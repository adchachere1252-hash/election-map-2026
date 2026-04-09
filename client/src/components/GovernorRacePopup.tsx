import { X, User, Calendar, TrendingUp, Award } from "lucide-react";
import { getRatingColor } from "@/lib/electionUtils";

interface GovernorRace {
  id: number;
  stateCode: string;
  stateName: string;
  rating: string | null;
  incumbentName: string | null;
  incumbentParty: string | null;
  isOpen: boolean;
  isTermLimited: boolean;
  previousParty: string | null;
  primaryDate: string | null;
  runoffDate: string | null;
  generalDate: string;
  demCandidate: string | null;
  repCandidate: string | null;
  status: string;
  calledParty: string | null;
  demVotes: number | null;
  repVotes: number | null;
  pctReporting: number | null;
  notes: string | null;
}

interface GovernorRacePopupProps {
  race: GovernorRace;
  onClose: () => void;
}

const PARTY_COLORS: Record<string, string> = {
  D: "#3b82f6",
  R: "#ef4444",
  I: "#9ca3af",
};

const PARTY_LABELS: Record<string, string> = {
  D: "Democrat",
  R: "Republican",
  I: "Independent",
};

function PartyBadge({ party }: { party: string }) {
  const color = PARTY_COLORS[party] ?? "#9ca3af";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
      style={{ background: color }}
    >
      {party}
    </span>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const bg = getRatingColor(rating as any);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
      style={{ background: bg }}
    >
      {rating}
    </span>
  );
}

function VoteBar({ demVotes, repVotes, pctReporting }: { demVotes: number | null; repVotes: number | null; pctReporting: number | null }) {
  if (!demVotes && !repVotes) return null;
  const total = (demVotes ?? 0) + (repVotes ?? 0);
  if (total === 0) return null;
  const demPct = ((demVotes ?? 0) / total) * 100;
  const repPct = ((repVotes ?? 0) / total) * 100;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>Dem {demPct.toFixed(1)}%</span>
        {pctReporting !== null && <span>{pctReporting.toFixed(0)}% reporting</span>}
        <span>Rep {repPct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        <div className="h-full transition-all duration-500" style={{ width: `${demPct}%`, background: "#3b82f6" }} />
        <div className="h-full transition-all duration-500" style={{ width: `${repPct}%`, background: "#ef4444" }} />
      </div>
    </div>
  );
}

export default function GovernorRacePopup({ race, onClose }: GovernorRacePopupProps) {
  const isCalled = !!race.calledParty;
  const isOpen = race.isOpen || race.isTermLimited;

  return (
    <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-foreground leading-tight">{race.stateName}</h2>
            <span className="text-xs text-muted-foreground font-medium">Governor</span>
            {isCalled && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: race.calledParty === "D" ? "#1a4fa0" : race.calledParty === "R" ? "#b22222" : "#6b7280" }}
              >
                <Award className="w-3 h-3" />
                Called {PARTY_LABELS[race.calledParty!] ?? race.calledParty}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {!isCalled && <RatingBadge rating={race.rating} />}
            {isOpen && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/40">
                {race.isTermLimited ? "Term-Limited" : "Open Seat"}
              </span>
            )}
            {race.previousParty && isOpen && (
              <span className="text-[10px] text-muted-foreground">
                Prev: <PartyBadge party={race.previousParty} />
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-3">
        {/* Incumbent */}
        {!isOpen && race.incumbentName && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{race.incumbentName}</span>
                {race.incumbentParty && <PartyBadge party={race.incumbentParty} />}
                <span className="text-[10px] text-muted-foreground">Incumbent Governor</span>
              </div>
            </div>
          </div>
        )}

        {/* Candidates */}
        {(race.demCandidate || race.repCandidate) && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Candidates</p>
            {race.demCandidate && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-blue-800/30 bg-blue-950/20">
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-xs font-medium text-foreground">{race.demCandidate}</span>
                <span className="text-[10px] text-blue-400 ml-auto">Democrat</span>
              </div>
            )}
            {race.repCandidate && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-red-800/30 bg-red-950/20">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-xs font-medium text-foreground">{race.repCandidate}</span>
                <span className="text-[10px] text-red-400 ml-auto">Republican</span>
              </div>
            )}
          </div>
        )}

        {/* Vote results */}
        <VoteBar demVotes={race.demVotes} repVotes={race.repVotes} pctReporting={race.pctReporting} />

        {/* Election dates */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Election Dates
          </p>
          <div className="grid grid-cols-1 gap-1">
            {race.primaryDate && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Primary</span>
                <span className="text-foreground font-medium">{race.primaryDate}</span>
              </div>
            )}
            {race.runoffDate && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Runoff</span>
                <span className="text-foreground font-medium">{race.runoffDate}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">General</span>
              <span className="text-foreground font-medium">{race.generalDate}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {race.notes && (
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{race.notes}</p>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 pt-1">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Status: <span className="text-foreground font-medium">{race.status}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
