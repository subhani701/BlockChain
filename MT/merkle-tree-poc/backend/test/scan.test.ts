/**
 * backend/test/scan.test.ts
 * -----------------------------------------------------------------------------
 * Scan ledger + replay (cloned-QR) detection.
 *
 * These are pure unit tests — no chain required, so they run in CI. The
 * chain-dependent half (verifyScan) is exercised by the gated e2e suite and by
 * live checks against Ganache.
 * -----------------------------------------------------------------------------
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateReplay,
  record,
  summaryFor,
  historyFor,
  _reset
} from "../src/services/scanLedger";
import { CHECK_WEIGHTS } from "../src/services/scanVerify";

const SERIAL = "SN-SCAN-TEST-0001";

beforeEach(() => _reset());

describe("scan ledger", () => {
  it("has no history for an unseen serial", () => {
    expect(summaryFor(SERIAL)).toBeNull();
    expect(historyFor(SERIAL)).toEqual([]);
  });

  it("records scans in order and aggregates them", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    record({ serial: SERIAL, at: "2026-01-02T00:00:00.000Z", location: "Hamburg" });

    const s = summaryFor(SERIAL)!;
    expect(s.scanCount).toBe(2);
    expect(s.firstSeen).toBe("2026-01-01T00:00:00.000Z");
    expect(s.lastSeen).toBe("2026-01-02T00:00:00.000Z");
    expect(s.locations).toEqual(["Hamburg"]);
  });

  it("keeps ledgers separate per serial", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z" });
    expect(summaryFor("SN-OTHER")).toBeNull();
    expect(summaryFor(SERIAL)!.scanCount).toBe(1);
  });
});

describe("qr_not_replayed — replay detection", () => {
  it("passes on the first ever scan", () => {
    const r = evaluateReplay(SERIAL, "Hamburg");
    expect(r.passed).toBe(true);
    expect(r.priorScanCount).toBe(0);
    expect(r.detail).toMatch(/first recorded scan/i);
  });

  it("passes when re-scanned at the SAME location", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    const r = evaluateReplay(SERIAL, "Hamburg");
    expect(r.passed).toBe(true);
    expect(r.priorScanCount).toBe(1);
  });

  it("FAILS when the same serial appears in a DIFFERENT location (cloned QR)", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    const r = evaluateReplay(SERIAL, "Mumbai");
    expect(r.passed).toBe(false);
    expect(r.priorLocations).toEqual(["Hamburg"]);
    expect(r.detail).toMatch(/cannot be in two places|cloned/i);
  });

  it("still fails if the clone appears after several same-location scans", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    record({ serial: SERIAL, at: "2026-01-02T00:00:00.000Z", location: "Hamburg" });
    expect(evaluateReplay(SERIAL, "Lagos").passed).toBe(false);
  });

  it("cannot judge a location conflict when no location is supplied (documented)", () => {
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    const r = evaluateReplay(SERIAL, undefined);
    expect(r.passed).toBe(true); // passes, but says why it could not judge
    expect(r.priorScanCount).toBe(1);
    expect(r.detail).toMatch(/no scan location supplied/i);
  });

  it("evaluates BEFORE the current scan is recorded (not its own prior)", () => {
    const first = evaluateReplay(SERIAL, "Hamburg");
    record({ serial: SERIAL, at: "2026-01-01T00:00:00.000Z", location: "Hamburg" });
    expect(first.passed).toBe(true);
    expect(first.priorScanCount).toBe(0);
  });
});

describe("check weights match project.md", () => {
  it("the 7 weighted checks sum to 1.00", () => {
    const total = Object.values(CHECK_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Number(total.toFixed(4))).toBe(1);
  });

  it("uses project.md's exact weights", () => {
    expect(CHECK_WEIGHTS.merkle_proof_valid).toBe(0.2);
    expect(CHECK_WEIGHTS.root_anchored_on_chain).toBe(0.15);
    expect(CHECK_WEIGHTS.batch_active).toBe(0.1);
    expect(CHECK_WEIGHTS.dealer_authorized).toBe(0.2);
    expect(CHECK_WEIGHTS.custody_continuous).toBe(0.15);
    expect(CHECK_WEIGHTS.qr_not_replayed).toBe(0.1);
    expect(CHECK_WEIGHTS.region_consistent).toBe(0.1);
  });

  it("the checks this module evaluates sum to 0.55", () => {
    const evaluated =
      CHECK_WEIGHTS.merkle_proof_valid +
      CHECK_WEIGHTS.root_anchored_on_chain +
      CHECK_WEIGHTS.batch_active +
      CHECK_WEIGHTS.qr_not_replayed;
    expect(Number(evaluated.toFixed(4))).toBe(0.55);
  });
});
