/**
 * shared/hash.ts
 * -----------------------------------------------------------------------------
 * Solidity-compatible leaf hashing, aligned to the VoltusWave / SKF project
 * (see merkle.md §7-§9).
 *
 * LEAF DEFINITION (must be identical on prover and verifier — merkle.md §10 #3):
 *
 *   leaf = keccak256( utf8Bytes( JSON.stringify({ serial, sku, batch_id, manufactured_at }) ) )
 *
 * Two things make this Ethereum- and project-compatible:
 *   1. keccak256 (not SHA-256) — the hash Ethereum/Solidity uses. (merkle.md §4 "Phase 4".)
 *   2. A CANONICAL serialization with a FIXED key order. We build the object
 *      ourselves in a guaranteed order so the bytes never depend on the input
 *      object's key ordering. Any difference in keys, order, or whitespace
 *      would change the hash and break verification.
 *
 * The on-chain contract never recomputes the leaf from fields — it receives the
 * 32-byte leaf and only does the sorted-pair climb (OpenZeppelin MerkleProof).
 * So the leaf can be a keccak256 of JSON; both sides simply must agree on it.
 * -----------------------------------------------------------------------------
 */
import { keccak256, toUtf8Bytes } from "ethers";
import type { Product } from "./types";
import { normalizeProduct } from "./validate";

/**
 * The canonical string that gets hashed into a leaf. FIXED key order:
 *   serial, sku, batch_id, manufactured_at
 * Changing this order (or the keys) changes every leaf and root — do not edit
 * without changing it identically everywhere (backend, tests, on-chain prover).
 */
export function canonicalLeaf(product: Product): string {
  // Validate + normalize FIRST so the hashed bytes are always canonical
  // (fixed key order here, canonical field values from normalizeProduct).
  // Throws ProductValidationError on invalid input — a leaf must never be
  // computed from malformed data.
  const p = normalizeProduct(product);
  return JSON.stringify({
    serial: p.serial,
    sku: p.sku,
    batch_id: p.batch_id,
    manufactured_at: p.manufactured_at
  });
}

/**
 * Human-readable form shown in the UI between "Product" and "Hash". Here it is
 * literally the canonical JSON that gets hashed (not a separate encoding).
 */
export function encodeProductForDisplay(product: Product): string {
  return canonicalLeaf(product);
}

/**
 * Compute the Merkle LEAF for a product:
 *   keccak256(utf8(JSON.stringify({ serial, sku, batch_id, manufactured_at })))
 * Returns a 0x-prefixed 32-byte hex string.
 */
export function hashProduct(product: Product): string {
  // DOUBLE-HASH the leaf (OpenZeppelin-recommended, second-preimage safe):
  //   inner = keccak256(utf8(canonicalJSON))   // 32 bytes
  //   leaf  = keccak256(inner)
  //
  // WHY: an internal tree node is keccak256(concat(32B,32B)) — 32 bytes. A
  // single-hashed leaf keccak256(data) is also 32 bytes, so a 64-byte node
  // preimage could be reinterpreted as a "leaf", enabling a leaf/node-confusion
  // (second-preimage) attack. Hashing the 32-byte inner hash again makes leaf
  // and node preimages structurally distinct. This matches @openzeppelin/merkle-tree.
  const inner = keccak256(toUtf8Bytes(canonicalLeaf(product)));
  return keccak256(inner);
}

/** Raw keccak256 of an arbitrary UTF-8 string (handy for ad-hoc demos). */
export function keccakString(input: string): string {
  return keccak256(toUtf8Bytes(input));
}
