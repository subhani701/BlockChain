/**
 * shared/hash.ts
 * -----------------------------------------------------------------------------
 * Leaf hashing — OpenZeppelin StandardMerkleTree convention (LEAF SPEC 3.0.0).
 *
 *   leaf = keccak256( keccak256( abi.encode(
 *            ["string","string","string","string"],
 *            [serial, sku, batch_id, manufactured_at] ) ) )
 *
 * This is byte-for-byte identical to `@openzeppelin/merkle-tree`'s
 * `StandardMerkleTree.leafHash(value)`, so:
 *   - leaves are DOUBLE-hashed (second-preimage / leaf-node-confusion safe),
 *   - the encoding is standard `abi.encode` of typed values (ecosystem interop),
 *   - trees built with @openzeppelin/merkle-tree (Standard/Simple) verify with
 *     OpenZeppelin's on-chain `MerkleProof.verify`.
 *
 * Values are validated + normalized first (see validate.ts) so the encoded bytes
 * are always canonical regardless of caller field order / formatting.
 * -----------------------------------------------------------------------------
 */
import { keccak256, AbiCoder, toUtf8Bytes } from "ethers";
import type { Product } from "./types";
import { normalizeProduct } from "./validate";

/** ABI leaf encoding (order matters — must match every producer + the tests). */
export const LEAF_ENCODING = ["string", "string", "string", "string"] as const;

const abi = AbiCoder.defaultAbiCoder();

/** The typed value tuple that gets ABI-encoded, in fixed order. */
export function productValue(product: Product): [string, string, string, string] {
  const p = normalizeProduct(product);
  return [p.serial, p.sku, p.batch_id, p.manufactured_at];
}

/**
 * Human-readable description of what gets hashed (for the UI). Shows the typed
 * value tuple that is ABI-encoded then double-keccak256'd.
 */
export function encodeProductForDisplay(product: Product): string {
  const [serial, sku, batch_id, manufactured_at] = productValue(product);
  return `abi.encode(string,string,string,string) → [${serial}, ${sku}, ${batch_id}, ${manufactured_at}]`;
}

/**
 * Compute the Merkle LEAF for a product (StandardMerkleTree convention):
 *   keccak256(keccak256(abi.encode(types, values)))
 * Returns a 0x-prefixed 32-byte hex string.
 */
export function hashProduct(product: Product): string {
  const inner = keccak256(abi.encode([...LEAF_ENCODING], productValue(product)));
  return keccak256(inner);
}

/** Raw keccak256 of an arbitrary UTF-8 string (ad-hoc demo helper). */
export function keccakString(input: string): string {
  return keccak256(toUtf8Bytes(input));
}
