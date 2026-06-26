/**
 * frontend/src/api/client.ts
 * -----------------------------------------------------------------------------
 * Thin typed wrapper around the backend REST API. The backend enables CORS, so
 * the browser calls it directly at VITE_API_BASE (default http://localhost:4000).
 * -----------------------------------------------------------------------------
 */

const BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "http://localhost:4000";

// ---- Types mirrored from shared/types.ts -----------------------------------

export interface Product {
  productId: string;
  serialNumber: string;
  batchId: string;
  manufactureDate: number;
}

export interface HashedProduct extends Product {
  encoded: string;
  leaf: string;
}

export interface OnChainInfo {
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  contractAddress: string;
  registeredBy: string;
}

export interface CreateBatchResponse {
  batchId: string;
  totalProducts: number;
  generatedAt: string;
  products: HashedProduct[];
}

export interface RegisterResponse {
  batchId: string;
  merkleRoot: string;
  totalProducts: number;
  onChain: OnChainInfo;
}

export interface MerkleLevel {
  level: number;
  nodes: string[];
}

export interface TreeResponse {
  batchId: string;
  merkleRoot: string;
  depth: number;
  levels: MerkleLevel[];
}

export interface ProofStep {
  sibling: string;
  position: "left" | "right";
}

export interface ProofResponse {
  batchId: string;
  product: Product;
  encoded: string;
  leaf: string;
  merkleRoot: string;
  proof: string[];
  steps: ProofStep[];
}

export interface VerifyResponse {
  batchId: string;
  leaf: string;
  proof: string[];
  result: "VALID" | "INVALID";
  valid: boolean;
  onChain?: { txHash: string; blockNumber: number; gasUsed: number };
  merkleRoot?: string;
}

export interface TamperResponse {
  batchId: string;
  field: string;
  original: { product: Product; encoded: string; leaf: string };
  tampered: { product: Product; encoded: string; leaf: string };
  proofUsed: string[];
  merkleRoot: string;
  offchainResult: "VALID" | "INVALID";
  explanation: string;
  onchainResult?: "VALID" | "INVALID";
  onChain?: { txHash: string; blockNumber: number; gasUsed: number };
  onChainError?: string;
}

export interface ChainStatus {
  connected: boolean;
  rpcUrl: string;
  contractAddress?: string;
  accounts?: string[];
  error?: string;
}

// ---- Low-level fetch helper ------------------------------------------------

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.detail || body?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// ---- API surface -----------------------------------------------------------

export const api = {
  health: () => http<{ status: string }>("/health"),

  chainStatus: () => http<ChainStatus>("/verify/chain/status"),

  createBatch: (batchId: string, count: number) =>
    http<CreateBatchResponse>("/batch/create", {
      method: "POST",
      body: JSON.stringify({ batchId, count })
    }),

  registerBatch: (batchId: string) =>
    http<RegisterResponse>("/batch/register", {
      method: "POST",
      body: JSON.stringify({ batchId })
    }),

  getBatch: (batchId: string) =>
    http<{
      batchId: string;
      totalProducts: number;
      generatedAt: string;
      merkleRoot: string;
      onChain: OnChainInfo | null;
      products: HashedProduct[];
    }>(`/batch/${encodeURIComponent(batchId)}`),

  getTree: (batchId: string) => http<TreeResponse>(`/batch/${batchId}/tree`),

  listBatches: () =>
    http<
      Array<{
        batchId: string;
        totalProducts: number;
        merkleRoot: string | null;
        onChain: OnChainInfo | null;
      }>
    >("/batch"),

  getProof: (productId: string, batchId: string) =>
    http<ProofResponse>(
      `/proof/${encodeURIComponent(productId)}?batchId=${encodeURIComponent(
        batchId
      )}`
    ),

  verifyOnChain: (batchId: string, productId: string) =>
    http<VerifyResponse>("/verify", {
      method: "POST",
      body: JSON.stringify({ batchId, productId })
    }),

  verifyOffChain: (batchId: string, productId: string) =>
    http<VerifyResponse>("/verify/offchain", {
      method: "POST",
      body: JSON.stringify({ batchId, productId })
    }),

  tamper: (
    batchId: string,
    productId: string,
    field: string,
    newValue: string,
    onChain: boolean
  ) =>
    http<TamperResponse>("/verify/tamper", {
      method: "POST",
      body: JSON.stringify({ batchId, productId, field, newValue, onChain })
    })
};

/** Shorten a hash for display: 0xabcd...1234 */
export function shortHash(hash: string, lead = 10, tail = 6): string {
  if (!hash || hash.length <= lead + tail) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}
