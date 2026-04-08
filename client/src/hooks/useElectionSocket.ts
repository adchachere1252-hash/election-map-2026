import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface RaceCalledEvent {
  type: "race_called";
  chamber: "senate" | "house";
  stateCode: string;
  stateName?: string;
  district?: number;
  districtLabel?: string;
  calledParty: string;
  calledWinner: string;
  timestamp: string;
}

export interface RaceUncalledEvent {
  type: "race_uncalled";
  chamber: "senate" | "house";
  stateCode: string;
  district?: number;
  timestamp: string;
}

export type ElectionEvent = RaceCalledEvent | RaceUncalledEvent;

export interface UseElectionSocketReturn {
  isConnected: boolean;
  lastEvent: ElectionEvent | null;
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Connects to the /ws WebSocket endpoint and invalidates tRPC caches
 * whenever a race_called or race_uncalled event is received.
 * Falls back gracefully to polling if WebSocket is unavailable.
 */
export function useElectionSocket(): UseElectionSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ElectionEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const utils = trpc.useUtils();

  const invalidateAll = useCallback(() => {
    utils.scoreboard.get.invalidate();
    utils.senate.list.invalidate();
    utils.house.list.invalidate();
    utils.flips.get.invalidate();
  }, [utils]);

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    // Build the WebSocket URL from the current page origin
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) { ws.close(); return; }
        setIsConnected(true);
        reconnectAttempts.current = 0;
        console.log("[WS] Connected to election live feed");
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const data = JSON.parse(event.data as string) as ElectionEvent & { type: string };
          if (data.type === "race_called" || data.type === "race_uncalled") {
            setLastEvent(data as ElectionEvent);
            // Immediately invalidate all relevant caches so UI updates without waiting for polling
            invalidateAll();
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMounted.current) return;
        setIsConnected(false);
        wsRef.current = null;
        // Attempt reconnect with backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts.current, 4);
          console.log(`[WS] Disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimer.current = setTimeout(connect, delay);
        } else {
          console.log("[WS] Max reconnect attempts reached. Falling back to polling only.");
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror — let it handle reconnect
        ws.close();
      };
    } catch {
      // WebSocket not available (e.g., test environment) — silently fall back to polling
    }
  }, [invalidateAll]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, lastEvent };
}
