/**
 * frontend/src/lib/bundle.ts
 * -----------------------------------------------------------------------------
 * Verification bundle = what a product's QR carries.
 *
 * ⚠️ SECURITY MODEL — read before changing anything here.
 *
 * A counterfeiter controls everything printed in the QR. So the bundle carries
 * ONLY the minimum evidence, and NOTHING that would be trusted:
 *   - product  : the fields, so the verifier can recompute the leaf itself
 *   - proof    : the sibling hashes, to climb to a root
 *   - batchId  : which batch to look up ON-CHAIN
 *   - leafSpec : the leaf-format version (reject a wrong-version leaf)
 *
 * It deliberately does NOT carry the leaf, the root, or the contract address:
 *   - the leaf is recomputed from `product` (never trusted from the QR),
 *   - the root is READ FROM THE CHAIN (never taken from the QR),
 *   - the trusted contract comes from the verifier's OWN config (lib/chain.ts).
 * Omitting them keeps the QR small (more scannable) and leaks nothing about the
 * registry.
 *
 * Math mirrors shared/hash.ts + shared/merkle.ts exactly:
 *   leaf   = keccak256(keccak256(abi.encode(4×string, [serial,sku,batch_id,manufactured_at])))
 *   parent = keccak256(sort(a,b)[0] ++ sort(a,b)[1])      (OZ commutative node hash)
 * -----------------------------------------------------------------------------
 */
import { keccak256, AbiCoder, concat } from "ethers";
import type { Product, ProofResponse } from "@/api/client";

export interface VerificationBundle {
  v: 1;
  leafSpec: string;
  batchId: string;
  product: Product;
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

/** Build the compact (production) bundle from a proof response. */
export function makeBundle(proof: ProofResponse): VerificationBundle {
  return {
    v: 1,
    leafSpec: proof.leafSpec ?? "unknown",
    batchId: proof.batchId,
    product: proof.product,
    proof: proof.proof
  };
}

export interface Recomputed {
  /** Leaf derived from the product fields alone. */
  computedLeaf: string;
  /** Root derived by climbing the proof from that leaf. */
  computedRoot: string;
}

/**
 * Derive the leaf and root from ONLY the product + proof — nothing the bundle
 * could have claimed about the leaf or root.
 */
export function recomputeFromBundle(b: VerificationBundle): Recomputed {
  const computedLeaf = leafOf(b.product);
  const computedRoot = b.proof.reduce(
    (acc, sibling) => nodeHash(acc, sibling),
    computedLeaf
  );
  return { computedLeaf, computedRoot };
}

export interface AuthenticityResult extends Recomputed {
  /** TRUE only if the recomputed root equals the trusted (on-chain) root. */
  valid: boolean;
}

/**
 * THE authenticity check. `trustedRoot` MUST have been read from the blockchain
 * (see lib/chain.ts) — never taken from the bundle.
 */
export function verifyAgainstTrustedRoot(
  b: VerificationBundle,
  trustedRoot: string
): AuthenticityResult {
  const { computedLeaf, computedRoot } = recomputeFromBundle(b);
  return {
    computedLeaf,
    computedRoot,
    valid: computedRoot.toLowerCase() === trustedRoot.toLowerCase()
  };
}
