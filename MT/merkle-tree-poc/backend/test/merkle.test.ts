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
  getLevels,
  buildTree,
  ODD_LEAF_CONVENTION,
  EmptyBatchError
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

  it("exposes the ABI-encoded value tuple for display", () => {
    const enc = encodeProductForDisplay(batch.products[0]);
    expect(enc).toContain("abi.encode");
    expect(enc).toContain("SN-BATCH-001-0001");
    expect(enc).toContain("SKF-6205-2RS");
  });
});

describe("merkle tree", () => {
  it("builds a root", () => {
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("reconstructs levels ending in the single root", () => {
    const levels = getLevels(leaves);
    // OZ's balanced layout: for non-power-of-2 counts leaves may span the two
    // deepest levels, so we assert the invariant (top = root) not exact counts.
    expect(levels.length).toBeGreaterThan(1);
    expect(levels[levels.length - 1].nodes.length).toBe(1);
    expect(levels[levels.length - 1].nodes[0]).toBe(root);
    // Total nodes in the tree = 2n - 1.
    const total = levels.reduce((s, l) => s + l.nodes.length, 0);
    expect(total).toBe(2 * leaves.length - 1);
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

describe("empty batch handling", () => {
  it("throws EmptyBatchError from buildTree([])", () => {
    expect(() => buildTree([])).toThrow(EmptyBatchError);
  });

  it("throws EmptyBatchError from getRoot([])", () => {
    expect(() => getRoot([])).toThrow(EmptyBatchError);
  });

  it("throws EmptyBatchError from getLevels([])", () => {
    expect(() => getLevels([])).toThrow(EmptyBatchError);
  });
});

describe("single-leaf tree", () => {
  const only = batch.products[0];
  const leaf = hashProduct(only);

  it("root equals the single leaf", () => {
    expect(getRoot([leaf])).toBe(leaf);
  });

  it("proof for the only leaf is empty", () => {
    expect(getProof([leaf], leaf)).toEqual([]);
  });

  it("verifies the only product with an empty proof", () => {
    const root = getRoot([leaf]);
    expect(verifyProof(leaf, [], root)).toBe(true);
  });

  it("rejects a different leaf against a single-leaf root", () => {
    const root = getRoot([leaf]);
    const other = hashProduct({ ...only, serial: only.serial + "-X" });
    expect(verifyProof(other, [], root)).toBe(false);
  });
});

describe("odd-leaf handling (@openzeppelin/merkle-tree)", () => {
  it("declares the openzeppelin convention", () => {
    expect(ODD_LEAF_CONVENTION).toBe("openzeppelin");
  });

  // Odd counts force a lonely node at one or more levels. Every product —
  // including the promoted last one — must still verify against the root.
  for (const n of [3, 5, 7, 9]) {
    it(`verifies every product in an odd-sized batch of ${n}`, () => {
      const b = generateBatch("BATCH-ODD", n);
      const lvs = b.products.map(hashProduct);
      const r = getRoot(lvs);
      for (const p of b.products) {
        const leaf = hashProduct(p);
        expect(verifyProof(leaf, getProof(lvs, leaf), r)).toBe(true);
      }
      // The last product (index n-1) is the one promoted at level 0.
      const last = b.products[n - 1];
      const lastLeaf = hashProduct(last);
      expect(verifyProof(lastLeaf, getProof(lvs, lastLeaf), r)).toBe(true);
    });
  }
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
