/**
 * routes/events.ts — GET /events (Server-Sent Events stream).
 *
 * The browser opens one long-lived EventSource here. On connect we seed the
 * current chain status, then the client receives pushed `chain:status` and
 * `chain:changed` events (from the chain WebSocket subscription + write routes).
 */
import { Router, Request, Response } from "express";
import { addClient, sendTo } from "../services/events";
import { chainStatus } from "../services/blockchain";

export const eventsRouter = Router();

eventsRouter.get("/", async (req: Request, res: Response) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Disable proxy buffering so events flush immediately.
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders?.();

  // Seed the client with the current chain status so its badge is correct at once.
  try {
    const status = await chainStatus();
    sendTo(res, "chain:status", status);
  } catch {
    sendTo(res, "chain:status", { connected: false });
  }

  const remove = addClient(res);

  // Heartbeat comment keeps intermediaries from closing the idle connection.
  const heartbeat = setInterval(() => {
    try {
      res.write(": hb\n\n");
    } catch {
      /* ignore */
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});
