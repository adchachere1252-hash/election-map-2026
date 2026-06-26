import { useRef } from "react";
import { trpc } from "@/lib/trpc";

// Country code to flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const chars = Array.from(code.toUpperCase());
  return String.fromCodePoint(
    ...chars.map((c) => c.charCodeAt(0) + 127397)
  );
}

// Election type short labels
function typeTag(type: string): string {
  switch (type) {
    case "Presidential": return "PRES";
    case "Parliamentary": return "PARL";
    case "Referendum": return "REF";
    case "Legislative": return "LEG";
    case "Local": return "LOC";
    default: return "ELEC";
  }
}

// Party/winner color mapping for global elections
function getResultColor(winnerParty: string | null): { dot: string; text: string; bg: string } {
  if (!winnerParty) return { dot: "bg-gray-400", text: "text-gray-300", bg: "bg-gray-700 text-gray-300" };
  
  const lower = winnerParty.toLowerCase();
  if (lower.includes("left") || lower.includes("labour") || lower.includes("socialist") || lower.includes("democrat") || lower.includes("dpk"))
    return { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-900/60 text-rose-300" };
  if (lower.includes("right") || lower.includes("conservative") || lower.includes("bjp") || lower.includes("fuerza"))
    return { dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-900/60 text-blue-300" };
  if (lower.includes("green") || lower.includes("yes"))
    return { dot: "bg-green-400", text: "text-green-300", bg: "bg-green-900/60 text-green-300" };
  
  return { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-900/60 text-amber-300" };
}

type WorldElection = {
  id: number;
  country: string;
  countryCode: string;
  electionType: string;
  electionName: string;
  electionDate: string;
  status: string;
  winner: string | null;
  winnerParty: string | null;
};

function WorldTickerItem({ election }: { election: WorldElection }) {
  const colors = getResultColor(election.winnerParty);
  const flag = countryFlag(election.countryCode);
  const tag = typeTag(election.electionType);
  
  const dateLabel = new Date(election.electionDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-1.5 mx-6 whitespace-nowrap">
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      <span className="text-sm">{flag}</span>
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
        {tag}
      </span>
      <span className="text-xs font-semibold text-foreground">{election.country}</span>
      {election.winner && (
        <span className={`text-xs font-bold ${colors.text}`}>
          {election.winner}
        </span>
      )}
      {election.winnerParty && (
        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${colors.bg}`}>
          {election.winnerParty}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground/60 ml-0.5">
        {dateLabel}
      </span>
      <span className="text-muted-foreground/40 mx-2">|</span>
    </span>
  );
}

export default function WorldResultsTicker() {
  const { data: elections = [] } = trpc.worldElections.getAll.useQuery();
  const trackRef = useRef<HTMLDivElement>(null);

  // Filter to only completed elections with winners
  const completedElections = elections.filter(
    (e) => e.status === "Completed" && (e.winner || e.electionType === "Referendum")
  );

  if (completedElections.length === 0) return null;

  const items = [...completedElections, ...completedElections];

  return (
    <div className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 overflow-hidden relative z-30">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 bg-slate-900/80 pr-2">
        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase px-2 border-r border-slate-700/50">
          🌍 RESULTS
        </span>
      </div>
      <div className="pl-28 py-1.5 overflow-hidden">
        <div
          ref={trackRef}
          className="inline-flex ticker-scroll"
          style={{
            animation: `ticker-scroll ${Math.max(20, completedElections.length * 6)}s linear infinite`,
          }}
        >
          {items.map((e, i) => (
            <WorldTickerItem key={`${e.id}-${i}`} election={e as WorldElection} />
          ))}
        </div>
      </div>
    </div>
  );
}
