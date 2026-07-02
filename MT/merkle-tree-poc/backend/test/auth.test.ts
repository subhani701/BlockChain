/**
 * backend/test/auth.test.ts
 * -----------------------------------------------------------------------------
 * Tests for API-key auth on mutating endpoints (Phase 2, Task 2.4).
 * Sets API_KEYS for the duration of these tests and restores it afterward so
 * the other suites keep running in dev (unprotected) mode.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/server";
import { store } from "../src/services/store";

const app = createApp();
const KEY = "test-secret-key-123";

beforeAll(() => {
  process.env.API_KEYS = KEY;
  store._reset();
});

afterAll(() => {
  // Restore dev mode so subsequent files aren't unexpectedly protected.
  delete process.env.API_KEYS;
});

describe("API-key auth on mutating endpoints", () => {
  it("rejects /batch/create without a key (401)", async () => {
    const res = await request(app)
      .post("/batch/create")
      .send({ batchId: "AUTH-1", count: 4 });
    expect(res.status).toBe(401);
  });

  it("rejects /batch/create with a wrong key (401)", async () => {
    const res = await request(app)
      .post("/batch/create")
      .set("Authorization", "Bearer wrong-key")
      .send({ batchId: "AUTH-1", count: 4 });
    expect(res.status).toBe(401);
  });

  it("accepts /batch/create with the correct key (201)", async () => {
    const res = await request(app)
      .post("/batch/create")
      .set("Authorization", `Bearer ${KEY}`)
      .send({ batchId: "AUTH-OK", count: 4 });
    expect(res.status).toBe(201);
    expect(res.body.totalProducts).toBe(4);
  });

  it("leaves /verify/offchain OPEN (public verification, no key needed)", async () => {
    // AUTH-OK was created above with a key; verifying it needs no key.
    const res = await request(app)
      .post("/verify/offchain")
      .send({ batchId: "AUTH-OK", serial: "SN-AUTH-OK-0001" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it("leaves GET endpoints OPEN", async () => {
    const res = await request(app).get("/batch/AUTH-OK/tree");
    expect(res.status).toBe(200);
  });

  it("guards /verify/tamper too (401 without key)", async () => {
    const res = await request(app)
      .post("/verify/tamper")
      .send({ batchId: "AUTH-OK", serial: "SN-AUTH-OK-0001", field: "sku" });
    expect(res.status).toBe(401);
  });
});
