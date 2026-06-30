# 🌳 Merkle Tree Product Verification — Ethereum PoC

A **complete, standalone** Proof of Concept demonstrating how to use **Merkle
Trees** for **product provenance and anti-counterfeit verification** on
Ethereum — built with **Truffle + Ganache** (not Hardhat).

Instead of storing thousands of products on-chain (expensive), a manufacturer
stores **only the 32-byte Merkle Root** of a batch. Anyone can later prove a
single product belongs to that batch using a short **Merkle Proof**, and the
smart contract verifies it on-chain.

```
Products  →  Leaf Hashes  →  Parent Hashes  →  Merkle Root  →  Ethereum
 (many)       keccak256        keccak256         32 bytes        O(1) storage
```

---

## Table of contents

1. [Architecture](#architecture)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [The complete lifecycle](#the-complete-lifecycle)
6. [API reference](#api-reference)
7. [Testing](#testing)
8. [Concepts explained](#concepts-explained-part-13)
9. [Why this matters for supply chains](#supply-chain-provenance)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────┐     REST/JSON      ┌──────────────┐    Ethers.js   ┌──────────┐
│  Frontend   │ ─────────────────▶ │   Backend    │ ─────────────▶ │ Ganache  │
│ React + Vite│                    │ Express + TS │                │ (EVM)    │
│  (3 pages)  │ ◀───────────────── │              │ ◀───────────── │          │
└─────────────┘                    └──────────────┘                └──────────┘
                                          │                              ▲
                                          │ reads ABI + address          │ deploy
                                          ▼                              │
                                  build/contracts/*.json ◀────── Truffle migrate
                                                                         │
                                                            contracts/ProductRegistry.sol
```

- **Off-chain** (backend + `shared/`): generate batch, hash products
  (`keccak256` of a canonical JSON of `{serial, sku, batch_id, manufactured_at}`),
  build the Merkle tree (`merkletreejs`), derive root + proofs.
- **On-chain** (`ProductRegistry.sol`): store the root, verify proofs using
  OpenZeppelin's `MerkleProof`; the backend talks to it with **Ethers.js (v6)**.
- The off-chain hashing is **byte-for-byte identical** to Solidity's, so proofs
  built in JavaScript verify on-chain (proven by the test suite).

---

## Project structure

```
merkle-tree-poc/
├── contracts/
│   └── ProductRegistry.sol        # Part 5 — root storage + on-chain verification
├── migrations/
│   └── 1_deploy_product_registry.js  # Part 6 — deploys the contract
├── test/
│   └── ProductRegistry.test.js    # Part 12 — Truffle/Mocha contract tests
├── shared/                        # Reused by backend + tests (one source of truth)
│   ├── types.ts                   #   domain types
│   ├── hash.ts                    # Part 2 — Solidity-compatible leaf hashing
│   ├── merkle.ts                  # Parts 3/4 — tree, root, proof, levels
│   └── batch.ts                   # Part 1 — batch generator
├── backend/                       # Part 8 — Express + TypeScript API
│   ├── src/
│   │   ├── index.ts               #   server bootstrap
│   │   ├── server.ts              #   express app factory
│   │   ├── config.ts              #   env config
│   │   ├── routes/                #   batch / proof / verify endpoints
│   │   └── services/              #   store (JSON), blockchain (ethers), merkle
│   └── test/                      #   Part 12 — vitest unit + API tests
├── frontend/                      # Part 9 — React + TS + Vite (3 pages + Learn)
│   └── src/
│       ├── pages/                 #   GenerateBatch / Proof / Verify+Tamper / Learn
│       ├── components/            # Part 11 — HashFlow, MerkleTreeView, ProofPathView
│       └── api/client.ts          #   typed API client
├── truffle-config.js              # Part 6 — networks + compiler
├── package.json                   # root: truffle, contracts, blockchain deps
└── README.md
```

---

## Prerequisites

- **Node.js ≥ 18**
- **Ganache** — either:
  - [Ganache GUI](https://archive.trufflesuite.com/ganache/) (RPC port **7545**), or
  - Ganache CLI: `npm i -g ganache` then `ganache --port 7545`
- (Truffle is installed locally via `npm install`; use `npx truffle …`.)

---

## Quick start

### 0. Install everything

```bash
cd merkle-tree-poc
npm run install:all       # installs root + backend + frontend deps
```

### 1. Start Ganache

Open the Ganache GUI (listens on `http://127.0.0.1:7545`) **or**:

```bash
npx ganache --port 7545
```

### 2. Compile + deploy the contract

```bash
npm run compile
npm run migrate           # deploys ProductRegistry, prints the address
```

The deployed address is auto-recorded in `build/contracts/ProductRegistry.json`;
the backend reads it from there (no manual copy needed). To override, set
`CONTRACT_ADDRESS` in `backend/.env`.

### 3. Start the backend

```bash
cp backend/.env.example backend/.env   # adjust GANACHE_RPC_URL if needed
npm run backend                        # http://localhost:4000
```

### 4. Start the frontend

```bash
npm run frontend                       # http://localhost:5173
```

Open **http://localhost:5173** and walk the three pages.

> **No Ganache?** The app still runs: batch generation, tree building, proof
> generation, and **off-chain** verification all work without a blockchain. Only
> the on-chain register/verify steps need Ganache.

---

## The complete lifecycle

The UI mirrors the conceptual lifecycle end to end:

| Step | Page | What happens |
|------|------|--------------|
| 1 | Batch & Tree | Generate `BATCH-001` with N products (`SKU-0001…`). |
| 2 | Batch & Tree | Each product → canonical JSON → `keccak256` **leaf**. |
| 3 | Batch & Tree | Build the Merkle tree, display every level + the **root**. |
| 4 | Batch & Tree | **Register** only the root on Ethereum (see tx hash + gas). |
| 5 | Proof | Pick a product → generate its **leaf + proof**, visualize the path. |
| 6 | Verify | Verify the product against the **smart contract** → `VALID`. |
| 7 | Verify | **Tamper** a field → re-verify → `INVALID` (the demo). |

---

## API reference

Base URL: `http://localhost:4000`

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness. |
| `GET`  | `/verify/chain/status` | Blockchain connection + contract + accounts. |
| `POST` | `/batch/create` | `{ batchId, count }` → generate products + leaves. |
| `POST` | `/batch/register` | `{ batchId }` → build tree, write root on-chain. |
| `GET`  | `/batch` | List batch summaries. |
| `GET`  | `/batch/:batchId` | Full batch with hashed products + root. |
| `GET`  | `/batch/:batchId/tree` | All Merkle levels (leaves → root). |
| `GET`  | `/proof/:serial?batchId=…` | Leaf + proof + annotated steps + root. |
| `POST` | `/verify` | `{ batchId, serial }` → on-chain `VALID`/`INVALID` + gas. |
| `POST` | `/verify/offchain` | Same, verified locally (no gas). |
| `POST` | `/verify/tamper` | `{ batchId, serial, field, newValue }` → fails. |

Example:

```bash
curl -X POST localhost:4000/batch/create -H 'content-type: application/json' \
  -d '{"batchId":"BATCH-001","count":8}'

curl -X POST localhost:4000/batch/register -H 'content-type: application/json' \
  -d '{"batchId":"BATCH-001"}'

curl 'localhost:4000/proof/SN-BATCH-001-0003?batchId=BATCH-001'

curl -X POST localhost:4000/verify -H 'content-type: application/json' \
  -d '{"batchId":"BATCH-001","serial":"SN-BATCH-001-0003"}'
```

---

## Testing

```bash
# Contract tests (Truffle/Mocha) — spins up an in-process Ganache if none given,
# or use a running one with: npm test
npx truffle test                 # 7 tests: register, access control, verify, tamper

# Backend tests (vitest) — hashing, merkle proofs, tampering, HTTP API
npm --prefix backend test        # 17 tests
```

All tests pass out of the box. The contract tests build the Merkle tree in
JavaScript and assert the **on-chain** `verifyProduct` agrees — including the
critical **tampering** case (a modified product must verify as `INVALID`).

---

## Concepts explained (Part 13)

### What is a Hash?

A **hash function** maps arbitrary input to a fixed-size output (a "digest" or
"fingerprint"). Good cryptographic hashes are:

- **Deterministic** — same input always yields the same output.
- **One-way** — you cannot reverse the output back to the input.
- **Collision-resistant** — practically impossible to find two inputs with the
  same output.
- **Avalanche effect** — changing a single bit of input changes ~half the
  output bits. This is *why tampering is detectable*.

### What is Keccak-256?

**Keccak-256** is the hash function Ethereum uses (a variant of the SHA-3
family; Ethereum adopted it before the final NIST SHA3 padding tweak, so
"keccak256" ≠ "SHA3-256"). It outputs **32 bytes** (256 bits).

The leaf is built from the product fields with a **canonical JSON
serialization** (aligned to the VoltusWave / SKF model and `merkle.md`):

```ts
// shared/hash.ts — fixed key order: serial, sku, batch_id, manufactured_at
const canonical = JSON.stringify({ serial, sku, batch_id, manufactured_at });
const leaf = keccak256(toUtf8Bytes(canonical));   // 0x… 32-byte hash
```

**Why this matters:** the contract recomputes the root from a leaf you supply.
If your off-chain leaf bytes differ even slightly, the roots never match and
verification always fails. So the serialization must be **canonical** — same
keys, same order, same whitespace — on every side (backend, tests, on-chain
prover). The contract itself never reconstructs the leaf from fields; it only
runs the sorted-pair climb (OpenZeppelin `MerkleProof`) over the 32-byte leaf,
so a `keccak256`-of-JSON leaf is exactly what it expects.

### What is a Merkle Tree?

A **Merkle Tree** is a binary tree of hashes:

```
                    ROOT = H(H12, H34)
                   /                  \
          H12 = H(H1,H2)        H34 = H(H3,H4)
          /        \             /        \
      H1=leaf   H2=leaf      H3=leaf   H4=leaf
      (prod A)  (prod B)     (prod C)  (prod D)
```

- **Leaves** = `keccak256` of each product.
- **Parents** = hash of their two children.
- **Root** = the single top hash that commits to *every* leaf.

If the number of nodes at a level is odd, `merkletreejs` carries the lone node
up unchanged. We use **sorted pairs** (`sortPairs: true`) so each parent is
`keccak256(sort(left, right))` — matching OpenZeppelin's `MerkleProof`. (Sorting
means a proof doesn't need to encode left/right; the verifier derives order by
comparing bytes.)

### Why store only the Merkle Root?

| Approach | On-chain storage | Cost |
|----------|------------------|------|
| Store every product | O(n) | Huge — every unit is a storage write |
| Store the Merkle Root | **O(1)** | One 32-byte slot per batch |

A single 32-byte root cryptographically commits to the *entire* batch. You
cannot add, remove, or alter any product without changing the root — yet you
pay for one storage slot no matter how many products exist.

### What is a Merkle Proof?

A **Merkle Proof** is the minimal set of sibling hashes needed to recompute the
root from one leaf — about **log₂(n)** hashes. For a 1,000,000-product batch
that's only ~20 hashes.

To verify product C (`H3`) above, the proof is `[H4, H12]`:

```
H3  --hash with H4-->  H34  --hash with H12-->  ROOT
```

Each sibling **exists** because, to climb one level, your current node must be
hashed with the exact node it was paired with at that level. You don't need the
rest of the tree.

### How Ethereum verifies proofs

`ProductRegistry.verifyProduct` calls OpenZeppelin's library:

```solidity
bool valid = MerkleProof.verify(proof, storedRoot, leaf);
```

`MerkleProof.verify` folds the leaf with each proof element
(`keccak256(sort(a,b))`) to recompute a root, then checks it equals the stored
root. Cost is O(log n) hashes — cheap and constant-ish per proof.

### Why tampering changes the hash

Because of the **avalanche effect**, changing *any* field (e.g. a serial
number) produces a completely different leaf hash. The original proof can no
longer fold that new leaf back into the stored root, so `verify` returns
`false`. The **Tamper Product** button on Page 3 demonstrates this live:

```
Genuine  SKU-0005 / SN-BATCH-001-0005  → leaf 0xab… → root matches → VALID
Tampered SKU-0005 / SN-COUNTERFEIT     → leaf 0x91… → root differs → INVALID
```

### Ganache: accounts, transactions, gas (Part 7)

Ganache gives you 10 pre-funded accounts. `accounts[0]` deploys the contract and
becomes the **manufacturer** (owner). Each on-chain action is a **transaction**
with a **tx hash**, mined into a **block**, costing **gas**. The UI surfaces the
contract address, tx hash, block number, and gas used for both registration and
verification (the `verifyProduct` transaction also emits a `ProductVerified`
event for an auditable trail).

---

## Supply chain provenance

This pattern maps directly onto real anti-counterfeit systems:

1. **Manufacture** — a factory produces a batch and records each unit's
   identity (product id, serial, batch, date).
2. **Commit** — it publishes one Merkle Root on a public chain. Cheap,
   tamper-evident, and reveals *nothing* about individual units (privacy: only
   hashes are public).
3. **Distribute** — each unit ships with its Merkle Proof (e.g. in a QR code).
4. **Verify** — a retailer, customs officer, or consumer scans the unit and
   verifies the proof against the on-chain root. A genuine unit is `VALID`; a
   cloned/altered unit is `INVALID`.
5. **Audit** — every verification can be logged on-chain via the
   `ProductVerified` event.

Because the root is immutable once published, no one — not even the manufacturer
— can retroactively forge membership for a counterfeit unit.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Contract artifact not found` | Run `npm run compile` (and `npm run migrate`). |
| `No accounts returned` / `blockchain offline` | Start Ganache; check `GANACHE_RPC_URL` (GUI = 7545, CLI = 8545). |
| `No contract address` | Run `npm run migrate`, or set `CONTRACT_ADDRESS` in `backend/.env`. |
| On-chain verify disabled in UI | Backend can't reach Ganache; off-chain verify still works. |
| `batch already exists` (409) | Use a new `batchId` or restart the backend (clears the in-memory store; delete `backend/data/batches.json`). |
| Truffle picks wrong network | Pass `--network ganache`, or run `npx truffle test` to use the built-in chain. |

---

## License

MIT — educational PoC. Designed to be integrated into a larger enterprise
provenance system later.
