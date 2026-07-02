/**
 * backend/src/middleware/rate-limit.ts
 * -----------------------------------------------------------------------------
 * Basic API rate limiting (DoS protection — OWASP SC / production hygiene).
 * Per-IP fixed window. Tunable via env; disabled in tests via RATE_LIMIT_DISABLED.
 * -----------------------------------------------------------------------------
 */
import { rateLimit } from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === "1",
  message: { error: "too many requests — slow down and retry shortly" }
});
