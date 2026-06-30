// step1b-explain.js
// Shows the TWO hidden steps inside solidityPackedKeccak256:
//   1) solidityPacked  -> glue the values into one byte string ("encodePacked")
//   2) keccak256       -> hash that byte string into 32 bytes
import { solidityPacked, keccak256, solidityPackedKeccak256 } from "ethers";

const p = {
  productId: "SKU-0001",
  serialNumber: "SN-0001",
  batchId: "BATCH-001",
  manufactureDate: 1700000000,
};

const types = ["string", "string", "string", "uint256"];
const values = [p.productId, p.serialNumber, p.batchId, p.manufactureDate];

// STEP 1: pack the values together (no hashing yet).
const packed = solidityPacked(types, values);
console.log("STEP 1 — packed bytes (abi.encodePacked):");
console.log(packed);
console.log("packed length:", (packed.length - 2) / 2, "bytes\n");

// STEP 2: hash the packed bytes.
const hashedInTwoSteps = keccak256(packed);
console.log("STEP 2 — keccak256(packed):");
console.log(hashedInTwoSteps, "\n");

// The all-in-one helper should give the SAME result.
const oneShot = solidityPackedKeccak256(types, values);
console.log("solidityPackedKeccak256 (one-shot):");
console.log(oneShot);
console.log("\nSame result both ways?", hashedInTwoSteps === oneShot);
