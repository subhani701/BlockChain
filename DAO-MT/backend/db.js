"use strict";
// better-sqlite3 init + schema + seed. Off-chain data only.
const path = require("path");
const Database = require("better-sqlite3");
const { idFor } = require("../lib/merkle");

const db = new Database(path.join(__dirname, "skf.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS dealers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  signalScore INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS batches (
  batchId TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS serials (
  serial TEXT PRIMARY KEY,
  batchId TEXT NOT NULL,
  dealerId TEXT NOT NULL,
  region TEXT NOT NULL,
  scanned INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  verdict TEXT,
  confidence INTEGER
);
CREATE TABLE IF NOT EXISTS counterfeit_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial TEXT NOT NULL,
  dealerId TEXT NOT NULL,
  severity TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS custody_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial TEXT NOT NULL,
  role TEXT NOT NULL,
  actor TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS enforcement_log (
  proposalId INTEGER PRIMARY KEY,
  dealerId TEXT NOT NULL,
  newStatus TEXT NOT NULL,
  ts INTEGER NOT NULL
);
`);

const BATCH = "BATCH-2026-001";

// ---- one-time seed ----
const alreadySeeded = db.prepare("SELECT COUNT(*) AS n FROM dealers").get().n > 0;
if (!alreadySeeded) {
  const seedDealers = [
    { name: "Nordic Bearings", status: "Authorized", signal: 0 },
    { name: "Müller GmbH", status: "UnderReview", signal: 10 },
    { name: "Eastern Motors", status: "Warned", signal: 25 },
    { name: "Midlands Supply", status: "Suspended", signal: 60 },
    { name: "Grey Market", status: "Blacklisted", signal: 95 },
  ];
  const insDealer = db.prepare(
    "INSERT INTO dealers (id,name,status,signalScore) VALUES (?,?,?,?)"
  );
  const dealerId = {};
  for (const d of seedDealers) {
    const id = idFor(d.name);
    dealerId[d.name] = id;
    insDealer.run(id, d.name, d.status, d.signal);
  }

  db.prepare("INSERT INTO batches (batchId,active) VALUES (?,1)").run(BATCH);

  // 8 genuine serials of BATCH-2026-001 + 1 fake serial.
  const insSerial = db.prepare(
    "INSERT INTO serials (serial,batchId,dealerId,region,scanned) VALUES (?,?,?,?,0)"
  );
  const genuine = [
    ["SN-88421-A", "Nordic Bearings", "EU-North"],
    ["SN-88421-B", "Nordic Bearings", "EU-North"],
    ["SN-88422-C", "Müller GmbH", "EU-Central"],
    ["SN-88423-D", "Müller GmbH", "EU-Central"],
    ["SN-88424-E", "Eastern Motors", "EU-East"],
    ["SN-88425-F", "Eastern Motors", "EU-East"],
    ["SN-88426-G", "Midlands Supply", "EU-West"],
    ["SN-88427-H", "Grey Market", "EU-South"],
  ];
  for (const [serial, dealer, region] of genuine) {
    insSerial.run(serial, BATCH, dealerId[dealer], region);
  }
  // Fake serial: "known" to the system (so it is COUNTERFEIT, not CANNOT_VERIFY)
  // but NOT part of the anchored Merkle tree. Assigned to Eastern Motors (Warned).
  insSerial.run("SN-99999-Z", BATCH, dealerId["Eastern Motors"], "EU-East");

  // Custody chains
  const insCustody = db.prepare(
    "INSERT INTO custody_events (serial,role,actor,ts) VALUES (?,?,?,?)"
  );
  const t0 = 1700000000;
  // genuine SN-88421-A: full unbroken PLANT -> DISTRIBUTOR -> DEALER
  insCustody.run("SN-88421-A", "PLANT", "SKF Gothenburg Plant", t0);
  insCustody.run("SN-88421-A", "DISTRIBUTOR", "Nordic Distribution AB", t0 + 100);
  insCustody.run("SN-88421-A", "DEALER", "Nordic Bearings", t0 + 200);
  // fake SN-99999-Z: broken chain (starts at DISTRIBUTOR, no PLANT origin)
  insCustody.run("SN-99999-Z", "DISTRIBUTOR", "Unknown Trader", t0 + 50);
  insCustody.run("SN-99999-Z", "DEALER", "Eastern Motors", t0 + 150);

  // 2 service requests: one genuine, one fake
  const insSR = db.prepare(
    "INSERT INTO service_requests (serial,region,status) VALUES (?,?,'Open')"
  );
  insSR.run("SN-88421-A", "EU-North"); // genuine
  insSR.run("SN-99999-Z", "EU-East"); // fake (region matches serial -> region check passes)

  console.log("[db] seeded dealers, serials, custody, service requests");
}

module.exports = db;
