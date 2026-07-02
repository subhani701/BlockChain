/**
 * backend/src/routes/proof.ts
 * -----------------------------------------------------------------------------
 * Proof generation:
 *   GET /proof/:serial?batchId=BATCH-001
 *
 * Returns a SELF-CONTAINED verification bundle: the product, its leaf, the
 * Merkle root, the proof (raw + annotated), the leaf-spec version, and the
 * contract address. This bundle is enough to verify the product OFFLINE against
 * the on-chain root — the basis of proof data-availability (it can be embedded
 * in the product QR at mint so verification never depends on a live backend).
 *
 * If batchId is omitted we search every stored batch for the serial.
 * -----------------------------------------------------------------------------
 */
import { Router, Request, Response } from "express";
import { store } from "../services/store";
import { buildProof, findProduct } from "../services/merkleService";
import { chainStatus } from "../services/blockchain";
import { asyncHandler } from "../middleware/error";
import { LEAF_SPEC_VERSION } from "../../../shared/validate";
import type { Batch } from "../../../shared/types";

export const proofRouter = Router();

proofRouter.get(
  "/:serial",
  asyncHandler(async (req: Request, res: Response) => {
    const { serial } = req.params;
    const batchId = req.query.batchId as string | undefined;

    let batch: Batch | undefined;
    if (batchId) {
      batch = store.get(batchId);
      if (!batch) {
        return res.status(404).json({ error: `batch ${batchId} not found` });
      }
    } else {
      batch = store.list().find((b) => findProduct(b, serial));
      if (!batch) {
        return res
          .status(404)
          .json({ error: `product ${serial} not found in any batch` });
      }
    }

    const product = findProduct(batch, serial);
    if (!product) {
      return res
        .status(404)
        .json({ error: `product ${serial} not found in batch ${batch.batchId}` });
    }

    const result = buildProof(batch, product);
    // Contract address (cached after first connect; null if chain offline).
    const chain = await chainStatus().catch(() => null);

    return res.json({
      batchId: batch.batchId,
      leafSpec: LEAF_SPEC_VERSION,
      contract: chain?.contractAddress ?? null,
      ...result
    });
  })
);
