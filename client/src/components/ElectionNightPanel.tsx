import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Zap, CheckCircle2, Circle, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Trophy, Undo2, Keyboard } from "lucide-react";
import { getPartyColor, getRatingClass } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, GovernorRace } from "../../../drizzle/schema";
import { toast } from "sonner";

interface ElectionNightPanelProps {
  adminToken: string;
}

type Chamber = "all" | "senate" | "house" | "governor";
type QueueFilter = "all" | "uncalled" | "called";

type RaceEntry = {
  id: number;
  chamber: "senate" | "house" | "governor";
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
  chamber: "senate" | "house" | "governor";
  label: string;
  calledWinner: string | null;
  calledParty: string | null;
  pct1: number | null;
  pct2: number | null;
  timestamp: Date;
};

function toRaceEntry(r: SenateRace, chamber: "senate"): RaceEntry;
function toRaceEntry(r: HouseRace, chamber: "house"): RaceEntry;
function toRaceEntry(r: GovernorRace, chamber: "governor"): RaceEntry;
function toRaceEntry(r: SenateRace | HouseRace | GovernorRace, chamber: "senate" | "house" | "governor"): RaceEntry {
  if (chamber === "governor") {
    const g = r as GovernorRace;
    return {
      id: g.id,
      chamber: "governor",
      label: g.stateName,
      sublabel: `Governor${g.isOpen ? " (Open)" : ""}`,
      rating: g.rating,
      status: g.status,
      candidate1Name: g.demCandidate ?? null,
      candidate1Party: "D",
      candidate2Name: g.repCandidate ?? null,
      candidate2Party: "R",
      calledWinner: g.calledWinner ?? null,
      calledParty: g.calledParty ?? null,
      // Convert raw vote counts to percentages for display
      candidate1VotePct: g.demVotes && g.repVotes && (g.demVotes + g.repVotes) > 0
        ? ((g.demVotes / (g.demVotes + g.repVotes)) * 100).toFixed(1)
        : null,
      candidate2VotePct: g.demVotes && g.repVotes && (g.demVotes + g.repVotes) > 0
        ? ((g.repVotes / (g.demVotes + g.repVotes)) * 100).toFixed(1)
        : null,
      pctReporting: g.pctReporting != null ? String(g.pctReporting) : null,
    };
  }
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
    candidate1Name: (r as SenateRace | HouseRace).candidate1Name ?? null,
    candidate1Party: (r as SenateRace | HouseRace).candidate1Party ?? null,
    candidate2Name: (r as SenateRace | HouseRace).candidate2Name ?? null,
    candidate2Party: (r as SenateRace | HouseRace).candidate2Party ?? null,
    calledWinner: r.calledWinner ?? null,
    calledParty: r.calledParty ?? null,
    candidate1VotePct: (r as SenateRace | HouseRace).candidate1VotePct != null ? String((r as SenateRace | HouseRace).candidate1VotePct) : null,
    candidate2VotePct: (r as SenateRace | HouseRace).candidate2VotePct != null ? String((r as SenateRace | HouseRace).candidate2VotePct) : null,
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
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRatingClass(rating as any)}`}>
      {rating}
    </span>
  );
}

function VotePctInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-16 truncate">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="0.0"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

function RaceRow({
  race,
  isActive,
  onActivate,
  onUpdate,
  onCall,
  onUncall,
  isSubmitting,
}: {
  race: RaceEntry;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (update: Partial<RaceEntry>) => void;
  onCall: (winner: "1" | "2" | null) => void;
  onUncall: () => void;
  isSubmitting: boolean;
}) {
  const isCalled = race.status === "Called" || race.status === "Certified";
  const chamberTag = race.chamber === "senate" ? "SEN" : race.chamber === "governor" ? "GOV" : "HSE";
  const chamberTagColor = race.chamber === "governor" ? "text-purple-400" : "text-muted-foreground";

  return (
    <div
      className={`border rounded-lg transition-all ${
        isCalled
          ? "border-green-800/50 bg-green-950/20"
          : isActive
          ? "border-blue-600/60 bg-blue-950/20"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      {/* Race header — always visible */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={onActivate}
      >
        {isCalled ? (
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold ${chamberTagColor}`}>{chamberTag}</span>
            <span className="text-sm font-semibold text-foreground truncate">{race.label}</span>
            {race.rating && <RatingBadge rating={race.rating} />}
          </div>
          {isCalled && race.calledWinner && (
            <div className="flex items-center gap-1 mt-0.5">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-yellow-300 font-medium">{race.calledWinner}</span>
              <PartyChip party={race.calledParty} />
            </div>
          )}
        </div>
        {isActive ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded edit panel */}
      {isActive && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-3">
          {/* Candidates */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <PartyChip party={race.candidate1Party} />
              <span className="text-xs text-foreground">{race.candidate1Name ?? "—"}</span>
            </div>
            <span className="text-muted-foreground/40 text-xs">vs</span>
            <div className="flex items-center gap-1.5">
              <PartyChip party={race.candidate2Party} />
              <span className="text-xs text-foreground">{race.candidate2Name ?? "—"}</span>
            </div>
          </div>

          {/* Vote pct inputs */}
          <div className="space-y-1.5">
            <VotePctInput
              label={race.candidate1Name ?? "Candidate 1"}
              value={race.candidate1VotePct ?? ""}
              onChange={v => onUpdate({ candidate1VotePct: v })}
            />
            <VotePctInput
              label={race.candidate2Name ?? "Candidate 2"}
              value={race.candidate2VotePct ?? ""}
              onChange={v => onUpdate({ candidate2VotePct: v })}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-16">% Reporting</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={race.pctReporting ?? ""}
                onChange={e => onUpdate({ pctReporting: e.target.value })}
                className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Call buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isCalled ? (
              <>
                <button
                  onClick={() => onCall("1")}
                  disabled={isSubmitting || !race.candidate1Name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: getPartyColor((race.candidate1Party ?? "D") as "D" | "R" | "I") }}
                >
                  <Trophy className="w-3 h-3" />
                  Call {race.candidate1Name ?? "Cand. 1"}
                </button>
                <button
                  onClick={() => onCall("2")}
                  disabled={isSubmitting || !race.candidate2Name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: getPartyColor((race.candidate2Party ?? "R") as "D" | "R" | "I") }}
                >
                  <Trophy className="w-3 h-3" />
                  Call {race.candidate2Name ?? "Cand. 2"}
                </button>
                <button
                  onClick={() => onCall(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Save Pcts
                </button>
              </>
            ) : (
              <button
                onClick={onUncall}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Undo2 className="w-3 h-3" /> Uncall
              </button>
            )}
          </div>
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
    ...((queue as any)?.governors ?? []).map((r: GovernorRace) => toRaceEntry(r, "governor")),
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
      if (race.chamber === "governor") {
        // Governor uses different vote fields and status enum
        await updateRace.mutateAsync({
          adminToken,
          chamber: "governor",
          id: race.id,
          pctReporting: pctRep,
          ...(winner !== null ? {
            calledWinner,
            calledParty: calledParty as "D" | "R" | "I" | null,
            govStatus: "Called",
          } : {}),
        });
      } else {
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
      }

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
      if (race.chamber === "governor") {
        await updateRace.mutateAsync({
          adminToken,
          chamber: "governor",
          id: race.id,
          calledWinner: null,
          calledParty: null,
          govStatus: "Voting",
        });
      } else {
        await updateRace.mutateAsync({
          adminToken,
          chamber: race.chamber,
          id: race.id,
          calledWinner: null,
          calledParty: null,
          status: "General",
        });
      }
      toast.success(`${race.label} uncalled`);
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

  const hasAnyRaces = queue && (
    queue.senate.length > 0 ||
    queue.house.length > 0 ||
    ((queue as any).governors?.length ?? 0) > 0
  );

  if (!hasAnyRaces) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
        <div>
          <p className="font-semibold text-foreground">No races in General/Voting status yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the Senate, House, or Governors tabs to advance races first.
          </p>
        </div>
      </div>
    );
  }

  const chamberOptions: { value: Chamber; label: string }[] = [
    { value: "all", label: "All Chambers" },
    { value: "senate", label: "Senate" },
    { value: "house", label: "House" },
    { value: "governor", label: "Governors" },
  ];

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
          <div className="flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5 text-muted-foreground/50" />
            <button
              onClick={() => refetch()}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
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
          {chamberOptions.map(({ value: c, label }) => (
            <button
              key={c}
              onClick={() => setChamberFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                chamberFilter === c
                  ? c === "governor"
                    ? "bg-purple-700 border-purple-600 text-white"
                    : "bg-blue-700 border-blue-600 text-white"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
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
                    <span className={`text-xs flex-shrink-0 ${u.chamber === "governor" ? "text-purple-400" : "text-muted-foreground"}`}>
                      {u.chamber === "senate" ? "SEN" : u.chamber === "governor" ? "GOV" : "HSE"}
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
