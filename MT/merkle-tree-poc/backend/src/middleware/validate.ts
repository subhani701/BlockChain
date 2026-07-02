/**
 * backend/src/middleware/validate.ts
 * -----------------------------------------------------------------------------
 * Request body validation using zod (Phase 2, Task 2.5).
 *
 * `validateBody(schema)` parses req.body against a zod schema. On success it
 * replaces req.body with the PARSED (typed, defaulted) value and calls next().
 * On failure it responds 400 with a structured list of field issues — so a
 * malformed request is rejected cleanly before any handler logic runs.
 * -----------------------------------------------------------------------------
 */
import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      res.status(400).json({
        error: "invalid request body",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message
        }))
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
