/**
 * backend/src/services/scanVerify.ts
 * -----------------------------------------------------------------------------
 * The integration seam with VoltusWave's `scanServiceRequest()`.
 *
 * It evaluates the checks this module can actually answer and returns them as
 * NAMED BOOLEANS with project.md's weights, plus a weighted score and an
 * attribution list. The app layer combines these with its own business checks
 * (dealer_authorized, custody_continuous, region_consistent) to reach a final
 * weighted verdict.
 *
 * TRUST MODEL (same as the field verifier):
 *   The scanned bundle is attacker-controlled. We recompute the leaf from the
 *   product fields and climb the proof ourselves, then compare the result to the
 *   root READ FROM THE CHAIN. Nothing the bundle claims about `leaf`/`root`/
 *   `contract` is trusted.
 *
 * VERDICT POLICY (deliberately conservative, and documented):
 *   - chain unreachable                              -> CANNOT_VERIFY (never a silent pass)
 *   - batch not anchored on-chain                    -> COUNTERFEIT
 *   - recomputed root != on-chain root               -> COUNTERFEIT
 *   - otherwise                                      -> AUTHENTIC
 *   `batch_active` and `qr_not_replayed` do NOT flip the verdict here — they are
 *   reported as failed checks + warnings and they lower the score, because the
 *   app's weighted machinery makes the final call. This keeps the layering clean:
 *   we supply evidence, the app decides.
 * -----------------------------------------------------------------------------
 */
import { hashProduct } from "../../../shared/hash";
import { computeRootFromProof } from "../../../shared/merkle";
import { normalizeProduct } from "../../../shared/validate";
import type { Product } from "../../../shared/types";
import { getBatchOnChain, getBatchStatusOnChain } from "./blockchain";
import { evaluateReplay, record, summaryFor } from "./scanLedger";

/** project.md's VerificationResult union. */
export type VerificationResult =
  | "AUTHENTIC"
  | "COUNTERFEIT"
  | "CANNOT_VERIFY"
  | "NOT_YET_SCANNED";

/** project.md's 7 weighted checks. */
export const CHECK_WEIGHTS = {
  merkle_proof_valid: 0.2,
  root_anchored_on_chain: 0.15,
  batch_active: 0.1,
  dealer_authorized: 0.2,
  custody_continuous: 0.15,
  qr_not_replayed: 0.1,
  region_consistent: 0.1
} as const;

export type CheckName = keyof typeof CHECK_WEIGHTS;

/** The checks THIS module can answer (0.55 of the total weight). */
const EVALUATED: CheckName[] = [
  "merkle_proof_valid",
  "root_anchored_on_chain",
  "batch_active",
  "qr_not_replayed"
];

/** The checks the APP must answer (0.45). */
const NOT_EVALUATED: Record<string, string> = {
  dealer_authorized: "requires the dealer DID / authorization registry",
  custody_continuous: "requires the custody chain for this serial",
  region_consistent: "requires the scan region vs the expected distribution region"
};

export interface CheckOutcome {
  check: CheckName;
  passed: boolean;
  weight: number;
  detail: string;
}

export interface ScanInput {
  batchId: string;
  product: Product;
  proof: string[];
  /** Optional scan context — enables the replay (cloned-QR) signal. */
  location?: string;
  scannerId?: string;
}

export interface ScanVerdict {
  result: VerificationResult;
  /** Sum of the weights of the checks that PASSED (out of 1.00). */
  score: number;
  /** Total weight of the checks we could evaluate (0.55). */
  evaluatedWeight: number;
  /** score / evaluatedWeight — how well it did on what we could measure. */
  confidence: number;
  checks: Record<string, { passed: boolean; weight: number; detail: string }>;
  /** Every evaluated check, failures first — the app's `attribution[]`. */
  attribution: CheckOutcome[];
  notEvaluated: { check: string; weight: number; reason: string }[];
  warnings: string[];
  computed: { leaf: string; root: string };
  onChain?: { merkleRoot: string; status: number; version: number };
  scan?: {
    serial: string;
    scanCount: number;
    firstSeen: string;
    lastSeen: string;
    locations: string[];
  } | null;
}

function buildVerdict(
  result: VerificationResult,
  outcomes: CheckOutcome[],
  computed: { leaf: string; root: string },
  extras: Partial<ScanVerdict> = {}
): ScanVerdict {
  const checks: ScanVerdict["checks"] = {};
  for (const o of outcomes) {
    checks[o.check] = { passed: o.passed, weight: o.weight, detail: o.detail };
  }
  const evaluatedWeight = outcomes.reduce((s, o) => s + o.weight, 0);
  const score = outcomes.filter((o) => o.passed).reduce((s, o) => s + o.weight, 0);

  return {
    result,
    score: Number(score.toFixed(4)),
    evaluatedWeight: Number(evaluatedWeight.toFixed(4)),
    confidence: evaluatedWeight
      ? Number((score / evaluatedWeight).toFixed(4))
      : 0,
    checks,
    // failures first — that's what an attribution list is for
    attribution: [...outcomes].sort((a, b) => Number(a.passed) - Number(b.passed)),
    notEvaluated: Object.entries(NOT_EVALUATED).map(([check, reason]) => ({
      check,
      weight: CHECK_WEIGHTS[check as CheckName],
      reason
    })),
    warnings: [],
    computed,
    ...extras
  };
}

/**
 * Verify one scanned part and record the scan.
 * `input.product` + `input.proof` come from the QR; everything trusted is read
 * from the chain.
 */
/** A single named check with its verdict-relevant detail. */
export interface AuthCheck {
  passed: boolean;
  detail: string;
}

/**
 * The pure, gas-free authenticity check — the ONE model both verify surfaces use:
 *   recompute the leaf from the product, climb the proof, and compare the result
 *   to the batch root READ FROM THE CHAIN (a free `view` read — no tx, no gas).
 *
 * No ledger write, no replay signal (that lives in verifyScan). Deterministic and
 * side-effect free, so it's safe for the operator "Verify" button on every click.
 *
 * Verdict: chain unreachable -> CANNOT_VERIFY; not anchored OR root mismatch ->
 * COUNTERFEIT; else AUTHENTIC. (batch_active does NOT flip the verdict — a genuine
 * part from a recalled batch is still AUTHENTIC, with a warning.)
 */
export async function verifyAuthenticity(
  batchId: string,
  rawProduct: Product,
  proof: string[]
): Promise<{
  result: VerificationResult;
  checks: {
    merkle_proof_valid: AuthCheck;
    root_anchored_on_chain: AuthCheck;
    batch_active: AuthCheck;
  };
  computed: { leaf: string; root: string };
  onChain?: { merkleRoot: string; status: number; version: number };
  warnings: string[];
}> {
  const product = normalizeProduct(rawProduct);
  const leaf = hashProduct(product);
  const root = computeRootFromProof(leaf, proof);
  const computed = { leaf, root };

  let onChain: { merkleRoot: string; status: number; version: number } | undefined;
  let chainUnreachable = false;
  let notRegistered = false;
  try {
    const [batch, status] = await Promise.all([
      getBatchOnChain(batchId),
      getBatchStatusOnChain(batchId)
    ]);
    onChain = { merkleRoot: batch.merkleRoot, status, version: batch.version };
  } catch (err) {
    if (/unknown batch/i.test((err as Error).message ?? "")) notRegistered = true;
    else chainUnreachable = true;
  }

  const rootAnchored = !notRegistered && !!onChain;
  const merkleValid =
    rootAnchored && root.toLowerCase() === onChain!.merkleRoot.toLowerCase();
  const batchActive = rootAnchored && onChain!.status === 0;
  const statusName = onChain ? ["Active", "Recalled", "Revoked"][onChain.status] : "";

  const result: VerificationResult = chainUnreachable
    ? "CANNOT_VERIFY"
    : !rootAnchored || !merkleValid
      ? "COUNTERFEIT"
      : "AUTHENTIC";

  const warnings: string[] = [];
  if (chainUnreachable)
    warnings.push(
      "The blockchain could not be reached, so authenticity could not be established."
    );
  if (result === "AUTHENTIC" && !batchActive)
    warnings.push(`Part is genuine, but the batch is ${statusName} — do not use.`);

  return {
    result,
    checks: {
      merkle_proof_valid: {
        passed: merkleValid,
        detail: chainUnreachable
          ? "Chain unreachable."
          : rootAnchored
            ? merkleValid
              ? "The proof reconstructs the batch root anchored on-chain."
              : "The proof does NOT reconstruct the on-chain root — forged or tampered."
            : "No root is anchored on-chain for this batch."
      },
      root_anchored_on_chain: {
        passed: rootAnchored,
        detail: chainUnreachable
          ? "Chain unreachable."
          : rootAnchored
            ? `Anchored on-chain (version ${onChain!.version}).`
            : "This batch was never registered on-chain."
      },
      batch_active: {
        passed: batchActive,
        detail: chainUnreachable
          ? "Chain unreachable."
          : !rootAnchored
            ? "Batch is not on-chain."
            : batchActive
              ? "Batch is Active on-chain."
              : `Batch is ${statusName} on-chain.`
      }
    },
    computed,
    onChain,
    warnings
  };
}

export async function verifyScan(input: ScanInput): Promise<ScanVerdict> {
  // Normalize before hashing (same canonical form as the minting side).
  const product = normalizeProduct(input.product);
  const leaf = hashProduct(product);
  const computedRoot = computeRootFromProof(leaf, input.proof);
  const computed = { leaf, root: computedRoot };

  // --- read the authoritative root + status from the chain -------------------
  let onChain: { merkleRoot: string; status: number; version: number } | undefined;
  let chainUnreachable = false;
  let notRegistered = false;

  try {
    const [batch, status] = await Promise.all([
      getBatchOnChain(input.batchId),
      getBatchStatusOnChain(input.batchId)
    ]);
    onChain = {
      merkleRoot: batch.merkleRoot,
      status,
      version: batch.version
    };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unknown batch/i.test(msg)) notRegistered = true;
    else chainUnreachable = true;
  }

  // Chain unreachable → we cannot make ANY claim. Never a silent pass.
  if (chainUnreachable) {
    const verdict = buildVerdict("CANNOT_VERIFY", [], computed, {
      scan: summaryFor(product.serial)
    });
    verdict.warnings.push(
      "The blockchain could not be reached, so authenticity could not be established."
    );
    return verdict;
  }

  // --- the replay signal (evaluate BEFORE recording this scan) ---------------
  const replay = evaluateReplay(product.serial, input.location);

  // --- assemble the checks ---------------------------------------------------
  const rootAnchored = !notRegistered && !!onChain;
  const merkleValid =
    rootAnchored &&
    computedRoot.toLowerCase() === onChain!.merkleRoot.toLowerCase();
  const batchActive = rootAnchored && onChain!.status === 0;

  const outcomes: CheckOutcome[] = [
    {
      check: "merkle_proof_valid",
      passed: merkleValid,
      weight: CHECK_WEIGHTS.merkle_proof_valid,
      detail: rootAnchored
        ? merkleValid
          ? "The proof reconstructs the batch root anchored on-chain."
          : "The proof does NOT reconstruct the on-chain root — the part data or proof is forged."
        : "Cannot evaluate: no root is anchored on-chain for this batch."
    },
    {
      check: "root_anchored_on_chain",
      passed: rootAnchored,
      weight: CHECK_WEIGHTS.root_anchored_on_chain,
      detail: rootAnchored
        ? `Batch root is anchored on-chain (version ${onChain!.version}).`
        : "This batch was never registered on-chain."
    },
    {
      check: "batch_active",
      passed: batchActive,
      weight: CHECK_WEIGHTS.batch_active,
      detail: !rootAnchored
        ? "Cannot evaluate: batch is not on-chain."
        : batchActive
          ? "Batch is Active on-chain."
          : `Batch is ${["Active", "Recalled", "Revoked"][onChain!.status]} on-chain.`
    },
    {
      check: "qr_not_replayed",
      passed: replay.passed,
      weight: CHECK_WEIGHTS.qr_not_replayed,
      detail: replay.detail
    }
  ];

  // --- verdict (see policy in the header) ------------------------------------
  const result: VerificationResult =
    !rootAnchored || !merkleValid ? "COUNTERFEIT" : "AUTHENTIC";

  const verdict = buildVerdict(result, outcomes, computed, { onChain });

  if (result === "AUTHENTIC" && !batchActive) {
    verdict.warnings.push(
      `Part is genuine, but the batch is ${["Active", "Recalled", "Revoked"][onChain!.status]} — do not use.`
    );
  }
  if (!replay.passed) {
    verdict.warnings.push(
      "Replay suspected: this serial has been scanned in a different location. The QR may be cloned."
    );
  }

  // Record the scan AFTER evaluating replay, so it isn't its own prior.
  record({
    serial: product.serial,
    at: new Date().toISOString(),
    location: input.location,
    scannerId: input.scannerId
  });
  verdict.scan = summaryFor(product.serial);

  return verdict;
}
