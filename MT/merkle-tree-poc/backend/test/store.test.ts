/**
 * backend/test/store.test.ts
 * -----------------------------------------------------------------------------
 * Tests the pluggable storage layer (Phase 3, Task 3.2), including the real
 * embedded SQLite store (node:sqlite, in-memory) — proving the abstraction
 * works against an actual database, not just the JSON file.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import { SqliteStore, JsonStore } from "../src/services/store";
import { generateBatch } from "../../shared/batch";
import type { Store } from "../src/services/store";
import {
  _treeInstanceFor,
  computeRoot,
  buildProof
} from "../src/services/merkleService";
import { verifyProof } from "../../shared/merkle";

function runContract(name: string, make: () => Store) {
  describe(`Store contract: ${name}`, () => {
    it("upsert + get round-trips a batch", () => {
      const s = make();
      const b = generateBatch("STORE-1", 4);
      s.upsert(b);
      const got = s.get("STORE-1");
      expect(got?.batchId).toBe("STORE-1");
      expect(got?.products).toHaveLength(4);
      expect(got?.products[0].serial).toBe(b.products[0].serial);
    });

    it("has() reflects presence", () => {
      const s = make();
      expect(s.has("NOPE")).toBe(false);
      s.upsert(generateBatch("STORE-2", 2));
      expect(s.has("STORE-2")).toBe(true);
    });

    it("upsert overwrites (idempotent key)", () => {
      const s = make();
      s.upsert(generateBatch("STORE-3", 2));
      s.upsert(generateBatch("STORE-3", 5));
      expect(s.get("STORE-3")?.products).toHaveLength(5);
      expect(s.list().filter((b) => b.batchId === "STORE-3")).toHaveLength(1);
    });

    it("list() returns all; _reset() clears", () => {
      const s = make();
      s.upsert(generateBatch("A", 1));
      s.upsert(generateBatch("B", 1));
      expect(s.list().length).toBeGreaterThanOrEqual(2);
      s._reset();
      expect(s.list()).toHaveLength(0);
    });

    it("get() returns undefined for a missing batch", () => {
      const s = make();
      expect(s.get("MISSING")).toBeUndefined();
    });
  });
}

// Real embedded SQL database (in-memory), plus a temp-file JSON store.
let tmpSeq = 0;
runContract("SqliteStore(:memory:)", () => new SqliteStore(":memory:"));
runContract("JsonStore(temp)", () => new JsonStore(`./data/store-test-${tmpSeq++}.json`));

describe("merkle tree cache (Phase 4.1)", () => {
  it("reuses one tree instance for the same batch (no rebuild)", () => {
    const batch = generateBatch("CACHE-1", 8);
    const t1 = _treeInstanceFor(batch);
    const t2 = _treeInstanceFor(batch);
    expect(t1).toBe(t2); // same reference → cached, not rebuilt
    // computeRoot / buildProof reuse the same cached data.
    expect(computeRoot(batch)).toBe(computeRoot(batch));
  });

  it("rebuilds when the products array is replaced (auto-invalidation)", () => {
    const batch = generateBatch("CACHE-2", 8);
    const t1 = _treeInstanceFor(batch);
    const rootV1 = computeRoot(batch);
    // Supersede-style replacement: new products array → new tree.
    const superseded = {
      ...batch,
      products: batch.products.map((p) => ({ ...p, sku: "SKF-NEW" }))
    };
    const t2 = _treeInstanceFor(superseded);
    expect(t2).not.toBe(t1);
    expect(computeRoot(superseded)).not.toBe(rootV1);
  });

  it("cached proofs still verify against the cached root", () => {
    const batch = generateBatch("CACHE-3", 10);
    const root = computeRoot(batch);
    for (const p of batch.products) {
      const built = buildProof(batch, p);
      expect(verifyProof(built.leaf, built.proof, root)).toBe(true);
    }
  });
});
