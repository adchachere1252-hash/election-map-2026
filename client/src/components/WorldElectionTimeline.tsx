import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Globe2, Users, Vote, Award, Clock, MapPin, Filter, SortAsc, SortDesc } from "lucide-react";

interface WorldElection {
  id: number;
  country: string;
  countryCode: string;
  electionType: string;
  electionName: string;
  electionDate: string;
  status: string;
  isDateConfirmed: boolean;
  isSnap?: boolean;
}

interface WorldElectionTimelineProps {
  elections: WorldElection[];
  onElectionClick: (countryCode: string, countryName: string) => void;
}

type EventType = "presidential" | "parliamentary" | "referendum" | "regional" | "other";
type Region = "all" | "americas" | "europe" | "asia" | "africa" | "oceania" | "middleeast";
type SortOrder = "asc" | "desc";

// ─── Country to Region Mapping ───────────────────────────────────────────────
const COUNTRY_REGIONS: Record<string, Region> = {
  // Americas
  US: "americas", CA: "americas", BR: "americas", MX: "americas", AR: "americas",
  CO: "americas", CL: "americas", PE: "americas", VE: "americas", EC: "americas",
  BO: "americas", PY: "americas", UY: "americas", GY: "americas", SR: "americas",
  CU: "americas", HT: "americas", DO: "americas", JM: "americas", TT: "americas",
  CR: "americas", PA: "americas", NI: "americas", HN: "americas", SV: "americas",
  GT: "americas", BZ: "americas",
  // Europe
  GB: "europe", DE: "europe", FR: "europe", IT: "europe", ES: "europe",
  PT: "europe", NL: "europe", BE: "europe", AT: "europe", CH: "europe",
  SE: "europe", NO: "europe", DK: "europe", FI: "europe", IE: "europe",
  PL: "europe", CZ: "europe", SK: "europe", HU: "europe", RO: "europe",
  BG: "europe", HR: "europe", RS: "europe", SI: "europe", BA: "europe",
  ME: "europe", MK: "europe", AL: "europe", GR: "europe", CY: "europe",
  LT: "europe", LV: "europe", EE: "europe", UA: "europe", MD: "europe",
  BY: "europe", IS: "europe", LU: "europe", MT: "europe", GE: "europe",
  AM: "europe", AZ: "europe",
  // Asia
  CN: "asia", JP: "asia", KR: "asia", IN: "asia", ID: "asia",
  TH: "asia", VN: "asia", PH: "asia", MY: "asia", SG: "asia",
  MM: "asia", KH: "asia", LA: "asia", BD: "asia", LK: "asia",
  NP: "asia", PK: "asia", AF: "asia", UZ: "asia", KZ: "asia",
  KG: "asia", TJ: "asia", TM: "asia", MN: "asia", TW: "asia",
  HK: "asia", KP: "asia",
  // Middle East
  IL: "middleeast", PS: "middleeast", SA: "middleeast", AE: "middleeast",
  QA: "middleeast", KW: "middleeast", BH: "middleeast", OM: "middleeast",
  YE: "middleeast", IQ: "middleeast", IR: "middleeast", JO: "middleeast",
  LB: "middleeast", SY: "middleeast", TR: "middleeast",
  // Africa
  ZA: "africa", NG: "africa", KE: "africa", ET: "africa", GH: "africa",
  TZ: "africa", UG: "africa", RW: "africa", CD: "africa", CG: "africa",
  CM: "africa", CI: "africa", SN: "africa", ML: "africa", BF: "africa",
  NE: "africa", TD: "africa", SD: "africa", SS: "africa", SO: "africa",
  DJ: "africa", ER: "africa", MG: "africa", MZ: "africa", AO: "africa",
  ZW: "africa", ZM: "africa", MW: "africa", BW: "africa", NA: "africa",
  SZ: "africa", LS: "africa", MU: "africa", SC: "africa", TN: "africa",
  DZ: "africa", MA: "africa", LY: "africa", EG: "africa", GW: "africa",
  GN: "africa", SL: "africa", LR: "africa", TG: "africa", BJ: "africa",
  GA: "africa", GQ: "africa",
  // Oceania
  AU: "oceania", NZ: "oceania", FJ: "oceania", PG: "oceania", WS: "oceania",
  TO: "oceania", VU: "oceania", SB: "oceania",
};

const REGION_LABELS: Record<Region, string> = {
  all: "All Regions",
  americas: "Americas",
  europe: "Europe",
  asia: "Asia-Pacific",
  africa: "Africa",
  middleeast: "Middle East",
  oceania: "Oceania",
};

const REGION_COLORS: Record<Region, string> = {
  all: "#6b7280",
  americas: "#ef4444",
  europe: "#3b82f6",
  asia: "#f59e0b",
  africa: "#10b981",
  middleeast: "#a855f7",
  oceania: "#06b6d4",
};

function getRegion(countryCode: string): Region {
  return COUNTRY_REGIONS[countryCode] || "other" as Region;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: Date;
  dateStr: string;
  label: string;
  sublabel: string;
  type: EventType;
  region: Region;
  countryCode: string;
  country: string;
  status: string;
  isDateConfirmed: boolean;
  isSnap?: boolean;
  election: WorldElection;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function daysFromNow(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getEventType(electionType: string): EventType {
  const t = electionType.toLowerCase();
  if (t.includes("president")) return "presidential";
  if (t.includes("parliament") || t.includes("legislative") || t.includes("general")) return "parliamentary";
  if (t.includes("referendum")) return "referendum";
  if (t.includes("regional") || t.includes("local") || t.includes("municipal")) return "regional";
  return "other";
}

const TYPE_COLORS: Record<EventType, string> = {
  presidential: "#f59e0b",
  parliamentary: "#3b82f6",
  referendum: "#a855f7",
  regional: "#10b981",
  other: "#6b7280",
};

const TYPE_LABELS: Record<EventType, string> = {
  presidential: "Presidential",
  parliamentary: "Parliamentary",
  referendum: "Referendum",
  regional: "Regional/Local",
  other: "Election",
};

function TypeIcon({ type }: { type: EventType }) {
  switch (type) {
    case "presidential": return <Users className="w-3.5 h-3.5" />;
    case "parliamentary": return <Vote className="w-3.5 h-3.5" />;
    case "referendum": return <Award className="w-3.5 h-3.5" />;
    default: return <Globe2 className="w-3.5 h-3.5" />;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WorldElectionTimeline({ elections, onElectionClick }: WorldElectionTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | EventType>("all");
  const [regionFilter, setRegionFilter] = useState<Region>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const windowEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 365);
    return d;
  }, [today]);

  // Build all events
  const events = useMemo((): TimelineEvent[] => {
    const evts: TimelineEvent[] = [];
    const cutoff = showAll ? null : windowEnd;

    for (const election of elections) {
      const date = parseDate(election.electionDate);
      if (!date) continue;
      if (!showAll && date < today) continue;
      if (cutoff && date > cutoff) continue;

      const type = getEventType(election.electionType);
      const region = getRegion(election.countryCode);
      evts.push({
        date,
        dateStr: election.electionDate,
        label: election.country,
        sublabel: election.electionName,
        type,
        region,
        countryCode: election.countryCode,
        country: election.country,
        status: election.status,
        isDateConfirmed: election.isDateConfirmed,
        isSnap: election.isSnap,
        election,
      });
    }

    return evts.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [elections, today, windowEnd, showAll]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let result = events;
    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (regionFilter !== "all") {
      result = result.filter((e) => e.region === regionFilter);
    }
    // Apply sort order
    if (sortOrder === "desc") {
      return [...result].reverse();
    }
    return result;
  }, [events, typeFilter, regionFilter, sortOrder]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { dateStr: string; date: Date; events: TimelineEvent[] }[] = [];
    const seen = new Map<string, number>();
    for (const evt of filteredEvents) {
      const key = evt.dateStr;
      if (!seen.has(key)) {
        seen.set(key, groups.length);
        groups.push({ dateStr: key, date: evt.date, events: [] });
      }
      groups[seen.get(key)!].events.push(evt);
    }
    return groups;
  }, [filteredEvents]);

  // Stats
  const stats = useMemo(() => {
    const regionCounts: Record<string, number> = {};
    for (const e of events) {
      regionCounts[e.region] = (regionCounts[e.region] || 0) + 1;
    }
    return {
      total: events.length,
      filtered: filteredEvents.length,
      regionCounts,
      presidential: events.filter((e) => e.type === "presidential").length,
      parliamentary: events.filter((e) => e.type === "parliamentary").length,
      referendum: events.filter((e) => e.type === "referendum").length,
      regional: events.filter((e) => e.type === "regional").length,
    };
  }, [events, filteredEvents]);

  if (events.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {showAll ? "No elections found" : "No upcoming elections in the next year"}
            </p>
            {!showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Show all elections
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">
              Global Election Timeline
            </span>
            <span className="text-xs text-slate-400">
              {stats.filtered}/{stats.total}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder((o) => o === "asc" ? "desc" : "asc")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              title={sortOrder === "asc" ? "Sorted: Earliest first" : "Sorted: Latest first"}
            >
              {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((o) => !o)}
              className={`p-1.5 rounded-lg transition-colors ${
                showFilters ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            {/* Show all toggle */}
            <button
              onClick={() => setShowAll((o) => !o)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50"
            >
              {showAll ? "Upcoming only" : "Show all"}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Filters */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-800/30 flex-shrink-0 space-y-2.5">
          {/* Region filter */}
          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Region</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(Object.keys(REGION_LABELS) as Region[]).map((r) => {
                const count = r === "all" ? stats.total : (stats.regionCounts[r] || 0);
                if (r !== "all" && count === 0) return null;
                return (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                      regionFilter === r
                        ? "text-white border shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent"
                    }`}
                    style={regionFilter === r ? {
                      borderColor: REGION_COLORS[r],
                      backgroundColor: `${REGION_COLORS[r]}20`,
                    } : {}}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: REGION_COLORS[r] }}
                    />
                    {REGION_LABELS[r]}
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Election type filter */}
          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Election Type</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", "presidential", "parliamentary", "referendum", "regional", "other"] as const).map((t) => {
                const count = t === "all" ? stats.total : events.filter((e) => e.type === t).length;
                if (t !== "all" && count === 0) return null;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                      typeFilter === t
                        ? "text-white border shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent"
                    }`}
                    style={typeFilter === t && t !== "all" ? {
                      borderColor: TYPE_COLORS[t as EventType],
                      backgroundColor: `${TYPE_COLORS[t as EventType]}20`,
                    } : typeFilter === t ? {
                      borderColor: "#6b7280",
                      backgroundColor: "#6b728020",
                    } : {}}
                  >
                    {t !== "all" && <TypeIcon type={t as EventType} />}
                    {t === "all" ? "All Types" : TYPE_LABELS[t as EventType]}
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active filter summary */}
          {(regionFilter !== "all" || typeFilter !== "all") && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">
                Showing {stats.filtered} of {stats.total} elections
              </span>
              <button
                onClick={() => { setRegionFilter("all"); setTypeFilter("all"); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline events grouped by date — SCROLLABLE */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Filter className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No elections match your filters</p>
              <button
                onClick={() => { setRegionFilter("all"); setTypeFilter("all"); }}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          grouped.map((group) => {
            const days = daysFromNow(group.date);
            const isToday = days === 0;
            const isTomorrow = days === 1;
            const isPast = days < 0;
            const dayLabel = isToday
              ? "Today"
              : isTomorrow
              ? "Tomorrow"
              : isPast
              ? `${Math.abs(days)}d ago`
              : `In ${days}d`;

            return (
              <div key={group.dateStr}>
                {/* Date header */}
                <div className="px-4 py-2 bg-slate-800/40 border-b border-slate-700/30 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {formatDayOfWeek(group.date)}, {formatDateLabel(group.date)}
                    </span>
                    {group.events.length > 1 && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {group.events.length} elections
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : days <= 7 && days > 0
                        ? "bg-amber-900/50 text-amber-400 border border-amber-500/30"
                        : days <= 30 && days > 0
                        ? "bg-slate-700/50 text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {dayLabel}
                  </span>
                </div>

                {/* Events on this date */}
                {group.events.map((evt) => {
                  const color = TYPE_COLORS[evt.type];
                  const regionColor = REGION_COLORS[evt.region] || "#6b7280";
                  return (
                    <button
                      key={evt.election.id}
                      onClick={() => onElectionClick(evt.countryCode, evt.country)}
                      className="w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Country flag */}
                        <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 mt-0.5 border border-slate-600/30">
                          <img
                            src={`https://flagcdn.com/w40/${evt.countryCode.toLowerCase()}.png`}
                            alt={evt.country}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {evt.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{evt.sublabel}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* Type badge */}
                            <span
                              className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{ color, background: `${color}20` }}
                            >
                              <TypeIcon type={evt.type} />
                              {TYPE_LABELS[evt.type]}
                            </span>

                            {/* Region badge */}
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ color: regionColor, background: `${regionColor}15` }}
                            >
                              {REGION_LABELS[evt.region] || "Other"}
                            </span>

                            {/* Status badge */}
                            {evt.status === "Voting Today" && (
                              <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30 animate-pulse">
                                LIVE
                              </span>
                            )}
                            {evt.status === "Completed" && (
                              <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30">
                                Completed
                              </span>
                            )}

                            {/* Snap election badge */}
                            {evt.isSnap && (
                              <span className="flex items-center gap-0.5 text-[10px] text-purple-400">
                                <MapPin className="w-2.5 h-2.5" />
                                Snap
                              </span>
                            )}

                            {/* Unconfirmed date */}
                            {!evt.isDateConfirmed && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400/70">
                                <Clock className="w-2.5 h-2.5" />
                                TBC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {Object.entries(REGION_COLORS).slice(1, 5).map(([region, color]) => (
            <div key={region} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[9px] text-slate-500 capitalize">{REGION_LABELS[region as Region]}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-500">
          Data: IFES, CFR, AP
        </span>
      </div>
    </div>
  );
}
