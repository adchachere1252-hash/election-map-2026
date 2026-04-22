import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useElectionSocket } from "@/contexts/ElectionSocketContext";

type TickerResult = {
  id: string;
  chamber: "senate" | "house" | "governor" | "referendum";
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
  const isRef = result.chamber === "referendum";

  const label =
    result.chamber === "house" && result.district != null
      ? `${result.stateCode}-${result.district}`
      : result.stateName;

  const chamberTag =
    result.chamber === "senate" ? "SEN" :
    result.chamber === "governor" ? "GOV" :
    result.chamber === "referendum" ? "RDT" : "HOR";

  const isFlip =
    result.previousParty &&
    result.previousParty !== result.calledParty &&
    result.previousParty !== "I" &&
    result.previousParty !== "Open" &&
    result.previousParty !== "VACANT";

  const flipLabel = isFlip ? `${result.previousParty}→${result.calledParty}` : null;

  // For referendums show today's date; for races show generalDate
  const dateLabel = isRef
    ? "Apr 21, 2026"
    : (result.generalDate ?? null);

  const dotColor = isD ? "bg-blue-400" : isR ? "bg-red-400" : isRef ? "bg-green-400" : "bg-gray-400";
  const tagColor = result.chamber === "governor" ? "text-purple-400" : "text-muted-foreground";
  const winnerColor = isD ? "text-blue-400" : isR ? "text-red-400" : isRef ? "text-green-400" : "text-gray-300";
  const partyBg = isD
    ? "bg-blue-900/60 text-blue-300"
    : isR
    ? "bg-red-900/60 text-red-300"
    : isRef
    ? "bg-green-900/60 text-green-300"
    : "bg-gray-700 text-gray-300";

  return (
    <span className="inline-flex items-center gap-1.5 mx-6 whitespace-nowrap">
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className={`text-[10px] font-bold tracking-wider ${tagColor}`}>
        {chamberTag}
      </span>
      {result.isSpecial && (
        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-900/60 text-yellow-300">
          SPECIAL
        </span>
      )}
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className={`text-xs font-bold ${winnerColor}`}>
        {result.calledWinner}
      </span>
      <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${partyBg}`}>
        {result.calledParty}
      </span>
      {isFlip && flipLabel && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse">
          ⇄ FLIP {flipLabel}
        </span>
      )}
      {dateLabel && (
        <span className="text-[10px] text-muted-foreground/60 ml-0.5">
          {dateLabel}
        </span>
      )}
      <span className="text-muted-foreground/40 mx-2">|</span>
    </span>
  );
}

export default function ResultsTicker() {
  const { lastEvent } = useElectionSocket();

  const { data: results = [], refetch } = trpc.live.recentResults.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (lastEvent?.type === "race_called") {
      refetch();
    }
  }, [lastEvent, refetch]);

  const trackRef = useRef<HTMLDivElement>(null);

  if (results.length === 0) return null;

  const items = [...results, ...results];

  return (
    <div className="flex-shrink-0 bg-card border-b border-border overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 bg-card pr-2">
        <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase px-2 border-r border-border">
          RESULTS
        </span>
      </div>
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
