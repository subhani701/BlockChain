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

export const verifyRouter = Router();

/**
 * POST /verify
 * Body: { batchId: string, productId: string }
 *   OR  { batchId: string, leaf: string, proof: string[] }
 *
 * Looks up (or accepts) the leaf+proof and asks the smart contract whether the
 * leaf belongs to the batch's committed Merkle root. Returns VALID / INVALID
 * plus the transaction details (gas used, tx hash).
 */
verifyRouter.post("/", async (req: Request, res: Response) => {
  const { batchId, productId } = req.body ?? {};
  let { leaf, proof } = req.body ?? {};

  if (!batchId) {
    return res.status(400).json({ error: "batchId is required" });
  }

  // If a productId is given, derive leaf+proof from the stored batch.
  if (productId) {
    const batch = store.get(batchId);
    if (!batch) {
      return res.status(404).json({ error: `batch ${batchId} not found` });
    }
    const product = findProduct(batch, productId);
    if (!product) {
      return res
        .status(404)
        .json({ error: `product ${productId} not in batch ${batchId}` });
    }
    const built = buildProof(batch, product);
    leaf = built.leaf;
    proof = built.proof;
  }

  if (!leaf || !Array.isArray(proof)) {
    return res
      .status(400)
      .json({ error: "provide productId, or both leaf and proof[]" });
  }

  try {
    const result = await verifyProductOnChain(batchId, proof, leaf);
    return res.json({
      batchId,
      leaf,
      proof,
      result: result.valid ? "VALID" : "INVALID",
      valid: result.valid,
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
});

/**
 * POST /verify/offchain
 * Same inputs as /verify but checks the proof locally (no blockchain). Handy
 * for instant UI feedback and for environments without Ganache.
 */
verifyRouter.post("/offchain", (req: Request, res: Response) => {
  const { batchId, productId } = req.body ?? {};
  let { leaf, proof } = req.body ?? {};

  const batch = store.get(batchId);
  if (!batch) return res.status(404).json({ error: `batch ${batchId} not found` });

  if (productId) {
    const product = findProduct(batch, productId);
    if (!product) {
      return res
        .status(404)
        .json({ error: `product ${productId} not in batch ${batchId}` });
    }
    const built = buildProof(batch, product);
    leaf = built.leaf;
    proof = built.proof;
  }

  if (!leaf || !Array.isArray(proof)) {
    return res
      .status(400)
      .json({ error: "provide productId, or both leaf and proof[]" });
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
 * Body: { batchId, productId, field, newValue }
 *
 * Takes a genuine product, applies a tamper to one field (default
 * serialNumber), recomputes its leaf, and re-runs verification using the
 * ORIGINAL product's proof. The result MUST be INVALID — demonstrating that any
 * change avalanches the hash and breaks the Merkle path.
 */
verifyRouter.post("/tamper", async (req: Request, res: Response) => {
  const {
    batchId,
    productId,
    field = "serialNumber",
    newValue = "SN-TAMPERED-9999",
    onChain = false
  } = req.body ?? {};

  const batch = store.get(batchId);
  if (!batch) return res.status(404).json({ error: `batch ${batchId} not found` });

  const original = findProduct(batch, productId);
  if (!original) {
    return res
      .status(404)
      .json({ error: `product ${productId} not in batch ${batchId}` });
  }

  const allowed: (keyof Product)[] = [
    "productId",
    "serialNumber",
    "batchId",
    "manufactureDate"
  ];
  if (!allowed.includes(field)) {
    return res.status(400).json({ error: `field must be one of ${allowed.join(", ")}` });
  }

  // The genuine proof for the original product.
  const genuine = buildProof(batch, original);

  // Build the tampered product + its new leaf.
  const tampered: Product = { ...original, [field]: newValue } as Product;
  const tamperedLeaf = leafFor(tampered);

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
});

/** GET /chain/status -> blockchain connection + contract details (Part 7). */
verifyRouter.get("/chain/status", async (_req: Request, res: Response) => {
  return res.json(await chainStatus());
});
