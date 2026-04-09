import { X, ExternalLink, BookOpen, Users, Calendar, Award } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SenatorDetailPopupProps {
  senatorId: number;
  onClose: () => void;
}

function partyColor(party: string) {
  if (party === "D") return { bg: "bg-blue-900/40", text: "text-blue-300", border: "border-blue-700/50", dot: "bg-blue-400" };
  if (party === "R") return { bg: "bg-red-900/40", text: "text-red-300", border: "border-red-700/50", dot: "bg-red-400" };
  return { bg: "bg-gray-700/40", text: "text-gray-300", border: "border-gray-600/50", dot: "bg-gray-400" };
}

function partyLabel(party: string) {
  if (party === "D") return "Democrat";
  if (party === "R") return "Republican";
  return "Independent";
}

function classLabel(cls: number) {
  if (cls === 1) return "Class I — Next election: 2030";
  if (cls === 2) return "Class II — Next election: 2026";
  if (cls === 3) return "Class III — Next election: 2028";
  return `Class ${cls}`;
}

export default function SenatorDetailPopup({ senatorId, onClose }: SenatorDetailPopupProps) {
  const { data: senator, isLoading } = trpc.senators.getById.useQuery({ id: senatorId });

  const colors = senator ? partyColor(senator.party) : partyColor("I");

  // Parse committees JSON
  let committees: string[] = [];
  if (senator?.committees) {
    try { committees = JSON.parse(senator.committees); } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b border-border ${colors.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Party circle */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-2 ${colors.border} ${colors.bg}`}>
                <span className={colors.text}>{senator?.party ?? "…"}</span>
              </div>
              <div>
                {isLoading ? (
                  <div className="h-6 w-40 bg-muted/40 rounded animate-pulse mb-1" />
                ) : (
                  <h2 className="text-lg font-bold text-foreground leading-tight">{senator?.name}</h2>
                )}
                <p className="text-sm text-muted-foreground">
                  {senator ? `${partyLabel(senator.party)} · ${senator.stateName}` : "Loading…"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/40 flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick meta row */}
          {senator && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                {partyLabel(senator.party)}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
                <Calendar className="w-3 h-3 inline mr-1" />
                {classLabel(senator.senateClass)}
              </span>
              {senator.isUpIn2026 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                  ⚡ Up in 2026
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-muted/40 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : senator ? (
            <>
              {/* Biography */}
              {senator.bio && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    Biography
                  </h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{senator.bio}</p>
                </section>
              )}

              {/* Committee Assignments */}
              {committees.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Committee Assignments
                  </h3>
                  <ul className="space-y-1.5">
                    {committees.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Senate Class & Term Info */}
              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Award className="w-3.5 h-3.5" />
                  Senate Class & Term
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/20 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Class</p>
                    <p className="text-sm font-semibold text-foreground">Class {senator.senateClass}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Next Election</p>
                    <p className="text-sm font-semibold text-foreground">{senator.nextElectionYear}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">State</p>
                    <p className="text-sm font-semibold text-foreground">{senator.stateName}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Party</p>
                    <p className={`text-sm font-semibold ${colors.text}`}>{partyLabel(senator.party)}</p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Senator not found.</p>
          )}
        </div>

        {/* Footer: official website link */}
        {senator?.websiteUrl && (
          <div className="px-6 py-4 border-t border-border bg-muted/10">
            <a
              href={senator.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${colors.border} ${colors.bg} ${colors.text} hover:opacity-80`}
            >
              <ExternalLink className="w-4 h-4" />
              Official Senate Website
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
