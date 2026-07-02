/**
 * integrations/voltuswave-merkle-client.ts  (Phase 6.3 — REFERENCE ONLY)
 * -----------------------------------------------------------------------------
 * A viem-based client for the ProductRegistry, intended to be dropped into the
 * VoltusWave (Next.js) repo, which owns viem/wagmi. It is NOT compiled or tested
 * in this PoC (viem is not a dependency here) — it documents the exact wiring.
 *
 * The leaf MUST be byte-identical to shared/hash.ts (LEAF_SPEC_VERSION 2.0.0):
 *   leaf = keccak256(keccak256(utf8(JSON.stringify(
 *            { serial, sku, batch_id, manufactured_at }))))   // fixed key order
 * -----------------------------------------------------------------------------
 */
import { createPublicClient, http, keccak256, toHex, type Hex } from "viem";

// Minimal ABI — only what the client needs.
const ABI = [
  {
    type: "function",
    name: "verifyProductView",
    stateMutability: "view",
    inputs: [
      { name: "batchId", type: "string" },
      { name: "proof", type: "bytes32[]" },
      { name: "leaf", type: "bytes32" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "getBatch",
    stateMutability: "view",
    inputs: [{ name: "batchId", type: "string" }],
    outputs: [
      { name: "id", type: "string" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "totalProducts", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "version", type: "uint256" }
    ]
  }
] as const;

export interface Product {
  serial: string;
  sku: string;
  batch_id: string;
  manufactured_at: string;
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:7545";
const CONTRACT = (process.env.NEXT_PUBLIC_PRODUCT_REGISTRY ?? "0x") as Hex;

const client = createPublicClient({ transport: http(RPC_URL) });

/** Canonical double-keccak leaf — must match shared/hash.ts exactly. */
export function leafForProduct(p: Product): Hex {
  const canonical = JSON.stringify({
    serial: p.serial,
    sku: p.sku,
    batch_id: p.batch_id,
    manufactured_at: p.manufactured_at
  });
  return keccak256(keccak256(toHex(canonical)));
}

/** Gas-free on-chain membership check (the real `merkle_proof_valid`). */
export async function verifyProductOnChain(
  batchId: string,
  proof: Hex[],
  leaf: Hex
): Promise<boolean> {
  return client.readContract({
    address: CONTRACT,
    abi: ABI,
    functionName: "verifyProductView",
    args: [batchId, proof, leaf]
  }) as Promise<boolean>;
}

/** Is a batch root anchored on-chain? (the real `root_anchored_on_chain`). */
export async function isRootAnchored(batchId: string): Promise<boolean> {
  try {
    const res = (await client.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: "getBatch",
      args: [batchId]
    })) as readonly [string, Hex, bigint, bigint, bigint, bigint];
    return res[1] !== ("0x" + "0".repeat(64));
  } catch {
    return false; // getBatch reverts for unknown batch
  }
}

/**
 * Fetch a product's proof from this PoC's backend (GET /proof/:serial). In
 * production the proof can also be embedded in the product QR at mint time.
 */
export async function fetchProof(
  apiBase: string,
  batchId: string,
  serial: string
): Promise<Hex[]> {
  const r = await fetch(
    `${apiBase}/proof/${encodeURIComponent(serial)}?batchId=${encodeURIComponent(batchId)}`
  );
  if (!r.ok) throw new Error(`proof fetch failed: ${r.status}`);
  const body = (await r.json()) as { proof: Hex[] };
  return body.proof;
}
