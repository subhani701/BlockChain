// step4-tamper.js
// ---------------------------------------------------------------------------
// GOAL: prove that a tampered product FAILS verification.
//   - Genuine SKU-0003 + its proof  -> rebuilds the stored root -> VALID
//   - Tampered SKU-0003 + same proof -> rebuilds a WRONG root   -> INVALID
// ---------------------------------------------------------------------------
import { solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

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

// The genuine product + the proof that ships with it.
const genuine = products[2]; // SKU-0003
const proof = tree.getHexProof(hashProduct(genuine));

console.log("Stored Merkle root:", root);
console.log("Proof (ships with the product):", proof.length, "hashes\n");

// ---------------------------------------------------------------------------
// CASE 1 — genuine product.
// ---------------------------------------------------------------------------
const genuineLeaf = hashProduct(genuine);
console.log("CASE 1: GENUINE product");
console.log("  leaf :", genuineLeaf.slice(0, 18) + "…");
console.log("  valid?", tree.verify(proof, genuineLeaf, root), "✅\n");

// ---------------------------------------------------------------------------
// CASE 2 — tampered product (counterfeiter changes ONLY the serial number),
// reusing the SAME proof from the genuine item.
// ---------------------------------------------------------------------------
const tampered = { ...genuine, serialNumber: "SN-FAKE-9999" };
const tamperedLeaf = hashProduct(tampered);
console.log("CASE 2: TAMPERED product (serial SN-0003 -> SN-FAKE-9999)");
console.log("  genuine leaf :", genuineLeaf.slice(0, 18) + "…");
console.log("  tampered leaf:", tamperedLeaf.slice(0, 18) + "…   (totally different!)");
console.log("  valid?", tree.verify(proof, tamperedLeaf, root), "❌\n");

// ---------------------------------------------------------------------------
// Show WHY: rebuild the root by hand with the tampered leaf.
// ---------------------------------------------------------------------------
const toBuf = (hex) => Buffer.from(hex.slice(2), "hex");
const hashPair = (a, b) => {
  const [x, y] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return keccak256(Buffer.concat([x, y]));
};
let running = toBuf(tamperedLeaf);
for (const sib of proof) running = hashPair(running, toBuf(sib));
const wrongRoot = "0x" + running.toString("hex");

console.log("Rebuilt root from TAMPERED leaf:", wrongRoot);
console.log("Stored root                    :", root);
console.log("Match?", wrongRoot === root, "-> the fake is rejected.");
