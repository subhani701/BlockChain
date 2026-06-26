import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ServiceRequest, ScanResult, Dealer } from "../lib/api";
import ReportForm from "./ReportForm";

const LABELS: Record<string, string> = {
  merkle_proof_valid: "Merkle proof valid (on-chain)",
  root_anchored_on_chain: "Batch root anchored on-chain",
  batch_active: "Batch active",
  dealer_authorized: "Dealer authorized (on-chain)",
  custody_continuous: "Custody chain continuous",
  qr_not_replayed: "QR not replayed",
  region_consistent: "Region consistent",
};

export default function Authenticity() {
  const { id } = useParams();
  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.serviceRequest(id!).then(setSr);
    api.dealers().then(setDealers);
  }, [id]);

  async function scan() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.scan(id!);
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!sr) return <div className="card">Loading…</div>;

  const dealerId = result?.dealerId || undefined;

  const vClass =
    result?.verdict === "AUTHENTIC" ? "ok" : result?.verdict === "COUNTERFEIT" ? "bad" : "warn";

  return (
    <>
      <div className="card">
        <Link to="/service-requests">← Service Requests</Link>
        <h2>
          Service Request #{sr.id} — <span className="mono">{sr.serial}</span>
        </h2>
        <div className="row">
          <span className="muted">Region: {sr.region}</span>
          <div className="spacer" />
          <button onClick={scan} disabled={busy}>
            {busy ? "Verifying…" : "Scan & Verify"}
          </button>
        </div>
        {err && <p className="err">{err}</p>}
      </div>

      {result && (
        <div className="card">
          <div className="row">
            <span className={`badge ${vClass}`} style={{ fontSize: 16 }}>
              {result.verdict}
            </span>
            <div className="spacer" />
            <span className="big">{result.confidence}%</span>
            <span className="muted">confidence</span>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Check</th>
                <th>Weight</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {result.attributions.map((a) => (
                <tr key={a.key}>
                  <td>{LABELS[a.key] || a.key}</td>
                  <td>{a.weight.toFixed(2)}</td>
                  <td className={a.passed ? "pass" : "fail"}>{a.passed ? "PASS ✓" : "FAIL ✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result?.verdict === "COUNTERFEIT" && (
        <ReportForm serial={result.serial} defaultDealerId={dealerId} />
      )}
    </>
  );
}
