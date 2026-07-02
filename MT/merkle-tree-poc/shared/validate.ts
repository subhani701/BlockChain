/**
 * shared/validate.ts
 * -----------------------------------------------------------------------------
 * Canonical product validation + normalization — the SINGLE source of truth for
 * what a "valid product" is and exactly how its fields are shaped before hashing.
 *
 * WHY THIS EXISTS (audit items #2, #3)
 * ------------------------------------
 * A Merkle leaf is keccak256 of the product's canonical JSON. If two producers
 * (our backend, the VoltusWave seed, a future Go/Python service) format "the
 * same" product even slightly differently — a trailing space, a different date
 * precision, `+00:00` vs `Z` — they produce DIFFERENT leaves, DIFFERENT roots,
 * and verification silently fails. Normalizing every product through this one
 * function guarantees identical bytes everywhere.
 *
 * RULES (canonical form):
 *   - serial, sku, batch_id : required, string, trimmed, non-empty.
 *   - manufactured_at       : required, string, a parseable date; re-emitted as
 *                             canonical UTC ISO-8601 with millisecond precision
 *                             and a 'Z' suffix (e.g. "2023-11-14T22:14:20.000Z").
 *   - Unknown/extra fields   : ignored (only the 4 canonical fields are hashed).
 *
 * Bump LEAF_SPEC_VERSION whenever these rules change (a rule change changes every
 * leaf/root, so it must be coordinated across all producers).
 * -----------------------------------------------------------------------------
 */
import type { Product } from "./types";

/**
 * Version tag for the canonical leaf specification.
 * 2.0.0 — leaves are DOUBLE-hashed: keccak256(keccak256(utf8(canonicalJSON)))
 *         (second-preimage safe; matches @openzeppelin/merkle-tree). A change
 *         here changes every leaf/root and must be coordinated + re-anchored.
 */
export const LEAF_SPEC_VERSION = "2.0.0";

/**
 * Thrown when a product fails validation. Carries the offending `field` so
 * callers (API routes) can return precise, machine-readable errors.
 */
export class ProductValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(`ProductValidationError[${field}]: ${message}`);
    this.name = "ProductValidationError";
    // Preserve prototype chain when transpiled to ES5-ish targets.
    Object.setPrototypeOf(this, ProductValidationError.prototype);
  }
}

/**
 * Thrown when a batch contains duplicate serials. Duplicate serials produce
 * duplicate leaves → ambiguous proofs and a known Merkle attack surface, so a
 * batch MUST have unique serials.
 */
export class DuplicateProductError extends Error {
  constructor(public readonly duplicates: string[]) {
    super(
      `DuplicateProductError: duplicate serial(s): ${duplicates.join(", ")}`
    );
    this.name = "DuplicateProductError";
    Object.setPrototypeOf(this, DuplicateProductError.prototype);
  }
}

/** Require a value to be a non-empty (after trim) string; return the trimmed value. */
function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ProductValidationError(
      field,
      `must be a string, got ${value === null ? "null" : typeof value}`
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ProductValidationError(field, "must not be empty");
  }
  return trimmed;
}

/**
 * Normalize `manufactured_at` to a canonical UTC ISO-8601 string.
 * Accepts any string Date can parse (with/without offset/millis) and collapses
 * it to one exact representation so equivalent timestamps hash identically.
 */
function normalizeTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new ProductValidationError(
      "manufactured_at",
      `must be an ISO-8601 string, got ${value === null ? "null" : typeof value}`
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ProductValidationError("manufactured_at", "must not be empty");
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new ProductValidationError(
      "manufactured_at",
      `is not a valid date: "${value}"`
    );
  }
  // Canonical: UTC, millisecond precision, trailing 'Z'.
  return new Date(ms).toISOString();
}

/**
 * Validate + normalize an arbitrary input into the canonical Product used for
 * hashing. Returns a NEW object containing EXACTLY the four canonical fields.
 * Throws {@link ProductValidationError} on any violation.
 */
export function normalizeProduct(
  input: Partial<Product> | Record<string, unknown> | null | undefined
): Product {
  if (input === null || input === undefined || typeof input !== "object") {
    throw new ProductValidationError("product", "must be an object");
  }
  const rec = input as Record<string, unknown>;
  return {
    serial: requireNonEmptyString(rec.serial, "serial"),
    sku: requireNonEmptyString(rec.sku, "sku"),
    batch_id: requireNonEmptyString(rec.batch_id, "batch_id"),
    manufactured_at: normalizeTimestamp(rec.manufactured_at)
  };
}

/**
 * Assert every product has a unique serial. Throws {@link DuplicateProductError}
 * listing all serials that appear more than once. Assumes serials are already
 * normalized (trimmed) so "SN-1" and " SN-1 " count as the same unit.
 */
export function assertUniqueSerials(products: readonly { serial: string }[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const p of products) {
    if (seen.has(p.serial)) duplicates.add(p.serial);
    else seen.add(p.serial);
  }
  if (duplicates.size > 0) throw new DuplicateProductError([...duplicates]);
}

/**
 * Validate + normalize a LIST of products and assert unique serials. This is the
 * single ingress guard for any externally-supplied product list (returns a new
 * array of canonical products). Throws ProductValidationError / DuplicateProductError.
 */
export function normalizeProducts(list: unknown): Product[] {
  if (!Array.isArray(list)) {
    throw new ProductValidationError("products", "must be an array");
  }
  const normalized = list.map((p) => normalizeProduct(p as Record<string, unknown>));
  assertUniqueSerials(normalized);
  return normalized;
}

/**
 * Non-throwing variant: returns `{ ok: true, product }` or `{ ok: false, error }`.
 * Handy in routes that want to branch rather than try/catch.
 */
export function tryNormalizeProduct(
  input: unknown
):
  | { ok: true; product: Product }
  | { ok: false; error: ProductValidationError } {
  try {
    return { ok: true, product: normalizeProduct(input as Record<string, unknown>) };
  } catch (err) {
    if (err instanceof ProductValidationError) return { ok: false, error: err };
    throw err;
  }
}
