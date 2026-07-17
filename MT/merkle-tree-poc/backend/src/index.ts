/**
 * backend/src/index.ts
 * -----------------------------------------------------------------------------
 * Server entry point. Starts the Express app and probes the blockchain so the
 * operator immediately sees whether Ganache + the contract are reachable.
 * -----------------------------------------------------------------------------
 */
import { createApp } from "./server";
import { config } from "./config";
import {
  chainStatus,
  reconcileStoreWithChain,
  startChainSubscriptions
} from "./services/blockchain";
import { broadcast } from "./services/events";
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

      // Clear any stale on-chain flags left over from a previous chain (e.g. a
      // Ganache reset), so the store reflects the real anchoring state.
      try {
        const { checked, cleared } = await reconcileStoreWithChain();
        if (cleared.length > 0) {
          logger.warn(
            { cleared },
            `reconciled store: cleared ${cleared.length} stale on-chain flag(s)`
          );
        } else {
          logger.info({ checked }, "store reconciled with chain (no stale flags)");
        }
      } catch (err) {
        logger.warn(
          { err: (err as Error).message },
          "store reconcile skipped (chain read failed)"
        );
      }

      // Real-time: subscribe to chain events and push them to browsers over SSE.
      await startChainSubscriptions({
        onChange: (batchId) => broadcast("chain:changed", { batchId }),
        onStatus: async (connected) => {
          try {
            broadcast("chain:status", await chainStatus());
          } catch {
            broadcast("chain:status", { connected });
          }
        }
      });
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
