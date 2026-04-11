import { useState } from "react";
import { X, MapPin, Users, ChevronRight, Calendar, Crosshair } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getPartyColor } from "@/lib/electionUtils";
import SenatorDetailPopup from "./SenatorDetailPopup";

interface NoRaceStatePopupProps {
  stateCode: string;
  stateName: string;
  onClose: () => void;
  onFocusMap?: () => void;
}

export default function NoRaceStatePopup({ stateCode, stateName, onClose, onFocusMap }: NoRaceStatePopupProps) {
  const { data: senators, isLoading } = trpc.senators.byState.useQuery({ stateCode });
  const [selectedSenatorId, setSelectedSenatorId] = useState<number | null>(null);

  // Determine next election year for this state
  const nextYear = senators && senators.length > 0
    ? Math.min(...senators.map(s => s.nextElectionYear))
    : null;

  return (
    <div className="popup-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">U.S. Senate</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">{stateName}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onFocusMap && (
            <button onClick={onFocusMap} title="Focus on map" className="text-muted-foreground hover:text-foreground p-1 rounded">
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* No Race Banner */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-200">No 2026 Senate Race</p>
          {nextYear && (
            <p className="text-xs text-slate-400">Next election: <span className="text-slate-300 font-medium">{nextYear}</span></p>
          )}
        </div>
      </div>

      {/* Senators */}
      {isLoading && (
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div key={i} className="h-12 rounded bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {senators && senators.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Current Senators (119th Congress)
          </p>
          <div className="space-y-2">
            {senators.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSenatorId(s.id)}
                className="w-full text-left rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors p-3 group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: getPartyColor(s.party as any) }}
                    />
                    <span className="font-semibold text-sm text-foreground truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">({s.party})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">Class {s.senateClass}</span>
                    <span className="bg-slate-700/60 text-slate-300 text-xs px-1.5 py-0.5 rounded font-medium">
                      {s.nextElectionYear}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
                {/* Bio snippet */}
                {s.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {s.bio}
                  </p>
                )}
                {/* Committees preview */}
                {s.committees && (() => {
                  try {
                    const comms: string[] = JSON.parse(s.committees);
                    if (comms.length > 0) {
                      return (
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          <span className="font-medium">Committees:</span> {comms.slice(0, 2).join(", ")}{comms.length > 2 ? ` +${comms.length - 2} more` : ""}
                        </p>
                      );
                    }
                  } catch { /* ignore */ }
                  return null;
                })()}
                <p className="text-xs text-blue-400/70 mt-1">Click for full profile →</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Senator Detail Popup */}
      {selectedSenatorId !== null && (
        <SenatorDetailPopup
          senatorId={selectedSenatorId}
          onClose={() => setSelectedSenatorId(null)}
        />
      )}
    </div>
  );
}
