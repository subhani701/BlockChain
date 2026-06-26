/**
 * App — top-level layout, navigation tabs, blockchain status pill, and the
 * shared outlet context (active batch + chain status) used by all pages.
 */
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api, type ChainStatus } from "./api/client";

export interface AppCtx {
  activeBatch: string;
  setActiveBatch: (b: string) => void;
  chain: ChainStatus | null;
}

export function App() {
  const [activeBatch, setActiveBatch] = useState<string>(
    () => localStorage.getItem("activeBatch") || ""
  );
  const [chain, setChain] = useState<ChainStatus | null>(null);

  // Persist the active batch so pages stay in sync across navigation.
  useEffect(() => {
    if (activeBatch) localStorage.setItem("activeBatch", activeBatch);
  }, [activeBatch]);

  // Poll the chain status once on load.
  useEffect(() => {
    api
      .chainStatus()
      .then(setChain)
      .catch(() =>
        setChain({ connected: false, rpcUrl: "?", error: "backend unreachable" })
      );
  }, []);

  const ctx: AppCtx = { activeBatch, setActiveBatch, chain };

  return (
    <div className="app">
      <header className="topbar">
        <h1>🌳 Merkle Tree Product Verification</h1>
        <span
          className={`chain-pill ${
            chain?.connected ? "ok" : chain ? "down" : ""
          }`}
        >
          {chain?.connected
            ? `⛓ on-chain · ${chain.contractAddress?.slice(0, 8)}…`
            : "⛓ blockchain offline"}
        </span>
      </header>

      <nav className="tabs">
        <NavLink to="/" end>
          1 · Batch &amp; Tree
        </NavLink>
        <NavLink to="/proof">2 · Proof</NavLink>
        <NavLink to="/verify">3 · Verify &amp; Tamper</NavLink>
        <NavLink to="/learn">Learn</NavLink>
      </nav>

      <div className="spacer" />

      {activeBatch && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          Active batch: <strong>{activeBatch}</strong>
        </div>
      )}

      <Outlet context={ctx} />

      <footer className="muted" style={{ marginTop: "2rem", fontSize: "0.8rem" }}>
        Truffle + Ganache · Ethers.js · merkletreejs · OpenZeppelin MerkleProof —
        standalone PoC.
      </footer>
    </div>
  );
}
