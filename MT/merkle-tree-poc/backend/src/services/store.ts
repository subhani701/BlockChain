/**
 * backend/src/services/store.ts
 * -----------------------------------------------------------------------------
 * Tiny persistence layer. No database (per PoC requirement) — batches live in
 * memory and are mirrored to a JSON file so they survive a server restart.
 * -----------------------------------------------------------------------------
 */
import fs from "fs";
import path from "path";
import { config } from "../config";
import type { Batch } from "../../../shared/types";

/** In-memory map of batchId -> Batch. */
const batches = new Map<string, Batch>();

/** Load any previously persisted batches at startup. */
function load(): void {
  try {
    if (fs.existsSync(config.dataFile)) {
      const raw = fs.readFileSync(config.dataFile, "utf-8");
      const arr: Batch[] = JSON.parse(raw);
      arr.forEach((b) => batches.set(b.batchId, b));
      // eslint-disable-next-line no-console
      console.log(`[store] loaded ${arr.length} batch(es) from disk`);
    }
  } catch (err) {
    console.warn("[store] could not load data file:", (err as Error).message);
  }
}

/** Persist the current in-memory state to disk (best-effort). */
function persist(): void {
  try {
    const dir = path.dirname(config.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      config.dataFile,
      JSON.stringify([...batches.values()], null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("[store] could not persist data file:", (err as Error).message);
  }
}

load();

export const store = {
  upsert(batch: Batch): void {
    batches.set(batch.batchId, batch);
    persist();
  },
  get(batchId: string): Batch | undefined {
    return batches.get(batchId);
  },
  has(batchId: string): boolean {
    return batches.has(batchId);
  },
  list(): Batch[] {
    return [...batches.values()];
  },
  /** Test helper: wipe everything (does not delete the file unless persisted). */
  _reset(): void {
    batches.clear();
  }
};
