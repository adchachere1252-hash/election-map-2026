import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface RunoffEvent {
  label: string;
  description: string;
  date: Date;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeText: string;
}

const RUNOFF_EVENTS: RunoffEvent[] = [
  {
    label: "TX Senate Runoff",
    description: "Cornyn vs Paxton (R) · Democrat TBD",
    date: new Date("2026-05-27T00:00:00"),
    colorClass: "text-orange-300",
    bgClass: "bg-gradient-to-r from-orange-950/80 via-red-950/80 to-orange-950/80",
    borderClass: "border-orange-700/50",
    badgeText: "⚡ RUNOFF",
  },
  {
    label: "AL Senate Runoff",
    description: "D: Wess vs Larriett · R: Moore vs Hudson",
    date: new Date("2026-06-16T00:00:00"),
    colorClass: "text-yellow-300",
    bgClass: "bg-gradient-to-r from-yellow-950/80 via-amber-950/80 to-yellow-950/80",
    borderClass: "border-yellow-700/50",
    badgeText: "⚡ RUNOFF",
  },
  {
    label: "GA Senate Runoff",
    description: "D: Jon Ossoff · R: Collins vs Dooley",
    date: new Date("2026-06-16T00:00:00"),
    colorClass: "text-yellow-300",
    bgClass: "bg-gradient-to-r from-yellow-950/80 via-amber-950/80 to-yellow-950/80",
    borderClass: "border-yellow-700/50",
    badgeText: "⚡ RUNOFF",
  },
  {
    label: "GA Governor Runoff",
    description: "D: Keisha Lance Bottoms · R: Burt Jones vs Rick Jackson",
    date: new Date("2026-06-16T00:00:00"),
    colorClass: "text-yellow-300",
    bgClass: "bg-gradient-to-r from-yellow-950/80 via-amber-950/80 to-yellow-950/80",
    borderClass: "border-yellow-700/50",
    badgeText: "⚡ RUNOFF",
  },
];

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RunoffCountdownBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("dismissed_runoff_banners");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dismiss = (key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem("dismissed_runoff_banners", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Only show events that are upcoming (within 30 days) and not dismissed
  const activeEvents = RUNOFF_EVENTS.filter(ev => {
    const days = getDaysUntil(ev.date);
    return days >= 0 && days <= 30 && !dismissed.has(ev.label);
  });

  if (activeEvents.length === 0) return null;

  // Show the most imminent event
  const ev = activeEvents.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const days = getDaysUntil(ev.date);
  const daysLabel =
    days === 0 ? "TODAY" :
    days === 1 ? "TOMORROW" :
    `${days} DAYS`;

  return (
    <div
      className={`relative w-full border-b ${ev.borderClass} ${ev.bgClass} flex-shrink-0`}
      style={{ animation: "slideDownBanner 0.4s ease-out forwards" }}
    >
      <div className="flex items-center justify-between px-4 py-1.5 gap-3">
        {/* Badge */}
        <span
          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-black tracking-widest uppercase ${ev.colorClass} bg-white/10`}
          style={{ animation: "pulseBadge 1.4s ease-in-out infinite" }}
        >
          {ev.badgeText}
        </span>

        {/* Content */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`font-bold text-sm ${ev.colorClass} flex-shrink-0`}>
            {ev.label}
          </span>
          <span className="text-white/60 text-xs hidden sm:inline">·</span>
          <span className="text-white/70 text-xs truncate hidden sm:inline">
            {ev.description}
          </span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${ev.colorClass} bg-white/10 border ${ev.borderClass}`}
          >
            ⏳ {daysLabel}
          </span>
          <span className="text-white/50 text-xs hidden md:inline">
            {ev.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => dismiss(ev.label)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors text-white/50 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes slideDownBanner {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseBadge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
