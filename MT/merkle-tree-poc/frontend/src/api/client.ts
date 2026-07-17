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

/** Backend base URL — exported so the SSE EventSource can reach `/events`. */
export const API_BASE = BASE;

// Optional API key for protected (mutating / gas-spending) endpoints. When the
// backend has API_KEYS set, these calls must send a matching Bearer token.
// Resolution order: a runtime key saved in the browser (Settings) → VITE_API_KEY.
const API_KEY_STORAGE = "voltus-api-key";

/** Current API key (runtime override from localStorage, else the build-time env). */
export function getApiKey(): string {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) return saved;
  }
  return (import.meta.env.VITE_API_KEY as string | undefined) ?? "";
}

/** Persist (or clear) the runtime API key. */
export function setApiKey(key: string): void {
  if (typeof localStorage === "undefined") return;
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

/** Authorization header for protected endpoints (empty in dev when no key set). */
function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

// ---- Types mirrored from shared/types.ts -----------------------------------

export interface Product {
  serial: string;
  sku: string;
  batch_id: string;
  manufactured_at: string;
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
  /** Self-contained bundle extras (for QR / offline verification). */
  leafSpec?: string;
  contract?: string | null;
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

export interface AuthenticityResponse {
  result: "AUTHENTIC" | "COUNTERFEIT" | "CANNOT_VERIFY";
  checks: {
    merkle_proof_valid: { passed: boolean; detail: string };
    root_anchored_on_chain: { passed: boolean; detail: string };
    batch_active: { passed: boolean; detail: string };
  };
  computed: { leaf: string; root: string };
  onChain?: { merkleRoot: string; status: number; version: number };
  warnings: string[];
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
    ...init,
    // Merge headers (spreading ...init above must not clobber Content-Type).
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
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
      headers: authHeaders(),
      body: JSON.stringify({ batchId, count })
    }),

  registerBatch: (batchId: string) =>
    http<RegisterResponse>("/batch/register", {
      method: "POST",
      headers: authHeaders(),
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

  getTree: (batchId: string) =>
    http<TreeResponse>(`/batch/${encodeURIComponent(batchId)}/tree`),

  /**
   * Read the batch's root + status FROM THE CONTRACT (not the local store).
   * Fallback for verifiers that can't reach an RPC directly — note this puts the
   * backend in the trust path. Throws on 404 (never registered) / 502 (chain down).
   */
  getOnChainBatch: (batchId: string) =>
    http<{
      batchId: string;
      merkleRoot: string;
      totalProducts: number;
      version: number;
      status: number; // 0 Active | 1 Recalled | 2 Revoked
      source: "chain";
    }>(`/batch/${encodeURIComponent(batchId)}/onchain`),

  /** Self-contained, offline-verifiable proof pack (data availability export). */
  getProofPack: (batchId: string) =>
    http<{
      format: string;
      version: string;
      leafSpec: string;
      batchId: string;
      merkleRoot: string;
      contract: string | null;
      onChain: OnChainInfo | null;
      generatedAt: string;
      count: number;
      proofs: {
        serial: string;
        product: Product;
        leaf: string;
        proof: string[];
      }[];
    }>(`/batch/${encodeURIComponent(batchId)}/proof-pack`),

  listBatches: () =>
    http<
      Array<{
        batchId: string;
        totalProducts: number;
        merkleRoot: string | null;
        onChain: OnChainInfo | null;
      }>
    >("/batch"),

  getProof: (serial: string, batchId: string) =>
    http<ProofResponse>(
      `/proof/${encodeURIComponent(serial)}?batchId=${encodeURIComponent(
        batchId
      )}`
    ),

  /**
   * THE verification: recompute off-chain + compare to the on-chain root.
   * Gas-free (a view read), 3-state verdict. No API key, writes nothing.
   */
  verifyAuthenticity: (batchId: string, serial: string) =>
    http<AuthenticityResponse>("/verify/authenticity", {
      method: "POST",
      body: JSON.stringify({ batchId, serial })
    }),

  /** Verify a SUPPLIED product + proof (used by the tamper demo). */
  verifyAuthenticityBundle: (batchId: string, product: Product, proof: string[]) =>
    http<AuthenticityResponse>("/verify/authenticity", {
      method: "POST",
      body: JSON.stringify({ batchId, product, proof })
    }),

  verifyOnChain: (batchId: string, serial: string) =>
    http<VerifyResponse>("/verify", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ batchId, serial })
    }),

  verifyOffChain: (batchId: string, serial: string) =>
    http<VerifyResponse>("/verify/offchain", {
      method: "POST",
      body: JSON.stringify({ batchId, serial })
    }),

  tamper: (
    batchId: string,
    serial: string,
    field: string,
    newValue: string,
    onChain: boolean
  ) =>
    http<TamperResponse>("/verify/tamper", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ batchId, serial, field, newValue, onChain })
    })
};

/** Shorten a hash for display: 0xabcd...1234 */
export function shortHash(hash: string, lead = 10, tail = 6): string {
  if (!hash || hash.length <= lead + tail) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}
