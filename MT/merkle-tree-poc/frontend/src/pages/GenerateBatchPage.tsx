/**
 * Page 1 — Generate Batch, Display Products, Build Merkle Tree, Register Root.
 */
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  api,
  shortHash,
  type CreateBatchResponse,
  type TreeResponse,
  type RegisterResponse
} from "../api/client";
import { HashFlow } from "../components/HashFlow";
import { MerkleTreeView } from "../components/MerkleTreeView";
import type { AppCtx } from "../App";

export function GenerateBatchPage() {
  const { setActiveBatch } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState("BATCH-001");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batch, setBatch] = useState<CreateBatchResponse | null>(null);
  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [registered, setRegistered] = useState<RegisterResponse | null>(null);

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onGenerate() {
    setTree(null);
    setRegistered(null);
    const res = await run("create", () => api.createBatch(batchId, count));
    if (res) {
      setBatch(res);
      setActiveBatch(res.batchId);
    }
  }

  async function onBuildTree() {
    const res = await run("tree", () => api.getTree(batchId));
    if (res) setTree(res);
  }

  async function onRegister() {
    const res = await run("register", () => api.registerBatch(batchId));
    if (res) setRegistered(res);
  }

  return (
    <div>
      <div className="card">
        <h2>Step 1 · Generate a manufacturing batch</h2>
        <p className="muted">
          A manufacturer produces many products. Instead of putting each one
          on-chain, we will hash them, build a Merkle tree, and store only the
          root.
        </p>
        <div className="row">
          <div>
            <label>Batch ID</label>
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          </div>
          <div>
            <label>Product count</label>
            <input
              type="number"
              min={1}
              max={1024}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <button onClick={onGenerate} disabled={busy !== null}>
            {busy === "create" ? "Generating…" : "Generate Batch"}
          </button>
        </div>
        {error && <div className="error" style={{ marginTop: "0.8rem" }}>{error}</div>}
      </div>

      {batch && (
        <>
          <div className="card">
            <h2>Products ({batch.totalProducts})</h2>
            <p className="muted">
              Each product is encoded with{" "}
              <code>abi.encodePacked(...)</code> and hashed with keccak256 to
              produce its <strong>leaf</strong>.
            </p>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Serial</th>
                    <th>Mfg Date</th>
                    <th>Leaf (keccak256)</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.products.map((p) => (
                    <tr key={p.productId}>
                      <td>{p.productId}</td>
                      <td>{p.serialNumber}</td>
                      <td>{p.manufactureDate}</td>
                      <td className="hash" title={p.leaf}>
                        {shortHash(p.leaf)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Hashing pipeline (first product)</h2>
            <HashFlow
              product={batch.products[0]}
              encoded={batch.products[0].encoded}
              leaf={batch.products[0].leaf}
            />
          </div>

          <div className="card">
            <h2>Step 2 · Build the Merkle Tree</h2>
            <button
              className="secondary"
              onClick={onBuildTree}
              disabled={busy !== null}
            >
              {busy === "tree" ? "Building…" : "Generate Merkle Tree"}
            </button>
            {tree && (
              <>
                <div className="spacer" />
                <div className="notice">
                  Merkle Root&nbsp;
                  <span className="hash">{tree.merkleRoot}</span>
                  <br />
                  Depth: {tree.depth} levels &nbsp;·&nbsp; this single 32-byte
                  root commits to all {tree.levels[0].nodes.length} products.
                </div>
                <div className="spacer" />
                <MerkleTreeView levels={tree.levels} />
              </>
            )}
          </div>

          <div className="card">
            <h2>Step 3 · Register the root on Ethereum</h2>
            <p className="muted">
              Only the root goes on-chain — O(1) storage regardless of batch
              size.
            </p>
            <button onClick={onRegister} disabled={busy !== null}>
              {busy === "register" ? "Sending transaction…" : "Register Root On-Chain"}
            </button>
            {registered && (
              <>
                <div className="spacer" />
                <dl className="kv">
                  <dt>Merkle Root</dt>
                  <dd className="hash">{registered.merkleRoot}</dd>
                  <dt>Contract</dt>
                  <dd className="hash">{registered.onChain.contractAddress}</dd>
                  <dt>Tx Hash</dt>
                  <dd className="hash">{registered.onChain.txHash}</dd>
                  <dt>Block</dt>
                  <dd>{registered.onChain.blockNumber}</dd>
                  <dt>Gas Used</dt>
                  <dd>{registered.onChain.gasUsed.toLocaleString()}</dd>
                  <dt>Registered By</dt>
                  <dd className="hash">{registered.onChain.registeredBy}</dd>
                </dl>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
