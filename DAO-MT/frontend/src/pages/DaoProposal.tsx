import { useEffect, useState } from "react";
import { api, Dealer, Proposal } from "../lib/api";
import { writeTx, readableError } from "../lib/contracts";

const ACTIONS = ["Warn", "Suspend", "Blacklist", "Reinstate"]; // index = enum code

export default function DaoProposal({ account }: { account: string | null }) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [dealerId, setDealerId] = useState("");
  const [actionCode, setActionCode] = useState(1); // Suspend
  const [quorum, setQuorum] = useState(3);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  async function refresh() {
    await api.resync().catch(() => {});
    const [d, p] = await Promise.all([api.dealers(), api.proposals()]);
    setDealers(d);
    setProposals(p);
    if (!dealerId && d.length) {
      const eastern = d.find((x: Dealer) => x.name === "Eastern Motors");
      setDealerId(eastern ? eastern.id : d[0].id);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(() => api.proposals().then(setProposals).catch(() => {}), 4000);
    return () => clearInterval(t);
  }, []);

  function guard(): string | null {
    if (!account) return "Connect MetaMask first.";
    return null;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setErr("");
    const g = guard();
    if (g) return setErr(g);
    setStatus(`${label}: pending… (confirm in MetaMask)`);
    try {
      await fn();
      setStatus(`${label}: confirmed ✓`);
      await refresh();
    } catch (e: any) {
      setStatus("");
      setErr(readableError(e));
    }
  }

  const openProposal = () =>
    run("Open proposal", async () => {
      await writeTx(account!, "GovernanceDAO", "openProposal", [
        dealerId as `0x${string}`,
        actionCode,
        BigInt(quorum),
      ]);
    });

  const vote = (id: number, support: boolean) =>
    run(`Vote ${support ? "FOR" : "AGAINST"} #${id}`, async () => {
      await writeTx(account!, "GovernanceDAO", "vote", [BigInt(id), support]);
    });

  const finalize = (id: number) =>
    run(`Finalize #${id}`, async () => {
      await writeTx(account!, "GovernanceDAO", "finalize", [BigInt(id)]);
    });

  const execute = (id: number) =>
    run(`Execute #${id}`, async () => {
      await writeTx(account!, "GovernanceDAO", "executeProposal", [BigInt(id)]);
    });

  return (
    <>
      <div className="card">
        <h2>DAO — Open Enforcement Proposal</h2>
        <div className="row">
          <label>Dealer</label>
          <select value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.status} (signal {d.signalScore})
              </option>
            ))}
          </select>
          <label>Action</label>
          <select value={actionCode} onChange={(e) => setActionCode(Number(e.target.value))}>
            {ACTIONS.map((a, i) => (
              <option key={a} value={i}>
                {a}
              </option>
            ))}
          </select>
          <label>Quorum</label>
          <input
            type="number"
            min={1}
            value={quorum}
            style={{ width: 70 }}
            onChange={(e) => setQuorum(Number(e.target.value))}
          />
          <button onClick={openProposal}>Open Proposal (MetaMask)</button>
        </div>
        <p className="muted">
          Tip: switch MetaMask accounts (import several Ganache keys) to cast multiple FOR votes
          until quorum is reached. One vote per address.
        </p>
        {status && <p className="pass">{status}</p>}
        {err && <p className="err">⚠ {err}</p>}
      </div>

      <div className="card">
        <h3>Proposals</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Dealer</th>
              <th>Action</th>
              <th>For</th>
              <th>Against</th>
              <th>Quorum</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.dealerName}</td>
                <td>{p.action}</td>
                <td>
                  <b>{p.forVotes}</b>
                </td>
                <td>{p.againstVotes}</td>
                <td>{p.quorum}</td>
                <td>
                  <span
                    className={
                      "badge " +
                      (p.status === "Passed" || p.status === "Executed"
                        ? "ok"
                        : p.status === "Failed"
                        ? "bad"
                        : "warn")
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="row">
                    {p.status === "Open" && (
                      <>
                        <button onClick={() => vote(p.id, true)}>Vote For</button>
                        <button className="secondary" onClick={() => vote(p.id, false)}>
                          Against
                        </button>
                        <button className="secondary" onClick={() => finalize(p.id)}>
                          Finalize
                        </button>
                      </>
                    )}
                    {p.status === "Passed" && (
                      <button onClick={() => execute(p.id)}>Execute (apply on-chain)</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {proposals.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No proposals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
