import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Globe2, Users, Vote, Award, Clock, MapPin } from "lucide-react";

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

interface TimelineEvent {
  date: Date;
  dateStr: string;
  label: string;
  sublabel: string;
  type: EventType;
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

export default function WorldElectionTimeline({ elections, onElectionClick }: WorldElectionTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | EventType>("all");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const windowEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 180);
    return d;
  }, [today]);

  // Build all events
  const events = useMemo((): TimelineEvent[] => {
    const evts: TimelineEvent[] = [];
    const cutoff = showAll ? null : windowEnd;

    for (const election of elections) {
      const date = parseDate(election.electionDate);
      if (!date) continue;
      // Show upcoming and today events; optionally show past (completed) if showAll
      if (!showAll && date < today) continue;
      if (cutoff && date > cutoff) continue;

      const type = getEventType(election.electionType);
      evts.push({
        date,
        dateStr: election.electionDate,
        label: election.country,
        sublabel: election.electionName,
        type,
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

  // Apply type filter
  const filteredEvents = useMemo(() => {
    if (typeFilter === "all") return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

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
  const stats = useMemo(() => ({
    total: events.length,
    presidential: events.filter((e) => e.type === "presidential").length,
    parliamentary: events.filter((e) => e.type === "parliamentary").length,
    referendum: events.filter((e) => e.type === "referendum").length,
    thisMonth: events.filter((e) => {
      const now = new Date();
      return e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear();
    }).length,
  }), [events]);

  if (filteredEvents.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {showAll ? "No elections match this filter" : "No elections in the next 180 days"}
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">
              Global Election Calendar
            </span>
            <span className="text-xs text-slate-400">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setShowAll((o) => !o)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAll ? "Next 180 days" : "Show all"}
          </button>
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "presidential", "parliamentary", "referendum", "regional", "other"] as const).map((t) => {
            const count = t === "all" ? events.length : events.filter((e) => e.type === t).length;
            if (t !== "all" && count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  typeFilter === t
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent"
                }`}
              >
                {t === "all" ? "All" : TYPE_LABELS[t]}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 border-b border-slate-700/30 bg-slate-800/30 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] text-slate-400">{stats.presidential} Presidential</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-[10px] text-slate-400">{stats.parliamentary} Parliamentary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-[10px] text-slate-400">{stats.referendum} Referendum</span>
        </div>
        <div className="ml-auto text-[10px] text-slate-500">
          {stats.thisMonth} this month
        </div>
      </div>

      {/* Timeline events grouped by date */}
      <div className="overflow-y-auto flex-1">
        {grouped.map((group) => {
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
                        <div className="flex items-center gap-2 mt-1.5">
                          {/* Type badge */}
                          <span
                            className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ color, background: `${color}20` }}
                          >
                            <TypeIcon type={evt.type} />
                            {TYPE_LABELS[evt.type]}
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
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-900/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {Object.entries(TYPE_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[9px] text-slate-500 capitalize">{type}</span>
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
