import { useState, useMemo, useCallback, Suspense, lazy } from "react";
import { trpc } from "@/lib/trpc";
import { Calendar, Globe2, Users, Clock, ChevronRight, X, MapPin, Vote, Award, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// Lazy load the 3D globe to keep initial bundle small
const Globe = lazy(() => import("@/components/Globe"));

// ─── Types ────────────────────────────────────────────────────────────────────
interface Candidate {
  name: string;
  party: string;
  votes?: number | null;
  pct?: string | null;
  photo?: string | null;
}

// ─── Status badge colors ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  "Upcoming": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "Voting Today": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse",
  "Completed": "bg-green-500/20 text-green-300 border-green-500/40",
  "Postponed": "bg-gray-500/20 text-gray-300 border-gray-500/40",
  "Cancelled": "bg-red-500/20 text-red-300 border-red-500/40",
};

// ─── Election type icons ──────────────────────────────────────────────────────
function ElectionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Presidential": return <Users className="w-4 h-4" />;
    case "Parliamentary": return <Vote className="w-4 h-4" />;
    case "Referendum": return <Award className="w-4 h-4" />;
    default: return <Globe2 className="w-4 h-4" />;
  }
}

// ─── Format date ──────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  countryCode,
  countryName,
  onClose,
}: {
  countryCode: string;
  countryName: string;
  onClose: () => void;
}) {
  const { data: elections, isLoading } = trpc.worldElections.getByCountry.useQuery(
    { countryCode },
    { enabled: !!countryCode }
  );

  return (
    <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 z-50 overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg">
            {countryCode && (
              <img
                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                alt={countryName}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{countryName}</h2>
            <p className="text-xs text-slate-400">{countryCode}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (!elections || elections.length === 0) && (
          <div className="text-center py-12 text-slate-400">
            <Globe2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No elections tracked for {countryName}</p>
            <p className="text-xs mt-1">Elections will appear here when added</p>
          </div>
        )}

        {elections?.map((election) => {
          const days = daysUntil(election.electionDate);
          const candidates: Candidate[] = election.candidates ? JSON.parse(election.candidates) : [];

          return (
            <div
              key={election.id}
              className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden"
            >
              {/* Election header */}
              <div className="p-4 border-b border-slate-700/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ElectionTypeIcon type={election.electionType} />
                    <span className="text-sm font-medium text-slate-200">{election.electionType}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[election.status] || STATUS_STYLES["Upcoming"]}`}>
                    {election.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mt-2">{election.electionName}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(election.electionDate)}</span>
                  {election.status === "Upcoming" && days > 0 && (
                    <span className="text-amber-400 text-xs">({days} days away)</span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                {/* System info */}
                {(election.systemType || election.termLength) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {election.systemType && (
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <span className="text-slate-500 block">System</span>
                        <span className="text-slate-300">{election.systemType}</span>
                      </div>
                    )}
                    {election.termLength && (
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <span className="text-slate-500 block">Term</span>
                        <span className="text-slate-300">{election.termLength}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Incumbent */}
                {election.incumbent && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Incumbent:</span>
                    <span className="text-slate-200">{election.incumbent}</span>
                    {election.incumbentParty && (
                      <span className="text-xs text-slate-400">({election.incumbentParty})</span>
                    )}
                  </div>
                )}

                {/* Winner (for completed) */}
                {election.winner && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-300">Winner</span>
                    </div>
                    <p className="text-white font-semibold mt-1">{election.winner}</p>
                    {election.winnerParty && (
                      <p className="text-xs text-green-400/80">{election.winnerParty}</p>
                    )}
                  </div>
                )}

                {/* Candidates */}
                {candidates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                      {election.status === "Completed" ? "Results" : "Candidates"}
                    </h4>
                    <div className="space-y-2">
                      {candidates.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-700/20 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm text-slate-200">{c.name}</span>
                            <span className="text-xs text-slate-500 ml-2">{c.party}</span>
                          </div>
                          {c.pct && (
                            <span className="text-sm font-mono text-slate-300">{c.pct}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Turnout */}
                {election.turnoutPct && (
                  <div className="text-xs text-slate-400">
                    Turnout: <span className="text-slate-300">{election.turnoutPct}%</span>
                  </div>
                )}

                {/* Notes */}
                {election.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-700/30 pt-3">
                    {election.notes}
                  </p>
                )}

                {/* Date confirmed badge */}
                {!election.isDateConfirmed && (
                  <div className="flex items-center gap-1 text-xs text-amber-400/80">
                    <Clock className="w-3 h-3" />
                    <span>Date not confirmed</span>
                  </div>
                )}

                {election.isSnap && (
                  <div className="flex items-center gap-1 text-xs text-purple-400/80">
                    <MapPin className="w-3 h-3" />
                    <span>Snap election</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Sources footer */}
      <div className="p-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        Data Sources: IFES Election Guide, CFR, AP
      </div>
    </div>
  );
}

// ─── Timeline Sidebar ─────────────────────────────────────────────────────────
function TimelineSidebar({
  elections,
  onElectionClick,
  filter,
  onFilterChange,
}: {
  elections: any[];
  onElectionClick: (countryCode: string, countryName: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
}) {
  const filteredElections = useMemo(() => {
    if (filter === "all") return elections;
    return elections.filter((e) => e.status === filter);
  }, [elections, filter]);

  return (
    <div className="w-full lg:w-80 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
      {/* Filter tabs */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "Upcoming", label: "Upcoming" },
            { key: "Completed", label: "Completed" },
            { key: "Voting Today", label: "Live" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Election list */}
      <div className="flex-1 overflow-y-auto">
        {filteredElections.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No elections match this filter
          </div>
        )}
        {filteredElections.map((election) => {
          const days = daysUntil(election.electionDate);
          return (
            <button
              key={election.id}
              onClick={() => onElectionClick(election.countryCode, election.country)}
              className="w-full text-left p-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <img
                    src={`https://flagcdn.com/w40/${election.countryCode.toLowerCase()}.png`}
                    alt={election.country}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {election.country}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{election.electionName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{formatDate(election.electionDate)}</span>
                    {election.status === "Upcoming" && days > 0 && days <= 30 && (
                      <span className="text-xs text-amber-400">{days}d</span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${STATUS_STYLES[election.status] || ""}`}>
                      {election.status === "Voting Today" ? "LIVE" : election.electionType.slice(0, 4)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats footer */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-amber-400">
              {elections.filter((e) => e.status === "Upcoming").length}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Upcoming</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">
              {elections.filter((e) => e.status === "Completed").length}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">
              {elections.length}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Globe Loading Fallback ───────────────────────────────────────────────────
function GlobeLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading globe...</p>
      </div>
    </div>
  );
}

// ─── Hover Tooltip ────────────────────────────────────────────────────────────
function HoverTooltip({ name, elections }: { name: string; elections: any[] }) {
  const countryElections = elections.filter(
    (e) => e.country === name || e.countryCode === name
  );
  const nextElection = countryElections.find((e) => e.status === "Upcoming");

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 pointer-events-none z-40 shadow-xl">
      <p className="text-sm font-medium text-white">{name}</p>
      {nextElection && (
        <p className="text-xs text-slate-400 mt-0.5">
          Next: {nextElection.electionName} ({formatDate(nextElection.electionDate)})
        </p>
      )}
      {countryElections.length === 0 && (
        <p className="text-xs text-slate-500 mt-0.5">No tracked elections</p>
      )}
    </div>
  );
}

// ─── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 z-30">
      <h4 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">Legend</h4>
      <div className="space-y-1.5">
        {[
          { color: "bg-amber-400", label: "Upcoming" },
          { color: "bg-yellow-300 animate-pulse", label: "Voting Today" },
          { color: "bg-green-400", label: "Completed" },
          { color: "bg-slate-600", label: "No Election Tracked" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function WorldElections() {
  const { data: elections = [], isLoading } = trpc.worldElections.getAll.useQuery();
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<{ code: string; name: string } | null>(null);
  const [filter, setFilter] = useState("all");
  const [showSidebar, setShowSidebar] = useState(false);

  const electionData = useMemo(
    () =>
      elections.map((e) => ({
        countryCode: e.countryCode,
        status: e.status as "Upcoming" | "Voting Today" | "Completed" | "Postponed" | "Cancelled",
        country: e.country,
      })),
    [elections]
  );

  const handleCountryClick = useCallback((code: string, name: string) => {
    setSelectedCountry({ code, name });
  }, []);

  const handleCountryHover = useCallback((code: string | null, name: string | null) => {
    if (code && name) {
      setHoveredCountry({ code, name });
    } else {
      setHoveredCountry(null);
    }
  }, []);

  const handleTimelineElectionClick = useCallback((code: string, name: string) => {
    setSelectedCountry({ code, name });
    setShowSidebar(false);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading world elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row bg-slate-950 relative overflow-hidden">
      {/* Back to U.S. Map button */}
      <Link
        to="/"
        className="absolute top-3 right-3 z-50 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center gap-2 hover:bg-slate-700/90 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">U.S. Map</span>
      </Link>

      {/* Sidebar toggle button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-3 left-3 z-50 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center gap-2 hover:bg-slate-700/90 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>Elections ({elections.length})</span>
        {showSidebar && <X className="w-4 h-4 ml-1" />}
      </button>

      {/* Timeline Sidebar (collapsible) */}
      {showSidebar && (
        <div className="absolute left-0 top-14 z-40 h-[calc(100%-3.5rem)] animate-in slide-in-from-left duration-200">
          <TimelineSidebar
            elections={elections}
            onElectionClick={handleTimelineElectionClick}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      )}

      {/* Globe area */}
      <div className="flex-1 relative">
        <Suspense fallback={<GlobeLoader />}>
          <Globe
            elections={electionData}
            onCountryClick={handleCountryClick}
            onCountryHover={handleCountryHover}
            selectedCountry={selectedCountry?.code || null}
            autoRotate={!selectedCountry}
          />
        </Suspense>

        {/* Hover tooltip */}
        {hoveredCountry && !selectedCountry && (
          <HoverTooltip name={hoveredCountry.name} elections={elections} />
        )}

        {/* Legend */}
        <Legend />

        {/* Detail Panel */}
        {selectedCountry && (
          <DetailPanel
            countryCode={selectedCountry.code}
            countryName={selectedCountry.name}
            onClose={() => setSelectedCountry(null)}
          />
        )}
      </div>
    </div>
  );
}
