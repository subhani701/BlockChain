/**
 * backend/src/routes/verify.ts
 * -----------------------------------------------------------------------------
 * Verification + tampering endpoints (Parts 9 page 3 & Part 10):
 *
 *   POST /verify        -> verify a product on-chain via the smart contract
 *   POST /verify/offchain -> verify off-chain (instant, no gas) for comparison
 *   POST /tamper        -> recompute a leaf from MODIFIED product data and show
 *                          that the original proof no longer verifies
 *   GET  /chain/status  -> connection + contract info
 * -----------------------------------------------------------------------------
 */
import { Router, Request, Response } from "express";
import { store } from "../services/store";
import {
  buildProof,
  findProduct,
  leafFor,
  verifyAgainstBatch
} from "../services/merkleService";
import { chainStatus, verifyProductOnChain } from "../services/blockchain";
import type { Product } from "../../../shared/types";
import { ProductValidationError } from "../../../shared/validate";
import { verifyScan, verifyAuthenticity } from "../services/scanVerify";
import { requireApiKey } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { verifySchema, tamperSchema, scanSchema } from "../schemas";

export const verifyRouter = Router();

/**
 * POST /verify/authenticity — THE single verification the UI uses.
 *
 * Body: { batchId, serial }  (derive product + proof from the stored batch)
 *   or: { batchId, product, proof }  (verify a supplied bundle)
 *
 * Recomputes the leaf, climbs the proof, and compares to the batch root READ FROM
 * THE CHAIN via a free `view` read — NO gas, NO transaction. Returns a 3-state
 * verdict (AUTHENTIC / COUNTERFEIT / CANNOT_VERIFY) with named checks. Read-only,
 * so it needs no API key and writes nothing.
 */
verifyRouter.post(
  "/authenticity",
  asyncHandler(async (req: Request, res: Response) => {
    const { batchId, serial, product, proof } = req.body ?? {};
    if (!batchId) return res.status(400).json({ error: "batchId is required" });

    let p = product as Product | undefined;
    let pr = proof as string[] | undefined;

    if (!p || !Array.isArray(pr)) {
      if (!serial) {
        return res
          .status(400)
          .json({ error: "provide serial, or both product and proof[]" });
      }
      const batch = store.get(batchId);
      if (!batch) {
        return res.status(404).json({ error: `batch ${batchId} not found` });
      }
      const found = findProduct(batch, serial);
      if (!found) {
        return res
          .status(404)
          .json({ error: `product ${serial} not in batch ${batchId}` });
      }
      const built = buildProof(batch, found);
      p = found;
      pr = built.proof;
    }

    const verdict = await verifyAuthenticity(batchId, p, pr);
    return res.json(verdict);
  })
);

/**
 * POST /verify/scan  — THE INTEGRATION SEAM for VoltusWave's scanServiceRequest().
 *
 * Body: { bundle: {batchId, product, proof} }   (the scanned QR — field path)
 *   or: { batchId, serial }                     (derive from the stored batch)
 *   plus optional { location, scannerId } for replay (cloned-QR) detection.
 *
 * Returns project.md-shaped output: the checks THIS module can answer as NAMED
 * booleans with their weights, a weighted score, an attribution list, the checks
 * we cannot answer (for the app to fill in), plus warnings.
 *
 * The batch root is always read FROM THE CHAIN — never from the scanned bundle.
 *
 * PROTECTED: this endpoint APPENDS to the scan ledger. Left open, an attacker
 * could poison the replay signal (spam a serial from many "locations" so that
 * genuine scans then fail qr_not_replayed). Field scanners must be authenticated.
 */
verifyRouter.post(
  "/scan",
  requireApiKey,
  validateBody(scanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { bundle, batchId, serial, location, scannerId } = req.body ?? {};

    let input;
    if (bundle) {
      input = {
        batchId: bundle.batchId,
        product: bundle.product as Product,
        proof: bundle.proof as string[],
        location,
        scannerId
      };
    } else {
      const batch = store.get(batchId);
      if (!batch) {
        return res.status(404).json({ error: `batch ${batchId} not found` });
      }
      const product = findProduct(batch, serial);
      if (!product) {
        return res
          .status(404)
          .json({ error: `product ${serial} not in batch ${batchId}` });
      }
      const built = buildProof(batch, product);
      input = { batchId, product, proof: built.proof, location, scannerId };
    }

    const verdict = await verifyScan(input);
    return res.json(verdict);
  })
);

/**
 * POST /verify
 * Body: { batchId: string, serial: string }
 *   OR  { batchId: string, leaf: string, proof: string[] }
 *
 * Looks up (or accepts) the leaf+proof and asks the smart contract whether the
 * leaf belongs to the batch's committed Merkle root. Returns VALID / INVALID
 * plus the transaction details (gas used, tx hash).
 */
verifyRouter.post("/", requireApiKey, validateBody(verifySchema), asyncHandler(async (req: Request, res: Response) => {
  const { batchId, serial } = req.body ?? {};
  let { leaf, proof } = req.body ?? {};

  if (!batchId) {
    return res.status(400).json({ error: "batchId is required" });
  }

  let merkleRoot: string | undefined;

  // If a serial is given, derive leaf+proof from the stored batch.
  if (serial) {
    const batch = store.get(batchId);
    if (!batch) {
      return res.status(404).json({ error: `batch ${batchId} not found` });
    }
    const product = findProduct(batch, serial);
    if (!product) {
      return res
        .status(404)
        .json({ error: `product ${serial} not in batch ${batchId}` });
    }
    const built = buildProof(batch, product);
    leaf = built.leaf;
    proof = built.proof;
    merkleRoot = built.merkleRoot;
  }

  if (!leaf || !Array.isArray(proof)) {
    return res
      .status(400)
      .json({ error: "provide serial, or both leaf and proof[]" });
  }

  try {
    const result = await verifyProductOnChain(batchId, proof, leaf);
    return res.json({
      batchId,
      leaf,
      proof,
      result: result.valid ? "VALID" : "INVALID",
      valid: result.valid,
      merkleRoot,
      onChain: {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed
      }
    });
  } catch (err) {
    return res.status(502).json({
      error: "on-chain verification failed",
      detail: (err as Error).message
    });
  }
}));

/**
 * POST /verify/offchain
 * Same inputs as /verify but checks the proof locally (no blockchain). Handy
 * for instant UI feedback and for environments without Ganache.
 */
verifyRouter.post("/offchain", validateBody(verifySchema), (req: Request, res: Response) => {
  const { batchId, serial } = req.body ?? {};
  let { leaf, proof } = req.body ?? {};

  const batch = store.get(batchId);
  if (!batch) return res.status(404).json({ error: `batch ${batchId} not found` });

  if (serial) {
    const product = findProduct(batch, serial);
    if (!product) {
      return res
        .status(404)
        .json({ error: `product ${serial} not in batch ${batchId}` });
    }
    const built = buildProof(batch, product);
    leaf = built.leaf;
    proof = built.proof;
  }

  if (!leaf || !Array.isArray(proof)) {
    return res
      .status(400)
      .json({ error: "provide serial, or both leaf and proof[]" });
  }

  const { valid, merkleRoot } = verifyAgainstBatch(batch, leaf, proof);
  return res.json({
    batchId,
    leaf,
    proof,
    merkleRoot,
    result: valid ? "VALID" : "INVALID",
    valid
  });
});

/**
 * POST /tamper  (Part 10 — Tampering Demo)
 * Body: { batchId, serial, field, newValue }
 *
 * Takes a genuine product, applies a tamper to one field (default serial),
 * recomputes its leaf, and re-runs verification using the ORIGINAL product's
 * proof. The result MUST be INVALID — demonstrating that any change avalanches
 * the hash and breaks the Merkle path.
 */
verifyRouter.post("/tamper", requireApiKey, validateBody(tamperSchema), asyncHandler(async (req: Request, res: Response) => {
  const {
    batchId,
    serial,
    field = "serial",
    newValue = "SN-COUNTERFEIT-0001",
    onChain = false
  } = req.body ?? {};

  const batch = store.get(batchId);
  if (!batch) return res.status(404).json({ error: `batch ${batchId} not found` });

  const original = findProduct(batch, serial);
  if (!original) {
    return res
      .status(404)
      .json({ error: `product ${serial} not in batch ${batchId}` });
  }

  const allowed: (keyof Product)[] = [
    "serial",
    "sku",
    "batch_id",
    "manufactured_at"
  ];
  if (!allowed.includes(field)) {
    return res.status(400).json({ error: `field must be one of ${allowed.join(", ")}` });
  }

  // The genuine proof for the original product.
  const genuine = buildProof(batch, original);

  // Build the tampered product + its new leaf.
  const tampered: Product = { ...original, [field]: newValue } as Product;

  // Tampering can produce STRUCTURALLY INVALID data (e.g. a non-date
  // manufactured_at). Production-correct behavior is to reject it before
  // hashing — such a product cannot belong to any batch — rather than 500.
  let tamperedLeaf: { leaf: string; encoded: string };
  try {
    tamperedLeaf = leafFor(tampered);
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return res.json({
        batchId,
        field,
        original: {
          product: original,
          encoded: genuine.encoded,
          leaf: genuine.leaf
        },
        tampered: {
          product: tampered,
          encoded: null,
          leaf: null,
          rejected: err.message
        },
        proofUsed: genuine.proof,
        merkleRoot: genuine.merkleRoot,
        offchainResult: "INVALID",
        explanation:
          `The tampered product is structurally invalid (${err.message}), so it is ` +
          `rejected at validation before hashing — it cannot belong to any batch.`
      });
    }
    throw err;
  }

  // Verify the TAMPERED leaf using the ORIGINAL proof.
  const offchain = verifyAgainstBatch(
    batch,
    tamperedLeaf.leaf,
    genuine.proof
  );

  const response: Record<string, unknown> = {
    batchId,
    field,
    original: {
      product: original,
      encoded: genuine.encoded,
      leaf: genuine.leaf
    },
    tampered: {
      product: tampered,
      encoded: tamperedLeaf.encoded,
      leaf: tamperedLeaf.leaf
    },
    proofUsed: genuine.proof,
    merkleRoot: offchain.merkleRoot,
    offchainResult: offchain.valid ? "VALID" : "INVALID",
    explanation:
      "Changing any field produces a completely different keccak256 leaf. " +
      "The original proof can no longer reconstruct the stored Merkle root, " +
      "so verification fails — proving the product data was altered."
  };

  // Optionally prove it on-chain too.
  if (onChain) {
    try {
      const chain = await verifyProductOnChain(
        batchId,
        genuine.proof,
        tamperedLeaf.leaf
      );
      response.onchainResult = chain.valid ? "VALID" : "INVALID";
      response.onChain = {
        txHash: chain.txHash,
        blockNumber: chain.blockNumber,
        gasUsed: chain.gasUsed
      };
    } catch (err) {
      response.onChainError = (err as Error).message;
    }
  }

  return res.json(response);
}));

/** GET /chain/status -> blockchain connection + contract details (Part 7). */
verifyRouter.get("/chain/status", async (_req: Request, res: Response) => {
  return res.json(await chainStatus());
});
