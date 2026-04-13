import { X, User, Calendar, TrendingUp, Award, Briefcase, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import { useState } from "react";
import { getRatingColor } from "@/lib/electionUtils";
import { CandidateAvatar } from "./CandidateAvatar";

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
  demPreviousOffice?: string | null;
  repPreviousOffice?: string | null;
  demBio?: string | null;
  repBio?: string | null;
  status: string;
  calledParty: string | null;
  demVotes: number | null;
  repVotes: number | null;
  pctReporting: number | null;
  notes: string | null;
  calledAt?: number | null;
}

interface GovernorRacePopupProps {
  race: GovernorRace;
  onClose: () => void;
  onFocusMap?: () => void;
}

const PARTY_COLORS: Record<string, string> = {
  D: "#3b82f6",
  R: "#ef4444",
  I: "#9ca3af",
};

const PARTY_BG: Record<string, string> = {
  D: "bg-blue-950/30 border-blue-800/40",
  R: "bg-red-950/30 border-red-800/40",
  I: "bg-gray-800/30 border-gray-700/40",
};

const PARTY_TEXT: Record<string, string> = {
  D: "text-blue-400",
  R: "text-red-400",
  I: "text-gray-400",
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

function VoteBar({ demVotes, repVotes, pctReporting }: {
  demVotes: number | null;
  repVotes: number | null;
  pctReporting: number | null;
}) {
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

function CandidateCard({
  name,
  party,
  previousOffice,
  bio,
  isIncumbent,
}: {
  name: string | null;
  party: "D" | "R" | "I";
  previousOffice?: string | null;
  bio?: string | null;
  isIncumbent?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayName = name ?? `TBD ${PARTY_LABELS[party]} Primary`;
  const isTbd = !name || name.startsWith("TBD");

  return (
    <div className={`rounded-lg border p-2.5 ${PARTY_BG[party] ?? "bg-muted/30 border-border"}`}>
      {/* Candidate header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <CandidateAvatar name={isTbd ? null : name} party={party} size={36} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-semibold ${isTbd ? "text-muted-foreground italic" : "text-foreground"}`}>
                {displayName}
              </span>
              <span className={`text-[10px] font-medium ${PARTY_TEXT[party] ?? "text-muted-foreground"}`}>
                {PARTY_LABELS[party]}
              </span>
              {isIncumbent && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-700/40 font-semibold">
                  Incumbent
                </span>
              )}
            </div>
            {previousOffice && (
              <div className="flex items-start gap-1 mt-0.5">
                <Briefcase className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-muted-foreground leading-relaxed">{previousOffice}</span>
              </div>
            )}
          </div>
        </div>
        {bio && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {/* Expandable bio */}
      {expanded && bio && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{bio}</p>
        </div>
      )}
    </div>
  );
}

export default function GovernorRacePopup({ race, onClose, onFocusMap }: GovernorRacePopupProps) {
  const isCalled = !!race.calledParty;
  const isOpenSeat = race.isOpen || race.isTermLimited;

  // Determine if incumbent is running (not open seat)
  const incumbentIsRunning = !isOpenSeat && !!race.incumbentName;
  // Determine which party the incumbent is
  const incumbentParty = race.incumbentParty as "D" | "R" | "I" | null;

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
                style={{
                  background:
                    race.calledParty === "D" ? "#1a4fa0" : race.calledParty === "R" ? "#b22222" : "#6b7280",
                }}
              >
                <Award className="w-3 h-3" />
                Called {PARTY_LABELS[race.calledParty!] ?? race.calledParty}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {!isCalled && <RatingBadge rating={race.rating} />}
            {isOpenSeat && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/40">
                {race.isTermLimited ? "Term-Limited — Open Seat" : "Open Seat"}
              </span>
            )}
            {race.previousParty && isOpenSeat && (
              <span className="text-[10px] text-muted-foreground">
                Currently held by: <PartyBadge party={race.previousParty} />
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {onFocusMap && (
            <button
              onClick={onFocusMap}
              title="Focus on map"
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* Incumbent banner (if not open seat) */}
        {incumbentIsRunning && race.incumbentName && incumbentParty && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{race.incumbentName}</span>
                <PartyBadge party={incumbentParty} />
                <span className="text-[10px] text-muted-foreground">Incumbent Governor — Seeking Re-election</span>
              </div>
            </div>
          </div>
        )}

        {/* Candidate Bio Cards */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isOpenSeat ? "Candidates" : "Race Matchup"}
          </p>

          {/* Democrat */}
          <CandidateCard
            name={race.demCandidate}
            party="D"
            previousOffice={race.demPreviousOffice}
            bio={race.demBio}
            isIncumbent={incumbentIsRunning && incumbentParty === "D"}
          />

          {/* Republican */}
          <CandidateCard
            name={race.repCandidate}
            party="R"
            previousOffice={race.repPreviousOffice}
            bio={race.repBio}
            isIncumbent={incumbentIsRunning && incumbentParty === "R"}
          />
        </div>

        {/* Vote results (election night) */}
        <VoteBar demVotes={race.demVotes} repVotes={race.repVotes} pctReporting={race.pctReporting} />
        {race.calledAt && (
          <p className="text-xs text-green-400 font-semibold text-right">
            Called at {new Date(race.calledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
          </p>
        )}

        {/* Election dates */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Election Dates
          </p>
          <div className="rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/30">
            {race.primaryDate && (
              <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Primary</span>
                <span className="text-foreground font-medium">{race.primaryDate}</span>
              </div>
            )}
            {race.runoffDate && (
              <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Runoff</span>
                <span className="text-foreground font-medium">{race.runoffDate}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">General Election</span>
              <span className="text-foreground font-medium">{race.generalDate}</span>
            </div>
          </div>
        </div>

        {/* Analyst consensus / notes */}
        {race.notes && (
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Analyst Consensus
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{race.notes}</p>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Status: <span className="text-foreground font-medium">{race.status}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
