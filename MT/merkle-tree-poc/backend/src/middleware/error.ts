/**
 * backend/src/middleware/error.ts
 * -----------------------------------------------------------------------------
 * Central error handling (Phase 2, Task 2.5).
 *
 * - `asyncHandler` wraps async route handlers so a thrown error / rejected
 *   promise is forwarded to Express's error pipeline (Express 4 does not do this
 *   automatically), instead of becoming an unhandled rejection / hung request.
 * - `errorHandler` is the last middleware: it maps known domain errors to clean
 *   4xx responses and everything else to a generic 500 (logged server-side).
 * -----------------------------------------------------------------------------
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import {
  ProductValidationError,
  DuplicateProductError
} from "../../../shared/validate";
import { EmptyBatchError } from "../../../shared/merkle";
import { logger } from "../logger";

/** Wrap an async handler so rejections reach the error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

/** Terminal error-handling middleware. Must have the 4-arg signature. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (res.headersSent) return; // delegate to Express default if already sending

  if (err instanceof DuplicateProductError) {
    res.status(400).json({ error: err.message, duplicates: err.duplicates });
    return;
  }
  if (err instanceof ProductValidationError) {
    res.status(400).json({ error: err.message, field: err.field });
    return;
  }
  if (err instanceof EmptyBatchError) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Unknown / unexpected error: log server-side, return a generic 500.
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "internal server error" });
}
