import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;

export interface RaceCalledEvent {
  type: "race_called";
  chamber: "senate" | "house" | "governor";
  stateCode: string;
  stateName?: string;
  districtLabel?: string;
  district?: number;
  calledParty: string;
  calledWinner: string;
  electionDate: string; // ISO date string e.g. "2026-05-19" — which election night this call belongs to
  timestamp: string;
}

export interface RaceUncalledEvent {
  type: "race_uncalled";
  chamber: "senate" | "house" | "governor";
  stateCode: string;
  stateName?: string;
  district?: number;
  timestamp: string;
}

export type ElectionEvent = RaceCalledEvent | RaceUncalledEvent;

/**
 * Attach a WebSocket server to the existing HTTP server.
 * Clients connect at ws://<host>/ws
 */
export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: "/election-ws" });

  wss.on("connection", (ws) => {
    // Send a welcome ping so the client knows it's connected
    ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));

    ws.on("error", (err) => {
      console.error("[WS] Client error:", err.message);
    });
  });

  console.log("[WS] WebSocket server attached at /election-ws");
  return wss;
}

/**
 * Broadcast an election event to all connected WebSocket clients.
 */
export function broadcastElectionEvent(event: ElectionEvent): void {
  if (!wss) return;
  const payload = JSON.stringify(event);
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  console.log(`[WS] Broadcast ${event.type} to ${sent} client(s):`, event.stateCode + (event.chamber === "house" ? `-${(event as RaceCalledEvent & { district?: number }).district}` : ""));
}

/**
 * Returns the number of currently connected WebSocket clients.
 */
export function getConnectedClientCount(): number {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) count++; });
  return count;
}
