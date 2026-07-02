/**
 * shared/merkle.ts
 * -----------------------------------------------------------------------------
 * Merkle Tree construction, root extraction, and proof generation.
 *
 * We use:
 *   - merkletreejs : builds the tree, computes the root, generates proofs.
 *   - keccak256    : the hash function used for INTERNAL (parent) nodes.
 *
 * CRITICAL configuration: { sortPairs: true }
 * -------------------------------------------
 * When hashing two child nodes into a parent, there are two conventions:
 *   parent = keccak256(left ++ right)              (order-dependent)
 *   parent = keccak256(sort(a, b)[0] ++ sort(...)[1])  (order-independent)
 *
 * OpenZeppelin's MerkleProof library uses the SORTED variant, so we MUST set
 * sortPairs: true. This also means a proof does not need to encode left/right
 * positions — the verifier derives ordering by comparing bytes. (We still
 * surface a derived position in the UI for teaching purposes.)
 *
 * Leaves are ALREADY keccak256 hashes (see hash.ts), so we tell merkletreejs
 * NOT to re-hash them.
 * -----------------------------------------------------------------------------
 */
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import type { MerkleLevel, ProofStep } from "./types";

/**
 * ODD-LEAF CONVENTION (audit item #6) — locked to "promote".
 * -------------------------------------------------------------------------
 * When a tree level has an odd number of nodes, the lonely last node can be:
 *   - "promote"   : carried up UNCHANGED to the next level  ← WE USE THIS
 *   - "duplicate" : hashed with itself (hash(h, h))
 * These produce DIFFERENT roots, so every producer/verifier MUST agree.
 * merkletreejs promotes by default (duplicateOdd = false); we set it
 * EXPLICITLY below so the convention can never drift silently, and OZ's
 * on-chain MerkleProof.verify is compatible with the promote convention
 * (proven by the odd-sized contract test). NOTE: merkle.md's illustrative
 * sample uses "duplicate" — do NOT copy that into production code.
 */
export const ODD_LEAF_CONVENTION = "promote" as const;

/**
 * Thrown when a Merkle operation is attempted on zero leaves. An empty batch has
 * no meaningful root (and the on-chain contract rejects a zero root / zero
 * product count), so we fail loudly here rather than emit a bogus "0x" root.
 */
export class EmptyBatchError extends Error {
  constructor() {
    super("EmptyBatchError: cannot build a Merkle tree from zero leaves");
    this.name = "EmptyBatchError";
    Object.setPrototypeOf(this, EmptyBatchError.prototype);
  }
}

/** Convert a 0x-hex string to a Buffer that merkletreejs understands. */
function toBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

/** Convert a Buffer back to a 0x-prefixed lowercase hex string. */
function toHex(buf: Buffer): string {
  return "0x" + buf.toString("hex");
}

/**
 * Build a MerkleTree from a list of leaf hashes (0x hex strings).
 * @returns the merkletreejs MerkleTree instance.
 */
export function buildTree(leaves: string[]): MerkleTree {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new EmptyBatchError();
  }
  const leafBuffers = leaves.map(toBuffer);
  return new MerkleTree(leafBuffers, keccak256, {
    sortPairs: true, // Match OpenZeppelin MerkleProof (commutative hashing).
    // Leaves are already hashed; do not hash again.
    hashLeaves: false,
    // Lock the odd-leaf convention to "promote" (see ODD_LEAF_CONVENTION).
    // This is merkletreejs's default, set explicitly to prevent silent drift.
    duplicateOdd: false
  });
}

/** Return the Merkle Root of a set of leaves as a 0x hex string. */
export function getRoot(leaves: string[]): string {
  return toHex(buildTree(leaves).getRoot());
}

/**
 * Generate the Merkle Proof for a single leaf as a flat list of sibling
 * hashes (0x hex). This is exactly what you pass to the smart contract.
 */
export function getProof(leaves: string[], leaf: string): string[] {
  const tree = buildTree(leaves);
  return tree.getProof(toBuffer(leaf)).map((p) => toHex(p.data));
}

/**
 * Generate the proof annotated with sibling position (left/right) for the UI.
 * The position tells you which side the sibling sits on relative to the
 * running hash as we climb toward the root.
 */
export function getProofSteps(leaves: string[], leaf: string): ProofStep[] {
  const tree = buildTree(leaves);
  return tree.getProof(toBuffer(leaf)).map((p) => ({
    sibling: toHex(p.data),
    position: p.position // 'left' | 'right'
  }));
}

/**
 * Verify a proof off-chain (mirrors what the contract does on-chain). Useful in
 * tests and for instant UI feedback before/without a blockchain round-trip.
 */
export function verifyProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  const tree = buildTree([leaf]); // tree instance only used for its verify().
  return tree.verify(
    proof.map(toBuffer),
    toBuffer(leaf),
    toBuffer(root)
  );
}

/**
 * Reconstruct EVERY level of the tree (leaves at level 0 up to the root) for
 * visualization. merkletreejs exposes getLayers() returning Buffer[][].
 */
export function getLevels(leaves: string[]): MerkleLevel[] {
  const layers = buildTree(leaves).getLayers(); // Buffer[][]
  return layers.map((layer, idx) => ({
    level: idx,
    nodes: layer.map(toHex)
  }));
}
