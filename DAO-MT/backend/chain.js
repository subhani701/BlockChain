"use strict";
// viem public client (READ + event indexing only — no private keys server-side).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createPublicClient, http, defineChain } = require("viem");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

const deploymentsPath = path.join(__dirname, "deployments.json");
if (!fs.existsSync(deploymentsPath)) {
  throw new Error(
    "backend/deployments.json missing — run `truffle migrate --network development` first."
  );
}
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

const ganache = defineChain({
  id: 1337,
  name: "Ganache",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain: ganache, transport: http(RPC_URL) });

// Convenience read helper
async function read(contractName, functionName, args = []) {
  const c = deployments[contractName];
  return publicClient.readContract({
    address: c.address,
    abi: c.abi,
    functionName,
    args,
  });
}

module.exports = { publicClient, deployments, ganache, read };
