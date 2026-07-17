/**
 * verify.ts — the REAL authenticity check, on-device.
 *
 * Mirrors the PoC exactly (shared/hash.ts + shared/merkle.ts + frontend/lib/bundle.ts):
 *   leaf   = keccak256(keccak256(abi.encode(4×string, [serial,sku,batch_id,manufactured_at])))
 *   parent = keccak256( sort(a,b)[0] ++ sort(a,b)[1] )        (OZ commutative node hash)
 *
 * SECURITY MODEL: the QR carries EVIDENCE only (product + proof + batchId). The
 * app recomputes the leaf/root itself and compares against the ON-CHAIN root read
 * from the MT backend — it NEVER trusts a root printed in the QR.
 */
import { keccak256, AbiCoder, concat } from "ethers";
import { BACKEND_URL } from "./config";

export interface Product {
  serial: string;
  sku: string;
  batch_id: string;
  manufactured_at: string;
}

/** What a product's QR encodes. */
export interface VerificationBundle {
  v: number;
  leafSpec?: string;
  batchId: string;
  product: Product;
  proof: string[];
}

const ENC = ["string", "string", "string", "string"];
const abi = AbiCoder.defaultAbiCoder();

/** OZ StandardMerkleTree leaf (double-hashed) — byte-identical to the backend. */
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

/** Derive the leaf + the root the proof climbs to, from the bundle alone. */
export function recompute(b: VerificationBundle): {
  computedLeaf: string;
  computedRoot: string;
} {
  const computedLeaf = leafOf(b.product);
  const computedRoot = b.proof.reduce(
    (acc, sibling) => nodeHash(acc, sibling),
    computedLeaf
  );
  return { computedLeaf, computedRoot };
}

/** Parse a scanned string into a bundle, or throw a friendly error. */
export function parseBundle(text: string): VerificationBundle {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("This QR is not a TrustMark code");
  }
  const b = obj as Partial<VerificationBundle>;
  if (
    !b ||
    typeof b.batchId !== "string" ||
    !b.product ||
    !Array.isArray(b.proof)
  ) {
    throw new Error("This QR is not a TrustMark code");
  }
  return b as VerificationBundle;
}

export type Verdict = "AUTHENTIC" | "COUNTERFEIT" | "CANNOT_VERIFY";

const STATUS_LABELS = ["Active", "Recalled", "Revoked"] as const;

export interface OnChain {
  merkleRoot: string;
  status: number; // 0 Active | 1 Recalled | 2 Revoked
  statusLabel: string;
  totalProducts?: number;
  version?: number;
}

export interface VerifyResult {
  verdict: Verdict;
  reason: string;
  flagged: boolean; // authentic but Recalled/Revoked
  warnings: string[];
  computed: { leaf: string; root: string };
  onChain: OnChain | null;
  batchId: string;
  product: Product;
}

type ChainRead =
  | { ok: "found"; data: OnChain }
  | { ok: "not_found" }
  | { ok: "unreachable"; detail: string };

/** Read the authoritative on-chain root/status from the MT backend. */
async function fetchOnChain(batchId: string): Promise<ChainRead> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/batch/${encodeURIComponent(batchId)}/onchain`
    );
    if (res.status === 404) return { ok: "not_found" };
    if (!res.ok) return { ok: "unreachable", detail: `HTTP ${res.status}` };
    const j = (await res.json()) as {
      merkleRoot: string;
      status?: number;
      totalProducts?: number;
      version?: number;
    };
    const status = typeof j.status === "number" ? j.status : 0;
    return {
      ok: "found",
      data: {
        merkleRoot: j.merkleRoot,
        status,
        statusLabel: STATUS_LABELS[status] ?? "Unknown",
        totalProducts: j.totalProducts,
        version: j.version,
      },
    };
  } catch (e) {
    return { ok: "unreachable", detail: (e as Error)?.message ?? "network error" };
  }
}

/**
 * THE verdict. Compare the locally-recomputed root to the on-chain root.
 *  - batch not on chain            => COUNTERFEIT
 *  - chain unreachable             => CANNOT_VERIFY  (never a silent pass)
 *  - roots differ                  => COUNTERFEIT
 *  - roots match, batch Active     => AUTHENTIC
 *  - roots match, Recalled/Revoked => AUTHENTIC (flagged "do not use")
 */
export async function verifyBundle(
  bundle: VerificationBundle
): Promise<VerifyResult> {
  const { computedLeaf, computedRoot } = recompute(bundle);
  const base = {
    computed: { leaf: computedLeaf, root: computedRoot },
    batchId: bundle.batchId,
    product: bundle.product,
  };

  const chain = await fetchOnChain(bundle.batchId);

  if (chain.ok === "not_found") {
    return {
      ...base,
      verdict: "COUNTERFEIT",
      reason: "Batch is not registered on-chain",
      flagged: false,
      warnings: [],
      onChain: null,
    };
  }
  if (chain.ok === "unreachable") {
    return {
      ...base,
      verdict: "CANNOT_VERIFY",
      reason: "Could not reach the chain — try again when online",
      flagged: false,
      warnings: [],
      onChain: null,
    };
  }

  const onChain = chain.data;
  const match =
    computedRoot.toLowerCase() === onChain.merkleRoot.toLowerCase();

  if (!match) {
    return {
      ...base,
      verdict: "COUNTERFEIT",
      reason: "Proof does not match the on-chain root — data was altered",
      flagged: false,
      warnings: [],
      onChain,
    };
  }

  const flagged = onChain.status !== 0;
  return {
    ...base,
    verdict: "AUTHENTIC",
    reason: flagged
      ? `Authentic, but batch is ${onChain.statusLabel}`
      : "Verified against the on-chain root",
    flagged,
    warnings: flagged ? [`Batch is ${onChain.statusLabel} — do not use`] : [],
    onChain,
  };
}
