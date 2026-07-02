/**
 * backend/test/validate.test.ts
 * -----------------------------------------------------------------------------
 * Tests for canonical product validation + normalization (Phase 1, Task 1.1/1.2).
 * These lock down the leaf's exact bytes and the normalization guarantees that
 * make cross-service verification reliable.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import {
  normalizeProduct,
  tryNormalizeProduct,
  normalizeProducts,
  assertUniqueSerials,
  ProductValidationError,
  DuplicateProductError,
  LEAF_SPEC_VERSION
} from "../../shared/validate";
import { encodeProductForDisplay, hashProduct } from "../../shared/hash";
import { generateBatch } from "../../shared/batch";
import type { Product } from "../../shared/types";

const VALID: Product = {
  serial: "SN-BATCH-001-0001",
  sku: "SKF-6205-2RS",
  batch_id: "BATCH-001",
  manufactured_at: "2023-11-14T22:14:20.000Z"
};

describe("normalizeProduct — validation", () => {
  it("accepts a valid product and returns exactly the 4 canonical fields", () => {
    const p = normalizeProduct(VALID);
    expect(Object.keys(p).sort()).toEqual(
      ["batch_id", "manufactured_at", "serial", "sku"].sort()
    );
  });

  it.each(["serial", "sku", "batch_id", "manufactured_at"] as const)(
    "throws when %s is missing",
    (field) => {
      const bad = { ...VALID } as Record<string, unknown>;
      delete bad[field];
      expect(() => normalizeProduct(bad)).toThrow(ProductValidationError);
    }
  );

  it.each(["serial", "sku", "batch_id"] as const)(
    "throws when %s is empty or whitespace-only",
    (field) => {
      expect(() => normalizeProduct({ ...VALID, [field]: "   " })).toThrow(
        ProductValidationError
      );
    }
  );

  it("throws when a field is a non-string", () => {
    expect(() => normalizeProduct({ ...VALID, serial: 123 })).toThrow(
      ProductValidationError
    );
    expect(() => normalizeProduct({ ...VALID, sku: null })).toThrow(
      ProductValidationError
    );
  });

  it("throws on a non-object input", () => {
    expect(() => normalizeProduct(null)).toThrow(ProductValidationError);
    expect(() => normalizeProduct("nope" as unknown as Product)).toThrow(
      ProductValidationError
    );
  });

  it("throws on an unparseable manufactured_at", () => {
    expect(() =>
      normalizeProduct({ ...VALID, manufactured_at: "not-a-date" })
    ).toThrow(ProductValidationError);
  });

  it("exposes the offending field on the error", () => {
    try {
      normalizeProduct({ ...VALID, sku: "" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ProductValidationError);
      expect((e as ProductValidationError).field).toBe("sku");
    }
  });

  it("tryNormalizeProduct returns ok/err without throwing", () => {
    expect(tryNormalizeProduct(VALID).ok).toBe(true);
    const r = tryNormalizeProduct({ ...VALID, serial: "" });
    expect(r.ok).toBe(false);
  });
});

describe("normalizeProduct — normalization", () => {
  it("trims surrounding whitespace on string fields", () => {
    const p = normalizeProduct({
      ...VALID,
      serial: "  SN-BATCH-001-0001  ",
      sku: "\tSKF-6205-2RS\n"
    });
    expect(p.serial).toBe("SN-BATCH-001-0001");
    expect(p.sku).toBe("SKF-6205-2RS");
  });

  it("collapses equivalent timestamps to one canonical UTC ISO form", () => {
    const forms = [
      "2023-11-14T22:14:20.000Z",
      "2023-11-14T22:14:20Z", // no millis
      "2023-11-14T23:14:20+01:00" // same instant, offset
    ];
    const normalized = forms.map(
      (t) => normalizeProduct({ ...VALID, manufactured_at: t }).manufactured_at
    );
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("2023-11-14T22:14:20.000Z");
  });

  it("ignores unknown/extra fields", () => {
    const p = normalizeProduct({ ...VALID, hacker: "ignored", extra: 1 } as Record<
      string,
      unknown
    >);
    expect((p as Record<string, unknown>).hacker).toBeUndefined();
  });

  it("exports a leaf spec version", () => {
    expect(LEAF_SPEC_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("duplicate-serial handling", () => {
  const mk = (serial: string): Product => ({ ...VALID, serial });

  it("passes when all serials are unique", () => {
    expect(() =>
      assertUniqueSerials([mk("SN-1"), mk("SN-2"), mk("SN-3")])
    ).not.toThrow();
  });

  it("throws DuplicateProductError listing the repeated serial", () => {
    try {
      assertUniqueSerials([mk("SN-1"), mk("SN-2"), mk("SN-1")]);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DuplicateProductError);
      expect((e as DuplicateProductError).duplicates).toContain("SN-1");
    }
  });

  it("normalizeProducts normalizes each and rejects duplicates", () => {
    const list = normalizeProducts([mk("SN-1"), mk("SN-2")]);
    expect(list).toHaveLength(2);
    // trimming means "  SN-1  " duplicates "SN-1"
    expect(() =>
      normalizeProducts([mk("SN-1"), { ...VALID, serial: "  SN-1  " }])
    ).toThrow(DuplicateProductError);
  });

  it("normalizeProducts rejects a non-array", () => {
    expect(() => normalizeProducts("nope")).toThrow(ProductValidationError);
  });

  it("normalizeProducts surfaces per-product validation errors", () => {
    expect(() => normalizeProducts([mk("SN-1"), { ...VALID, sku: "" }])).toThrow(
      ProductValidationError
    );
  });
});

describe("hashProduct — determinism & golden vector (StandardMerkleTree leaf)", () => {
  it("exposes the ABI-encoded value tuple for display", () => {
    const enc = encodeProductForDisplay(VALID);
    expect(enc).toContain("abi.encode");
    expect(enc).toContain("SN-BATCH-001-0001");
    expect(enc).toContain("SKF-6205-2RS");
  });

  it("matches the GOLDEN leaf hash (locks the bytes — must never drift)", () => {
    // LEAF SPEC 3.0.0: leaf = keccak256(keccak256(abi.encode(4×string))) — the
    // @openzeppelin/merkle-tree StandardMerkleTree leaf. If this value changes,
    // the leaf spec changed → bump LEAF_SPEC_VERSION + re-anchor roots on-chain.
    expect(hashProduct(VALID)).toBe(
      "0xc83200d9db0989c1c390a730f82a271c5aff9700a9139a84d814e923cf80b345"
    );
  });

  it("equivalent-but-differently-formatted inputs hash identically", () => {
    const a = hashProduct(VALID);
    const b = hashProduct({ ...VALID, manufactured_at: "2023-11-14T23:14:20+01:00" });
    const c = hashProduct({ ...VALID, serial: "  SN-BATCH-001-0001  " });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("generated batch leaves match the current leaf spec", () => {
    const batch = generateBatch("BATCH-001", 4);
    expect(hashProduct(batch.products[0])).toBe(
      "0xc83200d9db0989c1c390a730f82a271c5aff9700a9139a84d814e923cf80b345"
    );
  });
});
