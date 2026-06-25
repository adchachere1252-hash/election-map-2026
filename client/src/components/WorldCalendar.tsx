import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Globe2 } from "lucide-react";

interface WorldElection {
  id: number;
  country: string;
  countryCode: string;
  electionType: string;
  electionName: string;
  electionDate: string;
  status: string;
  isDateConfirmed: boolean;
}

interface WorldCalendarProps {
  elections: WorldElection[];
  onElectionClick: (countryCode: string, countryName: string) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  "Upcoming": { bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" },
  "Voting Today": { bg: "bg-yellow-500/15", border: "border-yellow-400/40", dot: "bg-yellow-300" },
  "Completed": { bg: "bg-green-500/10", border: "border-green-500/30", dot: "bg-green-400" },
  "Postponed": { bg: "bg-gray-500/10", border: "border-gray-500/30", dot: "bg-gray-400" },
  "Cancelled": { bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
};

export default function WorldCalendar({ elections, onElectionClick }: WorldCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build a map of date -> elections for the current month
  const electionsByDate = useMemo(() => {
    const map = new Map<number, WorldElection[]>();
    elections.forEach((e) => {
      const d = new Date(e.electionDate + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(e);
      }
    });
    return map;
  }, [elections, year, month]);

  // Calendar grid computation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Count elections in this month
  const monthElectionCount = useMemo(() => {
    let count = 0;
    electionsByDate.forEach((arr) => { count += arr.length; });
    return count;
  }, [electionsByDate]);

  // Find months with elections for quick-jump dots
  const monthsWithElections = useMemo(() => {
    const months = new Set<string>();
    elections.forEach((e) => {
      const d = new Date(e.electionDate + "T00:00:00");
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return months;
  }, [elections]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">
              {MONTH_NAMES[month]} {year}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {monthElectionCount} election{monthElectionCount !== 1 ? "s" : ""} this month
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Month quick-jump row */}
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: 12 }, (_, i) => {
            const hasElection = monthsWithElections.has(`${year}-${i}`);
            const isCurrent = i === month;
            return (
              <button
                key={i}
                onClick={() => setCurrentDate(new Date(year, i, 1))}
                className={`w-6 h-6 rounded-full text-[10px] font-medium transition-all ${
                  isCurrent
                    ? "bg-blue-500 text-white"
                    : hasElection
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "text-slate-600 hover:text-slate-400 hover:bg-slate-700/30"
                }`}
                title={MONTH_NAMES[i]}
              >
                {MONTH_NAMES[i].slice(0, 1)}
              </button>
            );
          })}
          <button
            onClick={goToToday}
            className="ml-2 px-2 py-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-700/30">
        {DAY_NAMES.map((day) => (
          <div key={day} className="py-2 text-center text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDayOfMonth + 1;
          const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;
          const dayElections = isValidDay ? electionsByDate.get(dayNum) || [] : [];
          const todayHighlight = isValidDay && isToday(dayNum);

          return (
            <div
              key={i}
              className={`border-b border-r border-slate-800/50 p-1 min-h-[60px] relative transition-colors ${
                isValidDay ? "hover:bg-slate-800/30" : "bg-slate-900/30"
              } ${todayHighlight ? "bg-blue-500/5 ring-1 ring-inset ring-blue-500/30" : ""}`}
            >
              {isValidDay && (
                <>
                  <span className={`text-[11px] font-medium ${
                    todayHighlight ? "text-blue-400" : dayElections.length > 0 ? "text-white" : "text-slate-600"
                  }`}>
                    {dayNum}
                  </span>

                  {/* Election entries */}
                  <div className="mt-0.5 space-y-0.5">
                    {dayElections.slice(0, 3).map((election) => {
                      const colors = STATUS_COLORS[election.status] || STATUS_COLORS["Upcoming"];
                      return (
                        <button
                          key={election.id}
                          onClick={() => onElectionClick(election.countryCode, election.country)}
                          className={`w-full flex items-center gap-1 px-1 py-0.5 rounded ${colors.bg} border ${colors.border} hover:brightness-125 transition-all group cursor-pointer`}
                          title={`${election.country}: ${election.electionName}`}
                        >
                          <img
                            src={`https://flagcdn.com/w20/${election.countryCode.toLowerCase()}.png`}
                            alt={election.country}
                            className="w-3.5 h-2.5 rounded-sm object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <span className="text-[9px] text-slate-300 truncate group-hover:text-white">
                            {election.country.length > 8 ? election.countryCode : election.country}
                          </span>
                        </button>
                      );
                    })}
                    {dayElections.length > 3 && (
                      <span className="text-[9px] text-slate-500 pl-1">
                        +{dayElections.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(STATUS_COLORS).slice(0, 3).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className="text-[10px] text-slate-500">{status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Globe2 className="w-3 h-3" />
          <span>{elections.length} tracked</span>
        </div>
      </div>
    </div>
  );
}
