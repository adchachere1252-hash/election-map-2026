import { X, User, Calendar, TrendingUp, Award, Briefcase, ChevronDown, ChevronUp, Crosshair, MapPin } from "lucide-react";
import { useState } from "react";
import { getRatingColor, getRatingClass, getPartyColor, getPartyLabel } from "@/lib/electionUtils";
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
  otherCandidateName?: string | null;
  otherCandidateParty?: string | null;
  otherVotes?: number | null;
  otherVotePct?: number | null;
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

function VoteBar({ demVotes, repVotes, otherVotes, pctReporting }: {
  demVotes: number | null;
  repVotes: number | null;
  otherVotes?: number | null;
  pctReporting: number | null;
}) {
  if (!demVotes && !repVotes) return null;
  const total = (demVotes ?? 0) + (repVotes ?? 0) + (otherVotes ?? 0);
  if (total === 0) return null;
  const demPct = ((demVotes ?? 0) / total) * 100;
  const repPct = ((repVotes ?? 0) / total) * 100;
  const othPct = ((otherVotes ?? 0) / total) * 100;
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
        {othPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${othPct}%`, background: "#9ca3af" }} />}
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

/**
 * Mississippi Senate-style split-gradient matchup card for General-status Governor races.
 * Matches the GeneralMatchupSection used in Senate/House popups.
 */
function GeneralMatchupCard({
  demCandidate,
  repCandidate,
  rating,
  incumbentName,
  incumbentParty,
  isOpen,
  isTermLimited,
  previousParty,
  generalDate,
  contextLines,
}: {
  demCandidate: string | null;
  repCandidate: string | null;
  rating: string | null;
  incumbentName: string | null;
  incumbentParty: string | null;
  isOpen: boolean;
  isTermLimited: boolean;
  previousParty: string | null;
  generalDate: string;
  contextLines: string[];
}) {
  // Determine candidate1 (D) and candidate2 (R) for display
  const c1Name = demCandidate;
  const c1Party = "D";
  const c2Name = repCandidate;
  const c2Party = "R";

  if (!c1Name || !c2Name) return null;

  const c1Color = getPartyColor(c1Party as any);
  const c2Color = getPartyColor(c2Party as any);
  const photoSize = 72;

  return (
    <>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">November General Election Matchup</p>
      <div className="rounded-lg overflow-hidden border border-white/10 mb-3" style={{ background: "linear-gradient(135deg, " + c1Color + "18 0%, transparent 50%, " + c2Color + "18 100%)" }}>
        {/* Photo row with split gradient */}
        <div className="relative flex items-stretch">
          {/* Left half tint */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, " + c1Color + "22 0%, transparent 50%)" }} />
          {/* Right half tint */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to left, " + c2Color + "22 0%, transparent 50%)" }} />

          {/* Candidate 1 (Democrat) */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c1Color + ", " + c1Color + "88)" }}
            >
              <CandidateAvatar name={c1Name} party={c1Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{c1Name}</span>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: c1Color + "33",
                color: c1Color,
                border: "1px solid " + c1Color + "55"
              }}
            >
              {getPartyLabel(c1Party as any)}
            </span>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 px-1 z-10">
            <div className="w-px h-8 bg-white/10" />
            <span className="text-sm font-black text-white/40 tracking-widest">VS</span>
            {rating && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRatingClass(rating as any)}`}>{rating}</span>
            )}
            <div className="w-px h-8 bg-white/10" />
          </div>

          {/* Candidate 2 (Republican) */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c2Color + ", " + c2Color + "88)" }}
            >
              <CandidateAvatar name={c2Name} party={c2Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{c2Name}</span>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: c2Color + "33",
                color: c2Color,
                border: "1px solid " + c2Color + "55"
              }}
            >
              {getPartyLabel(c2Party as any)}
            </span>
          </div>
        </div>

        {/* Structured context block */}
        {contextLines.length > 0 && (
          <div className="mx-3 mb-3 bg-yellow-900/25 border border-yellow-700/35 rounded px-2.5 py-2 space-y-1">
            {contextLines.map((line, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-yellow-500/70 mt-0.5 flex-shrink-0 text-[10px]">▸</span>
                <span className="text-xs text-yellow-200/90 leading-snug">{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function GovernorRacePopup({ race, onClose, onFocusMap }: GovernorRacePopupProps) {
  const isCalled = !!race.calledParty;
  const isOpenSeat = race.isOpen || race.isTermLimited;
  // Show the matchup card whenever both D and R candidates are confirmed (not TBD)
  const hasBothCandidates = !!(race.demCandidate && race.repCandidate &&
    !race.demCandidate.startsWith("TBD") && !race.repCandidate.startsWith("TBD"));
  const isGeneral = (race.status === "General" || hasBothCandidates) && race.status !== "Primary Runoff" && race.status !== "Voting" && race.status !== "Primary";

  // Determine if incumbent is running (not open seat)
  const incumbentIsRunning = !isOpenSeat && !!race.incumbentName;
  // Determine which party the incumbent is
  const incumbentParty = race.incumbentParty as "D" | "R" | "I" | null;

  // Build context lines for the General matchup info box
  const contextLines: string[] = [];
  if (hasBothCandidates) {
    // Seat type
    contextLines.push("Gubernatorial race \u2014 4-year term. Winner takes office January 2027.");

    // Incumbent / open seat
    if (race.isTermLimited) {
      const partyLabel = race.incumbentParty === "D" ? "Democrat" : race.incumbentParty === "R" ? "Republican" : race.incumbentParty ?? "";
      contextLines.push(`Open seat \u2014 ${race.incumbentName ?? "incumbent"} (${partyLabel}) is term-limited and cannot seek re-election. No incumbent advantage.`);
    } else if (race.isOpen) {
      contextLines.push("Open seat \u2014 no incumbent is running. Both candidates start on equal footing.");
    } else if (race.incumbentName) {
      const partyLabel = race.incumbentParty === "D" ? "Democrat" : race.incumbentParty === "R" ? "Republican" : race.incumbentParty ?? "";
      const incumbentCandidate = race.incumbentParty === "D" ? race.demCandidate : race.repCandidate;
      contextLines.push(`${race.incumbentName} (${partyLabel}) is the incumbent governor seeking re-election${incumbentCandidate ? " as " + incumbentCandidate : ""}.`);
    }

    // Seat history / flip potential
    if (race.previousParty) {
      const prevLabel = race.previousParty === "D" ? "Democratic" : race.previousParty === "R" ? "Republican" : race.previousParty;
      const challengerParty = race.previousParty === "D" ? "R" : race.previousParty === "R" ? "D" : null;
      const challengerName = challengerParty === "D" ? race.demCandidate : challengerParty === "R" ? race.repCandidate : null;
      if (challengerName) {
        const challengerLabel = challengerParty === "D" ? "Democratic" : challengerParty === "R" ? "Republican" : "";
        contextLines.push(`${prevLabel}-held governorship. ${challengerName} is the ${challengerLabel} challenger; a win would flip the seat.`);
      }
    }

    // Rating explanation
    if (race.rating) {
      const ratingExplain: Record<string, string> = {
        "Solid D": "Solidly Democratic \u2014 not expected to be competitive. Democrat is heavily favored.",
        "Safe D": "Safe Democratic seat \u2014 Democrat is expected to win by a large margin.",
        "Lean D": "Leans Democratic \u2014 Democrat is favored but the race could tighten.",
        "Toss-up": "Toss-up \u2014 either candidate could win. One of the most competitive races of the cycle.",
        "Lean R": "Leans Republican \u2014 Republican is favored but the race could tighten.",
        "Safe R": "Safe Republican seat \u2014 Republican is expected to win by a large margin.",
        "Solid R": "Solidly Republican \u2014 not expected to be competitive. Republican is heavily favored.",
      };
      const explain = ratingExplain[race.rating] ?? `Rated ${race.rating}`;
      contextLines.push(`${explain} (Cook Political Report / Inside Elections / Sabato's Crystal Ball)`);
    }

    // Election date
    contextLines.push(`Election day: ${race.generalDate}.`);
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Governor</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground leading-tight">{race.stateName}</h2>
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

        {/* Incumbent banner (if not open seat and not General — General shows it in context box) */}
        {incumbentIsRunning && race.incumbentName && incumbentParty && !isGeneral && (
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

        {/* === GENERAL STATUS: Mississippi-style split-gradient matchup card === */}
        {isGeneral ? (
          <GeneralMatchupCard
            demCandidate={race.demCandidate}
            repCandidate={race.repCandidate}
            rating={race.rating}
            incumbentName={race.incumbentName}
            incumbentParty={race.incumbentParty}
            isOpen={race.isOpen}
            isTermLimited={race.isTermLimited}
            previousParty={race.previousParty}
            generalDate={race.generalDate}
            contextLines={contextLines}
          />
        ) : (
          /* === NON-GENERAL: Stacked CandidateCard layout === */
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
        )}

        {/* Primary Runoff banner */}
        {race.status === "Primary Runoff" && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-900/30 border border-orange-700/40">
            <span className="text-orange-300 text-sm">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-orange-200">Republican Primary — Runoff Required</p>
              <p className="text-[11px] text-orange-300/80 mt-0.5">
                No candidate reached the 50% threshold. The top two finishers advance to a runoff{race.runoffDate ? ` in ${race.runoffDate}` : " later this year"} to determine the Republican nominee.
              </p>
              {race.notes && (
                <p className="text-[11px] text-orange-200/70 mt-1 leading-relaxed">{race.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Vote results (election night only — hidden in General/Scheduled mode) */}
        {(race.status === "Primary" || race.status === "Primary Runoff" || race.status === "Voting" || race.status === "Called" || race.status === "Certified") && (
          <VoteBar demVotes={race.demVotes} repVotes={race.repVotes} otherVotes={race.otherVotes} pctReporting={race.pctReporting} />
        )}
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

        {/* Analyst consensus / notes — shown for non-General, non-runoff statuses only */}
        {race.notes && !isGeneral && race.status !== 'Primary Runoff' && (
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
