/**
 * backend/src/config.ts
 * -----------------------------------------------------------------------------
 * Loads environment configuration once and exposes a typed config object.
 * -----------------------------------------------------------------------------
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  rpcUrl: process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545",
  /** Optional explicit contract address; if empty we read it from the artifact. */
  contractAddress: process.env.CONTRACT_ADDRESS || "",
  manufacturerAccountIndex: parseInt(
    process.env.MANUFACTURER_ACCOUNT_INDEX || "0",
    10
  ),
  dataFile: path.resolve(
    process.cwd(),
    process.env.DATA_FILE || "./data/batches.json"
  ),
  /** Path to the Truffle artifact produced by `truffle compile/migrate`. */
  artifactPath: path.resolve(
    process.cwd(),
    "../build/contracts/ProductRegistry.json"
  )
};
