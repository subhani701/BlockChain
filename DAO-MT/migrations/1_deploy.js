const fs = require("fs");
const path = require("path");
const merkle = require("../lib/merkle");

const DealerRegistry = artifacts.require("DealerRegistry");
const BatchRegistry = artifacts.require("BatchRegistry");
const GovernanceDAO = artifacts.require("GovernanceDAO");

// Status enum: None=0, Authorized=1, UnderReview=2, Warned=3, Suspended=4, Blacklisted=5
const DEALERS = [
  { name: "Nordic Bearings", status: 1 }, // Authorized
  { name: "Müller GmbH", status: 2 }, // UnderReview
  { name: "Eastern Motors", status: 3 }, // Warned
  { name: "Midlands Supply", status: 4 }, // Suspended
  { name: "Grey Market", status: 5 }, // Blacklisted
];

module.exports = async function (deployer) {
  // 1. DealerRegistry
  await deployer.deploy(DealerRegistry);
  const registry = await DealerRegistry.deployed();

  // 2. BatchRegistry
  await deployer.deploy(BatchRegistry);
  const batch = await BatchRegistry.deployed();

  // 3. GovernanceDAO(registry)
  await deployer.deploy(GovernanceDAO, registry.address);
  const dao = await GovernanceDAO.deployed();

  // 4. Authorize DAO as a writer on the registry
  await registry.setDao(dao.address);

  // 5a. SEED dealers (register => Authorized, then set ladder status via owner)
  for (const d of DEALERS) {
    const id = merkle.idFor(d.name);
    await registry.registerDealer(id);
    if (d.status !== 1) {
      await registry.setStatus(id, d.status);
    }
    console.log(`  dealer ${d.name} (${id}) -> status ${d.status}`);
  }

  // 5b. Anchor the genuine batch
  const batchKey = "BATCH-2026-001";
  const batchId = merkle.idFor(batchKey);
  const tree = merkle.buildTree(merkle.SERIALS_BY_BATCH[batchKey]);
  const root = merkle.getRoot(tree);
  await batch.anchorBatch(batchId, root);
  console.log(`  anchored ${batchKey} (${batchId}) root=${root}`);

  // 6. Write deployments.json (addresses + ABIs) to backend/ and frontend/src/
  const deployments = {
    chainId: 1337,
    DealerRegistry: { address: registry.address, abi: DealerRegistry.abi },
    BatchRegistry: { address: batch.address, abi: BatchRegistry.abi },
    GovernanceDAO: { address: dao.address, abi: GovernanceDAO.abi },
  };
  const json = JSON.stringify(deployments, null, 2);
  const targets = [
    path.join(__dirname, "..", "backend", "deployments.json"),
    path.join(__dirname, "..", "frontend", "src", "deployments.json"),
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, json);
    console.log(`  wrote ${t}`);
  }
};
