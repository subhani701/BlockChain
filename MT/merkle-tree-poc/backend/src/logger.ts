/**
 * backend/src/logger.ts
 * -----------------------------------------------------------------------------
 * Shared pino logger.
 *
 * Production-grade dual mode:
 *   - Development (default): HUMAN-READABLE, colorized single-line logs via
 *     pino-pretty — easy to read while developing / demoing.
 *   - Production (NODE_ENV=production): raw structured JSON (one object per line)
 *     so log aggregators (Datadog / ELK / Loki) can parse & search fields.
 *
 * Level is controlled by LOG_LEVEL (default "info"; tests set "silent", which
 * also skips the pretty transport so no worker thread is spawned under vitest).
 * -----------------------------------------------------------------------------
 */
import pino from "pino";

const level = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";

// Pretty, human-readable output in dev; skip it in production and when silent
// (tests) to avoid spawning a transport worker thread.
const usePretty = !isProduction && level !== "silent";

export const logger = pino({
  level,
  base: { service: "merkle-tree-poc-backend" },
  ...(usePretty
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname,service",
            messageFormat: "{msg}",
            singleLine: true
          }
        }
      }
    : {})
});
