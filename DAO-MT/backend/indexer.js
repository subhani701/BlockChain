"use strict";
// Watches DealerStatusChanged, BatchAnchored, ProposalExecuted and upserts into sqlite.
const { publicClient, deployments } = require("./chain");
const db = require("./db");

const STATUS_NAME = [
  "None",
  "Authorized",
  "UnderReview",
  "Warned",
  "Suspended",
  "Blacklisted",
];

async function sync() {
  const latest = await publicClient.getBlockNumber();

  // DealerStatusChanged -> keep dealers.status fresh
  const statusLogs = await publicClient.getContractEvents({
    address: deployments.DealerRegistry.address,
    abi: deployments.DealerRegistry.abi,
    eventName: "DealerStatusChanged",
    fromBlock: 0n,
    toBlock: latest,
  });
  const updStatus = db.prepare("UPDATE dealers SET status = ? WHERE id = ?");
  for (const log of statusLogs) {
    const name = STATUS_NAME[Number(log.args.status)] || "None";
    updStatus.run(name, log.args.dealerId);
  }

  // BatchAnchored -> ensure batch row exists/active
  const batchLogs = await publicClient.getContractEvents({
    address: deployments.BatchRegistry.address,
    abi: deployments.BatchRegistry.abi,
    eventName: "BatchAnchored",
    fromBlock: 0n,
    toBlock: latest,
  });
  // (batchId here is the keccak id; off-chain table keys by readable batch key, so this
  //  is informational — we just make sure the indexer is exercising the event.)
  void batchLogs;

  // ProposalExecuted -> enforcement_log
  const execLogs = await publicClient.getContractEvents({
    address: deployments.GovernanceDAO.address,
    abi: deployments.GovernanceDAO.abi,
    eventName: "ProposalExecuted",
    fromBlock: 0n,
    toBlock: latest,
  });
  const insLog = db.prepare(
    "INSERT OR IGNORE INTO enforcement_log (proposalId,dealerId,newStatus,ts) VALUES (?,?,?,?)"
  );
  for (const log of execLogs) {
    const id = Number(log.args.id);
    const name = STATUS_NAME[Number(log.args.newStatus)] || "None";
    insLog.run(id, log.args.dealerId, name, Date.now());
  }

  return { block: Number(latest), statusEvents: statusLogs.length, executed: execLogs.length };
}

function startIndexer(intervalMs = 4000) {
  sync()
    .then((r) => console.log("[indexer] initial sync", r))
    .catch((e) => console.error("[indexer] initial sync failed:", e.message));
  setInterval(() => {
    sync().catch((e) => console.error("[indexer] sync error:", e.message));
  }, intervalMs);
}

module.exports = { sync, startIndexer };
