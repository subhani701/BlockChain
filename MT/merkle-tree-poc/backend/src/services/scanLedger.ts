/**
 * backend/src/services/scanLedger.ts
 * -----------------------------------------------------------------------------
 * Records every verification scan, per product serial.
 *
 * WHY THIS EXISTS:
 * A photocopied QR is byte-identical to the genuine one — it satisfies every
 * cryptographic check. No cryptography can detect a clone. The only defence is to
 * observe SCAN BEHAVIOUR over time: the same serial appearing in two places, or
 * being scanned far more often than a single physical part could be.
 *
 * This is the on-ramp for project.md's `qr_not_replayed` (weight 0.10).
 *
 * REPLAY RULE (explicit, so it can be argued with):
 *   - first ever scan of a serial            -> not replayed (pass)
 *   - later scans from the SAME location     -> not replayed (pass, count grows)
 *   - a scan from a DIFFERENT location       -> REPLAY SUSPECTED (fail)
 *   - scans with no location supplied        -> cannot judge location; pass, but
 *                                               `scanCount` is reported so the
 *                                               caller can apply its own policy.
 *
 * PRODUCTION NOTE: this is a file-backed store, adequate for a PoC. A real
 * deployment needs a database (indexed by serial), plus richer signals —
 * impossible-travel detection (distance/time), scan velocity, and scanner
 * identity/attestation.
 * -----------------------------------------------------------------------------
 */
import fs from "fs";
import path from "path";
import { logger } from "../logger";

export interface ScanEvent {
  serial: string;
  at: string; // ISO timestamp
  location?: string;
  scannerId?: string;
}

export interface ScanHistory {
  serial: string;
  scanCount: number;
  firstSeen: string;
  lastSeen: string;
  locations: string[];
}

/** Result of evaluating the replay signal for one scan. */
export interface ReplayCheck {
  /** true = no replay suspected (the `qr_not_replayed` check passes). */
  passed: boolean;
  detail: string;
  /** Scans of this serial BEFORE the current one. */
  priorScanCount: number;
  priorLocations: string[];
}

const FILE =
  process.env.SCAN_LEDGER_FILE ||
  path.join(process.cwd(), "data", "scans.json");

/** serial -> every scan of that serial, oldest first. */
const ledger = new Map<string, ScanEvent[]>();
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(FILE)) {
      const rows: ScanEvent[] = JSON.parse(fs.readFileSync(FILE, "utf-8"));
      for (const e of rows) {
        const list = ledger.get(e.serial) ?? [];
        list.push(e);
        ledger.set(e.serial, list);
      }
      logger.info({ serials: ledger.size, file: FILE }, "loaded scan ledger");
    }
  } catch (err) {
    logger.warn({ err }, "could not load scan ledger");
  }
}

function persist(): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const rows = [...ledger.values()].flat();
    fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), "utf-8");
  } catch (err) {
    logger.warn({ err }, "could not persist scan ledger");
  }
}

/** Every scan recorded for a serial (oldest first). */
export function historyFor(serial: string): ScanEvent[] {
  load();
  return ledger.get(serial) ?? [];
}

/** Aggregated view for a serial, or null if never scanned. */
export function summaryFor(serial: string): ScanHistory | null {
  const events = historyFor(serial);
  if (!events.length) return null;
  return {
    serial,
    scanCount: events.length,
    firstSeen: events[0].at,
    lastSeen: events[events.length - 1].at,
    locations: [...new Set(events.map((e) => e.location).filter(Boolean))] as string[]
  };
}

/**
 * Evaluate the replay signal for a scan that is ABOUT to be recorded.
 * Call this BEFORE `record()` so the current scan isn't counted as its own prior.
 */
export function evaluateReplay(
  serial: string,
  location?: string
): ReplayCheck {
  const prior = historyFor(serial);
  const priorLocations = [
    ...new Set(prior.map((e) => e.location).filter(Boolean))
  ] as string[];

  if (prior.length === 0) {
    return {
      passed: true,
      detail: "First recorded scan of this serial.",
      priorScanCount: 0,
      priorLocations: []
    };
  }

  if (location && priorLocations.length && !priorLocations.includes(location)) {
    return {
      passed: false,
      detail:
        `Serial previously scanned at [${priorLocations.join(", ")}] and now at ` +
        `"${location}" — the same physical part cannot be in two places. Cloned QR suspected.`,
      priorScanCount: prior.length,
      priorLocations
    };
  }

  return {
    passed: true,
    detail: location
      ? `Seen ${prior.length} time(s) before, all at "${location}".`
      : `Seen ${prior.length} time(s) before; no scan location supplied, so location conflict could not be assessed.`,
    priorScanCount: prior.length,
    priorLocations
  };
}

/** Append a scan to the ledger (and persist). */
export function record(event: ScanEvent): void {
  load();
  const list = ledger.get(event.serial) ?? [];
  list.push(event);
  ledger.set(event.serial, list);
  persist();
}

/** Test helper: wipe the in-memory ledger (and the file). */
export function _reset(): void {
  ledger.clear();
  loaded = true;
  try {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  } catch {
    /* ignore */
  }
}
