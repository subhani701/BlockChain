// step1-hash.js
// ---------------------------------------------------------------------------
// GOAL: turn a product into a 32-byte fingerprint (a "hash") and see the rules.
// We use ethers' solidityPackedKeccak256, which matches what Solidity computes
// on-chain with keccak256(abi.encodePacked(...)). (More on "why" in Step 5.)
// ---------------------------------------------------------------------------

import { solidityPackedKeccak256 } from "ethers";

// A product = some fields describing one physical item.
const product = {
  productId: "SKU-0001",
  serialNumber: "SN-0001",
  batchId: "BATCH-001",
  manufactureDate: 1700000000, // a Unix timestamp (seconds)
};

// To hash it, we tell ethers the TYPE of each field, then the VALUE of each.
// "abi.encodePacked" = glue the fields together tightly, then keccak256 it.
function hashProduct(p) {
  return solidityPackedKeccak256(
    ["string", "string", "string", "uint256"], // types, in order
    [p.productId, p.serialNumber, p.batchId, p.manufactureDate] // values, in order
  );
}

const hash = hashProduct(product);

console.log("Product:", product);
console.log("\nHash (the 'leaf'):", hash);
console.log("Length:", hash.length, "chars =", (hash.length - 2) / 2, "bytes\n");

// RULE 1: deterministic — hashing the SAME product again gives the SAME hash.
console.log("Same product again ->", hashProduct(product));
console.log("Identical?", hashProduct(product) === hash);

// RULE 2: avalanche — change ONE character in the serial number...
const tampered = { ...product, serialNumber: "SN-0002" };
console.log("\nTampered serial    ->", hashProduct(tampered));
console.log("Completely different from the original? ", hashProduct(tampered) !== hash);
