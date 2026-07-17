/**
 * events.ts — a tiny Server-Sent Events (SSE) hub.
 *
 * Holds the set of connected browser clients and broadcasts push updates to them
 * (chain status changes, batch anchoring/status changes). This replaces the
 * frontend's 15s `/chain/status` polling with real-time push.
 */
import type { Response } from "express";

interface Client {
  id: number;
  res: Response;
}

const clients = new Set<Client>();
let nextId = 1;

/** Register an SSE client; returns a disposer to remove it on disconnect. */
export function addClient(res: Response): () => void {
  const client: Client = { id: nextId++, res };
  clients.add(client);
  return () => {
    clients.delete(client);
  };
}

/** Push a named event with a JSON payload to every connected client. */
export function broadcast(type: string, data: unknown = {}): void {
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    try {
      c.res.write(frame);
    } catch {
      clients.delete(c);
    }
  }
}

/** Write a single event to one client (used to seed initial state on connect). */
export function sendTo(res: Response, type: string, data: unknown = {}): void {
  try {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* client already gone */
  }
}

export function clientCount(): number {
  return clients.size;
}
