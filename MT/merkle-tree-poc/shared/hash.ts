/**
 * shared/hash.ts
 * -----------------------------------------------------------------------------
 * Solidity-compatible hashing for Merkle leaves (Ethers.js).
 *
 * WHY "Solidity-compatible" matters
 * ---------------------------------
 * The smart contract verifies a product by recomputing the Merkle root from a
 * leaf + proof and comparing it to the stored root. For that to ever match,
 * the leaf we build OFF-chain in JavaScript must be BYTE-FOR-BYTE identical to
 * what Solidity would produce ON-chain. Ethereum uses keccak256 (NOT the NIST
 * SHA3-256 standard), and Solidity offers two encodings:
 *
 *   - abi.encode(...)        : each argument padded to 32 bytes (loss-less,
 *                              unambiguous, but larger).
 *   - abi.encodePacked(...)  : tightly packed with NO padding (compact).
 *
 * We use keccak256(abi.encodePacked(...)). Ethers' `solidityPackedKeccak256`
 * does EXACTLY this: it tightly packs the typed arguments (the JS equivalent of
 * abi.encodePacked) and runs keccak256 over them, so the JS leaf equals
 * Solidity's `keccak256(abi.encodePacked(...))`.
 *
 * If we instead used Node's crypto SHA-256, or JSON.stringify + hash, the bytes
 * would differ and on-chain verification would always fail.
 * -----------------------------------------------------------------------------
 */
import { solidityPackedKeccak256 } from "ethers";
import type { Product } from "./types";

/**
 * The ordered, typed field list used to encode a product. Keeping this in one
 * place guarantees the backend, tests, and contract documentation all agree on
 * the exact encoding.
 *
 * Encoding (abi.encodePacked):
 *   string  productId
 *   string  serialNumber
 *   string  batchId
 *   uint256 manufactureDate
 */
export function productAbiTypes(): { type: string; name: keyof Product }[] {
  return [
    { type: "string", name: "productId" },
    { type: "string", name: "serialNumber" },
    { type: "string", name: "batchId" },
    { type: "uint256", name: "manufactureDate" }
  ];
}

/**
 * Produce a human-readable description of the packed encoding for the UI:
 *   "string:SKU-0001 | string:SN-... | string:BATCH-001 | uint256:1700000000"
 *
 * This is purely educational (it is NOT what gets hashed); it lets the
 * frontend show the "Encoded Data" step between Product and Hash.
 */
export function encodeProductForDisplay(product: Product): string {
  return productAbiTypes()
    .map(({ type, name }) => `${type}:${String(product[name])}`)
    .join(" | ");
}

/**
 * Compute the Merkle LEAF for a product:
 *   keccak256(abi.encodePacked(productId, serialNumber, batchId, manufactureDate))
 *
 * Returns a 0x-prefixed 32-byte hex string, e.g. "0xab12...".
 */
export function hashProduct(product: Product): string {
  const fields = productAbiTypes();
  const types = fields.map((f) => f.type);
  // Ethers accepts string | number | bigint for these types; manufactureDate is
  // a safe-integer Unix timestamp, so the number value encodes correctly.
  const values = fields.map((f) => product[f.name]);
  return solidityPackedKeccak256(types, values);
}

/**
 * Raw keccak256 of an arbitrary UTF-8 string. Handy for ad-hoc demos
 * (e.g. showing how a one-character change avalanches the whole digest).
 */
export function keccakString(input: string): string {
  return solidityPackedKeccak256(["string"], [input]);
}
