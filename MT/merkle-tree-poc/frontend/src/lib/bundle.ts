/**
 * frontend/src/lib/bundle.ts
 * -----------------------------------------------------------------------------
 * Verification bundle = everything a QR needs to make a product verifiable
 * OFFLINE against the on-chain root. The `verifyBundleOffline` function
 * recomputes the leaf and climbs the proof entirely in the browser (no backend),
 * using the exact same math as shared/hash.ts + shared/merkle.ts:
 *   leaf   = keccak256(keccak256(abi.encode(4×string, [serial,sku,batch_id,manufactured_at])))
 *   parent = keccak256(sort(a,b)[0] ++ sort(a,b)[1])   (OZ commutative node hash)
 * -----------------------------------------------------------------------------
 */
import { keccak256, AbiCoder, concat } from "ethers";
import type { Product, ProofResponse } from "@/api/client";

export interface VerificationBundle {
  v: 1;
  leafSpec: string;
  batchId: string;
  contract: string | null;
  root: string;
  product: Product;
  leaf: string;
  proof: string[];
}

const ENC = ["string", "string", "string", "string"];
const abi = AbiCoder.defaultAbiCoder();

/** OZ StandardMerkleTree leaf for a product (matches the backend byte-for-byte). */
export function leafOf(p: Product): string {
  const inner = keccak256(
    abi.encode(ENC, [p.serial, p.sku, p.batch_id, p.manufactured_at])
  );
  return keccak256(inner);
}

/** OZ commutative node hash: keccak256 of the sorted concatenation. */
function nodeHash(a: string, b: string): string {
  const [lo, hi] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(concat([lo, hi]));
}

/** Build a compact bundle from a proof response (for QR encoding). */
export function makeBundle(proof: ProofResponse): VerificationBundle {
  return {
    v: 1,
    leafSpec: proof.leafSpec ?? "unknown",
    batchId: proof.batchId,
    contract: proof.contract ?? null,
    root: proof.merkleRoot,
    product: proof.product,
    leaf: proof.leaf,
    proof: proof.proof
  };
}

export interface OfflineResult {
  valid: boolean;
  leafOk: boolean;
  rootOk: boolean;
  computedLeaf: string;
  computedRoot: string;
}

/**
 * Fully OFFLINE verification (no backend, no chain): recompute the leaf from the
 * product fields, climb the proof, and check both the leaf and the reconstructed
 * root match what the bundle claims.
 */
export function verifyBundleOffline(b: VerificationBundle): OfflineResult {
  const computedLeaf = leafOf(b.product);
  const leafOk = computedLeaf.toLowerCase() === b.leaf.toLowerCase();
  const computedRoot = b.proof.reduce(
    (acc, sib) => nodeHash(acc, sib),
    computedLeaf
  );
  const rootOk = computedRoot.toLowerCase() === b.root.toLowerCase();
  return { valid: leafOk && rootOk, leafOk, rootOk, computedLeaf, computedRoot };
}
