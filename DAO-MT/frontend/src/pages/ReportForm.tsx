import { useEffect, useState } from "react";
import { api, Dealer } from "../lib/api";

export default function ReportForm({
  serial,
  defaultDealerId,
}: {
  serial: string;
  defaultDealerId?: string;
}) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dealerId, setDealerId] = useState(defaultDealerId || "");
  const [severity, setSeverity] = useState("high");
  const [result, setResult] = useState<{ name: string; signalScore: number; added: number } | null>(
    null
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.dealers().then((d: Dealer[]) => {
      setDealers(d);
      if (!dealerId && d.length) setDealerId(defaultDealerId || d[0].id);
    });
  }, []);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.report(serial, dealerId, severity);
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: "var(--bad)" }}>
      <h3>🚩 File Counterfeit Report</h3>
      <div className="row">
        <span className="muted">Serial</span>
        <span className="mono">{serial}</span>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <label>Dealer</label>
        <select value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label>Severity</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="low">low (+10)</option>
          <option value="medium">medium (+20)</option>
          <option value="high">high (+30)</option>
        </select>
        <button onClick={submit} disabled={busy || !dealerId}>
          {busy ? "Filing…" : "File Report"}
        </button>
      </div>
      {err && <p className="err">{err}</p>}
      {result && (
        <p className="pass">
          Report filed against <b>{result.name}</b>. Signal score +{result.added} → now{" "}
          <b>{result.signalScore}/100</b>.
        </p>
      )}
    </div>
  );
}
