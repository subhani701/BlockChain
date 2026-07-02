/**
 * backend/test/e2e.test.ts
 * -----------------------------------------------------------------------------
 * End-to-end test (Phase 5, Task 5.1): drives the FULL flow through the real
 * Express API against a REAL chain (Ganache + deployed contract):
 *   create -> register(on-chain) -> proof -> verify(on-chain) -> tamper ->
 *   supersede(on-chain) -> verify(new data).
 *
 * Gated behind RUN_E2E=1 so the default `npm test` stays chain-free. Run with:
 *   RUN_E2E=1 GANACHE_RPC_URL=http://127.0.0.1:7545 npx vitest run test/e2e.test.ts
 * (requires: ganache on 7545 + `truffle migrate`).
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server";

const RUN = process.env.RUN_E2E === "1";
const app = createApp();
const BATCH = `E2E-${Date.now()}`;

describe.skipIf(!RUN)("E2E: API <-> chain", () => {
  it("create -> register -> proof -> verify -> tamper -> supersede -> verify", async () => {
    // 1. Create a batch.
    const create = await request(app)
      .post("/batch/create")
      .send({ batchId: BATCH, count: 4 });
    expect(create.status).toBe(201);
    const serial = create.body.products[1].serial;

    // 2. Register the root on-chain.
    const reg = await request(app)
      .post("/batch/register")
      .send({ batchId: BATCH });
    expect(reg.status).toBe(200);
    expect(reg.body.merkleRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(reg.body.onChain.gasUsed).toBeGreaterThan(0);

    // 3. Fetch a proof.
    const proof = await request(app)
      .get(`/proof/${serial}`)
      .query({ batchId: BATCH });
    expect(proof.status).toBe(200);
    expect(Array.isArray(proof.body.proof)).toBe(true);

    // 4. Verify genuine on-chain -> VALID.
    const verify = await request(app)
      .post("/verify")
      .send({ batchId: BATCH, serial });
    expect(verify.status).toBe(200);
    expect(verify.body.result).toBe("VALID");

    // 5. Tamper -> INVALID.
    const tamper = await request(app)
      .post("/verify/tamper")
      .send({ batchId: BATCH, serial, field: "sku", newValue: "FAKE" });
    expect(tamper.status).toBe(200);
    expect(tamper.body.offchainResult).toBe("INVALID");

    // 6. Supersede with corrected data -> version 2.
    const corrected = create.body.products.map((p: { serial: string }, i: number) => ({
      serial: p.serial,
      sku: "SKF-CORRECTED",
      batch_id: BATCH,
      manufactured_at: new Date(1700000000000 + i * 60000).toISOString()
    }));
    const sup = await request(app)
      .post(`/batch/${BATCH}/supersede`)
      .send({ products: corrected });
    expect(sup.status).toBe(200);
    expect(sup.body.version).toBe(2);

    // 7. Verify the corrected product against the NEW root -> VALID.
    const verify2 = await request(app)
      .post("/verify")
      .send({ batchId: BATCH, serial });
    expect(verify2.status).toBe(200);
    expect(verify2.body.result).toBe("VALID");
  }, 60000);
});
