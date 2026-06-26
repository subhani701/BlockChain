/**
 * backend/src/index.ts
 * -----------------------------------------------------------------------------
 * Server entry point. Starts the Express app and probes the blockchain so the
 * operator immediately sees whether Ganache + the contract are reachable.
 * -----------------------------------------------------------------------------
 */
import { createApp } from "./server";
import { config } from "./config";
import { chainStatus } from "./services/blockchain";

async function main(): Promise<void> {
  const app = createApp();

  app.listen(config.port, async () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${config.port}`);

    const status = await chainStatus();
    if (status.connected) {
      console.log(
        `[api] blockchain OK — contract ${status.contractAddress} on ${status.rpcUrl}`
      );
    } else {
      console.warn(
        `[api] blockchain NOT connected (${status.error}). ` +
          `Off-chain endpoints still work; deploy + run Ganache for on-chain.`
      );
    }
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[api] fatal:", err);
  process.exit(1);
});
