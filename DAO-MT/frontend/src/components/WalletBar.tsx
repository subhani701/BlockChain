import { useEffect, useState } from "react";
import { connectWallet, getAccount, currentChainId, ensureChain, CHAIN_ID_HEX } from "../lib/wallet";

export default function WalletBar({
  account,
  setAccount,
}: {
  account: string | null;
  setAccount: (a: string | null) => void;
}) {
  const [chainOk, setChainOk] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const acc = await getAccount();
    setAccount(acc);
    const cid = await currentChainId();
    setChainOk(cid === CHAIN_ID_HEX);
  }

  useEffect(() => {
    refresh();
    const e = (window as any).ethereum;
    if (e) {
      e.on("accountsChanged", refresh);
      e.on("chainChanged", refresh);
      return () => {
        e.removeListener("accountsChanged", refresh);
        e.removeListener("chainChanged", refresh);
      };
    }
  }, []);

  async function onConnect() {
    setErr("");
    try {
      const a = await connectWallet();
      setAccount(a);
      await refresh();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="card row">
      <strong>SKF Anti-Counterfeit · DAO Governance</strong>
      <div className="spacer" />
      {account ? (
        <>
          <span className="mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
          {chainOk ? (
            <span className="badge ok">chain 1337</span>
          ) : (
            <button className="secondary" onClick={() => ensureChain().then(refresh)}>
              Switch to 1337
            </button>
          )}
        </>
      ) : (
        <button onClick={onConnect}>Connect MetaMask</button>
      )}
      {err && <span className="err">{err}</span>}
    </div>
  );
}
