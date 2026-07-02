/**
 * backend/src/services/store.ts
 * -----------------------------------------------------------------------------
 * Pluggable persistence layer (Phase 3, Task 3.2).
 *
 * A `Store` interface with two implementations selected by STORE_DRIVER:
 *   - "json"   (default) : in-memory Map mirrored to a JSON file (dev-friendly).
 *   - "sqlite"           : a real embedded SQL database via Node's built-in
 *                          `node:sqlite` (no external server, production-viable).
 *
 * The interface makes it trivial to add a PostgresStore later (same methods)
 * without touching routes/services.
 * -----------------------------------------------------------------------------
 */
import fs from "fs";
import path from "path";
import type { DatabaseSync, StatementSync } from "node:sqlite";
import { config } from "../config";
import { logger } from "../logger";
import type { Batch } from "../../../shared/types";

/** Storage contract used by the rest of the backend. */
export interface Store {
  upsert(batch: Batch): void;
  get(batchId: string): Batch | undefined;
  has(batchId: string): boolean;
  list(): Batch[];
  /** Test helper: wipe all batches. */
  _reset(): void;
}

/**
 * JSON-file store: in-memory Map mirrored to disk. Survives restarts.
 */
export class JsonStore implements Store {
  private batches = new Map<string, Batch>();

  constructor(private readonly file: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        const arr: Batch[] = JSON.parse(fs.readFileSync(this.file, "utf-8"));
        arr.forEach((b) => this.batches.set(b.batchId, b));
        logger.info({ count: arr.length, file: this.file }, "loaded batches from disk");
      }
    } catch (err) {
      logger.warn({ err }, "could not load data file");
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.file,
        JSON.stringify([...this.batches.values()], null, 2),
        "utf-8"
      );
    } catch (err) {
      logger.warn({ err }, "could not persist data file");
    }
  }

  upsert(batch: Batch): void {
    this.batches.set(batch.batchId, batch);
    this.persist();
  }
  get(batchId: string): Batch | undefined {
    return this.batches.get(batchId);
  }
  has(batchId: string): boolean {
    return this.batches.has(batchId);
  }
  list(): Batch[] {
    return [...this.batches.values()];
  }
  _reset(): void {
    this.batches.clear();
  }
}

/**
 * SQLite store backed by Node's built-in `node:sqlite`. Each batch is stored as
 * one row (batchId PRIMARY KEY, data = JSON). node:sqlite is loaded lazily so
 * the JSON driver never pays its (experimental) import cost.
 */
export class SqliteStore implements Store {
  private db: DatabaseSync;
  private stmtUpsert: StatementSync;
  private stmtGet: StatementSync;
  private stmtAll: StatementSync;
  private stmtReset: StatementSync;

  constructor(dbPath: string) {
    // Lazy require: only load node:sqlite when this driver is actually used.
    const { DatabaseSync: DB } = require("node:sqlite") as typeof import("node:sqlite");
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DB(dbPath);
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS batches (batchId TEXT PRIMARY KEY, data TEXT NOT NULL)"
    );
    this.stmtUpsert = this.db.prepare(
      "INSERT OR REPLACE INTO batches (batchId, data) VALUES (?, ?)"
    );
    this.stmtGet = this.db.prepare("SELECT data FROM batches WHERE batchId = ?");
    this.stmtAll = this.db.prepare("SELECT data FROM batches");
    this.stmtReset = this.db.prepare("DELETE FROM batches");
  }

  upsert(batch: Batch): void {
    this.stmtUpsert.run(batch.batchId, JSON.stringify(batch));
  }
  get(batchId: string): Batch | undefined {
    const row = this.stmtGet.get(batchId);
    return row ? (JSON.parse(row.data as string) as Batch) : undefined;
  }
  has(batchId: string): boolean {
    return this.stmtGet.get(batchId) !== undefined;
  }
  list(): Batch[] {
    return this.stmtAll.all().map((r) => JSON.parse(r.data as string) as Batch);
  }
  _reset(): void {
    this.stmtReset.run();
  }
}

/** Select the store implementation from STORE_DRIVER (default "json"). */
function createStore(): Store {
  const driver = (process.env.STORE_DRIVER || "json").toLowerCase();
  if (driver === "sqlite") {
    const dbPath =
      process.env.SQLITE_PATH ||
      config.dataFile.replace(/\.json$/, "") + ".sqlite";
    logger.info({ driver, path: dbPath }, "using SQLite store");
    return new SqliteStore(dbPath);
  }
  return new JsonStore(config.dataFile);
}

export const store: Store = createStore();
