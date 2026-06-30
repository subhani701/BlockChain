// step2-tree.js
// ---------------------------------------------------------------------------
// GOAL: take 4 products -> 4 leaves -> combine upward into ONE Merkle Root.
// ---------------------------------------------------------------------------
import { solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

// 1) Our batch: 4 products (small, so the tree is easy to read).
const products = [
  { productId: "SKU-0001", serialNumber: "SN-0001", batchId: "BATCH-001", manufactureDate: 1700000000 },
  { productId: "SKU-0002", serialNumber: "SN-0002", batchId: "BATCH-001", manufactureDate: 1700000060 },
  { productId: "SKU-0003", serialNumber: "SN-0003", batchId: "BATCH-001", manufactureDate: 1700000120 },
  { productId: "SKU-0004", serialNumber: "SN-0004", batchId: "BATCH-001", manufactureDate: 1700000180 },
];

// 2) Hash each product into a LEAF (same function we learned in Step 1).
function hashProduct(p) {
  return solidityPackedKeccak256(
    ["string", "string", "string", "uint256"],
    [p.productId, p.serialNumber, p.batchId, p.manufactureDate]
  );
}
const leaves = products.map(hashProduct);

console.log("LEAVES (one hash per product):");
leaves.forEach((leaf, i) => console.log(`  L${i}  ${leaf}`));

// 3) Build the Merkle Tree.
//    - keccak256        : the function used to hash a PAIR of nodes into a parent
//    - sortPairs: true  : sort the two siblings before hashing (matches OpenZeppelin)
//    Leaves are already hashed, so merkletreejs should NOT hash them again.
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

// 4) The Merkle Root — ONE 32-byte value that commits to all 4 products.
console.log("\nMERKLE ROOT (represents the whole batch):");
console.log("  " + tree.getHexRoot());

// 5) Print every LEVEL of the tree so you can see leaves -> parents -> root.
console.log("\nTREE, level by level (0 = leaves, top = root):");
const layers = tree.getHexLayers(); // array of levels, each is an array of hashes
layers.forEach((level, i) => {
  const label = i === 0 ? "leaves" : i === layers.length - 1 ? "ROOT  " : `level ${i}`;
  console.log(`  ${label}: ${level.map((h) => h.slice(0, 10) + "…").join("   ")}`);
});

// 6) Bonus: merkletreejs can draw the tree as ASCII.
console.log("\nASCII tree (merkletreejs built-in):");
console.log(tree.toString());
