/**
 * backend/test/edgecases.test.ts
 * -----------------------------------------------------------------------------
 * Phase 1 capstone: property/edge-case tests across the full batch-size
 * spectrum. Ties together hashing, tree construction, proof generation,
 * verification, and tampering — proving they hold TOGETHER for powers-of-2
 * boundaries (2,4,8,16) and non-powers (3,5,6,7,10,17), plus the n=1 edge.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import { generateBatch } from "../../shared/batch";
import { hashProduct } from "../../shared/hash";
import { getRoot, getProof, verifyProof, getLevels } from "../../shared/merkle";
import type { Product } from "../../shared/types";

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 16, 17];
const FIELDS: (keyof Product)[] = ["serial", "sku", "batch_id", "manufactured_at"];

describe("edge/property tests across batch sizes", () => {
  for (const n of SIZES) {
    describe(`batch of ${n}`, () => {
      const batch = generateBatch("BATCH-EDGE", n);
      const leaves = batch.products.map(hashProduct);
      const root = getRoot(leaves);

      it("every genuine product verifies against the root", () => {
        for (const p of batch.products) {
          const leaf = hashProduct(p);
          expect(verifyProof(leaf, getProof(leaves, leaf), root)).toBe(true);
        }
      });

      it("proof length never exceeds ceil(log2(n))", () => {
        const bound = Math.ceil(Math.log2(n)); // n=1 -> 0
        for (const p of batch.products) {
          const proof = getProof(leaves, hashProduct(p));
          expect(proof.length).toBeLessThanOrEqual(bound);
        }
      });

      it("root is deterministic across independent rebuilds", () => {
        const rebuilt = getRoot(batch.products.map(hashProduct));
        expect(rebuilt).toBe(root);
      });

      it("the top tree level is exactly the single root", () => {
        const levels = getLevels(leaves);
        expect(levels[levels.length - 1].nodes).toEqual([root]);
      });

      it("tampering ANY single field breaks verification", () => {
        // Pick a middle-ish product so we exercise interior + promoted paths.
        const idx = Math.floor((n - 1) / 2);
        const original = batch.products[idx];
        const proof = getProof(leaves, hashProduct(original));

        for (const field of FIELDS) {
          const newValue =
            field === "manufactured_at"
              ? "2020-01-01T00:00:00.000Z" // valid but DIFFERENT date
              : "TAMPERED-XYZ";
          const tampered = { ...original, [field]: newValue } as Product;
          expect(
            verifyProof(hashProduct(tampered), proof, root),
            `tampering ${field} should break verification`
          ).toBe(false);
        }
      });
    });
  }
});
