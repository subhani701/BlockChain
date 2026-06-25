# Merkle Trees — Zero to Hero

A complete, beginner-friendly guide to **Merkle trees**: what they are, why this project uses
them, worked examples you can verify by hand, real runnable code, and a concrete plan to
implement them in **this** codebase (where `merkle_root` and the `merkle_proof_valid` check
already exist as mock data).

> **Where this lives in the project today**
> In `lib/store/seed.skf.ts` you'll see fake values like `merkle_root: '0x7f3a…b912'`, and in
> `lib/store/provenance.ts` the verification runs a check `merkle_proof_valid` with **weight 0.2**
> — the single heaviest check. Right now it's faked. This guide shows you the real thing and how
> to wire it in.

---

## Table of Contents

1. [The Problem Merkle Trees Solve](#1-the-problem-merkle-trees-solve)
2. [What a Merkle Tree Is](#2-what-a-merkle-tree-is)
3. [The Core Ingredient: Hashing](#3-the-core-ingredient-hashing)
4. [Building a Tree — Worked Example by Hand](#4-building-a-tree--worked-example-by-hand)
5. [Merkle Proofs — Proving One Leaf](#5-merkle-proofs--proving-one-leaf)
6. [Why It's Powerful (the Math)](#6-why-its-powerful-the-math)
7. [Runnable Code (TypeScript)](#7-runnable-code-typescript)
8. [How This Maps to the SKF Project](#8-how-this-maps-to-the-skf-project)
9. [Implementation Plan (Complete)](#9-implementation-plan-complete)
10. [Edge Cases & Gotchas](#10-edge-cases--gotchas)
11. [Cheat-Sheet](#11-cheat-sheet)

---

## 1. The Problem Merkle Trees Solve

SKF makes a **batch of 10,000 bearings**. Later, a technician in the field scans **one** part and
asks: *"Is serial `SN-88421-A` genuinely part of an SKF batch, and has nobody tampered with the
record?"*

Naive options, both bad:
- **Put all 10,000 records on the blockchain.** → Huge, expensive, slow.
- **Put nothing on-chain, just trust a database.** → Forgeable. The whole point was tamper-proof.

**Merkle trees give you the best of both:**
- Store **one** small fingerprint (the *Merkle root*) on-chain.
- Prove any single part belongs to that batch with a **tiny proof** (~log₂(n) hashes).
- For 10,000 parts, a proof is only **~14 hashes** instead of 10,000 records.

> One number on-chain. Tiny proofs. Total certainty. That's the magic.

---

## 2. What a Merkle Tree Is

A **Merkle tree** (a.k.a. *hash tree*) is a tree where:

- **Leaves** = the hash of each piece of data (e.g. each part record).
- **Every parent** = the hash of its two children concatenated together.
- **The root** = the single hash at the very top that summarizes *everything*.

```
                    ROOT  = H(H12 + H34)          ← one fingerprint, goes on-chain
                   /                  \
            H12=H(H1+H2)          H34=H(H3+H4)     ← internal nodes
            /        \            /        \
        H1=H(A)  H2=H(B)     H3=H(C)   H4=H(D)     ← leaves (hashed data)
          |        |           |          |
        data A   data B      data C     data D     ← the actual part records
```

**Key property:** change *anything* in any leaf, and its hash changes, which changes its parent,
which changes the root. **Tampering is mathematically impossible to hide.**

---

## 3. The Core Ingredient: Hashing

A **hash function** (Ethereum uses **keccak-256**, a SHA-3 variant, shown as
`0x…`) takes any input and returns a fixed-length fingerprint:

```
hash("SN-88421-A")  → 0x7f3a9c...b912   (always the same for the same input)
hash("SN-88421-B")  → 0x2d18ef...44a1   (totally different — one char changed)
```

Three properties that make Merkle trees work:
1. **Deterministic** — same input → same output, always.
2. **One-way** — you can't reverse a hash back to the input.
3. **Avalanche** — change one bit → ~half the output bits flip. No way to forge a collision.

> In examples below I'll write short fake hashes like `h(A)` so you can follow by hand. Real
> hashes are 32-byte hex strings.

---

## 4. Building a Tree — Worked Example by Hand

Say a mini-batch has **4 parts**: `A, B, C, D` (imagine each is a full part record).

**Step 1 — Hash each leaf:**
```
h1 = hash(A)
h2 = hash(B)
h3 = hash(C)
h4 = hash(D)
```

**Step 2 — Hash pairs to make the next level up:**
```
h12 = hash(h1 + h2)      // "+" means concatenate the two hashes
h34 = hash(h3 + h4)
```

**Step 3 — Hash the pair again to get the root:**
```
root = hash(h12 + h34)
```

That `root` is the **Merkle root**. SKF writes only `root` to the blockchain. Done.

**What if there's an odd number of leaves?** (say 5 parts: A B C D E)
The lonely last node is **duplicated** (hashed with itself) so it has a pair:
```
level0: h1 h2 h3 h4 h5
level1: h12  h34  h55   ← h5 paired with itself
level2: h1234  h5555    ← h55 paired with itself
root:   hash(h1234 + h5555)
```
(Other schemes "promote" the lonely node unchanged — pick one rule and stay consistent.)

---

## 5. Merkle Proofs — Proving One Leaf

Now the field technician wants to prove **part C** is in the batch, *without* downloading A, B, D.

The server gives them a **Merkle proof** = just the **sibling hashes** along the path from C up to
the root:

```
                    ROOT
                   /     \
               h12       h34
              /   \      /   \
            h1    h2   h3    h4
                        ↑
                     (this is C)
```

To rebuild the root starting from C, you need:
- `h4` (C's sibling) → compute `h34 = hash(h3 + h4)`
- `h12` (h34's sibling) → compute `root = hash(h12 + h34)`

So the **proof for C** is just `[h4, h12]` — **2 hashes** for a 4-leaf tree.

**Verification the technician runs:**
```
computed = hash(C)                    // h3
computed = hash(computed + h4)        // h34   (sibling on the right)
computed = hash(h12 + computed)       // root  (sibling on the left)
return computed == on_chain_root      // ✓ genuine  /  ✗ fake or tampered
```

If `computed === root` (the value SKF anchored on-chain), part C is **provably genuine**. This is
exactly what the `merkle_proof_valid` check represents in `provenance.ts`.

> ⚠️ **Order matters.** Each proof step must know whether the sibling goes on the **left** or
> **right** before hashing. So a proof element is really `{ hash, position }`, not just a hash.

---

## 6. Why It's Powerful (the Math)

| Batch size (n) | Records to store naively | Merkle proof size (~log₂ n) |
|---|---|---|
| 4 | 4 | 2 |
| 1,000 | 1,000 | ~10 |
| 10,000 | 10,000 | ~14 |
| 1,000,000 | 1,000,000 | ~20 |

- **On-chain storage:** always **1** hash (the root), no matter how big the batch.
- **Proof size:** **O(log n)** — grows incredibly slowly.
- **Verification cost:** **O(log n)** hash operations — instant.
- **Security:** to forge a fake part you'd need a **hash collision** — computationally impossible
  with keccak-256/SHA-256.

This is why blockchains (Bitcoin, Ethereum), Git, IPFS, and Certificate Transparency all use
Merkle trees under the hood.

---

## 7. Runnable Code (TypeScript)

Drop this into a file (e.g. `lib/merkle.ts`) — it uses Node's built-in `crypto`, no dependencies.
This is real, working, hero-level code.

```ts
import { createHash } from 'crypto';

// --- 1. The hash function (SHA-256 here; swap for keccak256 to match Ethereum) ---
function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// A proof step: the sibling hash + which side it sits on
type ProofStep = { hash: string; position: 'left' | 'right' };

// --- 2. Build the tree, return all levels (leaves at [0], root at the top) ---
export function buildMerkleTree(leaves: string[]): string[][] {
  if (leaves.length === 0) throw new Error('Cannot build a tree with no leaves');

  let level = leaves.map(hash);          // hash the raw data into leaf hashes
  const tree: string[][] = [level];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;   // odd one out → pair with itself
      next.push(hash(left + right));
    }
    tree.push(next);
    level = next;
  }
  return tree;                            // tree[tree.length - 1][0] is the root
}

export function getMerkleRoot(leaves: string[]): string {
  const tree = buildMerkleTree(leaves);
  return tree[tree.length - 1][0];
}

// --- 3. Generate a proof for the leaf at `index` ---
export function getProof(leaves: string[], index: number): ProofStep[] {
  const tree = buildMerkleTree(leaves);
  const proof: ProofStep[] = [];
  let idx = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const nodes = tree[level];
    const isRightNode = idx % 2 === 1;
    const siblingIdx = isRightNode ? idx - 1 : idx + 1;
    const sibling = nodes[siblingIdx] ?? nodes[idx];   // odd-node fallback
    proof.push({ hash: sibling, position: isRightNode ? 'left' : 'right' });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

// --- 4. Verify a leaf against a known root, using only the proof ---
export function verifyProof(leafData: string, proof: ProofStep[], root: string): boolean {
  let computed = hash(leafData);
  for (const step of proof) {
    computed = step.position === 'left'
      ? hash(step.hash + computed)     // sibling on the left
      : hash(computed + step.hash);    // sibling on the right
  }
  return computed === root;
}

// --- 5. Try it ---
const parts = ['SN-88421-A', 'SN-77210-C', 'SN-66105-B', 'SN-55098-D'];
const root  = getMerkleRoot(parts);
const proof = getProof(parts, 2);                  // prove 'SN-66105-B'
console.log('root  :', root);
console.log('valid :', verifyProof('SN-66105-B', proof, root));  // true
console.log('forged:', verifyProof('FAKE-PART',  proof, root));  // false
```

**What you just proved:** with only the part's data + a 2-element proof, you can verify it against
the root — and any forged input fails. That's the entire trust model in ~50 lines.

---

## 8. How This Maps to the SKF Project

| Merkle concept | This project's field/code | File |
|---|---|---|
| Leaf data | A `Product` record (serial, sku, batch_id, manufactured_at) | `lib/store/types.ts` |
| Batch of leaves | All products sharing a `batch_id` (e.g. `B-2025-0412`) | `seed.skf.ts` |
| Merkle root | `verification.merkle_root` (currently `'0x7f3a…b912'`, faked) | `seed.skf.ts` |
| On-chain anchor | `verification.chain_anchor_ref` / `on_chain_ref` | `seed.skf.ts` |
| Proof verification | the `merkle_proof_valid` check (weight **0.2**) | `provenance.ts` → `scanServiceRequest()` |
| "Root anchored on chain" | the `root_anchored_on_chain` check (weight 0.15) | `provenance.ts` |

Right now in `scanServiceRequest()`, the check is faked:
```ts
{ check: 'merkle_proof_valid', passed: !!product, weight: 0.2, label: 'Merkle proof valid' }
```
It just says "passed = does a product record exist." The implementation plan below replaces that
with a **real Merkle verification**.

---

## 9. Implementation Plan (Complete)

A step-by-step plan to make Merkle proofs **real** in this codebase, from mock to production.

### Phase 1 — Add the Merkle library (UI-demo level, no chain)
1. Create `lib/merkle.ts` with the code from Section 7 (use `sha256` for now).
2. In `seed.skf.ts`, group products by `batch_id`. For each batch, compute a **real** root:
   ```ts
   const batchLeaves = productsInBatch.map(p =>
     JSON.stringify({ serial: p.serial, sku: p.sku, batch_id: p.batch_id, manufactured_at: p.manufactured_at })
   );
   const realRoot = getMerkleRoot(batchLeaves);
   ```
   Store `realRoot` as each product's `merkle_root` (replacing the fake `0x7f3a…`).
3. Store the per-batch leaf list (or regenerate it on demand) so proofs can be produced.

### Phase 2 — Wire verification into the scan
4. In `provenance.ts` → `scanServiceRequest()`, compute the proof and verify it for real:
   ```ts
   const leaf = JSON.stringify(productRecord);
   const proof = getProof(batchLeaves, indexOfProduct);
   const merkleOk = verifyProof(leaf, proof, anchoredRoot);

   // replace the faked line with:
   { check: 'merkle_proof_valid', passed: merkleOk, weight: 0.2, label: 'Merkle proof valid' }
   ```
5. Now a tampered product record (e.g. someone edits `sku`) makes `merkleOk = false` → the part
   flips to `COUNTERFEIT`. The demo becomes *actually meaningful*.

### Phase 3 — Surface it in the UI
6. In `sr-authenticity-screen.tsx`, show the proof path (the sibling hashes) and a green/red badge
   for `merkle_proof_valid`. Let users expand "View Merkle proof."
7. Add a small visual of the tree (optional, nice-to-have) using the levels from `buildMerkleTree`.

### Phase 4 — Match Ethereum (production-grade)
8. Swap `sha256` for **keccak256** (the `js-sha3` package or `ethers`/`viem` utilities) so roots
   match what an Ethereum contract computes.
9. Sort sibling pairs deterministically if you'll verify on-chain (OpenZeppelin's `MerkleProof`
   sorts each pair before hashing — `hash(min(a,b) + max(a,b))` — which removes the need to store
   left/right positions). Decide on one convention and use it on **both** sides.

### Phase 5 — Put it on a real chain
10. Write a `Provenance.sol` smart contract that:
    - stores `batchRoots[batchId] = root` at **mint** time (Batch Minting Console),
    - exposes `verify(serial, leaf, proof)` using OpenZeppelin's `MerkleProof.verify`.
11. At mint time, compute the root off-chain (Section 7 code), send **one** transaction to store it.
12. In `scanServiceRequest`, instead of in-memory verify, call the contract's `verify(...)` via
    `viem`/`wagmi`. The returned `merkleOk` drives the same attribution check.
13. The `chain_anchor_ref` becomes the **real transaction hash** of the mint, viewable in a block
    explorer.

### Deliverables checklist
- [ ] `lib/merkle.ts` — build / root / proof / verify
- [ ] Real roots in seed data, grouped by batch
- [ ] Real verification inside `scanServiceRequest()`
- [ ] UI shows proof + pass/fail badge
- [ ] keccak256 + sorted-pair convention (if going on-chain)
- [ ] `Provenance.sol` with `MerkleProof.verify` + mint storing roots
- [ ] Frontend reads/writes the contract via viem/wagmi

---

## 10. Edge Cases & Gotchas

1. **Odd number of leaves** — decide your rule (duplicate the last leaf *vs* promote it) and apply
   it identically when building *and* verifying. Mismatched rules = roots never match.
2. **Pair ordering** — either store `{hash, position}` per proof step (Section 7), **or** sort each
   pair before hashing (OpenZeppelin style). Don't mix the two.
3. **Leaf format must be canonical** — `JSON.stringify` key order, whitespace, and encoding must be
   **identical** on the prover and verifier, or hashes differ. Define one exact serialization.
4. **Hash function must match** — sha256 vs keccak256 produce different roots. On-chain = keccak256.
5. **Second-preimage attacks** — production trees often prefix leaves vs internal nodes with a byte
   tag (e.g. `0x00` for leaves, `0x01` for nodes) so a leaf can't be confused with an internal
   node. OpenZeppelin double-hashes leaves for this reason.
6. **Don't roll your own for real money** — for production on-chain use, lean on
   **OpenZeppelin's `MerkleProof`** and a vetted JS builder (e.g. `merkletreejs`).

---

## 11. Cheat-Sheet

```
Leaf       = hash(data)
Parent     = hash(leftChild + rightChild)
Root       = the single top hash → stored on-chain
Proof      = the sibling hashes along the path from your leaf to the root
Verify     = re-hash your leaf up using the proof; check it equals the on-chain root

Storage on-chain : 1 hash, always
Proof size       : ~log2(n) hashes
Verify cost      : ~log2(n) hashes
Forge a fake     : needs a hash collision → infeasible

In this project:
  Product record      → leaf
  Products in a batch → leaves of one tree
  merkle_root         → root anchored on-chain (currently faked in seed.skf.ts)
  merkle_proof_valid  → the 0.2-weight check in scanServiceRequest()  ← make it real
```

**Real-world Merkle users:** Bitcoin & Ethereum (block tx roots), Git (commit/tree objects), IPFS
(content addressing), Certificate Transparency, ZK-rollups, airdrop allowlists.

---

*Next step suggestion: implement Phase 1–2 above so a tampered part record actually flips the scan
result to COUNTERFEIT — it turns the demo's headline feature from decoration into real
cryptography.*
