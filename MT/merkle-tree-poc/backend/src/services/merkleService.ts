/**
 * backend/src/services/merkleService.ts
 * -----------------------------------------------------------------------------
 * Domain service that combines the shared hashing/Merkle utilities with the
 * batch store. Routes call into here; this keeps HTTP concerns out of the
 * cryptography.
 * -----------------------------------------------------------------------------
 */
import {
  encodeProductForDisplay,
  hashProduct
} from "../../../shared/hash";
import {
  getLevels,
  getProof,
  getProofSteps,
  getRoot,
  verifyProof
} from "../../../shared/merkle";
import type {
  Batch,
  HashedProduct,
  MerkleLevel,
  Product,
  ProofResult
} from "../../../shared/types";

/** Compute leaf hashes for every product in a batch (order preserved). */
export function leavesOf(batch: Batch): string[] {
  return batch.products.map(hashProduct);
}

/** Attach encoded data + leaf hash to each product (for the UI table). */
export function hashedProducts(batch: Batch): HashedProduct[] {
  return batch.products.map((p) => ({
    ...p,
    encoded: encodeProductForDisplay(p),
    leaf: hashProduct(p)
  }));
}

/** Compute (and return) the Merkle root for a batch. */
export function computeRoot(batch: Batch): string {
  return getRoot(leavesOf(batch));
}

/** Return every level of the tree for visualization (level 0 = leaves). */
export function treeLevels(batch: Batch): MerkleLevel[] {
  return getLevels(leavesOf(batch));
}

/** Locate a product within a batch by its productId. */
export function findProduct(
  batch: Batch,
  productId: string
): Product | undefined {
  return batch.products.find((p) => p.productId === productId);
}

/**
 * Build the full proof payload for a single product: leaf, proof, annotated
 * steps, and the root it should reconstruct to.
 */
export function buildProof(batch: Batch, product: Product): ProofResult {
  const leaves = leavesOf(batch);
  const leaf = hashProduct(product);
  return {
    product,
    encoded: encodeProductForDisplay(product),
    leaf,
    merkleRoot: getRoot(leaves),
    proof: getProof(leaves, leaf),
    steps: getProofSteps(leaves, leaf)
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
  const root = getRoot(leavesOf(batch));
  return { valid: verifyProof(leaf, proof, root), merkleRoot: root };
}

/** Compute a leaf for arbitrary product data (used by the tamper endpoint). */
export function leafFor(product: Product): {
  leaf: string;
  encoded: string;
} {
  return {
    leaf: hashProduct(product),
    encoded: encodeProductForDisplay(product)
  };
}
