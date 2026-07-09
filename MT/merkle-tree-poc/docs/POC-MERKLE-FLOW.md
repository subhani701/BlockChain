# VoltusWave Merkle POC — End-to-End Flow (as implemented)

**Plain summary.** A batch is created off-chain (`POST /batch/create`): products are
generated/ingested, each hashed to a leaf, and the raw products persisted to a JSON
file. Registering (`POST /batch/register`) builds the Merkle tree off-chain, derives
the root, and writes **only that 32-byte root** to a real Solidity contract on Ganache
via ethers v6. To prove one part, the backend rebuilds the tree, extracts that leaf's
proof (`GET /proof/:serial`), and can package it into a self-contained QR bundle.
Verification happens three interchangeable ways — off-chain in the backend
(`verifyProof`), offline in the browser (`verifyBundleOffline`), or on-chain
(`verifyProductView`) — each folding `leaf + proof` back to a root and comparing it to
the stored root. Tampering re-hashes a modified product and reuses the original proof,
which reconstructs a *wrong* root → INVALID. **The flow stops at the verdict.** No
counterfeit-report / dealer-score / DAO / enforcement chain is wired to the Merkle
result in this POC.

**Entry points, in sequence (the seams):**
1. `POST /batch/create` `{batchId, count}` → products + leaves
2. `POST /batch/register` `{batchId}` → root anchored on-chain
3. `GET /proof/:serial?batchId=…` → leaf + proof (+ QR bundle in the UI); `GET /batch/:id/proof-pack` for the whole batch
4. `POST /verify` `{batchId, serial}` (on-chain) — or `POST /verify/offchain`, or browser `verifyBundleOffline(bundle)`
5. `POST /verify/tamper` `{batchId, serial, field, newValue}` → INVALID
6. report → score → DAO → enforce — **not implemented** (see bottom)

---

## 1. Batch creation / mint
**Entry:** `POST /batch/create` — `backend/src/routes/batch.ts`
```ts
batchRouter.post("/create", requireApiKey, validateBody(createBatchSchema), (req, res) => {
  const { batchId, count, products } = req.body ?? {};
  if (store.has(batchId)) return res.status(409).json({ error: `batch ${batchId} already exists` });
  let batch: Batch;
  if (products !== undefined) {
    batch = { batchId, products: normalizeProducts(products), generatedAt: new Date().toISOString() };  // ingest path
  } else {
    const n = Number.isInteger(count) && count > 0 ? count : 100;
    batch = generateBatch(batchId, n);              // generated path (shared/batch.ts)
    assertUniqueSerials(batch.products);
  }
  store.upsert(batch);                              // ← persists to backend/data/batches.json
  return res.status(201).json({
    batchId: batch.batchId, totalProducts: batch.products.length,
    generatedAt: batch.generatedAt, products: hashedProducts(batch)   // ← each product + its leaf
  });
});
```
**products → leaves → tree → root** (`backend/src/services/merkleService.ts`):
```ts
function dataFor(batch) {                            // cached in a WeakMap keyed by batch.products
  let data = cache.get(batch.products);
  if (!data) {
    const leaves = batch.products.map(hashProduct);  // ① product → leaf   (shared/hash.ts)
    const tree = buildTree(leaves);                  // ② leaves → tree    (shared/merkle.ts, SimpleMerkleTree)
    data = { leaves, tree, root: rootFromTree(tree) };// ③ tree → root
    cache.set(batch.products, data);
  }
  return data;
}
export function hashedProducts(batch) {              // create response uses this
  const { leaves } = dataFor(batch);
  return batch.products.map((p, i) => ({ ...p, encoded: encodeProductForDisplay(p), leaf: leaves[i] }));
}
```
Leaf itself (`shared/hash.ts`):
```ts
export function hashProduct(product) {
  const inner = keccak256(abi.encode(["string","string","string","string"],
    [p.serial, p.sku, p.batch_id, p.manufactured_at]));   // p = normalizeProduct(product)
  return keccak256(inner);                                // double hash (OZ StandardMerkleTree leaf)
}
```
**Boundary/persistence:** nothing on-chain yet. **Persisted:** the raw products (`store.upsert` → `data/batches.json`). **Derived on demand:** leaves, tree, root (WeakMap cache; `data/batches.json` stores only `{batchId, products[], generatedAt}`).

## 2. Anchor the root on-chain
**Entry:** `POST /batch/register` — `backend/src/routes/batch.ts`
```ts
const merkleRoot = computeRoot(batch);        // build tree off-chain, derive root (merkleService → dataFor)
batch.merkleRoot = merkleRoot;
const onChain = await registerBatchOnChain(batch.batchId, merkleRoot, batch.products.length);
batch.onChain = onChain; store.upsert(batch);
return res.json({ batchId, merkleRoot, totalProducts: batch.products.length, onChain });
// on chain-write failure → 502 but still store.upsert(batch) so off-chain demo works
```
**The tx** (`backend/src/services/blockchain.ts`, ethers v6):
```ts
export async function registerBatchOnChain(batchId, merkleRoot, totalProducts) {
  const { contract, manufacturer, address } = await getChain();   // signer = Ganache account 0 (REGISTRAR_ROLE)
  const tx = await contract.registerBatch(batchId, merkleRoot, totalProducts);  // ← signed tx
  const receipt = await tx.wait();                                // ← confirm it landed (mined)
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber),
           gasUsed: Number(receipt.gasUsed), contractAddress: address, registeredBy: manufacturer };
}
```
**On chain** (`contracts/ProductRegistry.sol`): `registerBatch` (onlyRole REGISTRAR, whenNotPaused) stores `batches[batchId].merkleRoot = merkleRoot` (+ status Active, version 1) and emits `BatchRegistered`.
**Boundary:** **crosses on-chain:** `(batchId, merkleRoot, totalProducts)`. **Stays off-chain:** all products/leaves/tree. **Persisted:** root+onChain info added to the batch in `data/batches.json`; the root is stored **verbatim** on-chain (the chain does not recompute it). **What's signed:** the `registerBatch` tx, by account 0 (holds REGISTRAR_ROLE). **Confirm it landed:** `tx.wait()` returns the receipt (txHash, block, gas).

## 3. Proof / QR bundle for one part
**Entry:** `GET /proof/:serial?batchId=…` — `backend/src/routes/proof.ts`
```ts
const result = buildProof(batch, product);
const chain = await chainStatus().catch(() => null);
return res.json({ batchId, leafSpec: LEAF_SPEC_VERSION, contract: chain?.contractAddress ?? null, ...result });
```
**buildProof** (`merkleService.ts`):
```ts
export function buildProof(batch, product) {
  const { tree, root } = dataFor(batch);            // cache hit (tree already built)
  const leaf = hashProduct(product);
  return { product, encoded: encodeProductForDisplay(product), leaf,
           merkleRoot: root, proof: proofFromTree(tree, leaf) /* tree.getProof(leaf) */,
           steps: proofStepsFromTree(tree, leaf) };
}
```
**Per-product QR bundle** (`frontend/src/lib/bundle.ts`, built from the proof response):
```ts
{ v: 1, leafSpec, batchId, contract, root: proof.merkleRoot, product, leaf, proof }
```
**Whole-batch export:** `GET /batch/:id/proof-pack` → `{format, leafSpec, merkleRoot, contract, proofs:[{serial, product, leaf, proof}]}`.
**Boundary/persistence:** all off-chain. **Derived on demand** (proofs are NOT stored) — the QR bundle and proof-pack are on-the-fly exports rebuilt from the products.

## 4. Scan → verify (three paths)
The QR bundle carries everything needed. `merkle_proof_valid` = the boolean these paths return. `root_anchored_on_chain` is **implicit**: the on-chain path reverts on an unknown/unregistered batch, so a successful on-chain verify proves the root is anchored (there is **no separately-named `root_anchored_on_chain` field** — see gaps).

**(a) On-chain — `POST /verify`** (`backend/src/routes/verify.ts` → `blockchain.ts`)
```ts
// route: derive leaf+proof from the stored batch, then:
const result = await verifyProductOnChain(batchId, proof, leaf);
return res.json({ batchId, leaf, proof, result: result.valid ? "VALID":"INVALID",
                  valid: result.valid, onChain: { txHash, blockNumber, gasUsed } });
```
```ts
export async function verifyProductOnChain(batchId, proof, leaf) {
  const { contract } = await getChain();
  const valid = await contract.verifyProductView(batchId, proof, leaf);  // ← gas-free read = source of truth
  const tx = await contract.verifyProduct(batchId, proof, leaf);         // ← tx for the audit event + gas
  const receipt = await tx.wait();
  return { valid, txHash: receipt.hash, blockNumber: Number(receipt.blockNumber), gasUsed: Number(receipt.gasUsed) };
}
```
On chain: `MerkleProof.verify(proof, b.merkleRoot, leaf)`. **Used when** the chain is up (the UI's "Verify on Smart Contract").

**(b) Off-chain backend — `POST /verify/offchain`** (`verify.ts` → `merkleService.verifyAgainstBatch` → `shared/merkle.verifyProof`)
```ts
export function verifyProof(leaf, proof, root) {
  const computed = proof.reduce((acc, sib) => nodeHash(acc, sib), leaf);  // sorted-pair keccak256 climb
  return computed.toLowerCase() === root.toLowerCase();
}
```
**Used when** no chain / instant feedback. No gas.

**(c) Offline browser — `verifyBundleOffline`** (`frontend/src/lib/bundle.ts`, no backend call)
```ts
export function verifyBundleOffline(b) {
  const computedLeaf = leafOf(b.product);                       // re-hash product (mirror of shared/hash.ts)
  const computedRoot = b.proof.reduce((a,s)=>nodeHash(a,s), computedLeaf);
  return { valid: computedLeaf===b.leaf && computedRoot===b.root, leafOk, rootOk, computedLeaf, computedRoot };
}
```
**Used when** a technician scans the QR (Field Verify page) — verifies against the embedded root with zero backend; optionally cross-checks `bundle.root` against the registered root via `getBatch`.

**Request/response shapes:** `POST /verify` and `/verify/offchain` accept `{batchId, serial}` (or `{batchId, leaf, proof}`) → `{result:"VALID"|"INVALID", valid, leaf, proof, merkleRoot?, onChain?}`.

**Boundary/persistence:** verify results are **not persisted** off-chain; the on-chain path emits a `ProductVerified` event (permanent on-chain record). All three paths run the identical fold algorithm.

## 5. Tamper path
**Entry:** `POST /verify/tamper` — `backend/src/routes/verify.ts`
```ts
const genuine = buildProof(batch, original);                 // the REAL proof for the untouched product
const tampered = { ...original, [field]: newValue };         // change one field
let tamperedLeaf = leafFor(tampered);                        // hashProduct(tampered) → a DIFFERENT leaf
// verify tamperedLeaf against genuine.proof + the batch root:
const { valid } = verifyAgainstBatch(batch, tamperedLeaf.leaf, genuine.proof);
// (if the tampered field is structurally invalid, e.g. a bad date, it's REJECTED before hashing)
```
**Why INVALID:** only the **leaf** changes (one field → avalanche → new hash), but the **proof siblings and root are the original**. Folding the new leaf with the old siblings reconstructs a **different root ≠ stored root** → INVALID. Response includes `offchainResult`, optional `onchainResult`, both leaves, and an `explanation`. Off-chain and on-chain agree.

## 6. Downstream — report → score → DAO → enforce
**not implemented (in this POC).** The flow **stops at the verdict** (`VALID`/`INVALID` + tamper explanation returned by the `/verify*` endpoints). There is **no** counterfeit-report, dealer-signal-score, DAO-proposal, or enforcement code in this repo — that machinery lives in the separate VoltusWave Next.js app (`project.md`), not here.

**The boundary:** this POC produces the two cryptographic booleans (`merkle_proof_valid`, and `root_anchored_on_chain` implicitly) and ends. A real integration into `scanServiceRequest()` (`lib/store/provenance.ts` in the app) would: (1) reconstruct the scanned part's leaf using the **same** leaf encoding, (2) obtain its proof (from the QR bundle or a `GET /proof/:serial` call), (3) call one of the verify paths above to get a real `merkle_proof_valid`, (4) confirm the batch root is anchored (`getBatch`/`chainStatus`) for `root_anchored_on_chain`, and (5) feed those two booleans into the existing 7-check weighted score — leaving the app's report → score → DAO → enforce chain untouched. None of that wiring exists here.

---

## Where the flow currently breaks / is stubbed / hands off
- **Downstream chain (report/score/DAO/enforce): not implemented.** Ends at the verdict. §6.
- **`root_anchored_on_chain` is not a named output** — it's implied by a successful on-chain verify (contract reverts on unknown batch). No endpoint returns that specific boolean; a caller must infer it (or read `getBatch`/`chainStatus`). §4.
- **`batch_active` on-chain but not exposed** — `setBatchStatus`/`getBatchStatus` exist in the contract, but **no backend route** (`/batch/:id/status`) surfaces them. Verdict paths don't consult status. §2.
- **Leaf encoding duplicated** — `shared/hash.ts` (backend/tests) and `frontend/src/lib/bundle.ts` (`leafOf`) are two implementations that must stay byte-identical (tested-equal, but a drift risk). §1/§4.
- **Chain is Ganache (local), not Clique PoA;** contract is `ProductRegistry.sol` (app calls it `ProvenanceRegistry.sol`); **admin is a single EOA** (multisig/DAO deferred). §2.
- **Off-chain store = single JSON file** (`data/batches.json`); no DB/IPFS/backup. Proofs are derived on demand — persistence of proofs happens only via on-demand QR/proof-pack export. §1/§3.
- **Not integrated** into the VoltusWave app / `scanServiceRequest()` / the 7-check machinery — this is a standalone REST + UI demonstrator. §6.
