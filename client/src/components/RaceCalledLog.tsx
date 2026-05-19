/**
 * RaceCalledLog
 *
 * A collapsible panel anchored to the bottom-left of the map showing every
 * race called tonight. Persists across page refreshes via localStorage.
 * Entries are party-colored, timestamped, and newest-first.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Flag, Trash2 } from "lucide-react";
import { useElectionSocket, type RaceCallEntry } from "@/contexts/ElectionSocketContext";

function partyColor(party: string) {
  if (party === "R") return "text-red-400";
  if (party === "D") return "text-blue-400";
  return "text-gray-400";
}

function partyBg(party: string) {
  if (party === "R") return "border-l-red-500";
  if (party === "D") return "border-l-blue-500";
  return "border-l-gray-500";
}

function partyBadge(party: string) {
  if (party === "R") return "bg-red-500/20 text-red-300 border border-red-500/30";
  if (party === "D") return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
  return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
}

function chamberLabel(entry: RaceCallEntry): string {
  if (entry.chamber === "senate") return `${entry.stateName ?? entry.stateCode} Senate`;
  if (entry.chamber === "governor") return `${entry.stateName ?? entry.stateCode} Governor`;
  // House
  const label = entry.districtLabel ?? String(entry.stateCode);
  return `${entry.stateCode}-${label}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function RaceCalledLog() {
  const { raceCallLog, clearLog } = useElectionSocket();
  const [open, setOpen] = useState(true);

  // Don't render if no calls yet
  if (raceCallLog.length === 0) return null;

  return (
    <div
      className="absolute bottom-4 left-4 z-30 w-64 rounded-xl overflow-hidden shadow-2xl border border-white/10"
      style={{ background: "rgba(10,14,26,0.92)", backdropFilter: "blur(12px)" }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            Races Called
          </span>
          <span className="text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-full px-1.5 py-0.5 leading-none">
            {raceCallLog.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); clearLog(); }}
              className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
              title="Clear log"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Entry list */}
      {open && (
        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
          {raceCallLog.map(entry => (
            <div
              key={entry.id}
              className={`flex items-start gap-2 px-3 py-2 border-l-2 ${partyBg(entry.calledParty)}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-white truncate">
                    {chamberLabel(entry)}
                  </span>
                  <span className={`text-[10px] font-bold rounded px-1 py-0.5 leading-none ${partyBadge(entry.calledParty)}`}>
                    {entry.calledParty}
                  </span>
                </div>
                <div className={`text-xs font-medium mt-0.5 ${partyColor(entry.calledParty)}`}>
                  {entry.calledWinner}
                </div>
              </div>
              <div className="text-[10px] text-gray-500 whitespace-nowrap mt-0.5 shrink-0">
                {formatTime(entry.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      {open && (
        <div className="px-3 py-1.5 border-t border-white/5">
          <p className="text-[10px] text-gray-600">Saved for tonight · newest first</p>
        </div>
      )}
    </div>
  );
}
