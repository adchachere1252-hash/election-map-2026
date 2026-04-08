import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, MapPin, Building2, Vote, ChevronRight } from "lucide-react";
import { getRatingClass } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";

interface GlobalSearchProps {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  redistrictingStates: RedistrictingState[];
  referendums: Referendum[];
  onSelectSenate: (race: SenateRace) => void;
  onSelectHouse: (race: HouseRace) => void;
  onSelectRedistricting: (state: RedistrictingState) => void;
  onSelectReferendum: (ref: Referendum) => void;
  /** Called on every keystroke with the current raw query string — used to drive map highlighting */
  onQueryChange?: (query: string) => void;
}

type SearchResult =
  | { kind: "senate"; data: SenateRace; score: number }
  | { kind: "house"; data: HouseRace; score: number }
  | { kind: "redistricting"; data: RedistrictingState; score: number }
  | { kind: "referendum"; data: Referendum; score: number };

function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 60;
  return 0;
}

function searchScore(fields: (string | null | undefined)[], query: string): number {
  return Math.max(...fields.map(f => (f ? scoreMatch(f, query) : 0)));
}

export default function GlobalSearch({
  senateRaces,
  houseRaces,
  redistrictingStates,
  referendums,
  onSelectSenate,
  onSelectHouse,
  onSelectRedistricting,
  onSelectReferendum,
  onQueryChange,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and rating filter state
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "senate" | "house" | "redistricting" | "referendum">("all");

  const results = useMemo((): SearchResult[] => {
    const q = query.trim();
    if (!q && ratingFilter === "all" && typeFilter === "all") return [];

    const all: SearchResult[] = [];

    if (typeFilter === "all" || typeFilter === "senate") {
      for (const race of senateRaces) {
        const score = q ? searchScore([
          race.stateName, race.stateCode, race.incumbent,
          race.candidate1Name, race.candidate2Name, race.calledWinner,
          race.rating, race.status,
        ], q) : 50;
        if (score > 0) {
          if (ratingFilter === "all" || race.rating === ratingFilter) {
            all.push({ kind: "senate", data: race, score });
          }
        }
      }
    }

    if (typeFilter === "all" || typeFilter === "house") {
      for (const race of houseRaces) {
        const score = q ? searchScore([
          race.stateName, race.stateCode, race.incumbent,
          race.candidate1Name, race.candidate2Name, race.calledWinner,
          race.rating, race.status,
          `${race.stateCode}-${race.districtLabel}`,
          `${race.stateCode} ${race.district}`,
        ], q) : 50;
        if (score > 0) {
          if (ratingFilter === "all" || race.rating === ratingFilter) {
            all.push({ kind: "house", data: race, score });
          }
        }
      }
    }

    if (typeFilter === "all" || typeFilter === "redistricting") {
      for (const state of redistrictingStates) {
        const score = q ? searchScore([
          state.stateName, state.stateCode, state.reason, state.method, state.status,
        ], q) : 50;
        if (score > 0 && ratingFilter === "all") {
          all.push({ kind: "redistricting", data: state, score });
        }
      }
    }

    if (typeFilter === "all" || typeFilter === "referendum") {
      for (const ref of referendums) {
        const score = q ? searchScore([
          ref.stateName, ref.stateCode, ref.name, ref.description, ref.status,
        ], q) : 50;
        if (score > 0 && ratingFilter === "all") {
          all.push({ kind: "referendum", data: ref, score });
        }
      }
    }

    return all.sort((a, b) => b.score - a.score).slice(0, 50);
  }, [query, ratingFilter, typeFilter, senateRaces, houseRaces, redistrictingStates, referendums]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.kind === "senate") onSelectSenate(result.data);
    else if (result.kind === "house") onSelectHouse(result.data);
    else if (result.kind === "redistricting") onSelectRedistricting(result.data);
    else if (result.kind === "referendum") onSelectReferendum(result.data);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (results[activeIndex]) handleSelect(results[activeIndex]); }
    if (e.key === "Escape") { setIsOpen(false); inputRef.current?.blur(); }
  };

  const showResults = isOpen && (results.length > 0 || query.trim().length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); setActiveIndex(0); onQueryChange?.(e.target.value); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search races, states, candidates..."
          className="w-full bg-muted/60 border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-muted transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); onQueryChange?.(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {/* Type filter */}
        {(["all", "senate", "house", "redistricting", "referendum"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setIsOpen(true); }}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              typeFilter === t
                ? "bg-blue-700 border-blue-600 text-white"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span className="text-muted-foreground/30 text-xs self-center">|</span>
        {/* Rating filter */}
        {(["all", "Solid D", "Lean D", "Toss-up", "Lean R", "Solid R"] as const).map(r => (
          <button
            key={r}
            onClick={() => { setRatingFilter(r); setIsOpen(true); }}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              ratingFilter === r
                ? r === "all"
                  ? "bg-muted border-border text-foreground"
                  : getRatingClass(r as any) + " border-transparent"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {r === "all" ? "Any Rating" : r}
          </button>
        ))}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No races found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""}</span>
              </div>
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(result)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors flex items-center gap-3 ${
                    i === activeIndex ? "bg-accent" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: result.kind === "senate" ? "rgba(91,143,212,0.15)" :
                        result.kind === "house" ? "rgba(124,158,107,0.15)" :
                        result.kind === "redistricting" ? "rgba(200,169,81,0.15)" :
                        "rgba(155,107,155,0.15)"
                    }}>
                    {result.kind === "senate" && <Building2 className="w-3.5 h-3.5 text-blue-400" />}
                    {result.kind === "house" && <MapPin className="w-3.5 h-3.5 text-green-400" />}
                    {result.kind === "redistricting" && <MapPin className="w-3.5 h-3.5 text-yellow-400" />}
                    {result.kind === "referendum" && <Vote className="w-3.5 h-3.5 text-purple-400" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {result.kind === "senate" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{result.data.stateName}</span>
                          <span className="text-xs text-muted-foreground">Senate</span>
                          {result.data.isSpecial && <span className="text-xs bg-yellow-900/40 text-yellow-400 px-1 rounded">Special</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.data.incumbent ?? "Open seat"} · {result.data.status}
                          {result.data.rating && ` · ${result.data.rating}`}
                        </p>
                      </>
                    )}
                    {result.kind === "house" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {result.data.stateCode}-{result.data.districtLabel}
                          </span>
                          <span className="text-xs text-muted-foreground">{result.data.stateName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.data.incumbent ?? "Open seat"} · {result.data.status}
                          {result.data.rating && ` · ${result.data.rating}`}
                        </p>
                      </>
                    )}
                    {result.kind === "redistricting" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{result.data.stateName}</span>
                          <span className="text-xs text-muted-foreground">Redistricting</span>
                          <span className={`text-xs px-1 rounded ${result.data.enacted ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"}`}>
                            {result.data.enacted ? "Enacted" : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{result.data.reason ?? ""}</p>
                      </>
                    )}
                    {result.kind === "referendum" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{result.data.stateName}</span>
                          <span className="text-xs text-muted-foreground">Referendum</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{result.data.name}</p>
                      </>
                    )}
                  </div>

                  {/* Rating badge */}
                  {(result.kind === "senate" || result.kind === "house") && result.data.rating && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${getRatingClass(result.data.rating as any)}`}>
                      {result.data.rating}
                    </span>
                  )}

                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
