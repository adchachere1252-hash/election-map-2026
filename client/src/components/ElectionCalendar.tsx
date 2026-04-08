import { useMemo, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import type { SenateRace, HouseRace, Referendum } from "../../../drizzle/schema";

interface ElectionCalendarProps {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  referendums: Referendum[];
  onSelectSenate?: (race: SenateRace) => void;
  onSelectReferendum?: (ref: Referendum) => void;
}

interface CalendarEvent {
  date: Date;
  dateStr: string;
  label: string;
  sublabel: string;
  type: "senate-primary" | "senate-special" | "house-primary" | "referendum" | "general";
  stateCode: string;
  data: SenateRace | HouseRace | Referendum;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Handle formats like "June 2, 2026" or "2026-06-02"
  const d = new Date(dateStr);
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

const TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  "senate-primary": "#5b8fd4",
  "senate-special": "#c8a951",
  "house-primary": "#7c9e6b",
  "referendum": "#9b6b9b",
  "general": "#d96b4a",
};

const TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  "senate-primary": "Senate Primary",
  "senate-special": "Senate Special",
  "house-primary": "House Primary",
  "referendum": "Referendum",
  "general": "General Election",
};

export default function ElectionCalendar({
  senateRaces,
  houseRaces,
  referendums,
  onSelectSenate,
  onSelectReferendum,
}: ElectionCalendarProps) {
  const [showAll, setShowAll] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const windowEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 90);
    return d;
  }, [today]);

  // Build all upcoming events (filtered to 90-day window unless showAll)
  const events = useMemo((): CalendarEvent[] => {
    const evts: CalendarEvent[] = [];
    const cutoff = showAll ? null : windowEnd;

    // Senate primaries
    for (const race of senateRaces) {
      if (race.primaryDate) {
        const date = parseDate(race.primaryDate);
        if (date && date >= today && (!cutoff || date <= cutoff)) {
          evts.push({
            date,
            dateStr: race.primaryDate,
            label: `${race.stateName}`,
            sublabel: race.isSpecial ? "Special Election Primary" : "Senate Primary",
            type: race.isSpecial ? "senate-special" : "senate-primary",
            stateCode: race.stateCode,
            data: race,
          });
        }
      }
      // General election date
      if (race.generalDate) {
        const date = parseDate(race.generalDate);
        if (date && date >= today && race.status === "General" && (!cutoff || date <= cutoff)) {
          evts.push({
            date,
            dateStr: race.generalDate,
            label: `${race.stateName}`,
            sublabel: race.isSpecial ? "Senate Special General" : "Senate General",
            type: "general",
            stateCode: race.stateCode,
            data: race,
          });
        }
      }
    }

    // House primaries — group by date and state to avoid 435 individual entries
    const housePrimaryMap: Record<string, { date: Date; dateStr: string; states: Set<string>; count: number; sample: HouseRace }> = {};
    for (const race of houseRaces) {
      if (race.primaryDate && (race.status === "Scheduled" || race.status === "Primary")) {
        const date = parseDate(race.primaryDate);
        if (date && date >= today && (!cutoff || date <= cutoff)) {
          const key = race.primaryDate;
          if (!housePrimaryMap[key]) {
            housePrimaryMap[key] = { date, dateStr: race.primaryDate, states: new Set(), count: 0, sample: race };
          }
          housePrimaryMap[key].states.add(race.stateCode);
          housePrimaryMap[key].count++;
        }
      }
    }
    for (const [, val] of Object.entries(housePrimaryMap)) {
      const stateList = Array.from(val.states).sort().slice(0, 4).join(", ");
      const moreStates = val.states.size > 4 ? ` +${val.states.size - 4} more` : "";
      evts.push({
        date: val.date,
        dateStr: val.dateStr,
        label: `${val.count} House District${val.count > 1 ? "s" : ""}`,
        sublabel: `${stateList}${moreStates}`,
        type: "house-primary",
        stateCode: val.sample.stateCode,
        data: val.sample,
      });
    }

    // Referendums
    for (const ref of referendums) {
      if (ref.electionDate) {
        const date = parseDate(ref.electionDate);
        if (date && date >= today && ref.status !== "Certified" && (!cutoff || date <= cutoff)) {
          evts.push({
            date,
            dateStr: ref.electionDate,
            label: ref.stateName,
            sublabel: ref.name,
            type: "referendum",
            stateCode: ref.stateCode,
            data: ref,
          });
        }
      }
    }

    // Sort by date ascending
    return evts.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [senateRaces, houseRaces, referendums, today, windowEnd, showAll]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { dateStr: string; date: Date; events: CalendarEvent[] }[] = [];
    const seen = new Map<string, number>();
    for (const evt of events) {
      const key = evt.dateStr;
      if (!seen.has(key)) {
        seen.set(key, groups.length);
        groups.push({ dateStr: key, date: evt.date, events: [] });
      }
      groups[seen.get(key)!].events.push(evt);
    }
    return groups;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="p-4 text-center flex flex-col items-center gap-3">
        <Calendar className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">
          {showAll ? "No upcoming elections found" : "No elections in the next 90 days"}
        </p>
        {!showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Show all future elections
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 flex-shrink-0">
        <Calendar className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-foreground">
          {showAll ? "All Upcoming" : "Next 90 Days"}
        </span>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
        <button
          onClick={() => setShowAll(o => !o)}
          className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAll ? "Limit to 90d" : "Show all"}
        </button>
      </div>

      {/* Events grouped by date */}
      <div className="overflow-y-auto flex-1">
        {grouped.map(group => {
          const days = daysFromNow(group.date);
          const isToday = days === 0;
          const isTomorrow = days === 1;
          const isPast = days < 0;
          const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : isPast ? "Past" : `In ${days}d`;

          return (
            <div key={group.dateStr}>
              {/* Date header */}
              <div className="px-3 py-1.5 bg-muted/20 border-b border-border/50 flex items-center justify-between sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {formatDayOfWeek(group.date)}, {formatDateLabel(group.date)}
                  </span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  isToday ? "bg-blue-700 text-white" :
                  days <= 7 ? "bg-yellow-900/50 text-yellow-400" :
                  "text-muted-foreground"
                }`}>
                  {dayLabel}
                </span>
              </div>

              {/* Events on this date */}
              {group.events.map((evt, i) => {
                const color = TYPE_COLORS[evt.type];
                const isClickable = evt.type === "senate-primary" || evt.type === "senate-special" || evt.type === "general" || evt.type === "referendum";

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if ((evt.type === "senate-primary" || evt.type === "senate-special" || evt.type === "general") && onSelectSenate) {
                        onSelectSenate(evt.data as SenateRace);
                      } else if (evt.type === "referendum" && onSelectReferendum) {
                        onSelectReferendum(evt.data as Referendum);
                      }
                    }}
                    disabled={!isClickable}
                    className={`w-full text-left px-3 py-2 border-b border-border/30 transition-colors ${
                      isClickable ? "hover:bg-accent cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium text-foreground truncate">{evt.label}</span>
                          {isClickable && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{evt.sublabel}</p>
                        <span
                          className="text-xs font-medium"
                          style={{ color }}
                        >
                          {TYPE_LABELS[evt.type]}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
