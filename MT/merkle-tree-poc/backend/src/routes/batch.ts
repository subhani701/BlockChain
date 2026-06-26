/**
 * backend/src/routes/batch.ts
 * -----------------------------------------------------------------------------
 * Batch lifecycle endpoints:
 *   POST /batch/create     -> generate a batch of products (Part 1)
 *   POST /batch/register   -> build Merkle tree + commit root on-chain (Parts 3/7)
 *   GET  /batch            -> list all batches (summaries)
 *   GET  /batch/:batchId   -> full batch with hashed products + root + on-chain
 *   GET  /batch/:batchId/tree -> every level of the Merkle tree (Part 11)
 * -----------------------------------------------------------------------------
 */
import { Router, Request, Response } from "express";
import { generateBatch } from "../../../shared/batch";
import { store } from "../services/store";
import {
  computeRoot,
  hashedProducts,
  treeLevels
} from "../services/merkleService";
import { registerBatchOnChain } from "../services/blockchain";

export const batchRouter = Router();

/**
 * POST /batch/create
 * Body: { batchId: string, count?: number }
 * Generates products and stores the batch (NOT yet on-chain).
 */
batchRouter.post("/create", (req: Request, res: Response) => {
  const { batchId, count } = req.body ?? {};
  if (!batchId || typeof batchId !== "string") {
    return res.status(400).json({ error: "batchId (string) is required" });
  }
  if (store.has(batchId)) {
    return res
      .status(409)
      .json({ error: `batch ${batchId} already exists` });
  }
  const n = Number.isInteger(count) && count > 0 ? count : 100;
  if (n > 5000) {
    return res.status(400).json({ error: "count must be <= 5000" });
  }

  const batch = generateBatch(batchId, n);
  store.upsert(batch);

  return res.status(201).json({
    batchId: batch.batchId,
    totalProducts: batch.products.length,
    generatedAt: batch.generatedAt,
    products: hashedProducts(batch)
  });
});

/**
 * POST /batch/register
 * Body: { batchId: string }
 * Builds the Merkle tree, then writes the root to Ethereum via the contract.
 */
batchRouter.post("/register", async (req: Request, res: Response) => {
  const { batchId } = req.body ?? {};
  const batch = batchId ? store.get(batchId) : undefined;
  if (!batch) {
    return res.status(404).json({ error: `batch ${batchId} not found` });
  }

  // 1) Build the tree off-chain and derive the root.
  const merkleRoot = computeRoot(batch);
  batch.merkleRoot = merkleRoot;

  // 2) Commit ONLY the root to the blockchain.
  try {
    const onChain = await registerBatchOnChain(
      batch.batchId,
      merkleRoot,
      batch.products.length
    );
    batch.onChain = onChain;
    store.upsert(batch);

    return res.json({
      batchId: batch.batchId,
      merkleRoot,
      totalProducts: batch.products.length,
      onChain
    });
  } catch (err) {
    // Persist the root even if the chain write failed, so the off-chain demo
    // still works and the user gets a clear blockchain error.
    store.upsert(batch);
    return res.status(502).json({
      error: "failed to register root on-chain",
      detail: (err as Error).message,
      merkleRoot
    });
  }
});

/** GET /batch -> list of batch summaries. */
batchRouter.get("/", (_req: Request, res: Response) => {
  const list = store.list().map((b) => ({
    batchId: b.batchId,
    totalProducts: b.products.length,
    merkleRoot: b.merkleRoot ?? null,
    onChain: b.onChain ?? null
  }));
  return res.json(list);
});

/** GET /batch/:batchId -> full batch detail. */
batchRouter.get("/:batchId", (req: Request, res: Response) => {
  const batch = store.get(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ error: "batch not found" });
  }
  return res.json({
    batchId: batch.batchId,
    totalProducts: batch.products.length,
    generatedAt: batch.generatedAt,
    merkleRoot: batch.merkleRoot ?? computeRoot(batch),
    onChain: batch.onChain ?? null,
    products: hashedProducts(batch)
  });
});

/** GET /batch/:batchId/tree -> all Merkle levels (leaves..root). */
batchRouter.get("/:batchId/tree", (req: Request, res: Response) => {
  const batch = store.get(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ error: "batch not found" });
  }
  const levels = treeLevels(batch);
  return res.json({
    batchId: batch.batchId,
    merkleRoot: levels[levels.length - 1]?.nodes[0] ?? null,
    depth: levels.length,
    levels
  });
});
