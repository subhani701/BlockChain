// step3-proof.js
// ---------------------------------------------------------------------------
// GOAL: prove ONE product is in the batch using only its sibling hashes,
//       then rebuild the root from leaf + proof to confirm it matches.
// ---------------------------------------------------------------------------
import { solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

// Same batch as Step 2.
const products = [
  { productId: "SKU-0001", serialNumber: "SN-0001", batchId: "BATCH-001", manufactureDate: 1700000000 },
  { productId: "SKU-0002", serialNumber: "SN-0002", batchId: "BATCH-001", manufactureDate: 1700000060 },
  { productId: "SKU-0003", serialNumber: "SN-0003", batchId: "BATCH-001", manufactureDate: 1700000120 },
  { productId: "SKU-0004", serialNumber: "SN-0004", batchId: "BATCH-001", manufactureDate: 1700000180 },
];

const hashProduct = (p) =>
  solidityPackedKeccak256(
    ["string", "string", "string", "uint256"],
    [p.productId, p.serialNumber, p.batchId, p.manufactureDate]
  );

const leaves = products.map(hashProduct);
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot();

// --- Pick the product we want to prove --------------------------------------
const target = products[2]; // SKU-0003
const leaf = hashProduct(target);

console.log("Proving:", target.productId);
console.log("Its leaf:", leaf);
console.log("Merkle root:", root);

// --- Generate the proof (the sibling hashes) --------------------------------
const proof = tree.getHexProof(leaf);
console.log(`\nPROOF = ${proof.length} sibling hashes (NOT the whole tree):`);
proof.forEach((sib, i) => console.log(`  step ${i + 1}: ${sib}`));

// --- Rebuild the root BY HAND to see how verification works -----------------
// At each step: hash the running value with the sibling. Because the tree used
// sortPairs:true, we sort the two before hashing (smaller bytes first).
const toBuf = (hex) => Buffer.from(hex.slice(2), "hex");
const hashPair = (a, b) => {
  const [x, y] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a]; // sort
  return keccak256(Buffer.concat([x, y]));
};

let running = toBuf(leaf);
console.log("\nClimbing to the root:");
console.log("  start  :", "0x" + running.toString("hex").slice(0, 8) + "…  (my leaf)");
proof.forEach((sib, i) => {
  running = hashPair(running, toBuf(sib));
  console.log(`  + sib${i + 1}:`, "0x" + running.toString("hex").slice(0, 8) + "…");
});
const rebuilt = "0x" + running.toString("hex");

console.log("\nRebuilt root:", rebuilt);
console.log("Stored  root:", root);
console.log("MATCH? ", rebuilt === root, "  -> SKU-0003 is genuinely in the batch ✅");

// --- The library can verify for us too (same result) ------------------------
console.log("\ntree.verify(proof, leaf, root) =>", tree.verify(proof, leaf, root));
