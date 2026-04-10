import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useElectionSocket } from "@/contexts/ElectionSocketContext";

type TickerResult = {
  id: string;
  chamber: "senate" | "house" | "governor";
  stateCode: string;
  stateName: string;
  district: number | null;
  calledWinner: string;
  calledParty: string;
  previousParty?: string | null;
  updatedAt: string | Date | null;
  generalDate?: string | null;
  isSpecial?: boolean;
};

function TickerItem({ result }: { result: TickerResult }) {
  const isD = result.calledParty === "D";
  const isR = result.calledParty === "R";
  const label =
    result.chamber === "house" && result.district != null
      ? `${result.stateCode}-${result.district}`
      : result.stateName;
  const chamberTag =
    result.chamber === "senate" ? "SEN" :
    result.chamber === "governor" ? "GOV" : "HOR";

  // Detect a flip: previousParty exists, is not the same as calledParty, and is not "I" or "Open"
  const isFlip =
    result.previousParty &&
    result.previousParty !== result.calledParty &&
    result.previousParty !== "I" &&
    result.previousParty !== "Open" &&
    result.previousParty !== "VACANT";

  // Direction of flip: D→R or R→D
  const flipLabel = isFlip
    ? `${result.previousParty}→${result.calledParty}`
    : null;

  // Show election date (generalDate) instead of the called timestamp
  const electionDateLabel = result.generalDate ?? null;

  return (
    <span className="inline-flex items-center gap-1.5 mx-6 whitespace-nowrap">
      {/* Party color dot */}
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
          isD ? "bg-blue-400" : isR ? "bg-red-400" : "bg-gray-400"
        }`}
      />
      {/* Chamber tag */}
      <span className={`text-[10px] font-bold tracking-wider ${
        result.chamber === "governor" ? "text-purple-400" : "text-muted-foreground"
      }`}>
        {chamberTag}
      </span>
      {/* Special badge */}
      {result.isSpecial && (
        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-900/60 text-yellow-300">
          SPECIAL
        </span>
      )}
      {/* Location */}
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {/* Winner */}
      <span
        className={`text-xs font-bold ${
          isD ? "text-blue-400" : isR ? "text-red-400" : "text-gray-300"
        }`}
      >
        {result.calledWinner}
      </span>
      {/* Party badge */}
      <span
        className={`text-[10px] font-bold px-1 py-0.5 rounded ${
          isD
            ? "bg-blue-900/60 text-blue-300"
            : isR
            ? "bg-red-900/60 text-red-300"
            : "bg-gray-700 text-gray-300"
        }`}
      >
        {result.calledParty}
      </span>
      {/* FLIP badge — only shown when a seat changed party */}
      {isFlip && flipLabel && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse">
          ⇄ FLIP {flipLabel}
        </span>
      )}
      {/* Election date */}
      {electionDateLabel && (
        <span className="text-[10px] text-muted-foreground/60 ml-0.5">
          {electionDateLabel}
        </span>
      )}
      {/* Separator */}
      <span className="text-muted-foreground/40 mx-2">|</span>
    </span>
  );
}

export default function ResultsTicker() {
  const { lastEvent } = useElectionSocket();

  const { data: results = [], refetch } = trpc.live.recentResults.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  // Instantly refetch when a race is called via WebSocket
  useEffect(() => {
    if (lastEvent?.type === "race_called") {
      refetch();
    }
  }, [lastEvent, refetch]);

  const trackRef = useRef<HTMLDivElement>(null);

  // Don't render if no races have been called yet
  if (results.length === 0) return null;

  // Duplicate items so the scroll loops seamlessly
  const items = [...results, ...results];

  return (
    <div className="flex-shrink-0 bg-card border-b border-border overflow-hidden relative">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

      {/* "RESULTS" label pinned left */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 bg-card pr-2">
        <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase px-2 border-r border-border">
          RESULTS
        </span>
      </div>

      {/* Scrolling track */}
      <div className="pl-24 py-1.5 overflow-hidden">
        <div
          ref={trackRef}
          className="inline-flex ticker-scroll"
          style={{
            animation: `ticker-scroll ${Math.max(20, results.length * 6)}s linear infinite`,
          }}
        >
          {items.map((r, i) => (
            <TickerItem key={`${r.id}-${i}`} result={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
