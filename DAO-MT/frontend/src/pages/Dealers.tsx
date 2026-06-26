import { useEffect, useState } from "react";
import { api, Dealer } from "../lib/api";

function statusBadge(s: string) {
  if (s === "Authorized") return <span className="badge ok">{s}</span>;
  if (s === "Suspended" || s === "Blacklisted") return <span className="badge bad">{s}</span>;
  if (s === "Warned" || s === "UnderReview") return <span className="badge warn">{s}</span>;
  return <span className="badge muted">{s}</span>;
}

export default function Dealers() {
  const [rows, setRows] = useState<Dealer[]>([]);
  const [err, setErr] = useState("");

  function load() {
    api.dealers().then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card">
      <div className="row">
        <h2>Dealer Leaderboard</h2>
        <div className="spacer" />
        <button className="secondary" onClick={load}>
          Refresh
        </button>
      </div>
      {err && <p className="err">{err}</p>}
      <table>
        <thead>
          <tr>
            <th>Dealer</th>
            <th>On-chain Status</th>
            <th>Signal Score</th>
            <th>Dealer ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>{statusBadge(d.status)}</td>
              <td>
                <b>{d.signalScore}</b>/100
              </td>
              <td className="mono">{d.id.slice(0, 14)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
