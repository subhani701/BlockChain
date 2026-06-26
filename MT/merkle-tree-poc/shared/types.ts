/**
 * shared/types.ts
 * -----------------------------------------------------------------------------
 * Shared TypeScript types describing the domain model. These are imported by
 * the backend (and mirrored by the frontend) so both sides agree on shapes.
 * -----------------------------------------------------------------------------
 */

/** A single physical product manufactured as part of a batch. */
export interface Product {
  /** Stable product identifier, e.g. "SKU-0001". */
  productId: string;
  /** Unique per-unit serial number, e.g. "SN-BATCH-001-0001". */
  serialNumber: string;
  /** The batch this product belongs to, e.g. "BATCH-001". */
  batchId: string;
  /** Manufacture date as a Unix timestamp in SECONDS (uint256 on-chain). */
  manufactureDate: number;
}

/**
 * A product enriched with the cryptographic data derived from it. This is what
 * the API returns so the UI can show: Product -> Encoded Data -> Hash.
 */
export interface HashedProduct extends Product {
  /** The Solidity ABI-packed encoding shown for educational purposes. */
  encoded: string;
  /** keccak256(abi.encodePacked(...)) of the product fields = the Merkle leaf. */
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
