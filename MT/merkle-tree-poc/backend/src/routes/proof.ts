/**
 * backend/src/routes/proof.ts
 * -----------------------------------------------------------------------------
 * Proof generation (Part 4):
 *   GET /proof/:productId?batchId=BATCH-001
 *
 * Returns the product, its leaf hash, the Merkle root, and the proof (both as
 * raw sibling hashes and annotated with left/right positions for the UI).
 *
 * If batchId is omitted we search every stored batch for the productId.
 * -----------------------------------------------------------------------------
 */
import { Router, Request, Response } from "express";
import { store } from "../services/store";
import { buildProof, findProduct } from "../services/merkleService";
import type { Batch } from "../../../shared/types";

export const proofRouter = Router();

proofRouter.get("/:productId", (req: Request, res: Response) => {
  const { productId } = req.params;
  const batchId = req.query.batchId as string | undefined;

  let batch: Batch | undefined;
  if (batchId) {
    batch = store.get(batchId);
    if (!batch) {
      return res.status(404).json({ error: `batch ${batchId} not found` });
    }
  } else {
    // Search all batches for the product.
    batch = store.list().find((b) => findProduct(b, productId));
    if (!batch) {
      return res
        .status(404)
        .json({ error: `product ${productId} not found in any batch` });
    }
  }

  const product = findProduct(batch, productId);
  if (!product) {
    return res
      .status(404)
      .json({ error: `product ${productId} not found in batch ${batch.batchId}` });
  }

  const result = buildProof(batch, product);
  return res.json({
    batchId: batch.batchId,
    ...result
  });
});
