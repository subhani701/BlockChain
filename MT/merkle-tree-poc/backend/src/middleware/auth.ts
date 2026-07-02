/**
 * backend/src/middleware/auth.ts
 * -----------------------------------------------------------------------------
 * Bearer API-key auth for mutating / gas-spending endpoints (audit #24, #26).
 *
 * Protects endpoints that change server state or spend gas (batch create/register,
 * on-chain verify, tamper). Public read paths (off-chain verify, GETs) stay open.
 *
 * Keys are read from the API_KEYS env var (comma-separated) at REQUEST time, so
 * they can be toggled in tests without re-importing modules.
 *   - API_KEYS unset/empty  -> DEV MODE: allow, but warn once (so local dev and
 *                              the existing test suite keep working).
 *   - API_KEYS configured   -> require `Authorization: Bearer <key>` matching a
 *                              known key (constant-time comparison), else 401.
 * -----------------------------------------------------------------------------
 */
import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

/** Parse allowed API keys from env at call time (test-friendly, not cached). */
function allowedKeys(): string[] {
  return (process.env.API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/** Constant-time string comparison to avoid leaking key length/content via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

let warnedDevMode = false;

/**
 * Express middleware: require a valid Bearer API key on the guarded route.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const keys = allowedKeys();

  if (keys.length === 0) {
    if (!warnedDevMode) {
      // eslint-disable-next-line no-console
      console.warn(
        "[auth] API_KEYS not set — mutating endpoints are UNPROTECTED (dev mode). " +
          "Set API_KEYS in the environment before deploying."
      );
      warnedDevMode = true;
    }
    return next();
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : "";

  if (token && keys.some((k) => safeEqual(k, token))) {
    return next();
  }
  res.status(401).json({ error: "unauthorized: a valid API key is required" });
}
