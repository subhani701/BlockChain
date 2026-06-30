/**
 * Page 3 — Verify a Product against the smart contract, and the Tampering Demo.
 */
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  api,
  type HashedProduct,
  type VerifyResponse,
  type TamperResponse
} from "../api/client";
import type { AppCtx } from "../App";

export function VerifyPage() {
  const { activeBatch, chain } = useOutletContext<AppCtx>();

  const [batchId, setBatchId] = useState(activeBatch || "BATCH-001");
  const [products, setProducts] = useState<HashedProduct[]>([]);
  const [serial, setSerial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [verify, setVerify] = useState<VerifyResponse | null>(null);
  const [tamper, setTamper] = useState<TamperResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Tamper controls.
  const [field, setField] = useState("serial");
  const [newValue, setNewValue] = useState("SN-COUNTERFEIT-0001");

  const chainUp = chain?.connected === true;

  useEffect(() => {
    if (!batchId) return;
    api
      .getBatch(batchId)
      .then((b) => {
        setProducts(b.products);
        setSerial(b.products[0]?.serial ?? "");
        setError(null);
      })
      .catch((e) => {
        setProducts([]);
        setError((e as Error).message);
      });
  }, [batchId]);

  async function onVerify(onChain: boolean) {
    setBusy(onChain ? "chain" : "off");
    setError(null);
    setTamper(null);
    try {
      const res = onChain
        ? await api.verifyOnChain(batchId, serial)
        : await api.verifyOffChain(batchId, serial);
      setVerify(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onTamper() {
    setBusy("tamper");
    setError(null);
    setVerify(null);
    try {
      const res = await api.tamper(batchId, serial, field, newValue, chainUp);
      setTamper(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Step 5 · Verify a product</h2>
        <p className="muted">
          The smart contract recomputes the root from the product's leaf + proof
          and compares it to the stored root. Match → genuine.
        </p>
        <div className="row">
          <div>
            <label>Batch ID</label>
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          </div>
          <div>
            <label>Product</label>
            <select
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.serial} value={p.serial}>
                  {p.serial} — {p.sku}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onVerify(true)}
            disabled={busy !== null || !chainUp || !serial}
            title={chainUp ? "" : "Blockchain not connected"}
          >
            {busy === "chain" ? "Verifying on-chain…" : "Verify on Smart Contract"}
          </button>
          <button
            className="secondary"
            onClick={() => onVerify(false)}
            disabled={busy !== null || !serial}
          >
            {busy === "off" ? "Verifying…" : "Verify Off-chain"}
          </button>
        </div>
        {!chainUp && (
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
            Blockchain not connected — on-chain verify is disabled. Start Ganache
            + migrate, or use the off-chain check.
          </p>
        )}
        {error && <div className="error" style={{ marginTop: "0.8rem" }}>{error}</div>}
      </div>

      {verify && (
        <div className="card">
          <div className={`verdict ${verify.valid ? "valid" : "invalid"}`}>
            {verify.result}
          </div>
          <div className="spacer" />
          <dl className="kv">
            <dt>Leaf</dt>
            <dd className="hash">{verify.leaf}</dd>
            <dt>Proof siblings</dt>
            <dd>{verify.proof.length}</dd>
            {verify.merkleRoot && (
              <>
                <dt>Merkle Root</dt>
                <dd className="hash">{verify.merkleRoot}</dd>
              </>
            )}
            {verify.onChain && (
              <>
                <dt>Tx Hash</dt>
                <dd className="hash">{verify.onChain.txHash}</dd>
                <dt>Block</dt>
                <dd>{verify.onChain.blockNumber}</dd>
                <dt>Gas Used</dt>
                <dd>{verify.onChain.gasUsed.toLocaleString()}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <div className="card">
        <h2>Step 6 · Tampering Demo</h2>
        <p className="muted">
          Take a genuine product, change one field, and try to verify it using
          the original proof. It must fail.
        </p>
        <div className="row">
          <div>
            <label>Field to tamper</label>
            <select value={field} onChange={(e) => setField(e.target.value)}>
              <option value="serial">serial</option>
              <option value="sku">sku</option>
              <option value="manufactured_at">manufactured_at</option>
            </select>
          </div>
          <div>
            <label>New value</label>
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          </div>
          <button className="danger" onClick={onTamper} disabled={busy !== null || !serial}>
            {busy === "tamper" ? "Tampering…" : "Tamper Product"}
          </button>
        </div>
      </div>

      {tamper && (
        <div className="card">
          <div
            className={`verdict ${
              tamper.offchainResult === "VALID" ? "valid" : "invalid"
            }`}
          >
            {tamper.offchainResult}
            {tamper.onchainResult ? ` (on-chain: ${tamper.onchainResult})` : ""}
          </div>
          <div className="spacer" />
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Original (genuine)</th>
                <th>Tampered</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="muted">{tamper.field}</td>
                <td className="mono">
                  {String((tamper.original.product as any)[tamper.field])}
                </td>
                <td className="mono" style={{ color: "var(--bad)" }}>
                  {String((tamper.tampered.product as any)[tamper.field])}
                </td>
              </tr>
              <tr>
                <td className="muted">Leaf</td>
                <td className="hash">{tamper.original.leaf}</td>
                <td className="hash" style={{ color: "var(--bad)" }}>
                  {tamper.tampered.leaf}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="explain">{tamper.explanation}</p>
          {tamper.onChainError && (
            <div className="error">on-chain check: {tamper.onChainError}</div>
          )}
        </div>
      )}
    </div>
  );
}
