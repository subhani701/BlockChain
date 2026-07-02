# Phase 6 — Production Integration & Advanced Features

This document covers the "nice-to-have" items that are **deploy-time / integration
artifacts** (they target infrastructure or the VoltusWave repo, which is outside
this PoC), plus the evaluated-and-deferred multiproof feature. The runnable,
tested hardening lives in Phases 1–5 (see git history + `Task.md`).

---

## 6.1 On-chain multiproofs — evaluated, deferred (with rationale)

**Goal:** verify many products in one transaction (OpenZeppelin
`MerkleProof.multiProofVerify`) instead of one proof per product.

**What we found (prototype):** a merkletreejs multiproof over our `sortPairs`
tree *did* reconstruct the root for a power-of-two batch. **However**, merkletreejs
warns: *"For correct multiProofs it's strongly recommended to set `complete: true`."*
Enabling `complete: true` pads the tree to a power of two — which **changes the
Merkle root** for non-power-of-2 batches. That would break compatibility with our
existing single-proof trees and the committed leaf spec (`LEAF_SPEC_VERSION`).

**Decision:** do **not** ship a multiproof that is only correct for power-of-2
batches. A robust implementation should use **`@openzeppelin/merkle-tree`**
(`StandardMerkleTree`), which is purpose-built for OZ `multiProofVerify`. That
library uses its own leaf encoding (`keccak256(keccak256(abi.encode(...)))` over
typed values), so adopting it is a **leaf-spec migration**, not a drop-in:

- Bump `LEAF_SPEC_VERSION` and switch `shared/hash.ts` + `shared/merkle.ts` to
  `@openzeppelin/merkle-tree` for both single and multi proofs.
- Re-anchor all roots (leaf bytes change).
- Add `verifyProducts(batchId, proof, proofFlags, leaves[])` to the contract.

**Interim value already shipped:** `GET /batch/:id/proofs` returns all proofs from
the cached tree (Phase 4.3), and single-proof verification is O(log n) and cached.
For bulk *off-chain* verification, iterate `verifyProof` over the returned proofs.

---

## 6.2 Event indexer (The Graph)

The contract emits `BatchRegistered`, `BatchSuperseded`, and `ProductVerified`.
A subgraph turns these into a queryable API (dashboards, audit trails) without
polling. Scaffold provided under [`indexer/`](../indexer):

- `subgraph.yaml` — manifest (contract address, ABI, event handlers).
- `schema.graphql` — `Batch`, `BatchVersion`, `Verification` entities.
- `src/mapping.ts` — event handlers populating those entities.

Deploy-time steps (not runnable here — needs a Graph node / Subgraph Studio):
```bash
npm i -g @graphprotocol/graph-cli
graph codegen && graph build
graph deploy --studio <subgraph-name>
```
Set the deployed `ProductRegistry` address + start block in `subgraph.yaml`.

---

## 6.3 viem/wagmi client + VoltusWave `scanServiceRequest()` wiring

VoltusWave (`project.md`) uses **viem**. The Merkle module plugs into its
`scanServiceRequest()` 7-check verdict by making the two crypto checks real:
`merkle_proof_valid` (0.2) and `root_anchored_on_chain` (0.15).

A reference viem client is provided at
[`integrations/voltuswave-merkle-client.ts`](../integrations/voltuswave-merkle-client.ts)
(reference only — not compiled here; drop into the VoltusWave repo, which owns viem).

Wiring outline in `lib/store/provenance.ts`:
```ts
import { verifyProductOnChain, leafForProduct } from "@/lib/merkle-client";
// inside scanServiceRequest():
const leaf = leafForProduct(product);                 // canonical-JSON double-keccak leaf
const proof = await fetchProof(product.batch_id, product.serial); // from this PoC's /proof/:serial
const merkleOk = await verifyProductOnChain(product.batch_id, proof, leaf);
// replace the faked check:
{ check: 'merkle_proof_valid', passed: merkleOk, weight: 0.2, label: 'Merkle proof valid' }
```
The leaf construction MUST match `shared/hash.ts` exactly (canonical JSON, fixed
key order, double keccak256) — reuse that module (or `LEAF_SPEC_VERSION` 2.0.0 spec).

---

## 6.4 Key management (HSM/KMS) & private chain deployment

**Registrar key (no hot single key):**
- Deploy with the `admin` = a **multisig** (e.g. Safe) or a KMS/HSM-backed signer.
- Grant `REGISTRAR_ROLE` to operational signers; keep `DEFAULT_ADMIN_ROLE` on the
  multisig. Rotate registrars via `grantRole`/`revokeRole` (Phase 2.2).
- Backend: replace the Ganache unlocked-account signer with a KMS signer
  (e.g. ethers `AwsKmsSigner`) via the `blockchain.ts` `getChain()` seam.

**Target chain (VoltusWave private Geth + Clique PoA, see `chains.md`):**
- Add a `voltus` network to `truffle-config.js` (RPC URL + a KMS/HD provider).
- `PAUSER_ROLE` (Phase 2.3) gives an on-chain emergency stop.
- Gas is validator-rewarded on Clique; registration/supersede cost is O(1).

**Pre-deploy checklist:** run the CI Slither job (Phase 5.3), a formal review,
set `API_KEYS`, choose `STORE_DRIVER=sqlite`/Postgres, and re-anchor roots under
the current `LEAF_SPEC_VERSION`.
