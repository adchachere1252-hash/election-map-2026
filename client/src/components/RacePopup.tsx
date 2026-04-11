import { useState } from "react";
import { X, MapPin, Calendar, Users, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";
import { getRatingClass, getRatingColor, getPartyColor, getStatusColor, formatVotePct, getPartyLabel } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import SenatorDetailPopup from "./SenatorDetailPopup";

interface RacePopupProps {
  type: "senate" | "house" | "redistricting" | "referendum";
  data: SenateRace | HouseRace | RedistrictingState | Referendum | null;
  onClose: () => void;
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

function CandidateRow({
  name, party, votePct, isWinner
}: { name: string | null | undefined; party: string | null | undefined; votePct: string | number | null | undefined; isWinner?: boolean }) {
  if (!name) return null;
  const pctNum = votePct !== null && votePct !== undefined ? parseFloat(String(votePct)) : null;
  const hasVotes = pctNum !== null && !isNaN(pctNum) && pctNum > 0;
  return (
    <div className={`py-1.5 px-2 rounded ${isWinner ? "bg-green-900/30 border border-green-700/40" : "bg-muted/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <PartyDot party={party} />
          <span className="text-sm font-medium truncate">{name}</span>
          {party && <span className="ml-1.5 text-xs text-muted-foreground">({party})</span>}
          {isWinner && <span className="ml-2 text-xs text-green-400 font-bold">✓ Called</span>}
        </div>
        {hasVotes && (
          <span className="text-sm font-bold ml-2 flex-shrink-0" style={{ color: getPartyColor(party as any) }}>
            {formatVotePct(pctNum!)}
          </span>
        )}
      </div>
      {hasVotes && <VoteBar pct={pctNum!} party={party} />}
    </div>
  );
}

function SenatePopup({ race, onClose }: { race: SenateRace; onClose: () => void }) {
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
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
          <X className="w-4 h-4" />
        </button>
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

      {(race.candidate1Name || race.candidate2Name) && (
        <div className="space-y-1.5 mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Candidates</p>
          <CandidateRow
            name={race.candidate1Name}
            party={race.candidate1Party}
            votePct={race.candidate1VotePct}
            isWinner={race.calledWinner === race.candidate1Name}
          />
          <CandidateRow
            name={race.candidate2Name}
            party={race.candidate2Party}
            votePct={race.candidate2VotePct}
            isWinner={race.calledWinner === race.candidate2Name}
          />
          {race.pctReporting && parseFloat(String(race.pctReporting)) > 0 && (
            <p className="text-xs text-muted-foreground text-right">{formatVotePct(race.pctReporting)} reporting</p>
          )}
        </div>
      )}

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
        {race.generalDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>General: {race.generalDate}</span>
          </div>
        )}
        {race.notes && (
          <div className="flex items-start gap-2 text-xs text-yellow-400 mt-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{race.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HousePopup({ race, onClose }: { race: HouseRace; onClose: () => void }) {
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
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={race.status} />
        <RatingBadge rating={race.rating} />
      </div>

      {race.incumbent && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Incumbent:</span>
          <PartyDot party={race.incumbentParty} />
          <span className="font-medium truncate">{race.incumbent}</span>
          {race.incumbentRetiring && <span className="text-orange-400 text-xs flex-shrink-0">(Retiring)</span>}
        </div>
      )}

      {(race.candidate1Name || race.candidate2Name) && (
        <div className="space-y-1.5 mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Candidates</p>
          <CandidateRow
            name={race.candidate1Name}
            party={race.candidate1Party}
            votePct={race.candidate1VotePct}
            isWinner={race.calledWinner === race.candidate1Name}
          />
          <CandidateRow
            name={race.candidate2Name}
            party={race.candidate2Party}
            votePct={race.candidate2VotePct}
            isWinner={race.calledWinner === race.candidate2Name}
          />
          {race.pctReporting && parseFloat(String(race.pctReporting)) > 0 && (
            <p className="text-xs text-muted-foreground text-right">{formatVotePct(race.pctReporting)} reporting</p>
          )}
        </div>
      )}

      <div className="border-t border-border pt-2 space-y-1">
        {race.primaryDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Primary: {race.primaryDate}</span>
          </div>
        )}
        {race.generalDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>General: {race.generalDate}</span>
          </div>
        )}
        {race.notes && (
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

      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white`}
          style={{ background: state.enacted ? "#4a7c59" : "#8b6914" }}
        >
          {state.enacted ? "Map Enacted" : "Pending"}
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
          <div className="flex items-start gap-2 text-xs text-yellow-400 border-t border-border pt-2">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{state.litigationNotes}</span>
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

      {/* Vote tallies */}
      <div className="space-y-2 mb-3">
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
          <p className="text-xs text-muted-foreground mt-0.5 text-right">{yesVotes.toLocaleString()} votes</p>
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
          <p className="text-xs text-muted-foreground mt-0.5 text-right">{noVotes.toLocaleString()} votes</p>
        </div>
      </div>

      {pctReporting > 0 && (
        <p className="text-xs text-center text-muted-foreground border-t border-border pt-2">
          {pctReporting.toFixed(1)}% of precincts reporting
        </p>
      )}

      {referendum.notes && (
        <div className="flex items-start gap-2 text-xs text-yellow-400 border-t border-border pt-2 mt-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{referendum.notes}</span>
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
