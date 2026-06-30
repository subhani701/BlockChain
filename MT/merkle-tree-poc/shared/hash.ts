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

/**
 * The canonical string that gets hashed into a leaf. FIXED key order:
 *   serial, sku, batch_id, manufactured_at
 * Changing this order (or the keys) changes every leaf and root — do not edit
 * without changing it identically everywhere (backend, tests, on-chain prover).
 */
export function canonicalLeaf(product: Product): string {
  return JSON.stringify({
    serial: product.serial,
    sku: product.sku,
    batch_id: product.batch_id,
    manufactured_at: product.manufactured_at
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
  return keccak256(toUtf8Bytes(canonicalLeaf(product)));
}

/** Raw keccak256 of an arbitrary UTF-8 string (handy for ad-hoc demos). */
export function keccakString(input: string): string {
  return keccak256(toUtf8Bytes(input));
}
