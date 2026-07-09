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

// Supersede requires the CORRECTED product list (new data → new root). batchId
// comes from the URL param, not the body.
export const supersedeBatchSchema = z.object({
  products: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "products must be a non-empty array")
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

/**
 * POST /verify/scan — the integration seam with scanServiceRequest().
 * Either supply the scanned `bundle` (field path), or `batchId` + `serial` and we
 * derive the product + proof from the stored batch (operator path).
 * `location` / `scannerId` are optional scan context used for replay detection.
 */
export const scanSchema = z
  .object({
    bundle: z
      .object({
        batchId: z.string().min(1),
        product: z.record(z.string(), z.unknown()),
        proof: z.array(z.string())
      })
      .optional(),
    batchId: z.string().min(1).optional(),
    serial: z.string().min(1).optional(),
    location: z.string().min(1).max(200).optional(),
    scannerId: z.string().min(1).max(200).optional()
  })
  .refine((v) => !!v.bundle || (!!v.batchId && !!v.serial), {
    message: "provide either `bundle`, or both `batchId` and `serial`"
  });
