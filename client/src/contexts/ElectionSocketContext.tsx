/**
 * ElectionSocketContext
 *
 * Provides a single shared WebSocket connection for the entire app.
 * Components call useElectionSocket() to read isConnected / lastEvent
 * without each creating their own socket.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type ElectionEvent =
  | {
      type: "race_called";
      chamber: "senate" | "house";
      stateCode: string;
      stateName?: string;
      district?: number | null;
      districtLabel?: string;
      calledWinner: string;
      calledParty: string;
      timestamp: string;
    }
  | {
      type: "race_uncalled";
      chamber: "senate" | "house";
      stateCode: string;
      district?: number | null;
      timestamp: string;
    };

interface ElectionSocketContextValue {
  isConnected: boolean;
  lastEvent: ElectionEvent | null;
}

const ElectionSocketContext = createContext<ElectionSocketContextValue>({
  isConnected: false,
  lastEvent: null,
});

const MAX_RETRIES = 10;

export function ElectionSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ElectionEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  const invalidate = useCallback(() => {
    utils.scoreboard.get.invalidate();
    utils.senate.list.invalidate();
    utils.house.list.invalidate();
    utils.flips.get.invalidate();
    utils.live.recentResults.invalidate();
  }, [utils]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retriesRef.current = 0;
    };

    ws.onmessage = (evt) => {
      try {
        const event: ElectionEvent = JSON.parse(evt.data);
        setLastEvent(event);
        if (event.type === "race_called" || event.type === "race_uncalled") {
          invalidate();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
        retriesRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [invalidate]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <ElectionSocketContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </ElectionSocketContext.Provider>
  );
}

export function useElectionSocket() {
  return useContext(ElectionSocketContext);
}
