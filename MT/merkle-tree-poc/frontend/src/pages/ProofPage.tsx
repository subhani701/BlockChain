/**
 * Page 2 — Select a Product, Generate its Merkle Proof, Visualize the Path.
 */
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  api,
  type HashedProduct,
  type ProofResponse,
  type TreeResponse
} from "../api/client";
import { ProofPathView } from "../components/ProofPathView";
import { MerkleTreeView } from "../components/MerkleTreeView";
import { HashFlow } from "../components/HashFlow";
import type { AppCtx } from "../App";

export function ProofPage() {
  const { activeBatch, setActiveBatch } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState(activeBatch || "BATCH-001");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load products + tree when the batch changes.
  useEffect(() => {
    if (!batchId) return;
    setError(null);
    setProof(null);
    Promise.all([api.getBatch(batchId), api.getTree(batchId)])
      .then(([b, t]) => {
        setProducts(b.products);
        setProductId(b.products[0]?.productId ?? "");
        setTree(t);
      })
      .catch((e) => {
        setProducts([]);
        setTree(null);
        setError((e as Error).message);
      });
  }, [batchId]);

  async function onGenerateProof() {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.getProof(productId, batchId);
      setProof(res);
      setActiveBatch(batchId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Highlight the proof siblings on the tree.
  const siblingSet = proof ? new Set(proof.proof) : undefined;

  return (
    <div>
      <div className="card">
        <h2>Step 4 · Generate a Merkle Proof</h2>
        <p className="muted">
          A proof is the short list of sibling hashes needed to rebuild the root
          from one product — about log₂(n) hashes, not the whole tree.
        </p>
        <div className="row">
          <div>
            <label>Batch ID</label>
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          </div>
          <div>
            <label>Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productId} — {p.serialNumber}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onGenerateProof} disabled={busy || !productId}>
            {busy ? "Generating…" : "Generate Proof"}
          </button>
        </div>
        {error && <div className="error" style={{ marginTop: "0.8rem" }}>{error}</div>}
      </div>

      {proof && (
        <>
          <div className="card">
            <h2>Leaf for {proof.product.productId}</h2>
            <HashFlow
              product={proof.product}
              encoded={proof.encoded}
              leaf={proof.leaf}
            />
          </div>

          <div className="card">
            <h2>Proof path ({proof.proof.length} siblings)</h2>
            <ProofPathView proof={proof} />
          </div>

          {tree && (
            <div className="card">
              <h2>Where the proof lives in the tree</h2>
              <p className="muted">
                <span style={{ color: "var(--good)" }}>Green</span> = your leaf,
                <span style={{ color: "var(--warn)" }}> amber</span> = sibling
                hashes supplied by the proof.
              </p>
              <MerkleTreeView
                levels={tree.levels}
                leaf={proof.leaf}
                siblingNodes={siblingSet}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
