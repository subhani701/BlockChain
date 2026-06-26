/**
 * backend/src/server.ts
 * -----------------------------------------------------------------------------
 * Builds and configures the Express application. Kept separate from index.ts so
 * tests can import the app without starting a listening socket.
 * -----------------------------------------------------------------------------
 */
import express, { Application, Request, Response } from "express";
import cors from "cors";
import { batchRouter } from "./routes/batch";
import { proofRouter } from "./routes/proof";
import { verifyRouter } from "./routes/verify";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  // Simple liveness probe.
  app.get("/health", (_req: Request, res: Response) =>
    res.json({ status: "ok", service: "merkle-tree-poc-backend" })
  );

  // Feature routers.
  app.use("/batch", batchRouter);
  app.use("/proof", proofRouter);
  app.use("/verify", verifyRouter);

  // 404 fallback.
  app.use((_req: Request, res: Response) =>
    res.status(404).json({ error: "not found" })
  );

  return app;
}
