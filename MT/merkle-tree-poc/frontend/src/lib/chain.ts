/**
 * frontend/src/lib/chain.ts
 * -----------------------------------------------------------------------------
 * Read the AUTHORITATIVE batch root straight from the blockchain, in the browser.
 *
 * WHY THIS EXISTS (security):
 * A product's QR carries a `root`, but a counterfeiter controls what they print.
 * Verifying a proof against the QR's own root is a self-consistency check, not an
 * authenticity check. The root MUST come from the chain.
 *
 * TRUST ANCHORS — these must come from the verifier's own configuration, never
 * from the scanned QR:
 *   - VITE_RPC_URL          : which chain node to read
 *   - VITE_CONTRACT_ADDRESS : which contract is the real registry
 * If the QR names a different contract, it is pointing you at the attacker's
 * registry. Always read from the trusted address.
 * -----------------------------------------------------------------------------
 */
import { ethers } from "ethers";

/** Minimal read-only ABI — only what a verifier needs. */
const VERIFIER_ABI = [
  "function getBatch(string batchId) view returns (string id, bytes32 merkleRoot, uint256 totalProducts, uint256 createdAt, uint256 updatedAt, uint256 version)",
  "function getBatchStatus(string batchId) view returns (uint8 status)"
];

/** Lifecycle status as stored on-chain (enum ProductRegistry.BatchStatus). */
export const BATCH_STATUS = ["Active", "Recalled", "Revoked"] as const;
export type BatchStatusName = (typeof BATCH_STATUS)[number];

export interface OnChainBatch {
  merkleRoot: string;
  status: number; // 0 Active | 1 Recalled | 2 Revoked
  version: number;
  /** Where this value came from — surfaced in the UI so trust is explicit. */
  source: "chain" | "backend";
}

/** The batch was never registered on-chain — a strong counterfeit signal. */
export class BatchNotRegisteredError extends Error {
  constructor(batchId: string) {
    super(`Batch "${batchId}" is not registered on-chain.`);
    this.name = "BatchNotRegisteredError";
  }
}

/** RPC endpoint the verifier trusts (empty ⇒ direct chain reads unavailable). */
export function getRpcUrl(): string {
  return (import.meta.env.VITE_RPC_URL as string | undefined) ?? "";
}

/** The registry address the verifier trusts (empty ⇒ fall back to chain status). */
export function getTrustedContract(): string {
  return (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ?? "";
}

/**
 * Read a batch's root + status directly from the contract — no backend involved.
 * Throws BatchNotRegisteredError if the batch does not exist on-chain.
 */
export async function readBatchFromChain(
  contractAddress: string,
  batchId: string
): Promise<OnChainBatch> {
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) throw new Error("No RPC endpoint configured (VITE_RPC_URL).");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, VERIFIER_ABI, provider);

  try {
    const [batch, status] = await Promise.all([
      contract.getBatch(batchId),
      contract.getBatchStatus(batchId)
    ]);
    return {
      merkleRoot: batch[1] as string, // (id, merkleRoot, total, createdAt, updatedAt, version)
      version: Number(batch[5]),
      status: Number(status),
      source: "chain"
    };
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (/unknown batch/i.test(msg)) throw new BatchNotRegisteredError(batchId);
    throw err; // network / RPC failure → caller must treat as CANNOT_VERIFY
  }
}
