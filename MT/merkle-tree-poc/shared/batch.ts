/**
 * shared/batch.ts
 * -----------------------------------------------------------------------------
 * Batch generator. Simulates a manufacturer (SKF) producing a batch of N
 * products. Each unit gets a deterministic serial so the demo is reproducible.
 *
 * Product shape matches the VoltusWave / SKF model: serial, sku, batch_id,
 * manufactured_at (see merkle.md §8).
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
 * @param sku      Product model shared across the batch (default an SKF bearing).
 * @param baseDate Manufacture date (Unix seconds). Fixed by default so batches
 *                 are reproducible across runs.
 */
export function generateBatch(
  batchId: string,
  count = 100,
  sku = "SKF-6205-2RS",
  baseDate = 1700000000 // 2023-11-14T22:13:20Z — fixed for reproducibility.
): Batch {
  const products: Product[] = [];

  for (let i = 1; i <= count; i++) {
    const seq = pad(i, 4);
    products.push({
      serial: `SN-${batchId}-${seq}`,
      sku,
      batch_id: batchId,
      // Stagger manufacture timestamps by one minute per unit (ISO-8601).
      manufactured_at: new Date((baseDate + i * 60) * 1000).toISOString()
    });
  }

  return {
    batchId,
    products,
    generatedAt: new Date(baseDate * 1000).toISOString()
  };
}
