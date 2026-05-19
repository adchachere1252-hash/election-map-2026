/**
 * ElectionSocketContext
 *
 * Provides a single shared WebSocket connection for the entire app.
 * Components call useElectionSocket() to read isConnected / lastEvent / raceCallLog.
 *
 * raceCallLog: persisted in localStorage keyed to today's date (ET) so it
 * survives page refreshes and shows a full election-night history.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type ElectionEvent =
  | {
      type: "race_called";
      chamber: "senate" | "house" | "governor";
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
      chamber: "senate" | "house" | "governor";
      stateCode: string;
      district?: number | null;
      timestamp: string;
    };

export type RaceCallEntry = {
  id: string; // unique key: stateCode + chamber + district + timestamp
  chamber: "senate" | "house" | "governor";
  stateCode: string;
  stateName?: string;
  districtLabel?: string;
  calledWinner: string;
  calledParty: string;
  timestamp: string; // ISO string
};

interface ElectionSocketContextValue {
  isConnected: boolean;
  lastEvent: ElectionEvent | null;
  raceCallLog: RaceCallEntry[];
  clearLog: () => void;
}

const ElectionSocketContext = createContext<ElectionSocketContextValue>({
  isConnected: false,
  lastEvent: null,
  raceCallLog: [],
  clearLog: () => {},
});

const MAX_RETRIES = 10;

/** Returns today's date string in US Eastern Time, e.g. "2026-05-19" */
function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const STORAGE_KEY_PREFIX = "election_race_log_";

function loadLog(dateKey: string): RaceCallEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + dateKey);
    if (!raw) return [];
    return JSON.parse(raw) as RaceCallEntry[];
  } catch {
    return [];
  }
}

function saveLog(dateKey: string, log: RaceCallEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + dateKey, JSON.stringify(log));
  } catch {
    // storage full — ignore
  }
}

export function ElectionSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ElectionEvent | null>(null);
  const dateKey = todayET();
  const [raceCallLog, setRaceCallLog] = useState<RaceCallEntry[]>(() => loadLog(dateKey));
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

  const addToLog = useCallback((event: Extract<ElectionEvent, { type: "race_called" }>) => {
    const entry: RaceCallEntry = {
      id: `${event.stateCode}-${event.chamber}-${event.districtLabel ?? ""}-${event.timestamp}`,
      chamber: event.chamber,
      stateCode: event.stateCode,
      stateName: event.stateName,
      districtLabel: event.districtLabel,
      calledWinner: event.calledWinner,
      calledParty: event.calledParty,
      timestamp: event.timestamp,
    };
    setRaceCallLog(prev => {
      // Deduplicate by id
      if (prev.some(e => e.id === entry.id)) return prev;
      const next = [entry, ...prev]; // newest first
      saveLog(dateKey, next);
      return next;
    });
  }, [dateKey]);

  const clearLog = useCallback(() => {
    setRaceCallLog([]);
    localStorage.removeItem(STORAGE_KEY_PREFIX + dateKey);
  }, [dateKey]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/election-ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retriesRef.current = 0;
    };

    ws.onmessage = (evt) => {
      try {
        const event: ElectionEvent = JSON.parse(evt.data);
        setLastEvent(event);
        if (event.type === "race_called") {
          addToLog(event);
          invalidate();
        } else if (event.type === "race_uncalled") {
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
  }, [invalidate, addToLog]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <ElectionSocketContext.Provider value={{ isConnected, lastEvent, raceCallLog, clearLog }}>
      {children}
    </ElectionSocketContext.Provider>
  );
}

export function useElectionSocket() {
  return useContext(ElectionSocketContext);
}
