/**
 * backend/src/schemas.ts
 * -----------------------------------------------------------------------------
 * zod schemas for API request bodies (Phase 2, Task 2.5). Kept permissive at
 * the edges (e.g. products[] items are validated deeply by normalizeProducts,
 * which produces field-level errors); zod enforces the request SHAPE.
 * -----------------------------------------------------------------------------
 */
import { z } from "zod";

export const createBatchSchema = z.object({
  batchId: z.string().min(1, "batchId is required"),
  count: z.number().int().positive().optional(),
  // Deep per-product validation happens in normalizeProducts; here we only
  // require that, if present, products is an array of objects.
  products: z.array(z.record(z.string(), z.unknown())).optional()
});

export const registerBatchSchema = z.object({
  batchId: z.string().min(1, "batchId is required")
});

export const verifySchema = z.object({
  batchId: z.string().min(1, "batchId is required"),
  serial: z.string().optional(),
  leaf: z.string().optional(),
  proof: z.array(z.string()).optional()
});

export const tamperSchema = z.object({
  batchId: z.string().min(1, "batchId is required"),
  serial: z.string().min(1, "serial is required"),
  field: z.string().optional(),
  newValue: z.string().optional(),
  onChain: z.boolean().optional()
});
