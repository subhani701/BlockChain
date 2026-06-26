import { getWalletClient, getReadClient, ensureChain } from "./wallet";
import { API } from "./api";

export type Deployments = {
  chainId: number;
  DealerRegistry: { address: `0x${string}`; abi: any };
  BatchRegistry: { address: `0x${string}`; abi: any };
  GovernanceDAO: { address: `0x${string}`; abi: any };
};

let cache: Deployments | null = null;

export async function loadContracts(): Promise<Deployments> {
  if (cache) return cache;
  const res = await fetch(`${API}/api/contracts`);
  if (!res.ok) throw new Error("failed to load /api/contracts (run truffle migrate?)");
  cache = (await res.json()) as Deployments;
  return cache;
}

type ContractName = "DealerRegistry" | "BatchRegistry" | "GovernanceDAO";

/** Send a write tx via MetaMask; returns the tx hash. Waits for the receipt. */
export async function writeTx(
  account: string,
  contractName: ContractName,
  functionName: string,
  args: any[]
): Promise<`0x${string}`> {
  await ensureChain();
  const c = await loadContracts();
  const wallet = getWalletClient(account);
  const hash = await wallet.writeContract({
    address: c[contractName].address,
    abi: c[contractName].abi,
    functionName,
    args,
  });
  const pub = getReadClient();
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

/** Read a view via MetaMask provider. */
export async function readContract(
  contractName: ContractName,
  functionName: string,
  args: any[] = []
): Promise<any> {
  const c = await loadContracts();
  const pub = getReadClient();
  return pub.readContract({
    address: c[contractName].address,
    abi: c[contractName].abi,
    functionName,
    args,
  });
}

/** Turn a viem/MetaMask error into a readable revert reason. */
export function readableError(e: any): string {
  const msg =
    e?.shortMessage ||
    e?.details ||
    e?.cause?.shortMessage ||
    e?.message ||
    String(e);
  const m = /reverted with the following reason:\s*([^\n]+)/i.exec(e?.message || "");
  if (m) return m[1].trim();
  return msg;
}
