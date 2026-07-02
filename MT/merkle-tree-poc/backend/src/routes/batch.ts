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
  treeLevels,
  allProofs
} from "../services/merkleService";
import {
  registerBatchOnChain,
  supersedeBatchOnChain,
  chainStatus
} from "../services/blockchain";
import { LEAF_SPEC_VERSION } from "../../../shared/validate";
import type { Batch } from "../../../shared/types";
import {
  normalizeProducts,
  assertUniqueSerials,
  ProductValidationError,
  DuplicateProductError
} from "../../../shared/validate";
import { requireApiKey } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import {
  createBatchSchema,
  registerBatchSchema,
  supersedeBatchSchema
} from "../schemas";

export const batchRouter = Router();

/**
 * POST /batch/create
 * Body: { batchId: string, count?: number }
 * Generates products and stores the batch (NOT yet on-chain).
 */
batchRouter.post("/create", requireApiKey, validateBody(createBatchSchema), (req: Request, res: Response) => {
  const { batchId, count, products } = req.body ?? {};
  if (!batchId || typeof batchId !== "string") {
    return res.status(400).json({ error: "batchId (string) is required" });
  }
  if (store.has(batchId)) {
    return res
      .status(409)
      .json({ error: `batch ${batchId} already exists` });
  }

  let batch: Batch;
  try {
    if (products !== undefined) {
      // Custom product list (the production/ingest path): validate + normalize
      // every product and reject duplicate serials before building a tree.
      const normalized = normalizeProducts(products);
      if (normalized.length === 0) {
        return res.status(400).json({ error: "products must not be empty" });
      }
      if (normalized.length > 5000) {
        return res.status(400).json({ error: "products length must be <= 5000" });
      }
      batch = {
        batchId,
        products: normalized,
        generatedAt: new Date().toISOString()
      };
    } else {
      // Generated path: deterministic products with guaranteed-unique serials.
      const n = Number.isInteger(count) && count > 0 ? count : 100;
      if (n > 5000) {
        return res.status(400).json({ error: "count must be <= 5000" });
      }
      batch = generateBatch(batchId, n);
      // Enforce the uniqueness invariant universally (defensive; always holds here).
      assertUniqueSerials(batch.products);
    }
  } catch (err) {
    if (err instanceof DuplicateProductError) {
      return res
        .status(400)
        .json({ error: err.message, duplicates: err.duplicates });
    }
    if (err instanceof ProductValidationError) {
      return res.status(400).json({ error: err.message, field: err.field });
    }
    throw err;
  }

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
batchRouter.post("/register", requireApiKey, validateBody(registerBatchSchema), asyncHandler(async (req: Request, res: Response) => {
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
}));

/**
 * POST /batch/:batchId/supersede  (batch versioning — Phase 3)
 * Body: { products: Product[] }  — the CORRECTED product list.
 * Rebuilds the tree from the new products, then supersedes the on-chain root.
 */
batchRouter.post(
  "/:batchId/supersede",
  requireApiKey,
  validateBody(supersedeBatchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const existing = store.get(batchId);
    if (!existing) {
      return res.status(404).json({ error: `batch ${batchId} not found` });
    }

    // Validate + dedupe the corrected products (throws → central error handler).
    const products = normalizeProducts(req.body.products);
    const updated: Batch = { ...existing, products };
    const merkleRoot = computeRoot(updated);
    updated.merkleRoot = merkleRoot;

    try {
      const onChain = await supersedeBatchOnChain(
        batchId,
        merkleRoot,
        products.length
      );
      updated.onChain = onChain;
      store.upsert(updated);
      return res.json({
        batchId,
        merkleRoot,
        totalProducts: products.length,
        version: onChain.version,
        onChain
      });
    } catch (err) {
      store.upsert(updated);
      return res.status(502).json({
        error: "failed to supersede root on-chain",
        detail: (err as Error).message,
        merkleRoot
      });
    }
  })
);

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

/**
 * GET /batch/:batchId/proofs -> proofs for every product (served from cache).
 * Bounded by the batch size cap (<= 5000 products).
 */
batchRouter.get("/:batchId/proofs", (req: Request, res: Response) => {
  const batch = store.get(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ error: "batch not found" });
  }
  const proofs = allProofs(batch);
  return res.json({
    batchId: batch.batchId,
    merkleRoot: computeRoot(batch),
    count: proofs.length,
    proofs
  });
});

/**
 * GET /batch/:batchId/proof-pack  (Proof Data Availability)
 * A SELF-CONTAINED, durable export: the root + contract + leaf-spec + every
 * product's fields, leaf, and proof. Download it (or pin it to IPFS / embed a
 * per-product slice in the QR) so products remain verifiable against the
 * on-chain root even if this backend and its store are lost.
 */
batchRouter.get(
  "/:batchId/proof-pack",
  asyncHandler(async (req: Request, res: Response) => {
    const batch = store.get(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ error: "batch not found" });
    }
    const proofs = allProofs(batch);
    const byId = new Map(batch.products.map((p) => [p.serial, p]));
    const chain = await chainStatus().catch(() => null);

    return res.json({
      format: "voltus-merkle-proof-pack",
      version: "1",
      leafSpec: LEAF_SPEC_VERSION,
      batchId: batch.batchId,
      merkleRoot: computeRoot(batch),
      contract: chain?.contractAddress ?? null,
      onChain: batch.onChain ?? null,
      generatedAt: new Date().toISOString(),
      count: proofs.length,
      proofs: proofs.map((pr) => ({
        serial: pr.serial,
        product: byId.get(pr.serial),
        leaf: pr.leaf,
        proof: pr.proof
      }))
    });
  })
);

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
