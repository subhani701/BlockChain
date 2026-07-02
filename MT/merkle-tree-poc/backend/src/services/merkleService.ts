/**
 * backend/src/services/merkleService.ts
 * -----------------------------------------------------------------------------
 * Domain service combining the shared hashing/Merkle utilities with the batch
 * store. Routes call into here; this keeps HTTP concerns out of the cryptography.
 *
 * PERFORMANCE (Phase 4, Task 4.1): building a Merkle tree is O(n). Previously
 * each request rebuilt the tree several times (root + proof + steps + levels).
 * We now cache { leaves, tree, root } per batch in a WeakMap keyed by the
 * batch.products ARRAY reference. Because create/supersede always assign a NEW
 * products array, the cache auto-invalidates on change (the old array is GC'd)
 * with no manual bookkeeping and zero staleness risk.
 * -----------------------------------------------------------------------------
 */
import { SimpleMerkleTree } from "@openzeppelin/merkle-tree";
import { encodeProductForDisplay, hashProduct } from "../../../shared/hash";
import {
  buildTree,
  rootFromTree,
  proofFromTree,
  proofStepsFromTree,
  levelsFromTree,
  verifyProof
} from "../../../shared/merkle";
import type {
  Batch,
  HashedProduct,
  MerkleLevel,
  Product,
  ProofResult
} from "../../../shared/types";

interface MerkleData {
  leaves: string[];
  tree: SimpleMerkleTree;
  root: string;
}

/** Cache keyed by the products array reference (auto-invalidates on replacement). */
const cache = new WeakMap<Product[], MerkleData>();

/** Build (or reuse the cached) leaves + tree + root for a batch. */
function dataFor(batch: Batch): MerkleData {
  const key = batch.products;
  let data = cache.get(key);
  if (!data) {
    const leaves = batch.products.map(hashProduct);
    const tree = buildTree(leaves);
    data = { leaves, tree, root: rootFromTree(tree) };
    cache.set(key, data);
  }
  return data;
}

/** Test/inspection helper: the cached MerkleTree instance for a batch. */
export function _treeInstanceFor(batch: Batch): SimpleMerkleTree {
  return dataFor(batch).tree;
}

/** Leaf hashes for every product in a batch (order preserved, cached). */
export function leavesOf(batch: Batch): string[] {
  return dataFor(batch).leaves;
}

/** Attach encoded data + leaf hash to each product (for the UI table). */
export function hashedProducts(batch: Batch): HashedProduct[] {
  const { leaves } = dataFor(batch);
  return batch.products.map((p, i) => ({
    ...p,
    encoded: encodeProductForDisplay(p),
    leaf: leaves[i] // reuse cached leaves (avoid re-hashing)
  }));
}

/** Compute (and return) the Merkle root for a batch (cached). */
export function computeRoot(batch: Batch): string {
  return dataFor(batch).root;
}

/** Return every level of the tree for visualization (level 0 = leaves, cached). */
export function treeLevels(batch: Batch): MerkleLevel[] {
  return levelsFromTree(dataFor(batch).tree);
}

/** Locate a product within a batch by its (unique) serial number. */
export function findProduct(batch: Batch, serial: string): Product | undefined {
  return batch.products.find((p) => p.serial === serial);
}

/**
 * Build the full proof payload for a single product: leaf, proof, annotated
 * steps, and the root it should reconstruct to (all from the cached tree).
 */
export function buildProof(batch: Batch, product: Product): ProofResult {
  const { tree, root } = dataFor(batch);
  const leaf = hashProduct(product);
  return {
    product,
    encoded: encodeProductForDisplay(product),
    leaf,
    merkleRoot: root,
    proof: proofFromTree(tree, leaf),
    steps: proofStepsFromTree(tree, leaf)
  };
}

/**
 * Verify an arbitrary leaf against a batch off-chain. Used by the tampering
 * demo: pass a proof for the ORIGINAL product but a leaf from the TAMPERED
 * product and watch it fail.
 */
export function verifyAgainstBatch(
  batch: Batch,
  leaf: string,
  proof: string[]
): { valid: boolean; merkleRoot: string } {
  const root = dataFor(batch).root;
  return { valid: verifyProof(leaf, proof, root), merkleRoot: root };
}

/**
 * Generate proofs for EVERY product in a batch, served from the cached tree
 * (Phase 4.3). O(n log n) once; cheap on repeat calls thanks to the cache.
 */
export function allProofs(
  batch: Batch
): { serial: string; leaf: string; proof: string[] }[] {
  const { tree, leaves } = dataFor(batch);
  return batch.products.map((p, i) => ({
    serial: p.serial,
    leaf: leaves[i],
    proof: proofFromTree(tree, leaves[i])
  }));
}

/** Compute a leaf for arbitrary product data (used by the tamper endpoint). */
export function leafFor(product: Product): { leaf: string; encoded: string } {
  return {
    leaf: hashProduct(product),
    encoded: encodeProductForDisplay(product)
  };
}
