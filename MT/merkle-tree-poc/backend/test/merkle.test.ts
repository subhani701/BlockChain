/**
 * backend/test/merkle.test.ts
 * -----------------------------------------------------------------------------
 * Unit tests for the shared hashing + Merkle logic (no blockchain required).
 * Covers leaf hashing determinism, proof validity, and tampering.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import { generateBatch } from "../../shared/batch";
import { hashProduct, encodeProductForDisplay } from "../../shared/hash";
import {
  getRoot,
  getProof,
  verifyProof,
  getLevels
} from "../../shared/merkle";
import type { Product } from "../../shared/types";

const batch = generateBatch("BATCH-001", 100);
const leaves = batch.products.map(hashProduct);
const root = getRoot(leaves);

describe("hashing", () => {
  it("produces a 0x-prefixed 32-byte keccak256 leaf", () => {
    const leaf = hashProduct(batch.products[0]);
    expect(leaf).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for identical input", () => {
    expect(hashProduct(batch.products[5])).toBe(hashProduct(batch.products[5]));
  });

  it("avalanches: a one-field change yields a totally different leaf", () => {
    const a = batch.products[0];
    const b: Product = { ...a, serial: a.serial + "X" };
    expect(hashProduct(a)).not.toBe(hashProduct(b));
  });

  it("exposes the canonical JSON that gets hashed", () => {
    const enc = encodeProductForDisplay(batch.products[0]);
    expect(enc).toContain('"serial":"SN-BATCH-001-0001"');
    expect(enc).toContain('"sku":"SKF-6205-2RS"');
    expect(enc).toContain('"batch_id":"BATCH-001"');
  });
});

describe("merkle tree", () => {
  it("builds a root", () => {
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("has ceil(log2(n)) + 1 levels for 100 leaves", () => {
    const levels = getLevels(leaves);
    // 100 leaves -> 100,50,25,13,7,4,2,1 = 8 levels.
    expect(levels[0].nodes.length).toBe(100);
    expect(levels[levels.length - 1].nodes.length).toBe(1);
    expect(levels[levels.length - 1].nodes[0]).toBe(root);
  });
});

describe("merkle proof", () => {
  it("verifies every genuine product", () => {
    for (const product of batch.products) {
      const leaf = hashProduct(product);
      const proof = getProof(leaves, leaf);
      expect(verifyProof(leaf, proof, root)).toBe(true);
    }
  });

  it("produces a proof of length ~log2(n)", () => {
    const leaf = hashProduct(batch.products[0]);
    const proof = getProof(leaves, leaf);
    // 100 leaves -> proof length between 6 and 8.
    expect(proof.length).toBeGreaterThanOrEqual(6);
    expect(proof.length).toBeLessThanOrEqual(8);
  });
});

describe("tampering", () => {
  it("fails verification when the serial number is changed", () => {
    const original = batch.products[10];
    const proof = getProof(leaves, hashProduct(original));

    const tampered: Product = { ...original, serial: "SN-FAKE-9999" };
    const tamperedLeaf = hashProduct(tampered);

    expect(verifyProof(tamperedLeaf, proof, root)).toBe(false);
  });

  it("fails for a product that was never in the batch", () => {
    const fake: Product = {
      serial: "SN-FORGED",
      sku: "SKF-6205-2RS",
      batch_id: "BATCH-001",
      manufactured_at: "2023-11-14T22:14:20.000Z"
    };
    const someProof = getProof(leaves, hashProduct(batch.products[0]));
    expect(verifyProof(hashProduct(fake), someProof, root)).toBe(false);
  });
});
