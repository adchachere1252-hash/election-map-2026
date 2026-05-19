// Election Night Build — May 5, 2026 | General Election Mode — May 6, 2026
import { useState } from "react";
import { X, MapPin, Calendar, Users, TrendingUp, AlertCircle, ChevronRight, ChevronDown, ChevronUp, Crosshair, Briefcase } from "lucide-react";
import { getRatingClass, getRatingColor, getPartyColor, getStatusColor, formatVotePct, getPartyLabel } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import SenatorDetailPopup from "./SenatorDetailPopup";
import { CandidateAvatar } from "./CandidateAvatar";

interface RacePopupProps {
  type: "senate" | "house" | "redistricting" | "referendum";
  data: SenateRace | HouseRace | RedistrictingState | Referendum | null;
  onClose: () => void;
  onFocusMap?: () => void;
}

function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getRatingClass(rating as any)}`}
    >
      {rating}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    Scheduled: "bg-gray-700 text-gray-300",
    Primary: "bg-purple-900 text-purple-200",
    "Primary Runoff": "bg-orange-900 text-orange-200",
    General: "bg-blue-900 text-blue-200",
    Called: "bg-green-900 text-green-200",
    Certified: "bg-emerald-900 text-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[status] ?? "bg-gray-700 text-gray-300"}`}>
      {status}
    </span>
  );
}

function PartyDot({ party }: { party: string | null | undefined }) {
  if (!party) return null;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
      style={{ background: getPartyColor(party as any) }}
    />
  );
}

function VoteBar({ pct, party }: { pct: number; party: string | null | undefined }) {
  return (
    <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: getPartyColor(party as any) }}
      />
    </div>
  );
}

/** AP feed includes "Total Write-ins" as a candidate record — suppress it from all UI displays */
const isWriteInEntry = (name: string | null | undefined) =>
  !name || name.toLowerCase().includes("write-in") || name.toLowerCase() === "total write-ins";

function CandidateRow({
  name, party, votePct, isWinner, isEliminated, showVotes
}: { name: string | null | undefined; party: string | null | undefined; votePct: string | number | null | undefined; isWinner?: boolean; isEliminated?: boolean; showVotes?: boolean }) {
  if (!name) return null;
  if (isWriteInEntry(name)) return null; // Suppress AP write-in entries
  // If a race has been called and this is NOT the winner, hide this candidate
  if (isEliminated) return null;
  const pctNum = votePct !== null && votePct !== undefined ? parseFloat(String(votePct)) : null;
  // Only show vote data when explicitly allowed (i.e., during Primary or Called/Certified status)
  const hasVotes = showVotes && pctNum !== null && !isNaN(pctNum) && pctNum > 0;
  return (
    <div className={`py-1.5 px-2 rounded ${isWinner ? "bg-green-900/30 border border-green-700/40" : "bg-muted/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <CandidateAvatar name={name} party={party} size={32} />
          <div className="flex items-center min-w-0">
            <span className="text-sm font-medium truncate">{name}</span>
            {party && <span className="ml-1.5 text-xs text-muted-foreground">({party})</span>}
            {isWinner && (
              <span className="ml-2 inline-flex items-center gap-1 bg-green-800/60 border border-green-600/50 text-green-300 text-xs px-1.5 py-0.5 rounded font-bold">
                ✓ Race Called
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end ml-2 flex-shrink-0">
          {hasVotes && (
            <span className="text-sm font-bold" style={{ color: getPartyColor(party as any) }}>
              {formatVotePct(pctNum!)}
            </span>
          )}

        </div>
      </div>
      {hasVotes && <VoteBar pct={pctNum!} party={party} />}
    </div>
  );
}

function GeneralMatchupSection({
  candidate1Name, candidate1Party,
  candidate2Name, candidate2Party,
  rating,
  // Context props for the yellow info box
  incumbent, incumbentParty, incumbentRetiring,
  isSpecial, specialNote,
  otherCandidateName, otherCandidateParty,
  generalDate,
  chamber, district, districtLabel,
  previousParty,
}: {
  candidate1Name: string | null | undefined;
  candidate1Party: string | null | undefined;
  candidate2Name: string | null | undefined;
  candidate2Party: string | null | undefined;
  rating?: string | null;
  incumbent?: string | null;
  incumbentParty?: string | null;
  incumbentRetiring?: boolean | null;
  isSpecial?: boolean | null;
  specialNote?: string | null;
  otherCandidateName?: string | null;
  otherCandidateParty?: string | null;
  generalDate?: string | null;
  chamber?: "senate" | "house" | "governor";
  district?: number | null;
  districtLabel?: string | null;
  previousParty?: string | null;
}) {
  if (!candidate1Name || !candidate2Name) return null;

  // Build structured context lines for the yellow info box
  const contextLines: string[] = [];

  // 1. Seat / race type with full description
  if (isSpecial) {
    contextLines.push(specialNote ? `Special Election: ${specialNote}` : "Special Election \u2014 filling a vacant seat mid-term");
  } else if (chamber === "senate") {
    contextLines.push("U.S. Senate \u2014 Class 2 seat, 6-year term. Winner serves through January 2033.");
  } else if (chamber === "house") {
    const distStr = districtLabel === "AL" || district === 0 ? "At-Large" : `${districtLabel ?? district}`;
    const suffix = districtLabel === "AL" || district === 0 ? "" : ["1","21","31","41","51","61","71","81","91"].some(s => distStr.endsWith(s)) ? "st" : ["2","22","32","42","52","62","72","82","92"].some(s => distStr.endsWith(s)) ? "nd" : ["3","23","33","43","53","63","73","83","93"].some(s => distStr.endsWith(s)) ? "rd" : "th";
    const distFull = districtLabel === "AL" || district === 0 ? "At-Large" : `${distStr}${suffix} Congressional District`;
    contextLines.push(`U.S. House \u2014 ${distFull}. 2-year term; winner serves in the 120th Congress (2027\u20132029).`);
  } else if (chamber === "governor") {
    contextLines.push("Gubernatorial race \u2014 4-year term. Winner takes office January 2027.");
  }

  // 2. Incumbent / open seat with party context
  if (incumbent && incumbentRetiring) {
    const partyLabel = incumbentParty === "D" ? "Democrat" : incumbentParty === "R" ? "Republican" : incumbentParty ?? "";
    contextLines.push(`Open seat \u2014 ${incumbent} (${partyLabel}) is not seeking re-election. No incumbent advantage.`);
  } else if (incumbent && !incumbentRetiring) {
    const partyLabel = incumbentParty === "D" ? "Democrat" : incumbentParty === "R" ? "Republican" : incumbentParty ?? "";
    const incumbentSide = incumbentParty === candidate1Party ? candidate1Name : candidate2Name;
    contextLines.push(`${incumbent} (${partyLabel}) is the incumbent seeking re-election${incumbentSide ? " as " + incumbentSide : ""}.`);
  } else if (!incumbent) {
    contextLines.push("Open seat \u2014 no incumbent is running. Both candidates start on equal footing.");
  }

  // 3. Seat history / flip potential
  const seatHeldByD = previousParty === "D";
  const seatHeldByR = previousParty === "R";
  const challengerParty = seatHeldByD ? "R" : seatHeldByR ? "D" : null;
  const challengerName = challengerParty === candidate1Party ? candidate1Name : challengerParty === candidate2Party ? candidate2Name : null;
  if (previousParty && previousParty !== candidate1Party && previousParty !== candidate2Party) {
    const prevLabel = previousParty === "D" ? "Democrats" : previousParty === "R" ? "Republicans" : previousParty;
    contextLines.push(`This seat is currently held by ${prevLabel}. A win here would be a party flip.`);
  } else if (previousParty && challengerName) {
    const prevLabel = previousParty === "D" ? "Democratic" : previousParty === "R" ? "Republican" : previousParty;
    const challengerLabel = challengerParty === "D" ? "Democratic" : challengerParty === "R" ? "Republican" : "";
    contextLines.push(`${prevLabel}-held seat. ${challengerName} is the ${challengerLabel} challenger; a win would flip the seat.`);
  }

  // 4. Rating explanation in plain English
  if (rating) {
    const ratingExplain: Record<string, string> = {
      "Solid D": "Solidly Democratic \u2014 not expected to be competitive. Democrat is heavily favored.",
      "Safe D": "Safe Democratic seat \u2014 Democrat is expected to win by a large margin.",
      "Lean D": "Leans Democratic \u2014 Democrat is favored but the race could tighten.",
      "Toss-up": "Toss-up \u2014 either candidate could win. One of the most competitive races of the cycle.",
      "Lean R": "Leans Republican \u2014 Republican is favored but the race could tighten.",
      "Safe R": "Safe Republican seat \u2014 Republican is expected to win by a large margin.",
      "Solid R": "Solidly Republican \u2014 not expected to be competitive. Republican is heavily favored.",
    };
    const explain = ratingExplain[rating] ?? `Rated ${rating}`;
    contextLines.push(`${explain} (Cook Political Report / Inside Elections / Sabato's Crystal Ball)`);
  }

  // 5. General election date
  if (generalDate) {
    contextLines.push(`Election day: ${generalDate}.`);
  }

  const photoSize = chamber === "senate" || chamber === "governor" ? 72 : 60;
  const c1Color = getPartyColor(candidate1Party as any);
  const c2Color = getPartyColor(candidate2Party as any);

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

          {/* Candidate 1 */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c1Color + ", " + c1Color + "88)" }}
            >
              <CandidateAvatar name={candidate1Name} party={candidate1Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{candidate1Name}</span>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: c1Color + "33",
                color: c1Color,
                border: "1px solid " + c1Color + "55"
              }}
            >
              {getPartyLabel(candidate1Party as any)}
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

          {/* Candidate 2 */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c2Color + ", " + c2Color + "88)" }}
            >
              <CandidateAvatar name={candidate2Name} party={candidate2Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{candidate2Name}</span>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: c2Color + "33",
                color: c2Color,
                border: "1px solid " + c2Color + "55"
              }}
            >
              {getPartyLabel(candidate2Party as any)}
            </span>
          </div>
        </div>

        {/* Structured context block — replaces raw notes */}
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

/** Primary Matchup Card — shown for races in Primary status (before general election nominees are set) */
function PrimaryMatchupSection({
  candidate1Name, candidate1Party, candidate1VotePct,
  candidate2Name, candidate2Party, candidate2VotePct,
  primaryDate, generalDate, notes, chamber, pctReporting, primaryWinner,
}: {
  candidate1Name: string | null | undefined;
  candidate1Party: string | null | undefined;
  candidate1VotePct?: string | number | null;
  candidate2Name: string | null | undefined;
  candidate2Party: string | null | undefined;
  candidate2VotePct?: string | number | null;
  primaryDate?: string | null;
  generalDate?: string | null;
  notes?: string | null;
  chamber?: string;
  pctReporting?: string | number | null;
  primaryWinner?: string | null;
}) {
  const primaryColor = "#a855f7"; // purple-500

  // Format vote pct for display
  const fmt = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return null;
    const n = parseFloat(String(v));
    return isNaN(n) || n <= 0 ? null : n % 1 === 0 ? String(n) : n.toFixed(1);
  };
  const pctRep = pctReporting ? parseFloat(String(pctReporting)) : 0;

  // Collect all candidates for live results list (suppress write-ins)
  const allCandidates = [
    { name: candidate1Name, party: candidate1Party, pct: fmt(candidate1VotePct) },
    { name: candidate2Name, party: candidate2Party, pct: fmt(candidate2VotePct) },
  ].filter(c => c.name && !isWriteInEntry(c.name))
   .sort((a, b) => (parseFloat(b.pct ?? "0") || 0) - (parseFloat(a.pct ?? "0") || 0));

  // Context lines
  const contextLines: string[] = [];
  if (primaryDate) contextLines.push(`Primary election: ${primaryDate}.`);
  if (generalDate) contextLines.push(`General election: ${generalDate}.`);
  if (notes) contextLines.push(notes);

  // ── LIVE COUNTING VIEW (no winner yet) ──────────────────────────────────────
  // Show a simple results list — NOT a VS matchup card.
  // The VS card is only appropriate once a winner is confirmed.
  if (!primaryWinner) {
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Primary — Live Results</p>
          <div className="flex items-center gap-2">
            {pctRep > 0 && (
              <span className="text-xs text-muted-foreground">{pctRep.toFixed(1)}% reporting</span>
            )}
            <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: primaryColor + "22", color: primaryColor, border: "1px solid " + primaryColor + "44" }}>
              {primaryDate ?? "Primary"}
            </span>
          </div>
        </div>
        <div className="rounded-lg border mb-3 overflow-hidden" style={{ borderColor: primaryColor + "33" }}>
          {allCandidates.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">Awaiting results…</div>
          ) : (
            <div className="divide-y divide-white/5">
              {allCandidates.map((c, i) => {
                const cColor = getPartyColor(c.party as any);
                const pctNum = parseFloat(c.pct ?? "0") || 0;
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <CandidateAvatar name={c.name} party={c.party} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">{c.name}</span>
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: cColor }}>
                          {c.pct ? `${c.pct}%` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: cColor }}>{getPartyLabel(c.party as any)}</span>
                      </div>
                      <VoteBar pct={pctNum} party={c.party} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pctRep === 0 && (
            <div className="px-3 py-2 border-t border-white/5 text-center">
              <span className="text-xs text-muted-foreground italic">Polls open — results will appear as precincts report</span>
            </div>
          )}
        </div>
        {contextLines.length > 0 && (
          <div className="mb-3 bg-purple-900/20 border border-purple-700/30 rounded px-2.5 py-2 space-y-1">
            {contextLines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-purple-400/70 mt-0.5 flex-shrink-0 text-[10px]">▸</span>
                <span className="text-xs text-purple-200/90 leading-snug">{line}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── WINNER CALLED VIEW ──────────────────────────────────────────────────────
  // Show the VS card only after a winner is confirmed by AP.
  const c1IsWriteIn = isWriteInEntry(candidate1Name);
  const c2IsWriteIn = isWriteInEntry(candidate2Name);
  const displayC1Name = c1IsWriteIn ? "Results Pending" : candidate1Name;
  const displayC2Name = c2IsWriteIn ? "Results Pending" : candidate2Name;
  const displayC1Party = c1IsWriteIn ? null : candidate1Party;
  const displayC2Party = c2IsWriteIn ? null : candidate2Party;
  const c1Color = getPartyColor((c1IsWriteIn ? "I" : candidate1Party) as any);
  const c2Color = getPartyColor((c2IsWriteIn ? "I" : candidate2Party) as any);
  const photoSize = chamber === "senate" || chamber === "governor" ? 72 : 60;
  const c1Pct = fmt(candidate1VotePct);
  const c2Pct = fmt(candidate2VotePct);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Primary Winner</p>
        <span className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: primaryColor + "22", color: primaryColor, border: "1px solid " + primaryColor + "44" }}>
          {primaryDate ?? "Primary"}
        </span>
      </div>
      <div className="rounded-lg overflow-hidden border mb-3" style={{ borderColor: primaryColor + "33", background: "linear-gradient(135deg, " + c1Color + "18 0%, transparent 50%, " + c2Color + "18 100%)" }}>
        {/* Photo row */}
        <div className="relative flex items-stretch">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, " + c1Color + "22 0%, transparent 50%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to left, " + c2Color + "22 0%, transparent 50%)" }} />

          {/* Candidate 1 */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c1Color + ", " + c1Color + "88)" }}>
              <CandidateAvatar name={displayC1Name} party={displayC1Party} size={photoSize} />
            </div>
            <span className={`text-sm font-bold text-center leading-tight ${c1IsWriteIn ? "text-muted-foreground italic" : ""}`}>{displayC1Name}</span>
            {!c1IsWriteIn && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: c1Color + "33", color: c1Color, border: "1px solid " + c1Color + "55" }}>
                {getPartyLabel(candidate1Party as any)}
              </span>
            )}
            {c1Pct && !c1IsWriteIn && (
              <span className="text-xs font-semibold" style={{ color: primaryColor }}>{c1Pct}%</span>
            )}
            {primaryWinner === candidate1Name && !c1IsWriteIn && (
              <span className="text-xs font-bold text-green-400">✓ Winner</span>
            )}
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 px-1 z-10">
            <div className="w-px h-8 bg-white/10" />
            <span className="text-sm font-black text-white/40 tracking-widest">VS</span>
            <div className="w-px h-8 bg-white/10" />
          </div>

          {/* Candidate 2 */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c2Color + ", " + c2Color + "88)" }}>
              <CandidateAvatar name={displayC2Name} party={displayC2Party} size={photoSize} />
            </div>
            <span className={`text-sm font-bold text-center leading-tight ${c2IsWriteIn ? "text-muted-foreground italic" : ""}`}>{displayC2Name}</span>
            {!c2IsWriteIn && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: c2Color + "33", color: c2Color, border: "1px solid " + c2Color + "55" }}>
                {getPartyLabel(candidate2Party as any)}
              </span>
            )}
            {c2Pct && !c2IsWriteIn && (
              <span className="text-xs font-semibold" style={{ color: primaryColor }}>{c2Pct}%</span>
            )}
            {primaryWinner === candidate2Name && !c2IsWriteIn && (
              <span className="text-xs font-bold text-green-400">✓ Winner</span>
            )}
          </div>
        </div>

        {/* Context block */}
        {contextLines.length > 0 && (
          <div className="mx-3 mb-3 bg-purple-900/20 border border-purple-700/30 rounded px-2.5 py-2 space-y-1">
            {contextLines.map((line, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-purple-400/70 mt-0.5 flex-shrink-0 text-[10px]">▸</span>
                <span className="text-xs text-purple-200/90 leading-snug">{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live vote count bar */}
        {(c1Pct || c2Pct) && (
          <div className="mx-3 mb-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{c1Pct ? `${c1Pct}%` : "—"}</span>
              {pctRep > 0 && <span>{pctRep.toFixed(1)}% reporting</span>}
              <span>{c2Pct ? `${c2Pct}%` : "—"}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.08)" }}>
              {c1Pct && <div className="h-full rounded-l-full" style={{ width: `${c1Pct}%`, background: c1Color }} />}
              {c2Pct && <div className="h-full rounded-r-full ml-auto" style={{ width: `${c2Pct}%`, background: c2Color }} />}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Runoff Matchup Card — shown for Primary Runoff status races */
function RunoffMatchupSection({
  candidate1Name, candidate1Party, candidate1PrimaryPct,
  candidate2Name, candidate2Party, candidate2PrimaryPct,
  primaryRunoffDate, generalDate,
  notes,
  chamber,
  incumbent, incumbentParty,
}: {
  candidate1Name: string | null | undefined;
  candidate1Party: string | null | undefined;
  candidate1PrimaryPct?: string | null;
  candidate2Name: string | null | undefined;
  candidate2Party: string | null | undefined;
  candidate2PrimaryPct?: string | null;
  primaryRunoffDate?: string | null;
  generalDate?: string | null;
  notes?: string | null;
  chamber?: "senate" | "house";
  incumbent?: string | null;
  incumbentParty?: string | null;
}) {
  if (!candidate1Name || !candidate2Name) return null;

  // Amber/orange color for runoff (same party — GOP runoff)
  const runoffColor = "#f59e0b"; // amber-400
  const c1Color = getPartyColor(candidate1Party as any);
  const c2Color = getPartyColor(candidate2Party as any);
  const photoSize = chamber === "senate" ? 72 : 60;

  // Build context lines
  const contextLines: string[] = [];

  if (chamber === "senate") {
    contextLines.push("U.S. Senate \u2014 Class 2 seat, 6-year term. Winner serves through January 2033.");
  }

  if (incumbent) {
    const partyLabel = incumbentParty === "D" ? "Democrat" : incumbentParty === "R" ? "Republican" : incumbentParty ?? "";
    contextLines.push(`${incumbent} (${partyLabel}) was eliminated in the May 16 primary \u2014 the first incumbent senator to lose a primary since 2012.`);
  }

  if (candidate1PrimaryPct || candidate2PrimaryPct) {
    const c1Pct = candidate1PrimaryPct ? ` (${candidate1PrimaryPct}% in primary)` : "";
    const c2Pct = candidate2PrimaryPct ? ` (${candidate2PrimaryPct}% in primary)` : "";
    contextLines.push(`${candidate1Name}${c1Pct} and ${candidate2Name}${c2Pct} advanced from the May 16 primary.`);
  }

  if (primaryRunoffDate) {
    contextLines.push(`Runoff election: ${primaryRunoffDate}. A majority is required to win the GOP nomination.`);
  }

  if (generalDate) {
    contextLines.push(`General election: ${generalDate}. The runoff winner is heavily favored in the general.`);
  }

  return (
    <>
      {/* Header label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: runoffColor + "22", color: runoffColor, border: "1px solid " + runoffColor + "44" }}>
          GOP Primary Runoff
        </span>
        {primaryRunoffDate && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {primaryRunoffDate}
          </span>
        )}
      </div>

      {/* Matchup card */}
      <div className="rounded-lg overflow-hidden border mb-3"
        style={{
          borderColor: runoffColor + "33",
          background: "linear-gradient(135deg, " + c1Color + "18 0%, transparent 50%, " + c2Color + "18 100%)"
        }}>

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(to right, " + c1Color + ", " + runoffColor + ", " + c2Color + ")" }} />

        {/* Photo row */}
        <div className="relative flex items-stretch">
          {/* Left half tint */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, " + c1Color + "22 0%, transparent 50%)" }} />
          {/* Right half tint */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to left, " + c2Color + "22 0%, transparent 50%)" }} />

          {/* Candidate 1 */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c1Color + ", " + c1Color + "88)" }}
            >
              <CandidateAvatar name={candidate1Name} party={candidate1Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{candidate1Name}</span>
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: c1Color + "33",
                  color: c1Color,
                  border: "1px solid " + c1Color + "55"
                }}
              >
                {getPartyLabel(candidate1Party as any)}
              </span>
              {candidate1PrimaryPct && (
                <span className="text-xs font-semibold" style={{ color: runoffColor }}>
                  {candidate1PrimaryPct}% primary
                </span>
              )}
            </div>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 px-1 z-10">
            <div className="w-px h-8" style={{ background: runoffColor + "33" }} />
            <span className="text-sm font-black tracking-widest" style={{ color: runoffColor + "88" }}>VS</span>
            <div className="w-px h-4" style={{ background: runoffColor + "33" }} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight"
              style={{ color: runoffColor + "cc", maxWidth: 40 }}>
              Runoff
            </span>
            <div className="w-px h-8" style={{ background: runoffColor + "33" }} />
          </div>

          {/* Candidate 2 */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-3 pt-4 pb-3 z-10">
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, " + c2Color + ", " + c2Color + "88)" }}
            >
              <CandidateAvatar name={candidate2Name} party={candidate2Party} size={photoSize} />
            </div>
            <span className="text-sm font-bold text-center leading-tight">{candidate2Name}</span>
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: c2Color + "33",
                  color: c2Color,
                  border: "1px solid " + c2Color + "55"
                }}
              >
                {getPartyLabel(candidate2Party as any)}
              </span>
              {candidate2PrimaryPct && (
                <span className="text-xs font-semibold" style={{ color: runoffColor }}>
                  {candidate2PrimaryPct}% primary
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Context box */}
        {contextLines.length > 0 && (
          <div className="mx-3 mb-3 rounded px-2.5 py-2 space-y-1"
            style={{ background: runoffColor + "15", border: "1px solid " + runoffColor + "30" }}>
            {contextLines.map((line, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0 text-[10px]" style={{ color: runoffColor + "aa" }}>▸</span>
                <span className="text-xs leading-snug" style={{ color: runoffColor + "dd" }}>{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Expandable bio card matching Governor popup CandidateCard style */
function BioCandidateCard({
  name, party, bio, isIncumbent,
}: {
  name: string | null | undefined;
  party: string | null | undefined;
  bio: string | null | undefined;
  isIncumbent?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!name || !bio) return null;
  const partyBg: Record<string, string> = {
    D: "bg-blue-950/30 border-blue-800/40",
    R: "bg-red-950/30 border-red-800/40",
    I: "bg-gray-800/30 border-gray-700/40",
  };
  const partyText: Record<string, string> = {
    D: "text-blue-400",
    R: "text-red-400",
    I: "text-gray-400",
  };
  const partyLabel: Record<string, string> = {
    D: "Democrat",
    R: "Republican",
    I: "Independent",
    L: "Libertarian",
    G: "Green",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${partyBg[party ?? "I"] ?? "bg-muted/30 border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <CandidateAvatar name={name} party={party} size={36} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground">{name}</span>
              <span className={`text-[10px] font-medium ${partyText[party ?? "I"] ?? "text-muted-foreground"}`}>
                {partyLabel[party ?? "I"] ?? party}
              </span>
              {isIncumbent && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-700/40 font-semibold">
                  Incumbent
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? "Hide bio" : "View bio"}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{bio}</p>
        </div>
      )}
    </div>
  );
}

function SenatePopup({ race, onClose, onFocusMap }: { race: SenateRace; onClose: () => void; onFocusMap?: () => void }) {
  const { data: senators } = trpc.senators.byState.useQuery({ stateCode: race.stateCode });
  const [selectedSenatorId, setSelectedSenatorId] = useState<number | null>(null);
  return (
    <div className="popup-enter">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">U.S. Senate</span>
            {race.isSpecial && (
              <span className="bg-yellow-900 text-yellow-300 text-xs px-1.5 py-0.5 rounded font-semibold">Special</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground">{race.stateName}</h3>
          {race.isSpecial && race.specialNote && (
            <p className="text-xs text-yellow-400 mt-0.5">{race.specialNote}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onFocusMap && (
            <button onClick={onFocusMap} title="Focus on map" className="text-muted-foreground hover:text-foreground p-1 rounded">
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={race.status} />
        <RatingBadge rating={race.rating} />
      </div>

      {/* Current Senators for this state */}
      {senators && senators.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Current Senators (119th Congress)
          </p>
          <div className="space-y-1">
            {senators.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSenatorId(s.id)}
                className="w-full flex items-center justify-between py-1 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: getPartyColor(s.party as any) }}
                  />
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground">({s.party})</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Cl.{s.senateClass}</span>
                  {s.isUpIn2026 ? (
                    <span className="bg-amber-900/60 text-amber-300 text-xs px-1 py-0.5 rounded font-semibold">2026</span>
                  ) : (
                    <span className="bg-slate-700/60 text-slate-400 text-xs px-1 py-0.5 rounded">{s.nextElectionYear}</span>
                  )}
                  <ChevronRight className="w-3 h-3 text-muted-foreground ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedSenatorId !== null && (
        <SenatorDetailPopup
          senatorId={selectedSenatorId}
          onClose={() => setSelectedSenatorId(null)}
        />
      )}

      {race.incumbent && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Incumbent:</span>
          <PartyDot party={race.incumbentParty} />
          <span className="font-medium">{race.incumbent}</span>
          {race.incumbentRetiring && <span className="text-orange-400 text-xs">(Retiring)</span>}
        </div>
      )}

      {race.status === "General" ? (
        <>
          <GeneralMatchupSection
            candidate1Name={race.candidate1Name}
            candidate1Party={race.candidate1Party}
            candidate2Name={race.candidate2Name}
            candidate2Party={race.candidate2Party}
            rating={race.rating}
            chamber="senate"
            incumbent={race.incumbent}
            incumbentParty={race.incumbentParty}
            incumbentRetiring={race.incumbentRetiring}
            isSpecial={race.isSpecial}
            specialNote={race.specialNote}
            otherCandidateName={(race as any).otherCandidateName}
            otherCandidateParty={(race as any).otherCandidateParty}
            generalDate={race.generalDate}
            previousParty={race.previousParty}
          />
          {/* Expandable candidate bios — shown when bio data is available */}
          {((race as any).candidate1Bio || (race as any).candidate2Bio) && (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Candidate Bios
              </p>
              <BioCandidateCard
                name={race.candidate1Name}
                party={race.candidate1Party}
                bio={(race as any).candidate1Bio}
                isIncumbent={!race.incumbentRetiring && race.incumbentParty === race.candidate1Party}
              />
              <BioCandidateCard
                name={race.candidate2Name}
                party={race.candidate2Party}
                bio={(race as any).candidate2Bio}
                isIncumbent={!race.incumbentRetiring && race.incumbentParty === race.candidate2Party}
              />
            </div>
          )}
        </>
      ) : race.status === "Primary" && race.candidate1Name && race.candidate2Name ? (
        <PrimaryMatchupSection
          candidate1Name={race.candidate1Name}
          candidate1Party={race.candidate1Party}
          candidate1VotePct={race.candidate1VotePct}
          candidate2Name={race.candidate2Name}
          candidate2Party={race.candidate2Party}
          candidate2VotePct={race.candidate2VotePct}
          primaryDate={race.primaryDate}
          generalDate={race.generalDate}
          notes={(race as any).notes}
          chamber="senate"
          pctReporting={race.pctReporting}
          primaryWinner={(race as any).primaryWinner}
        />
      ) : race.status === "Primary Runoff" && race.candidate1Name && race.candidate2Name ? (
        <>
          <RunoffMatchupSection
            candidate1Name={race.candidate1Name}
            candidate1Party={race.candidate1Party}
            candidate1PrimaryPct={race.candidate1VotePct !== null && race.candidate1VotePct !== undefined ? parseFloat(String(race.candidate1VotePct)).toString() : null}
            candidate2Name={race.candidate2Name}
            candidate2Party={race.candidate2Party}
            candidate2PrimaryPct={race.candidate2VotePct !== null && race.candidate2VotePct !== undefined ? parseFloat(String(race.candidate2VotePct)).toString() : null}
            primaryRunoffDate={race.primaryRunoffDate}
            generalDate={race.generalDate}
            notes={(race as any).notes}
            chamber="senate"
            incumbent={race.incumbent}
            incumbentParty={race.incumbentParty}
          />
          {/* Expandable candidate bios */}
          {((race as any).candidate1Bio || (race as any).candidate2Bio) && (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Candidate Bios
              </p>
              <BioCandidateCard
                name={race.candidate1Name}
                party={race.candidate1Party}
                bio={(race as any).candidate1Bio}
                isIncumbent={false}
              />
              <BioCandidateCard
                name={race.candidate2Name}
                party={race.candidate2Party}
                bio={(race as any).candidate2Bio}
                isIncumbent={false}
              />
            </div>
          )}
        </>
      ) : (race.candidate1Name || race.candidate2Name) ? (
        <div className="space-y-1.5 mb-3">
          {(() => {
            const primaryWinner = (race as any).primaryWinner as string | null | undefined;
            const calledWinner = race.calledWinner;
            const effectiveWinner = calledWinner || primaryWinner || null;
            const isPrimary = !!primaryWinner && !calledWinner;
            const showVotes = race.status === "Primary" || race.status === "Primary Runoff" || race.status === "Called" || race.status === "Certified";
            return (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  {isPrimary ? "Primary Winner" : calledWinner ? "Winner" : "Candidates"}
                </p>
                <CandidateRow
                  name={race.candidate1Name}
                  party={race.candidate1Party}
                  votePct={race.candidate1VotePct}
                  isWinner={effectiveWinner === race.candidate1Name}
                  isEliminated={!!effectiveWinner && effectiveWinner !== race.candidate1Name}
                  showVotes={showVotes}
                />
                <CandidateRow
                  name={race.candidate2Name}
                  party={race.candidate2Party}
                  votePct={race.candidate2VotePct}
                  isWinner={effectiveWinner === race.candidate2Name}
                  isEliminated={!!effectiveWinner && effectiveWinner !== race.candidate2Name}
                  showVotes={showVotes}
                />
                {(race as any).otherCandidateName && (
                  <CandidateRow
                    name={(race as any).otherCandidateName}
                    party={(race as any).otherCandidateParty}
                    votePct={(race as any).otherVotePct}
                    isWinner={effectiveWinner === (race as any).otherCandidateName}
                    isEliminated={!!effectiveWinner && effectiveWinner !== (race as any).otherCandidateName}
                    showVotes={showVotes}
                  />
                )}
                {showVotes && race.pctReporting && parseFloat(String(race.pctReporting)) > 0 && !effectiveWinner && (
                  <p className="text-xs text-muted-foreground text-right">{formatVotePct(race.pctReporting)} reporting</p>
                )}
                {(race as any).calledAt && (
                  <p className="text-xs text-green-400 font-semibold text-right mt-0.5">
                    Called at {new Date((race as any).calledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      ) : null}

      <div className="border-t border-border pt-2 space-y-1">
        {race.primaryDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Primary: {race.primaryDate}</span>
          </div>
        )}
        {race.primaryRunoffDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Runoff: {race.primaryRunoffDate}</span>
          </div>
        )}
        {race.generalDate && race.status !== "General" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>General: {race.generalDate}</span>
          </div>
        )}
        {race.notes && race.status !== "General" && (
          <div className="flex items-start gap-2 text-xs text-yellow-400 mt-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{race.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HousePopup({ race, onClose, onFocusMap }: { race: HouseRace; onClose: () => void; onFocusMap?: () => void }) {
  const districtName = race.districtLabel === "AL"
    ? `${race.stateName} At-Large`
    : `${race.stateName} ${race.district}${getOrdinal(race.district)} District`;

  return (
    <div className="popup-enter">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">U.S. House</span>
          </div>
          <h3 className="text-base font-bold text-foreground">{districtName}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onFocusMap && (
            <button onClick={onFocusMap} title="Focus on map" className="text-muted-foreground hover:text-foreground p-1 rounded">
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <StatusBadge status={race.status} />
        <RatingBadge rating={race.rating} />
        {race.isVacancy && (
          <span className="bg-orange-900/60 text-orange-300 text-xs px-1.5 py-0.5 rounded font-semibold">Vacant</span>
        )}
        {race.isVacancy && (
          <span className="bg-purple-900/60 text-purple-300 text-xs px-1.5 py-0.5 rounded font-semibold">Special Election</span>
        )}
      </div>

      {race.isVacancy ? (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Incumbent:</span>
          <span className="text-orange-300 font-medium">Open Seat</span>
        </div>
      ) : race.incumbent && race.incumbent !== 'Vacant' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Incumbent:</span>
          <PartyDot party={race.incumbentParty} />
          <span className="font-medium truncate">{race.incumbent}</span>
          {race.incumbentRetiring && <span className="text-orange-400 text-xs flex-shrink-0">(Retiring)</span>}
        </div>
      )}

      {race.status === "General" ? (
        <>
          <GeneralMatchupSection
            candidate1Name={race.candidate1Name}
            candidate1Party={race.candidate1Party}
            candidate2Name={race.candidate2Name}
            candidate2Party={race.candidate2Party}
            rating={race.rating}
            chamber="house"
            incumbent={race.incumbent}
            incumbentParty={race.incumbentParty}
            incumbentRetiring={race.incumbentRetiring}
            otherCandidateName={(race as any).otherCandidateName}
            otherCandidateParty={(race as any).otherCandidateParty}
            generalDate={race.generalDate}
            district={race.district}
            districtLabel={race.districtLabel}
            previousParty={race.previousParty}
          />
          {/* Expandable candidate bios — shown when bio data is available */}
          {((race as any).candidate1Bio || (race as any).candidate2Bio) && (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Candidate Bios
              </p>
              <BioCandidateCard
                name={race.candidate1Name}
                party={race.candidate1Party}
                bio={(race as any).candidate1Bio}
                isIncumbent={!race.incumbentRetiring && race.incumbentParty === race.candidate1Party}
              />
              <BioCandidateCard
                name={race.candidate2Name}
                party={race.candidate2Party}
                bio={(race as any).candidate2Bio}
                isIncumbent={!race.incumbentRetiring && race.incumbentParty === race.candidate2Party}
              />
            </div>
          )}
        </>
      ) : race.status === "Primary" && race.candidate1Name && race.candidate2Name ? (
        <PrimaryMatchupSection
          candidate1Name={race.candidate1Name}
          candidate1Party={race.candidate1Party}
          candidate1VotePct={race.candidate1VotePct}
          candidate2Name={race.candidate2Name}
          candidate2Party={race.candidate2Party}
          candidate2VotePct={race.candidate2VotePct}
          primaryDate={race.primaryDate}
          generalDate={race.generalDate}
          notes={(race as any).notes}
          chamber="house"
          pctReporting={race.pctReporting}
          primaryWinner={(race as any).primaryWinner}
        />
      ) : (race.candidate1Name || race.candidate2Name) ? (
        <div className="space-y-1.5 mb-3">
          {(() => {
            const primaryWinner = (race as any).primaryWinner as string | null | undefined;
            const calledWinner = race.calledWinner;
            const effectiveWinner = calledWinner || primaryWinner || null;
            const isPrimary = !!primaryWinner && !calledWinner;
            const showVotes = race.status === "Primary" || race.status === "Primary Runoff" || race.status === "Called" || race.status === "Certified";
            return (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  {isPrimary ? "Primary Winner" : calledWinner ? "Winner" : "Candidates"}
                </p>
                <CandidateRow
                  name={race.candidate1Name}
                  party={race.candidate1Party}
                  votePct={race.candidate1VotePct}
                  isWinner={effectiveWinner === race.candidate1Name}
                  isEliminated={!!effectiveWinner && effectiveWinner !== race.candidate1Name}
                  showVotes={showVotes}
                />
                <CandidateRow
                  name={race.candidate2Name}
                  party={race.candidate2Party}
                  votePct={race.candidate2VotePct}
                  isWinner={effectiveWinner === race.candidate2Name}
                  isEliminated={!!effectiveWinner && effectiveWinner !== race.candidate2Name}
                  showVotes={showVotes}
                />
                {(race as any).otherCandidateName && (
                  <CandidateRow
                    name={(race as any).otherCandidateName}
                    party={(race as any).otherCandidateParty}
                    votePct={(race as any).otherVotePct}
                    isWinner={effectiveWinner === (race as any).otherCandidateName}
                    isEliminated={!!effectiveWinner && effectiveWinner !== (race as any).otherCandidateName}
                    showVotes={showVotes}
                  />
                )}
                {showVotes && race.pctReporting && parseFloat(String(race.pctReporting)) > 0 && !effectiveWinner && (
                  <p className="text-xs text-muted-foreground text-right">{formatVotePct(race.pctReporting)} reporting</p>
                )}
                {(race as any).calledAt && (
                  <p className="text-xs text-green-400 font-semibold text-right mt-0.5">
                    Called at {new Date((race as any).calledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      ) : null}

      {/* PrimaryMatchupSection is rendered above in the ternary chain for status === "Primary" */}

      <div className="border-t border-border pt-2 space-y-1">
        {race.primaryDate && race.status !== "Primary" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Primary: {race.primaryDate}</span>
          </div>
        )}
        {race.generalDate && race.status !== "Primary" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>General: {race.generalDate}</span>
          </div>
        )}
        {race.notes && race.status !== "General" && (
          <div className="flex items-start gap-2 text-xs text-yellow-400 mt-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{race.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RedistrictingPopup({ state, onClose }: { state: RedistrictingState; onClose: () => void }) {
  return (
    <div className="popup-enter">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Redistricting</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">{state.stateName}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white`}
          style={{
            background: state.status === 'Struck Down'
              ? '#991b1b'
              : state.enacted
              ? '#4a7c59'
              : '#8b6914'
          }}
        >
          {state.status === 'Struck Down' ? '⚖️ Struck Down by Court' : state.enacted ? 'Map Enacted' : 'Pending'}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {state.reason && (
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Reason</span>
            <p className="text-foreground mt-0.5">{state.reason}</p>
          </div>
        )}
        {state.method && (
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Method</span>
            <p className="text-foreground mt-0.5">{state.method}</p>
          </div>
        )}
        {state.status && (
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Status</span>
            <p className="text-foreground mt-0.5">{state.status}</p>
          </div>
        )}
        {state.delegationBefore && (
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Current Delegation</span>
            <p className="text-foreground mt-0.5 font-mono">{state.delegationBefore}</p>
          </div>
        )}
        {state.projectedImpact && (
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Projected Impact</span>
            <p className="font-bold mt-0.5" style={{ color: state.projectedImpact.includes("+D") || state.projectedImpact.includes("+5 D") ? "#5b8fd4" : state.projectedImpact.includes("+R") ? "#d96b4a" : "#7c3aed" }}>
              {state.projectedImpact}
            </p>
          </div>
        )}
        {state.litigationNotes && (
          <div className={`flex items-start gap-2 text-xs border-t border-border pt-2 ${
            state.status === 'Struck Down' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">{state.litigationNotes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReferendumPopup({ referendum, onClose }: { referendum: Referendum; onClose: () => void }) {
  const yesVotes = Number(referendum.yesVotes) || 0;
  const noVotes = Number(referendum.noVotes) || 0;
  const total = yesVotes + noVotes;
  const yesPct = total > 0 ? (yesVotes / total * 100).toFixed(1) : "0.0";
  const noPct = total > 0 ? (noVotes / total * 100).toFixed(1) : "0.0";
  const pctReporting = referendum.pctReporting ? parseFloat(String(referendum.pctReporting)) : 0;

  return (
    <div className="popup-enter">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-yellow-400 uppercase tracking-wider font-semibold">Referendum</span>
          </div>
          <h3 className="text-base font-bold text-foreground leading-tight">{referendum.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{referendum.stateName} · {referendum.electionDate}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded flex-shrink-0 ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={referendum.status} />
        {referendum.calledResult && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${referendum.calledResult === "Yes" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
            Called: {referendum.calledResult}
          </span>
        )}
      </div>

      {referendum.description && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed border-l-2 border-yellow-600 pl-2">
          {referendum.description}
        </p>
      )}

      {/* Vote tallies — always visible */}
      <div className="space-y-2 mb-3 border border-border rounded-lg p-3 bg-muted/20">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-green-400">{referendum.yesLabel || "Yes"}</span>
            <span className="font-bold text-green-400">{yesPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${yesPct}%`, background: "#276749" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-right">
            {total > 0 ? `${yesVotes.toLocaleString()} votes` : "No votes yet"}
          </p>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-red-400">{referendum.noLabel || "No"}</span>
            <span className="font-bold text-red-400">{noPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${noPct}%`, background: "#7a1010" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-right">
            {total > 0 ? `${noVotes.toLocaleString()} votes` : "No votes yet"}
          </p>
        </div>
        <div className="border-t border-border pt-2 mt-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total votes counted</span>
            <span className="font-semibold text-foreground">{total > 0 ? total.toLocaleString() : "—"}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Precincts reporting</span>
            <span className={`font-semibold ${pctReporting > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
              {pctReporting > 0 ? `${pctReporting.toFixed(1)}%` : "Polls not yet open"}
            </span>
          </div>
          {total > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>Margin</span>
              <span className={`font-semibold ${yesVotes > noVotes ? "text-green-400" : yesVotes < noVotes ? "text-red-400" : "text-foreground"}`}>
                {yesVotes === noVotes ? "Tied" : `${yesVotes > noVotes ? "Yes" : "No"} +${Math.abs(yesVotes - noVotes).toLocaleString()}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {referendum.notes && (
        <div className="text-xs border-t border-border pt-2 mt-2 space-y-1">
          <div className="flex items-center gap-1 text-yellow-400 font-semibold mb-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>About this measure</span>
          </div>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{referendum.notes}</p>
        </div>
      )}
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function RacePopup({ type, data, onClose }: RacePopupProps) {
  if (!data) return null;

  return (
    <div className="w-80 max-h-[80vh] overflow-y-auto bg-card border border-border rounded-lg shadow-2xl p-4">
      {type === "senate" && <SenatePopup race={data as SenateRace} onClose={onClose} />}
      {type === "house" && <HousePopup race={data as HouseRace} onClose={onClose} />}
      {type === "redistricting" && <RedistrictingPopup state={data as RedistrictingState} onClose={onClose} />}
      {type === "referendum" && <ReferendumPopup referendum={data as Referendum} onClose={onClose} />}
    </div>
  );
}
