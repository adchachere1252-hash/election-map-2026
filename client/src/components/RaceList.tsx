import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { getRatingColor, getPartyColor, getRatingClass } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";

type MapView = "senate" | "house" | "redistricting";

interface RaceListProps {
  view: MapView;
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  redistrictingStates: RedistrictingState[];
  referendums: Referendum[];
  onSelectSenate?: (race: SenateRace) => void;
  onSelectHouse?: (race: HouseRace) => void;
  onSelectRedistricting?: (state: RedistrictingState) => void;
  onSelectReferendum?: (ref: Referendum) => void;
  selectedId?: number | null;
}

const RATINGS_ORDER = ["Toss-up", "Lean D", "Likely D", "Lean R", "Likely R", "Solid D", "Solid R"];

function SenateList({ races, onSelect, selectedId }: {
  races: SenateRace[];
  onSelect?: (r: SenateRace) => void;
  selectedId?: number | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [only2026, setOnly2026] = useState(false);

  const filtered = useMemo(() => {
    return races.filter(r => {
      const matchSearch = !search || r.stateName.toLowerCase().includes(search.toLowerCase()) ||
        (r.incumbent?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchFilter = filter === "all" || r.rating === filter || r.status === filter;
      // 2026 filter: show only races with a general election date in 2026
      const match2026 = !only2026 || (r.generalDate && r.generalDate.includes("2026"));
      return matchSearch && matchFilter && match2026;
    }).sort((a, b) => {
      const ai = RATINGS_ORDER.indexOf(a.rating ?? "");
      const bi = RATINGS_ORDER.indexOf(b.rating ?? "");
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.stateName.localeCompare(b.stateName);
    });
  }, [races, search, filter]);

  return (
    <div className="flex flex-col">
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full bg-muted border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search states..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All Races</option>
          <option value="Toss-up">Toss-up</option>
          <option value="Lean D">Lean D</option>
          <option value="Likely D">Likely D</option>
          <option value="Lean R">Lean R</option>
          <option value="Likely R">Likely R</option>
          <option value="Solid D">Solid D</option>
          <option value="Solid R">Solid R</option>
          <option value="Called">Called</option>
          <option value="Certified">Certified</option>
        </select>
        {/* 2026-only toggle */}
        <button
          onClick={() => setOnly2026(v => !v)}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
            only2026
              ? "bg-amber-900/60 text-amber-200 border-amber-700/60 hover:bg-amber-900/80"
              : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${only2026 ? "bg-amber-400" : "bg-muted-foreground"}`} />
          {only2026 ? "Showing 2026 Races Only" : "Show 2026 Races Only"}
        </button>
      </div>
      <div>
        {filtered.map(race => (
          <button
            key={race.id}
            onClick={() => onSelect?.(race)}
            className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedId === race.id ? "bg-accent" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: getRatingColor(race.rating as any) }}
                />
                <span className="font-medium text-sm truncate">{race.stateName}</span>
                {race.isSpecial && (
                  <span className="text-xs bg-yellow-900 text-yellow-300 px-1 rounded flex-shrink-0">S</span>
                )}
              </div>
              {race.rating && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ml-1 ${getRatingClass(race.rating as any)}`}>
                  {race.rating}
                </span>
              )}
            </div>
            {race.incumbent && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate pl-4">
                {race.incumbent} ({race.incumbentParty}){race.incumbentRetiring ? " · Retiring" : ""}
              </p>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No races match your filter</p>
        )}
      </div>
      <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
        {filtered.length} of {races.length} races
      </div>
    </div>
  );
}

function HouseList({ races, onSelect, selectedId }: {
  races: HouseRace[];
  onSelect?: (r: HouseRace) => void;
  selectedId?: number | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expandedState, setExpandedState] = useState<string | null>(null);

  const byState = useMemo(() => {
    const map: Record<string, HouseRace[]> = {};
    for (const r of races) {
      if (!map[r.stateCode]) map[r.stateCode] = [];
      map[r.stateCode].push(r);
    }
    return map;
  }, [races]);

  const filteredStates = useMemo(() => {
    return Object.entries(byState)
      .filter(([code, stateRaces]) => {
        if (search) {
          return stateRaces.some(r =>
            r.stateName.toLowerCase().includes(search.toLowerCase()) ||
            (r.incumbent?.toLowerCase().includes(search.toLowerCase()) ?? false)
          );
        }
        if (filter !== "all") {
          return stateRaces.some(r => r.rating === filter || r.status === filter);
        }
        return true;
      })
      .sort(([, a], [, b]) => a[0].stateName.localeCompare(b[0].stateName));
  }, [byState, search, filter]);

  const totalFiltered = filteredStates.reduce((sum, [, r]) => sum + r.length, 0);

  return (
    <div className="flex flex-col">
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full bg-muted border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search state or incumbent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All Districts</option>
          <option value="Toss-up">Toss-up</option>
          <option value="Lean D">Lean D</option>
          <option value="Likely D">Likely D</option>
          <option value="Lean R">Lean R</option>
          <option value="Likely R">Likely R</option>
          <option value="Solid D">Solid D</option>
          <option value="Solid R">Solid R</option>
          <option value="Called">Called</option>
        </select>
      </div>
      <div>
        {filteredStates.map(([stateCode, stateRaces]) => {
          const isExpanded = expandedState === stateCode;
          const filteredRaces = filter !== "all"
            ? stateRaces.filter(r => r.rating === filter || r.status === filter)
            : stateRaces;
          if (filteredRaces.length === 0) return null;

          return (
            <div key={stateCode}>
              <button
                onClick={() => setExpandedState(isExpanded ? null : stateCode)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted border-b border-border text-sm font-semibold"
              >
                <span>{stateRaces[0].stateName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{filteredRaces.length} districts</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
              {isExpanded && filteredRaces.map(race => (
                <button
                  key={race.id}
                  onClick={() => onSelect?.(race)}
                  className={`w-full text-left px-4 py-2 border-b border-border/30 hover:bg-accent transition-colors ${selectedId === race.id ? "bg-accent" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: getRatingColor(race.rating as any) }}
                      />
                      <span className="text-xs font-medium">
                        {race.districtLabel === "AL" ? "At-Large" : `District ${race.district}`}
                      </span>
                    </div>
                    {race.rating && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>
                        {race.rating}
                      </span>
                    )}
                  </div>
                  {race.incumbent && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-3.5">
                      {race.incumbent}
                    </p>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
        {totalFiltered} of {races.length} districts
      </div>
    </div>
  );
}

function RedistrictingList({ states, referendums, onSelectState, onSelectReferendum }: {
  states: RedistrictingState[];
  referendums: Referendum[];
  onSelectState?: (s: RedistrictingState) => void;
  onSelectReferendum?: (r: Referendum) => void;
}) {
  const enacted = states.filter(s => s.enacted);
  const pending = states.filter(s => !s.enacted);

  return (
    <div className="flex flex-col">
      {referendums.length > 0 && (
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Active Referendums</p>
          {referendums.map(ref => (
            <button
              key={ref.id}
              onClick={() => onSelectReferendum?.(ref)}
              className="w-full text-left p-2.5 rounded border border-yellow-700/40 bg-yellow-900/10 hover:bg-yellow-900/20 transition-colors mb-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-yellow-400">{ref.stateName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${ref.status === "Called" ? "bg-green-900 text-green-200" : "bg-gray-700 text-gray-300"}`}>
                  {ref.status}
                </span>
              </div>
              <p className="text-xs text-foreground font-medium leading-tight">{ref.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ref.electionDate}</p>
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
          Enacted Maps ({enacted.length})
        </p>
        {enacted.map(state => (
          <button
            key={state.id}
            onClick={() => onSelectState?.(state)}
            className="w-full text-left px-2.5 py-2 rounded hover:bg-accent transition-colors mb-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{state.stateName}</span>
              {state.projectedImpact && (
                <span className="text-xs font-bold" style={{ color: state.projectedImpact.includes("D") ? "#5b8fd4" : "#d96b4a" }}>
                  {state.projectedImpact}
                </span>
              )}
            </div>
            {state.method && <p className="text-xs text-muted-foreground mt-0.5">{state.method}</p>}
          </button>
        ))}
      </div>

      <div className="p-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-600 inline-block" />
          Pending Maps ({pending.length})
        </p>
        {pending.map(state => (
          <button
            key={state.id}
            onClick={() => onSelectState?.(state)}
            className="w-full text-left px-2.5 py-2 rounded hover:bg-accent transition-colors mb-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{state.stateName}</span>
              {state.projectedImpact && state.projectedImpact !== "TBD" && (
                <span className="text-xs font-bold text-yellow-400">{state.projectedImpact}</span>
              )}
            </div>
            {state.status && <p className="text-xs text-muted-foreground mt-0.5 truncate">{state.status}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RaceList({
  view, senateRaces, houseRaces, redistrictingStates, referendums,
  onSelectSenate, onSelectHouse, onSelectRedistricting, onSelectReferendum,
  selectedId,
}: RaceListProps) {
  return (
    <div className="flex flex-col">
      {view === "senate" && (
        <SenateList races={senateRaces} onSelect={onSelectSenate} selectedId={selectedId} />
      )}
      {view === "house" && (
        <HouseList races={houseRaces} onSelect={onSelectHouse} selectedId={selectedId} />
      )}
      {view === "redistricting" && (
        <RedistrictingList
          states={redistrictingStates}
          referendums={referendums}
          onSelectState={onSelectRedistricting}
          onSelectReferendum={onSelectReferendum}
        />
      )}
    </div>
  );
}
