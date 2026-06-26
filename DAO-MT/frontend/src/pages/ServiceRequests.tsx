import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ServiceRequest } from "../lib/api";

function verdictBadge(v: string | null) {
  if (v === "AUTHENTIC") return <span className="badge ok">AUTHENTIC</span>;
  if (v === "COUNTERFEIT") return <span className="badge bad">COUNTERFEIT</span>;
  if (v === "CANNOT_VERIFY") return <span className="badge warn">CANNOT_VERIFY</span>;
  return <span className="badge muted">unscanned</span>;
}

export default function ServiceRequests() {
  const [rows, setRows] = useState<ServiceRequest[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.serviceRequests().then(setRows).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="card">
      <h2>Open Service Requests</h2>
      {err && <p className="err">{err}</p>}
      <table>
        <thead>
          <tr>
            <th>SR #</th>
            <th>Serial</th>
            <th>Region</th>
            <th>Status</th>
            <th>Verdict</th>
            <th>Confidence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>#{r.id}</td>
              <td className="mono">{r.serial}</td>
              <td>{r.region}</td>
              <td>{r.status}</td>
              <td>{verdictBadge(r.verdict)}</td>
              <td>{r.confidence != null ? `${r.confidence}%` : "—"}</td>
              <td>
                <Link to={`/sr/${r.id}`}>Scan &amp; Verify →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
