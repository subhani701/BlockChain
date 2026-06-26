/**
 * Learn — quick conceptual reference (the README goes deeper).
 */
export function LearnPage() {
  return (
    <div>
      <div className="card">
        <h2>The big idea</h2>
        <p>
          A manufacturer makes thousands of products. Putting each one on
          Ethereum would be extremely expensive. Instead we compute a single
          32-byte fingerprint — the <strong>Merkle Root</strong> — that commits
          to the entire batch, and store only that on-chain.
        </p>
        <pre className="mono">
{`Products  →  Leaf Hashes  →  Parent Hashes  →  Merkle Root  →  Ethereum
 (many)       keccak256        keccak256         32 bytes        O(1) storage`}
        </pre>
      </div>

      <div className="card">
        <h2>Glossary</h2>
        <dl className="kv">
          <dt>Hash</dt>
          <dd>
            A one-way function turning any data into a fixed-size fingerprint.
            Change one bit → a totally different output (the avalanche effect).
          </dd>
          <dt>keccak256</dt>
          <dd>
            The hash function Ethereum uses (a variant of SHA-3). Solidity's{" "}
            <code>keccak256(abi.encodePacked(...))</code> must match what we
            compute off-chain, byte for byte.
          </dd>
          <dt>Merkle Tree</dt>
          <dd>
            A binary tree of hashes. Leaves are product hashes; each parent is
            the hash of its two children; the single top node is the root.
          </dd>
          <dt>Merkle Root</dt>
          <dd>
            One hash that uniquely represents the whole batch. Stored on-chain.
          </dd>
          <dt>Merkle Proof</dt>
          <dd>
            The ~log₂(n) sibling hashes needed to rebuild the root from one
            leaf. Proves membership without revealing the other products.
          </dd>
        </dl>
      </div>

      <div className="card">
        <h2>Why tampering is caught</h2>
        <p>
          Verification recomputes the root from your product's leaf + proof and
          compares it to the stored root. Alter any field and the leaf changes
          completely, so the recomputed root no longer matches — the product is
          rejected as counterfeit.
        </p>
      </div>
    </div>
  );
}
