/**
 * shared/types.ts
 * -----------------------------------------------------------------------------
 * Shared TypeScript types describing the domain model. These are imported by
 * the backend (and mirrored by the frontend) so both sides agree on shapes.
 * -----------------------------------------------------------------------------
 */

/**
 * A single physical product manufactured as part of a batch.
 *
 * Field names match the VoltusWave / SKF data model (see merkle.md §8):
 *   serial · sku · batch_id · manufactured_at
 * The Merkle leaf is derived from EXACTLY these four fields, in this order.
 */
export interface Product {
  /** Unique per-unit serial number, e.g. "SN-BATCH-001-0001". The unit's identity. */
  serial: string;
  /** SKU / product model, e.g. "SKF-6205-2RS" (typically shared across a batch). */
  sku: string;
  /** The batch this product belongs to, e.g. "BATCH-001". */
  batch_id: string;
  /** Manufacture date as an ISO-8601 timestamp string, e.g. "2023-11-14T22:14:20.000Z". */
  manufactured_at: string;
}

/**
 * A product enriched with the cryptographic data derived from it. This is what
 * the API returns so the UI can show: Product -> Canonical JSON -> Hash.
 */
export interface HashedProduct extends Product {
  /** The canonical JSON serialization that gets hashed (shown for teaching). */
  encoded: string;
  /** keccak256(canonical JSON of the product fields) = the Merkle leaf. */
  leaf: string;
}

/** A manufacturing batch held in memory / JSON before being committed on-chain. */
export interface Batch {
  batchId: string;
  products: Product[];
  /** ISO timestamp when the batch object was generated off-chain. */
  generatedAt: string;
  /** Set once the Merkle tree is built. */
  merkleRoot?: string;
  /** Set once the root is committed to Ethereum. */
  onChain?: OnChainInfo;
}

/** Details captured after a batch root is written to the blockchain. */
export interface OnChainInfo {
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  contractAddress: string;
  registeredBy: string;
}

/** One level of a Merkle tree, used for visualization. */
export interface MerkleLevel {
  /** 0 = leaves, increasing toward the root. */
  level: number;
  /** Hex node hashes at this level (left to right). */
  nodes: string[];
}

/** A single hop in a Merkle proof: the sibling we hash against. */
export interface ProofStep {
  /** The sibling hash supplied by the proof. */
  sibling: string;
  /**
   * Whether the sibling sits on the left or right of the running hash.
   * With sorted pairs this is derived purely from byte ordering.
   */
  position: "left" | "right";
}

/** Full proof payload returned for a single product. */
export interface ProofResult {
  product: Product;
  encoded: string;
  leaf: string;
  merkleRoot: string;
  /** Raw proof as hex hashes (what you pass to the smart contract). */
  proof: string[];
  /** The same proof annotated with sibling positions, for the UI. */
  steps: ProofStep[];
}
