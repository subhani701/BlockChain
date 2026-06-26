/**
 * shared/batch.ts
 * -----------------------------------------------------------------------------
 * Batch generator (PoC Part 1).
 *
 * Simulates a manufacturer producing a batch of N products. Each product gets
 * a deterministic productId / serialNumber so the demo is reproducible.
 * -----------------------------------------------------------------------------
 */
import type { Batch, Product } from "./types";

/** Zero-pad a number to a fixed width, e.g. pad(7, 4) => "0007". */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Generate a manufacturing batch.
 *
 * @param batchId  Human-readable id, e.g. "BATCH-001".
 * @param count    Number of products to generate (default 100).
 * @param baseDate Manufacture date (Unix seconds). Defaults to a fixed date so
 *                 generated batches are reproducible across runs. Override to
 *                 use "now".
 */
export function generateBatch(
  batchId: string,
  count = 100,
  baseDate = 1700000000 // 2023-11-14T22:13:20Z — fixed for reproducibility.
): Batch {
  const products: Product[] = [];

  for (let i = 1; i <= count; i++) {
    const seq = pad(i, 4);
    products.push({
      productId: `SKU-${seq}`,
      serialNumber: `SN-${batchId}-${seq}`,
      batchId,
      // Stagger manufacture dates by one minute per unit, purely cosmetic.
      manufactureDate: baseDate + i * 60
    });
  }

  return {
    batchId,
    products,
    generatedAt: new Date(baseDate * 1000).toISOString()
  };
}
