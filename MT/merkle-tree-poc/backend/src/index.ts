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
import { logger } from "./logger";

async function main(): Promise<void> {
  const app = createApp();

  app.listen(config.port, async () => {
    logger.info(`listening on http://localhost:${config.port}`);

    const status = await chainStatus();
    if (status.connected) {
      logger.info(
        { contract: status.contractAddress, rpcUrl: status.rpcUrl },
        "blockchain OK"
      );
    } else {
      logger.warn(
        { error: status.error },
        "blockchain NOT connected — off-chain endpoints still work; deploy + run Ganache for on-chain"
      );
    }
  });
}

main().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
