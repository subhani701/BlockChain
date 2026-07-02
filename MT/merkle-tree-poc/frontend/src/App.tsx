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
import { api, type ChainStatus } from "@/api/client";

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

  useEffect(() => {
    if (activeBatch) localStorage.setItem("activeBatch", activeBatch);
  }, [activeBatch]);

  // Poll chain status so the topbar badge stays fresh.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .chainStatus()
        .then((c) => alive && setChain(c))
        .catch(
          () =>
            alive &&
            setChain({
              connected: false,
              rpcUrl: "?",
              error: "backend unreachable"
            })
        );
    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const ctx: AppCtx = { activeBatch, setActiveBatch, chain };

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
