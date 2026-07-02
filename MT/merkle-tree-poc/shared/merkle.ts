/**
 * shared/merkle.ts
 * -----------------------------------------------------------------------------
 * Merkle tree construction, root, and proofs — built on
 * `@openzeppelin/merkle-tree` (LEAF SPEC 3.0.0).
 *
 * We use `SimpleMerkleTree` over pre-hashed leaves (from shared/hash.ts, which
 * uses the StandardMerkleTree leaf encoding). SimpleMerkleTree with
 * `sortLeaves: true` produces the SAME root/proofs as StandardMerkleTree over
 * the raw values, and its proofs verify with OpenZeppelin's on-chain
 * `MerkleProof.verify` (sorted, commutative keccak256 node hashing). This also
 * unlocks multiproofs (tree.getMultiProof).
 *
 * Node hashing (for off-chain verify + proof-step positions) mirrors OZ exactly:
 *   parent = keccak256( sort(a, b)[0] ++ sort(a, b)[1] )
 * -----------------------------------------------------------------------------
 */
import { SimpleMerkleTree } from "@openzeppelin/merkle-tree";
import { keccak256, concat } from "ethers";
import type { MerkleLevel, ProofStep } from "./types";

/**
 * Odd-leaf / construction convention — delegated to @openzeppelin/merkle-tree
 * (the industry standard). Every producer/verifier must use the same library.
 */
export const ODD_LEAF_CONVENTION = "openzeppelin" as const;

/** Thrown when a Merkle operation is attempted on zero leaves. */
export class EmptyBatchError extends Error {
  constructor() {
    super("EmptyBatchError: cannot build a Merkle tree from zero leaves");
    this.name = "EmptyBatchError";
    Object.setPrototypeOf(this, EmptyBatchError.prototype);
  }
}

/** OZ node hash: keccak256 of the sorted concatenation of two 32-byte hashes. */
function nodeHash(a: string, b: string): string {
  const [lo, hi] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(concat([lo, hi]));
}

/**
 * Build a Merkle tree from a list of leaf hashes (0x hex). Uses SimpleMerkleTree
 * with sorted leaves so the root matches StandardMerkleTree and OZ MerkleProof.
 */
export function buildTree(leaves: string[]): SimpleMerkleTree {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new EmptyBatchError();
  }
  return SimpleMerkleTree.of(leaves, { sortLeaves: true });
}

// --- Tree-reusing primitives (a prebuilt tree is reused across derivations) ---

/** Root (0x hex) from a prebuilt tree. */
export function rootFromTree(tree: SimpleMerkleTree): string {
  return tree.root;
}

/** Proof (sibling hashes, 0x hex) for a leaf from a prebuilt tree. */
export function proofFromTree(tree: SimpleMerkleTree, leaf: string): string[] {
  return tree.getProof(leaf);
}

/**
 * Annotated proof steps (sibling + left/right position) from a prebuilt tree.
 * OZ proofs carry only hashes; we derive the side by replaying the sorted climb.
 */
export function proofStepsFromTree(
  tree: SimpleMerkleTree,
  leaf: string
): ProofStep[] {
  const proof = tree.getProof(leaf);
  let running = leaf;
  return proof.map((sibling) => {
    // In a sorted pair the smaller value is concatenated first (on the "left").
    const position: "left" | "right" =
      sibling.toLowerCase() <= running.toLowerCase() ? "left" : "right";
    running = nodeHash(running, sibling);
    return { sibling, position };
  });
}

/**
 * Every level of the tree (level 0 = leaves … top = root), reconstructed from
 * the OZ heap-array dump for visualization. For non-power-of-2 batches some
 * leaves sit one level up (OZ's balanced layout) — cosmetic only.
 */
export function levelsFromTree(tree: SimpleMerkleTree): MerkleLevel[] {
  const nodes = tree.dump().tree as string[]; // heap: index 0 = root, children 2i+1/2i+2
  const heapDepth = (i: number) => Math.floor(Math.log2(i + 1));
  const maxDepth = heapDepth(nodes.length - 1);
  const byLevel = new Map<number, string[]>();
  nodes.forEach((h, i) => {
    const level = maxDepth - heapDepth(i); // 0 = deepest (leaves), maxDepth = root
    const bucket = byLevel.get(level);
    if (bucket) bucket.push(h);
    else byLevel.set(level, [h]);
  });
  const levels: MerkleLevel[] = [];
  for (let l = 0; l <= maxDepth; l++) {
    levels.push({ level: l, nodes: byLevel.get(l) ?? [] });
  }
  return levels;
}

// --- leaves[]-based helpers (build then derive) -----------------------------

/** Return the Merkle Root of a set of leaves as a 0x hex string. */
export function getRoot(leaves: string[]): string {
  return rootFromTree(buildTree(leaves));
}

/** Generate the Merkle Proof (sibling hashes) for a single leaf. */
export function getProof(leaves: string[], leaf: string): string[] {
  return proofFromTree(buildTree(leaves), leaf);
}

/** Generate the proof annotated with sibling positions (for the UI). */
export function getProofSteps(leaves: string[], leaf: string): ProofStep[] {
  return proofStepsFromTree(buildTree(leaves), leaf);
}

/** Every level (leaves..root) for visualization. */
export function getLevels(leaves: string[]): MerkleLevel[] {
  return levelsFromTree(buildTree(leaves));
}

/**
 * Verify a proof off-chain — replays OZ's sorted-pair climb (identical to the
 * on-chain MerkleProof.verify). Works for ANY leaf/proof/root (e.g. a tampered
 * leaf), independent of the tree instance.
 */
export function verifyProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  const computed = proof.reduce((acc, sibling) => nodeHash(acc, sibling), leaf);
  return computed.toLowerCase() === root.toLowerCase();
}

/** Generate a multiproof (proof + flags) for several leaves — OZ multiProofVerify. */
export function getMultiProof(
  leaves: string[],
  subset: string[]
): { leaves: string[]; proof: string[]; proofFlags: boolean[] } {
  const mp = buildTree(leaves).getMultiProof(subset);
  return {
    leaves: mp.leaves.map((l) => String(l)),
    proof: mp.proof.map((p) => String(p)),
    proofFlags: mp.proofFlags
  };
}
