"use strict";
// The 7-weighted-check authenticity engine.
const { read } = require("./chain");
const db = require("./db");
const { getProof } = require("./merkle-proof");
const { idFor } = require("../lib/merkle");

const WEIGHTS = {
  merkle_proof_valid: 0.2,
  root_anchored_on_chain: 0.15,
  batch_active: 0.1,
  dealer_authorized: 0.2,
  custody_continuous: 0.15,
  qr_not_replayed: 0.1,
  region_consistent: 0.1,
};

const ROLE_ORDER = { PLANT: 0, DISTRIBUTOR: 1, DEALER: 2, TECHNICIAN: 3 };
const AUTHORIZED = 1; // DealerRegistry.Status.Authorized

async function verify(serial, scanRegion) {
  const row = db.prepare("SELECT * FROM serials WHERE serial = ?").get(serial);

  // Unknown serial (no record at all) -> CANNOT_VERIFY
  if (!row) {
    const attributions = Object.keys(WEIGHTS).map((key) => ({
      key,
      weight: WEIGHTS[key],
      passed: false,
    }));
    return { verdict: "CANNOT_VERIFY", confidence: 0, score: 0, dealerId: null, attributions };
  }

  const batchKey = row.batchId;
  const batchIdBytes = idFor(batchKey);

  // 1. merkle_proof_valid -> on-chain verifyPart
  let merkleValid = false;
  const { proof, inTree } = getProof(batchKey, serial);
  if (inTree) {
    merkleValid = await read("BatchRegistry", "verifyPart", [batchIdBytes, serial, proof]);
  }

  // 2. root_anchored_on_chain
  const anchored = await read("BatchRegistry", "isAnchored", [batchIdBytes]);

  // 3. batch_active (db flag)
  const batchRow = db.prepare("SELECT active FROM batches WHERE batchId = ?").get(batchKey);
  const batchActive = !!(batchRow && batchRow.active === 1);

  // 4. dealer_authorized -> on-chain status
  const statusRaw = await read("DealerRegistry", "dealerStatus", [row.dealerId]);
  const dealerAuthorized = Number(statusRaw) === AUTHORIZED;

  // 5. custody_continuous (db: unbroken PLANT -> ... chain)
  const events = db
    .prepare("SELECT role FROM custody_events WHERE serial = ? ORDER BY ts ASC")
    .all(serial);
  let custodyOk = events.length > 0 && events[0].role === "PLANT";
  for (let i = 1; i < events.length && custodyOk; i++) {
    if (ROLE_ORDER[events[i].role] <= ROLE_ORDER[events[i - 1].role]) custodyOk = false;
  }

  // 6. qr_not_replayed (db scanned flag)
  const qrOk = row.scanned === 0;

  // 7. region_consistent
  const regionOk = scanRegion ? row.region === scanRegion : true;

  const results = {
    merkle_proof_valid: Boolean(merkleValid),
    root_anchored_on_chain: Boolean(anchored),
    batch_active: batchActive,
    dealer_authorized: dealerAuthorized,
    custody_continuous: custodyOk,
    qr_not_replayed: qrOk,
    region_consistent: regionOk,
  };

  let score = 0;
  const attributions = Object.keys(WEIGHTS).map((key) => {
    const passed = results[key];
    if (passed) score += WEIGHTS[key];
    return { key, weight: WEIGHTS[key], passed };
  });
  score = Math.round(score * 100) / 100;

  let verdict;
  if (!results.merkle_proof_valid || score < 0.5) verdict = "COUNTERFEIT";
  else verdict = "AUTHENTIC";

  const confidence = Math.round(score * 100);
  return { verdict, confidence, score, dealerId: row.dealerId, attributions };
}

module.exports = { verify, WEIGHTS };
