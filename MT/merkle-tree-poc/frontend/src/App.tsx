/**
 * App — application shell: sidebar + topbar + footer + routed content.
 * Holds cross-page state (active batch + chain status) and provides it to pages
 * via the router Outlet context (AppCtx), preserving the existing pages' API.
 */
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { api, API_BASE, type ChainStatus } from "@/api/client";

export interface AppCtx {
  activeBatch: string;
  setActiveBatch: (b: string) => void;
  chain: ChainStatus | null;
  /** Increments whenever the chain changes (batch registered/superseded) so
   *  screens can refresh in real time instead of polling. */
  chainRev: number;
}

export function App() {
  const [activeBatch, setActiveBatch] = useState<string>(
    () => localStorage.getItem("activeBatch") || ""
  );
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [chainRev, setChainRev] = useState(0);

  useEffect(() => {
    if (activeBatch) localStorage.setItem("activeBatch", activeBatch);
  }, [activeBatch]);

  // Real-time chain updates via SSE (replaces polling). The backend pushes
  // `chain:status` (badge) and `chain:changed` (a batch was anchored/superseded).
  useEffect(() => {
    let alive = true;

    // Seed the badge immediately so it's correct before the first SSE frame.
    api
      .chainStatus()
      .then((c) => alive && setChain(c))
      .catch(
        () =>
          alive &&
          setChain({ connected: false, rpcUrl: "?", error: "backend unreachable" })
      );

    const es = new EventSource(`${API_BASE}/events`);
    es.addEventListener("chain:status", (e) => {
      try {
        if (alive) setChain(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore malformed frame */
      }
    });
    es.addEventListener("chain:changed", () => {
      if (alive) setChainRev((r) => r + 1);
    });
    // EventSource auto-reconnects on transient drops; nothing to do on error.

    return () => {
      alive = false;
      es.close();
    };
  }, []);

  const ctx: AppCtx = { activeBatch, setActiveBatch, chain, chainRev };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar chain={chain} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Outlet context={ctx} />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
