import { useState, useMemo } from "react";
import { Search } from "lucide-react";
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
  generalDate: string;
  demCandidate: string | null;
  repCandidate: string | null;
  status: string;
  calledParty: string | null;
}

interface GovernorRaceListProps {
  governorRaces: GovernorRace[];
  onSelectGovernor: (race: GovernorRace) => void;
  selectedId?: number | null;
}

const RATING_ORDER: Record<string, number> = {
  "Toss-up": 0,
  "Lean D": 1,
  "Lean R": 1,
  "Likely D": 2,
  "Likely R": 2,
  "Solid D": 3,
  "Solid R": 3,
};

const PARTY_COLORS: Record<string, string> = {
  D: "#3b82f6",
  R: "#ef4444",
  I: "#9ca3af",
};

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const bg = getRatingColor(rating as any);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap"
      style={{ background: bg }}
    >
      {rating}
    </span>
  );
}

export default function GovernorRaceList({
  governorRaces,
  onSelectGovernor,
  selectedId,
}: GovernorRaceListProps) {
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return governorRaces
      .filter(r => {
        if (filterRating !== "all" && r.rating !== filterRating) return false;
        if (!q) return true;
        return (
          r.stateName.toLowerCase().includes(q) ||
          r.stateCode.toLowerCase().includes(q) ||
          (r.incumbentName?.toLowerCase().includes(q)) ||
          (r.demCandidate?.toLowerCase().includes(q)) ||
          (r.repCandidate?.toLowerCase().includes(q)) ||
          (r.rating?.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ao = RATING_ORDER[a.rating ?? ""] ?? 9;
        const bo = RATING_ORDER[b.rating ?? ""] ?? 9;
        if (ao !== bo) return ao - bo;
        return a.stateName.localeCompare(b.stateName);
      });
  }, [governorRaces, search, filterRating]);

  // Group by rating tier
  const groups = useMemo(() => {
    const map = new Map<string, GovernorRace[]>();
    for (const r of filtered) {
      const key = r.rating ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // Sort groups by RATING_ORDER
    return Array.from(map.entries()).sort(([a], [b]) =>
      (RATING_ORDER[a] ?? 9) - (RATING_ORDER[b] ?? 9)
    );
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Governor Races</span>
          <span className="text-[10px] text-muted-foreground font-normal normal-case">
            {governorRaces.length} states · 2026
          </span>
        </div>
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search state or candidate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 text-xs bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {/* Rating filter */}
        <select
          value={filterRating}
          onChange={e => setFilterRating(e.target.value)}
          className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Ratings</option>
          <option value="Toss-up">Toss-up</option>
          <option value="Lean D">Lean D</option>
          <option value="Lean R">Lean R</option>
          <option value="Likely D">Likely D</option>
          <option value="Likely R">Likely R</option>
          <option value="Solid D">Solid D</option>
          <option value="Solid R">Solid R</option>
        </select>
      </div>

      {/* Race list */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No races match your filter.</div>
        ) : (
          groups.map(([rating, races]) => (
            <div key={rating}>
              {/* Rating group header */}
              <div
                className="sticky top-0 z-10 px-3 py-1 flex items-center gap-2"
                style={{ background: "hsl(var(--card))" }}
              >
                <RatingBadge rating={rating} />
                <span className="text-[10px] text-muted-foreground">{races.length} race{races.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Race items */}
              {races.map(race => {
                const isSelected = selectedId === race.id;
                const isCalled = !!race.calledParty;
                const isOpen = race.isOpen || race.isTermLimited;

                return (
                  <button
                    key={race.id}
                    onClick={() => onSelectGovernor(race)}
                    className={`w-full text-left px-3 py-2 border-b border-border/40 transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    {/* State name + badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{race.stateName}</span>
                      {isCalled && (
                        <span
                          className="text-[9px] font-bold px-1 py-0.5 rounded text-white"
                          style={{ background: race.calledParty === "D" ? "#1a4fa0" : "#b22222" }}
                        >
                          Called {race.calledParty}
                        </span>
                      )}
                      {isOpen && !isCalled && (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-700/30">
                          {race.isTermLimited ? "Term-Ltd" : "Open"}
                        </span>
                      )}
                    </div>

                    {/* Incumbent or candidates */}
                    {!isOpen && race.incumbentName ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PARTY_COLORS[race.incumbentParty ?? ""] ?? "#9ca3af" }}
                        />
                        <span className="text-[10px] text-muted-foreground truncate">{race.incumbentName}</span>
                        <span className="text-[10px] text-muted-foreground">· Incumbent</span>
                      </div>
                    ) : (race.status === "Voting" || race.status === "Primary") ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-amber-400 italic">Primary in progress — nominees TBD</span>
                      </div>
                    ) : (race.demCandidate || race.repCandidate) ? (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {race.demCandidate && (
                          <span className="text-[10px] text-blue-400 truncate max-w-[80px]">{race.demCandidate}</span>
                        )}
                        {race.demCandidate && race.repCandidate && (
                          <span className="text-[10px] text-muted-foreground">vs</span>
                        )}
                        {race.repCandidate && (
                          <span className="text-[10px] text-red-400 truncate max-w-[80px]">{race.repCandidate}</span>
                        )}
                      </div>
                    ) : null}

                    {/* Dates */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {race.primaryDate && (
                        <span className="text-[9px] text-muted-foreground">Primary: {race.primaryDate}</span>
                      )}
                      <span className="text-[9px] text-muted-foreground">General: {race.generalDate}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
