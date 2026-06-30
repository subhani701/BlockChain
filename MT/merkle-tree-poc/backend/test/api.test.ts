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
});
