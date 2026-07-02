/**
 * backend/test/api.test.ts
 * -----------------------------------------------------------------------------
 * HTTP-level tests for the off-chain API surface using supertest. These do NOT
 * require Ganache (they exercise create / proof / off-chain verify / tamper).
 *
 * On-chain endpoints (/batch/register, /verify) are covered by the Truffle
 * contract tests instead, since they need a running blockchain.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/server";
import { store } from "../src/services/store";

const app = createApp();
const BATCH = "BATCH-TEST";

beforeAll(() => {
  store._reset();
});

describe("POST /batch/create", () => {
  it("generates a batch of products with leaves", async () => {
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: BATCH, count: 16 });

    expect(res.status).toBe(201);
    expect(res.body.totalProducts).toBe(16);
    expect(res.body.products).toHaveLength(16);
    expect(res.body.products[0].leaf).toMatch(/^0x[0-9a-f]{64}$/);
    expect(res.body.products[0].encoded).toContain('"serial":"SN-BATCH-TEST-0001"');
  });

  it("rejects duplicate batch ids", async () => {
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: BATCH, count: 16 });
    expect(res.status).toBe(409);
  });

  it("requires a batchId", async () => {
    const res = await request(app).post("/batch/create").send({ count: 10 });
    expect(res.status).toBe(400);
  });

  it("accepts a valid custom products[] list", async () => {
    const products = [
      { serial: "SN-C-1", sku: "SKF-1", batch_id: "BATCH-CUSTOM", manufactured_at: "2023-11-14T22:14:20.000Z" },
      { serial: "SN-C-2", sku: "SKF-1", batch_id: "BATCH-CUSTOM", manufactured_at: "2023-11-14T22:15:20.000Z" }
    ];
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: "BATCH-CUSTOM", products });
    expect(res.status).toBe(201);
    expect(res.body.totalProducts).toBe(2);
    expect(res.body.products[0].leaf).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("rejects a custom products[] list with duplicate serials (400)", async () => {
    const products = [
      { serial: "SN-DUP", sku: "SKF-1", batch_id: "BATCH-DUP", manufactured_at: "2023-11-14T22:14:20.000Z" },
      { serial: "SN-DUP", sku: "SKF-1", batch_id: "BATCH-DUP", manufactured_at: "2023-11-14T22:15:20.000Z" }
    ];
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: "BATCH-DUP", products });
    expect(res.status).toBe(400);
    expect(res.body.duplicates).toContain("SN-DUP");
  });

  it("rejects a custom products[] list with an invalid product (400)", async () => {
    const products = [
      { serial: "SN-BAD-1", sku: "SKF-1", batch_id: "BATCH-BAD", manufactured_at: "not-a-date" }
    ];
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: "BATCH-BAD", products });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("manufactured_at");
  });
});

describe("GET /batch/:batchId/tree", () => {
  it("returns all levels ending in a single root", async () => {
    const res = await request(app).get(`/batch/${BATCH}/tree`);
    expect(res.status).toBe(200);
    expect(res.body.levels[0].nodes).toHaveLength(16);
    expect(res.body.levels[res.body.depth - 1].nodes).toHaveLength(1);
    expect(res.body.merkleRoot).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("GET /proof/:serial", () => {
  it("returns a leaf, proof and steps for a product", async () => {
    const res = await request(app)
      .get("/proof/SN-BATCH-TEST-0003")
      .query({ batchId: BATCH });

    expect(res.status).toBe(200);
    expect(res.body.leaf).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Array.isArray(res.body.proof)).toBe(true);
    expect(res.body.steps[0]).toHaveProperty("position");
  });
});

describe("POST /verify/offchain", () => {
  it("verifies a genuine product as VALID", async () => {
    const res = await request(app)
      .post("/verify/offchain")
      .send({ batchId: BATCH, serial: "SN-BATCH-TEST-0007" });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.result).toBe("VALID");
  });
});

describe("POST /verify/tamper", () => {
  it("flags a tampered product as INVALID", async () => {
    const res = await request(app)
      .post("/verify/tamper")
      .send({ batchId: BATCH, serial: "SN-BATCH-TEST-0005", field: "serial" });

    expect(res.status).toBe(200);
    expect(res.body.offchainResult).toBe("INVALID");
    expect(res.body.original.leaf).not.toBe(res.body.tampered.leaf);
  });

  it("flags a tampered sku as INVALID", async () => {
    const res = await request(app)
      .post("/verify/tamper")
      .send({ batchId: BATCH, serial: "SN-BATCH-TEST-0006", field: "sku", newValue: "FAKE-SKU" });
    expect(res.status).toBe(200);
    expect(res.body.offchainResult).toBe("INVALID");
  });

  it("rejects tampering manufactured_at with a non-date (structurally invalid)", async () => {
    const res = await request(app)
      .post("/verify/tamper")
      .send({
        batchId: BATCH,
        serial: "SN-BATCH-TEST-0007",
        field: "manufactured_at",
        newValue: "not-a-date"
      });
    expect(res.status).toBe(200);
    expect(res.body.offchainResult).toBe("INVALID");
    expect(res.body.tampered.rejected).toBeTruthy();
  });
});

describe("input validation (zod) + error handling", () => {
  it("rejects /batch/create with a non-numeric count (400 + issues)", async () => {
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: "ZOD-1", count: "ten" });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("rejects /batch/register without batchId (400)", async () => {
    const res = await request(app).post("/batch/register").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for /batch/register with an unknown batch (handler path intact)", async () => {
    const res = await request(app)
      .post("/batch/register")
      .send({ batchId: "DEFINITELY-NOT-A-BATCH" });
    expect(res.status).toBe(404);
  });

  it("rejects /verify/tamper without serial (400)", async () => {
    const res = await request(app)
      .post("/verify/tamper")
      .send({ batchId: BATCH });
    expect(res.status).toBe(400);
  });

  it("returns 404 superseding an unknown batch (handler path intact)", async () => {
    const res = await request(app)
      .post("/batch/NO-SUCH-BATCH/supersede")
      .send({
        products: [
          { serial: "SN-X-1", sku: "S", batch_id: "NO-SUCH-BATCH", manufactured_at: "2024-01-01T00:00:00.000Z" }
        ]
      });
    expect(res.status).toBe(404);
  });

  it("rejects /supersede with empty products (400)", async () => {
    const res = await request(app)
      .post(`/batch/${BATCH}/supersede`)
      .send({ products: [] });
    expect(res.status).toBe(400);
  });
});
