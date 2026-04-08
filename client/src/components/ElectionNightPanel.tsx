import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Zap, CheckCircle2, Circle, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Trophy, Undo2, Keyboard } from "lucide-react";
import { getPartyColor, getRatingClass } from "@/lib/electionUtils";
import type { SenateRace, HouseRace } from "../../../drizzle/schema";
import { toast } from "sonner";

interface ElectionNightPanelProps {
  adminToken: string;
}

type Chamber = "all" | "senate" | "house";
type QueueFilter = "all" | "uncalled" | "called";

type RaceEntry = {
  id: number;
  chamber: "senate" | "house";
  label: string;
  sublabel: string;
  rating: string | null;
  status: string | null;
  candidate1Name: string | null;
  candidate1Party: string | null;
  candidate2Name: string | null;
  candidate2Party: string | null;
  calledWinner: string | null;
  calledParty: string | null;
  candidate1VotePct: string | null;
  candidate2VotePct: string | null;
  pctReporting: string | null;
};

type RecentUpdate = {
  id: number;
  chamber: "senate" | "house";
  label: string;
  calledWinner: string | null;
  calledParty: string | null;
  pct1: number | null;
  pct2: number | null;
  timestamp: Date;
};

function toRaceEntry(r: SenateRace, chamber: "senate"): RaceEntry;
function toRaceEntry(r: HouseRace, chamber: "house"): RaceEntry;
function toRaceEntry(r: SenateRace | HouseRace, chamber: "senate" | "house"): RaceEntry {
  const label = chamber === "senate"
    ? (r as SenateRace).stateName ?? ""
    : `${(r as HouseRace).stateCode}-${(r as HouseRace).districtLabel}`;
  const sublabel = chamber === "senate"
    ? `U.S. Senate${(r as SenateRace).isSpecial ? " (Special)" : ""}`
    : `${(r as HouseRace).stateName} House`;
  return {
    id: r.id,
    chamber,
    label,
    sublabel,
    rating: r.rating,
    status: r.status,
    candidate1Name: r.candidate1Name ?? null,
    candidate1Party: r.candidate1Party ?? null,
    candidate2Name: r.candidate2Name ?? null,
    candidate2Party: r.candidate2Party ?? null,
    calledWinner: r.calledWinner ?? null,
    calledParty: r.calledParty ?? null,
    candidate1VotePct: r.candidate1VotePct != null ? String(r.candidate1VotePct) : null,
    candidate2VotePct: r.candidate2VotePct != null ? String(r.candidate2VotePct) : null,
    pctReporting: r.pctReporting != null ? String(r.pctReporting) : null,
  };
}

function PartyChip({ party }: { party: string | null | undefined }) {
  if (!party) return null;
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white flex-shrink-0"
      style={{ background: getPartyColor(party as "D" | "R" | "I") }}
    >
      {party}
    </span>
  );
}

function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return null;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(rating as any)}`}>
      {rating}
    </span>
  );
}

interface RaceRowProps {
  race: RaceEntry;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (update: Partial<RaceEntry>) => void;
  onCall: (winner: "1" | "2" | null) => void;
  onUncall: () => void;
  isSubmitting: boolean;
}

function RaceRow({ race, isActive, onActivate, onUpdate, onCall, onUncall, isSubmitting }: RaceRowProps) {
  const isCalled = race.status === "Called" || race.status === "Certified";
  const pct1Ref = useRef<HTMLInputElement>(null);
  const pct2Ref = useRef<HTMLInputElement>(null);
  const pctRepRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && pct1Ref.current) {
      pct1Ref.current.focus();
      pct1Ref.current.select();
    }
  }, [isActive]);

  const handleKeyDown = (e: React.KeyboardEvent, field: "pct1" | "pct2" | "pctRep") => {
    if (e.key === "Tab" && !e.shiftKey) {
      if (field === "pct1") { e.preventDefault(); pct2Ref.current?.focus(); pct2Ref.current?.select(); }
      if (field === "pct2") { e.preventDefault(); pctRepRef.current?.focus(); pctRepRef.current?.select(); }
    }
    if (e.key === "Escape") { onActivate(); }
  };

  return (
    <div
      className={`border rounded-lg transition-all duration-150 ${
        isCalled
          ? "border-green-700/50 bg-green-950/20"
          : isActive
          ? "border-yellow-500/60 bg-yellow-950/10"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/10 cursor-pointer"
      }`}
      onClick={!isActive ? onActivate : undefined}
    >
      {/* Race header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${isCalled ? "text-green-300" : "text-foreground"}`}>
              {race.label}
            </span>
            <span className="text-xs text-muted-foreground">{race.sublabel}</span>
            <RatingBadge rating={race.rating} />
            {isCalled && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Called
              </span>
            )}
          </div>
          {isCalled && race.calledWinner && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-yellow-300 font-medium">{race.calledWinner}</span>
              {race.calledParty && <PartyChip party={race.calledParty} />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isCalled ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUncall(); }}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 border border-orange-700/40 hover:border-orange-500/60 px-2 py-1 rounded transition-colors"
            >
              <Undo2 className="w-3 h-3" /> Uncall
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onActivate(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded entry form */}
      {isActive && !isCalled && (
        <div className="px-3 pb-3 border-t border-border/40 pt-2.5 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Vote percentage inputs */}
          <div className="grid grid-cols-2 gap-2">
            {/* Candidate 1 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <PartyChip party={race.candidate1Party} />
                <span className="text-xs text-muted-foreground truncate">
                  {race.candidate1Name ?? "Candidate 1"}
                </span>
              </div>
              <div className="relative">
                <input
                  ref={pct1Ref}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={race.candidate1VotePct ?? ""}
                  onChange={e => onUpdate({ candidate1VotePct: e.target.value || null })}
                  onKeyDown={e => handleKeyDown(e, "pct1")}
                  placeholder="0.0"
                  className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500/50 pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>

            {/* Candidate 2 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <PartyChip party={race.candidate2Party} />
                <span className="text-xs text-muted-foreground truncate">
                  {race.candidate2Name ?? "Candidate 2"}
                </span>
              </div>
              <div className="relative">
                <input
                  ref={pct2Ref}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={race.candidate2VotePct ?? ""}
                  onChange={e => onUpdate({ candidate2VotePct: e.target.value || null })}
                  onKeyDown={e => handleKeyDown(e, "pct2")}
                  placeholder="0.0"
                  className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500/50 pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* % Reporting */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 flex-shrink-0">% Reporting</span>
            <div className="relative flex-1">
              <input
                ref={pctRepRef}
                type="number"
                min="0"
                max="100"
                step="1"
                value={race.pctReporting ?? ""}
                onChange={e => onUpdate({ pctReporting: e.target.value || null })}
                onKeyDown={e => handleKeyDown(e, "pctRep")}
                placeholder="0"
                className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500/50 pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {/* Save vote pcts without calling */}
            <button
              onClick={() => onCall(null)}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-muted/60 hover:bg-muted border border-border text-sm py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Save
            </button>

            {/* Call for Candidate 1 */}
            {race.candidate1Name && (
              <button
                onClick={() => onCall("1")}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded border transition-colors disabled:opacity-50"
                style={{
                  background: `${getPartyColor(race.candidate1Party as any)}22`,
                  borderColor: `${getPartyColor(race.candidate1Party as any)}55`,
                  color: getPartyColor(race.candidate1Party as any),
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span className="truncate max-w-[80px]">{race.candidate1Name.split(" ").pop()}</span>
              </button>
            )}

            {/* Call for Candidate 2 */}
            {race.candidate2Name && (
              <button
                onClick={() => onCall("2")}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded border transition-colors disabled:opacity-50"
                style={{
                  background: `${getPartyColor(race.candidate2Party as any)}22`,
                  borderColor: `${getPartyColor(race.candidate2Party as any)}55`,
                  color: getPartyColor(race.candidate2Party as any),
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span className="truncate max-w-[80px]">{race.candidate2Name.split(" ").pop()}</span>
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            Tab to advance fields · Esc to collapse · Click candidate name to call race
          </p>
        </div>
      )}
    </div>
  );
}

export default function ElectionNightPanel({ adminToken }: ElectionNightPanelProps) {
  const [chamberFilter, setChamberFilter] = useState<Chamber>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("uncalled");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<RaceEntry>>>({});
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [showFeed, setShowFeed] = useState(true);

  const utils = trpc.useUtils();

  const { data: queue, isLoading, refetch } = trpc.electionNight.queue.useQuery(
    { adminToken },
    { refetchInterval: 10_000, staleTime: 10_000 }
  );

  const updateRace = trpc.electionNight.updateRace.useMutation({
    onSuccess: () => {
      utils.electionNight.queue.invalidate();
      utils.scoreboard.get.invalidate();
      utils.flips.get.invalidate();
    },
  });

  // Build the race list from server data merged with local edits
  const allRaces: RaceEntry[] = [
    ...(queue?.senate ?? []).map(r => toRaceEntry(r, "senate")),
    ...(queue?.house ?? []).map(r => toRaceEntry(r, "house")),
  ].map(r => {
    const key = `${r.chamber}-${r.id}`;
    return { ...r, ...localEdits[key] };
  });

  const filteredRaces = allRaces.filter(r => {
    if (chamberFilter !== "all" && r.chamber !== chamberFilter) return false;
    if (queueFilter === "uncalled") return r.status !== "Called" && r.status !== "Certified";
    if (queueFilter === "called") return r.status === "Called" || r.status === "Certified";
    return true;
  });

  const calledCount = allRaces.filter(r => r.status === "Called" || r.status === "Certified").length;
  const uncalledCount = allRaces.filter(r => r.status !== "Called" && r.status !== "Certified").length;

  const handleUpdate = useCallback((race: RaceEntry, update: Partial<RaceEntry>) => {
    const key = `${race.chamber}-${race.id}`;
    setLocalEdits(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...update } }));
  }, []);

  const handleCall = useCallback(async (race: RaceEntry, winner: "1" | "2" | null) => {
    const key = `${race.chamber}-${race.id}`;
    const edits = localEdits[key] ?? {};
    const merged = { ...race, ...edits };

    const pct1 = merged.candidate1VotePct ? parseFloat(merged.candidate1VotePct) : null;
    const pct2 = merged.candidate2VotePct ? parseFloat(merged.candidate2VotePct) : null;
    const pctRep = merged.pctReporting ? parseFloat(merged.pctReporting) : null;

    const calledWinner = winner === "1" ? merged.candidate1Name
      : winner === "2" ? merged.candidate2Name
      : null;
    const calledParty = winner === "1" ? merged.candidate1Party
      : winner === "2" ? merged.candidate2Party
      : null;

    try {
      await updateRace.mutateAsync({
        adminToken,
        chamber: race.chamber,
        id: race.id,
        candidate1VotePct: pct1,
        candidate2VotePct: pct2,
        pctReporting: pctRep,
        ...(winner !== null ? {
          calledWinner,
          calledParty: calledParty as "D" | "R" | "I" | null,
          status: "Called",
        } : {}),
      });

      // Clear local edits for this race
      setLocalEdits(prev => { const next = { ...prev }; delete next[key]; return next; });
      setActiveId(null);

      // Add to recent feed
      if (winner !== null) {
        setRecentUpdates(prev => [{
          id: race.id,
          chamber: race.chamber,
          label: race.label,
          calledWinner,
          calledParty,
          pct1,
          pct2,
          timestamp: new Date(),
        }, ...prev.slice(0, 19)]);
        toast.success(`${race.label} called for ${calledWinner}`, { duration: 3000 });
      } else {
        toast.success(`${race.label} updated`, { duration: 2000 });
      }

      // Auto-advance to next uncalled race
      if (winner !== null) {
        const currentIndex = filteredRaces.findIndex(r => r.chamber === race.chamber && r.id === race.id);
        const nextRace = filteredRaces.slice(currentIndex + 1).find(r => r.status !== "Called" && r.status !== "Certified");
        if (nextRace) setActiveId(`${nextRace.chamber}-${nextRace.id}`);
      }
    } catch {
      toast.error(`Failed to update ${race.label}`);
    }
  }, [adminToken, localEdits, filteredRaces, updateRace]);

  const handleUncall = useCallback(async (race: RaceEntry) => {
    try {
      await updateRace.mutateAsync({
        adminToken,
        chamber: race.chamber,
        id: race.id,
        calledWinner: null,
        calledParty: null,
        status: "General",
      });
      toast.success(`${race.label} uncalled — reverted to General`);
    } catch {
      toast.error(`Failed to uncall ${race.label}`);
    }
  }, [adminToken, updateRace]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading election queue...
      </div>
    );
  }

  if (!queue || (queue.senate.length === 0 && queue.house.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
        <div>
          <p className="font-semibold text-foreground">No races in General status yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the Senate or House tabs to advance races from Primary → General first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Main race queue */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Election Night Queue</span>
            <span className="text-xs text-muted-foreground">
              {calledCount} called · {uncalledCount} remaining
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all duration-500"
            style={{ width: `${allRaces.length > 0 ? (calledCount / allRaces.length) * 100 : 0}%` }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chamber */}
          {(["all", "senate", "house"] as Chamber[]).map(c => (
            <button
              key={c}
              onClick={() => setChamberFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                chamberFilter === c
                  ? "bg-blue-700 border-blue-600 text-white"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? "All Chambers" : c === "senate" ? "Senate" : "House"}
            </button>
          ))}
          <span className="text-muted-foreground/30 text-xs">|</span>
          {/* Status */}
          {(["all", "uncalled", "called"] as QueueFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setQueueFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                queueFilter === f
                  ? f === "called"
                    ? "bg-green-800 border-green-700 text-green-200"
                    : "bg-muted border-border text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "uncalled" ? `Uncalled (${uncalledCount})` : `Called (${calledCount})`}
            </button>
          ))}
        </div>

        {/* Race list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredRaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {queueFilter === "called" ? "No races called yet." : "All races in this view have been called!"}
            </div>
          ) : (
            filteredRaces.map(race => {
              const key = `${race.chamber}-${race.id}`;
              const merged = { ...race, ...(localEdits[key] ?? {}) };
              return (
                <RaceRow
                  key={key}
                  race={merged}
                  isActive={activeId === key}
                  onActivate={() => setActiveId(prev => prev === key ? null : key)}
                  onUpdate={update => handleUpdate(race, update)}
                  onCall={winner => handleCall(merged, winner)}
                  onUncall={() => handleUncall(race)}
                  isSubmitting={updateRace.isPending}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Live results feed */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2 border-l border-border pl-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Feed
          </span>
          <button
            onClick={() => setShowFeed(f => !f)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showFeed ? "Hide" : "Show"}
          </button>
        </div>

        {showFeed && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {recentUpdates.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 text-center py-4">
                Called races will appear here
              </div>
            ) : (
              recentUpdates.map((u, i) => (
                <div key={i} className="bg-card border border-green-800/40 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">{u.label}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {u.chamber === "senate" ? "SEN" : "HSE"}
                    </span>
                  </div>
                  {u.calledWinner && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      <span className="text-xs text-yellow-300 font-medium truncate">{u.calledWinner}</span>
                      {u.calledParty && (
                        <span
                          className="text-xs font-bold px-1 rounded"
                          style={{ color: getPartyColor(u.calledParty as any), background: `${getPartyColor(u.calledParty as any)}22` }}
                        >
                          {u.calledParty}
                        </span>
                      )}
                    </div>
                  )}
                  {(u.pct1 != null || u.pct2 != null) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {u.pct1 != null && <span>{u.pct1.toFixed(1)}%</span>}
                      {u.pct1 != null && u.pct2 != null && <span className="mx-1">·</span>}
                      {u.pct2 != null && <span>{u.pct2.toFixed(1)}%</span>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground/50 mt-1">
                    {u.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
