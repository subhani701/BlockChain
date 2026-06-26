import { createWalletClient, createPublicClient, custom, defineChain } from "viem";

export const CHAIN_ID = 1337;
export const CHAIN_ID_HEX = "0x539"; // 1337
export const RPC_URL = "http://127.0.0.1:8545";

export const ganache = defineChain({
  id: CHAIN_ID,
  name: "Ganache",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

function eth(): any {
  const e = (window as any).ethereum;
  if (!e) throw new Error("MetaMask not found. Install MetaMask to sign transactions.");
  return e;
}

export async function connectWallet(): Promise<string> {
  const accounts: string[] = await eth().request({ method: "eth_requestAccounts" });
  await ensureChain();
  return accounts[0];
}

export async function getAccount(): Promise<string | null> {
  const e = (window as any).ethereum;
  if (!e) return null;
  const accounts: string[] = await e.request({ method: "eth_accounts" });
  return accounts[0] || null;
}

export async function currentChainId(): Promise<string | null> {
  const e = (window as any).ethereum;
  if (!e) return null;
  return e.request({ method: "eth_chainId" });
}

export async function ensureChain(): Promise<void> {
  const current = await eth().request({ method: "eth_chainId" });
  if (current === CHAIN_ID_HEX) return;
  try {
    await eth().request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (e: any) {
    if (e.code === 4902) {
      await eth().request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "Ganache (SKF DAO)",
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

export function getWalletClient(account: string) {
  return createWalletClient({
    account: account as `0x${string}`,
    chain: ganache,
    transport: custom(eth()),
  });
}

export function getReadClient() {
  return createPublicClient({ chain: ganache, transport: custom(eth()) });
}
