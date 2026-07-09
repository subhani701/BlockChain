/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_API_KEY?: string;
  /** Chain RPC the verifier trusts — enables trustless, direct on-chain reads. */
  readonly VITE_RPC_URL?: string;
  /** The registry address the verifier trusts. NEVER take this from a scanned QR. */
  readonly VITE_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
