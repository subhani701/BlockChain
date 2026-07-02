/**
 * backend/src/logger.ts
 * -----------------------------------------------------------------------------
 * Shared pino logger (Phase 3, Task 3.3). Structured JSON logs with a level
 * controlled by LOG_LEVEL (default "info"; tests set "silent").
 * -----------------------------------------------------------------------------
 */
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "merkle-tree-poc-backend" }
});
