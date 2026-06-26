/**
 * backend/src/services/blockchain.ts
 * -----------------------------------------------------------------------------
 * All Ethereum interaction lives here. Uses Ethers.js (v6) to talk to Ganache
 * and the deployed ProductRegistry contract.
 *
 * The connection is initialized LAZILY so the rest of the API (batch creation,
 * proof generation) keeps working even if Ganache is not running yet.
 * -----------------------------------------------------------------------------
 */
import fs from "fs";
import { ethers, Contract, JsonRpcProvider } from "ethers";
import { config } from "../config";
import type { OnChainInfo } from "../../../shared/types";

interface ChainContext {
  provider: JsonRpcProvider;
  /** Contract instance connected to the manufacturer signer. */
  contract: Contract;
  address: string;
  manufacturer: string;
  accounts: string[];
}

let ctx: ChainContext | null = null;

/** Read and parse the Truffle artifact (ABI + per-network addresses). */
function loadArtifact(): any {
  if (!fs.existsSync(config.artifactPath)) {
    throw new Error(
      `Contract artifact not found at ${config.artifactPath}. ` +
        `Run "npm run compile" and "npm run migrate" first.`
    );
  }
  return JSON.parse(fs.readFileSync(config.artifactPath, "utf-8"));
}

/**
 * Establish (or reuse) a connection to Ganache + the contract.
 * Throws a descriptive error if anything is missing.
 */
export async function getChain(): Promise<ChainContext> {
  if (ctx) return ctx;

  const artifact = loadArtifact();
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Raw RPC call so we get plain address strings.
  const accounts: string[] = await provider.send("eth_accounts", []);
  if (!accounts.length) {
    throw new Error(
      `No accounts returned from ${config.rpcUrl}. Is Ganache running?`
    );
  }

  // Truffle records addresses keyed by NETWORK id (net_version), which can
  // differ from the EIP-155 chainId — so query net_version to match the key.
  const networkId: string = await provider.send("net_version", []);
  const fromArtifact = artifact.networks?.[networkId]?.address as
    | string
    | undefined;
  const address = config.contractAddress || fromArtifact || "";

  if (!address) {
    throw new Error(
      `No contract address. Deploy with "npm run migrate" (network id ` +
        `${networkId}) or set CONTRACT_ADDRESS in backend/.env.`
    );
  }

  // Ganache accounts are unlocked, so a JsonRpcSigner signs via the node — no
  // private key needed. We pick the manufacturer (the batch-registering owner).
  const signer = await provider.getSigner(config.manufacturerAccountIndex);
  const manufacturer = await signer.getAddress();

  const contract = new ethers.Contract(address, artifact.abi, signer);

  ctx = { provider, contract, address, manufacturer, accounts };
  // eslint-disable-next-line no-console
  console.log(
    `[chain] connected to ${config.rpcUrl} | contract ${address} | ` +
      `manufacturer ${manufacturer}`
  );
  return ctx;
}

/** Force re-connection (used after a fresh migration in dev). */
export function resetChain(): void {
  ctx = null;
}

/** Summary describing the chain connection (for a /health-style endpoint). */
export async function chainStatus(): Promise<{
  connected: boolean;
  rpcUrl: string;
  contractAddress?: string;
  accounts?: string[];
  error?: string;
}> {
  try {
    const c = await getChain();
    return {
      connected: true,
      rpcUrl: config.rpcUrl,
      contractAddress: c.address,
      accounts: c.accounts
    };
  } catch (err) {
    return {
      connected: false,
      rpcUrl: config.rpcUrl,
      error: (err as Error).message
    };
  }
}

/**
 * Register a batch's Merkle root on-chain.
 * @returns transaction details (hash, block, gas used, address).
 */
export async function registerBatchOnChain(
  batchId: string,
  merkleRoot: string,
  totalProducts: number
): Promise<OnChainInfo> {
  const { contract, manufacturer, address } = await getChain();

  // Ethers estimates gas automatically; send the tx then wait for the receipt.
  const tx = await contract.registerBatch(batchId, merkleRoot, totalProducts);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: Number(receipt.gasUsed),
    contractAddress: address,
    registeredBy: manufacturer
  };
}

/** Read a batch record straight from the contract storage. */
export async function getBatchOnChain(batchId: string): Promise<{
  batchId: string;
  merkleRoot: string;
  totalProducts: number;
  createdAt: number;
}> {
  const { contract } = await getChain();
  // getBatch returns named outputs (id, merkleRoot, totalProducts, createdAt).
  const result = await contract.getBatch(batchId);
  return {
    batchId: result.id,
    merkleRoot: result.merkleRoot,
    totalProducts: Number(result.totalProducts),
    createdAt: Number(result.createdAt)
  };
}

/**
 * Verify a product against the on-chain Merkle root.
 *
 * We do TWO things to be maximally instructive:
 *   1. A gas-free read (verifyProductView) to get the boolean reliably.
 *   2. A real transaction to verifyProduct so the demo can show a tx hash +
 *      gas used + the emitted ProductVerified event (an auditable trail).
 */
export async function verifyProductOnChain(
  batchId: string,
  proof: string[],
  leaf: string
): Promise<{
  valid: boolean;
  txHash: string;
  blockNumber: number;
  gasUsed: number;
}> {
  const { contract } = await getChain();

  // 1) Read-only verification (the source of truth for the result).
  const valid: boolean = await contract.verifyProductView(batchId, proof, leaf);

  // 2) State-changing call to leave an on-chain audit record + show gas.
  const tx = await contract.verifyProduct(batchId, proof, leaf);
  const receipt = await tx.wait();

  return {
    valid,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: Number(receipt.gasUsed)
  };
}
