"use strict";
const express = require("express");
const cors = require("cors");

const db = require("./db");
const { deployments, read } = require("./chain");
const { verify } = require("./verify");
const { getProof } = require("./merkle-proof");
const { startIndexer, sync } = require("./indexer");
const { idFor } = require("../lib/merkle");

require("dotenv").config();
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());

const STATUS_NAME = ["None", "Authorized", "UnderReview", "Warned", "Suspended", "Blacklisted"];
const ACTION_NAME = ["Warn", "Suspend", "Blacklist", "Reinstate"];
const PROPOSAL_STATUS = ["Open", "Passed", "Failed", "Executed"];
const SEVERITY_POINTS = { low: 10, medium: 20, high: 30 };

// ---- Dealers ----
app.get("/api/dealers", async (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM dealers").all();
    const out = [];
    for (const d of rows) {
      const statusRaw = await read("DealerRegistry", "dealerStatus", [d.id]);
      out.push({
        id: d.id,
        name: d.name,
        status: STATUS_NAME[Number(statusRaw)] || "None",
        signalScore: d.signalScore,
      });
    }
    out.sort((a, b) => b.signalScore - a.signalScore);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Service requests ----
app.get("/api/service-requests", (_req, res) => {
  res.json(db.prepare("SELECT * FROM service_requests ORDER BY id ASC").all());
});

app.get("/api/service-requests/:id", (req, res) => {
  const sr = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(req.params.id);
  if (!sr) return res.status(404).json({ error: "not found" });
  res.json(sr);
});

app.post("/api/service-requests/:id/scan", async (req, res) => {
  try {
    const sr = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(req.params.id);
    if (!sr) return res.status(404).json({ error: "not found" });
    const region = req.body.region || sr.region;
    const result = await verify(sr.serial, region);
    db.prepare(
      "UPDATE service_requests SET status = 'Verified', verdict = ?, confidence = ? WHERE id = ?"
    ).run(result.verdict, result.confidence, sr.id);
    res.json({ serviceRequestId: sr.id, serial: sr.serial, region, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Reports ----
app.post("/api/reports", (req, res) => {
  const { serial, dealerId, severity } = req.body || {};
  if (!serial || !dealerId || !severity)
    return res.status(400).json({ error: "serial, dealerId, severity required" });
  const dealer = db.prepare("SELECT * FROM dealers WHERE id = ?").get(dealerId);
  if (!dealer) return res.status(404).json({ error: "dealer not found" });

  db.prepare(
    "INSERT INTO counterfeit_reports (serial,dealerId,severity,createdAt) VALUES (?,?,?,?)"
  ).run(serial, dealerId, severity, Date.now());

  const pts = SEVERITY_POINTS[String(severity).toLowerCase()] || 15;
  const newScore = Math.min(100, dealer.signalScore + pts);
  db.prepare("UPDATE dealers SET signalScore = ? WHERE id = ?").run(newScore, dealerId);

  res.json({ dealerId, name: dealer.name, signalScore: newScore, added: pts });
});

// ---- Proposals (read on-chain, always fresh) ----
async function readProposal(id) {
  const p = await read("GovernanceDAO", "getProposal", [BigInt(id)]);
  return {
    id,
    dealerId: p[0],
    action: ACTION_NAME[Number(p[1])],
    actionCode: Number(p[1]),
    forVotes: Number(p[2]),
    againstVotes: Number(p[3]),
    quorum: Number(p[4]),
    status: PROPOSAL_STATUS[Number(p[5])],
    statusCode: Number(p[5]),
  };
}

app.get("/api/proposals", async (_req, res) => {
  try {
    const count = Number(await read("GovernanceDAO", "proposalCount", []));
    const dealers = db.prepare("SELECT id,name FROM dealers").all();
    const nameById = Object.fromEntries(dealers.map((d) => [d.id.toLowerCase(), d.name]));
    const out = [];
    for (let i = 0; i < count; i++) {
      const p = await readProposal(i);
      out.push({ ...p, dealerName: nameById[p.dealerId.toLowerCase()] || p.dealerId });
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/proposals/:id", async (req, res) => {
  try {
    const count = Number(await read("GovernanceDAO", "proposalCount", []));
    const id = Number(req.params.id);
    if (id < 0 || id >= count) return res.status(404).json({ error: "not found" });
    const p = await readProposal(id);
    const dealer = db.prepare("SELECT name FROM dealers WHERE id = ?").get(p.dealerId);
    res.json({ ...p, dealerName: dealer ? dealer.name : p.dealerId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Contracts (addresses + ABIs for the frontend) ----
app.get("/api/contracts", (_req, res) => res.json(deployments));

// ---- Proof helper ----
app.get("/api/proof", (req, res) => {
  const { batchId, serial } = req.query;
  if (!batchId || !serial) return res.status(400).json({ error: "batchId & serial required" });
  const { leaf, proof, inTree } = getProof(batchId, serial);
  res.json({ batchId, batchIdBytes: idFor(batchId), serial, leaf, proof, inTree });
});

// ---- Force re-sync (called by frontend after a write tx) ----
app.post("/api/sync", async (_req, res) => {
  try {
    const r = await sync();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  startIndexer();
});
