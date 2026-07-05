import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Trophy, TrendingUp, Calendar, ChevronRight, Globe2, MapPin } from "lucide-react";

// Country code to flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const chars = Array.from(code.toUpperCase());
  return String.fromCodePoint(...chars.map((c) => c.charCodeAt(0) + 127397));
}

// Party color mapping
function getPartyColor(party: string | null): string {
  if (!party) return "text-slate-300";
  const lower = party.toLowerCase();
  if (lower.includes("left") || lower.includes("labour") || lower.includes("socialist") || lower.includes("democrat"))
    return "text-rose-300";
  if (lower.includes("right") || lower.includes("conservative") || lower.includes("bjp") || lower.includes("liberal"))
    return "text-blue-300";
  if (lower.includes("green")) return "text-green-300";
  if (lower.includes("approved") || lower === "yes") return "text-green-300";
  if (lower.includes("rejected") || lower === "no") return "text-red-300";
  return "text-amber-300";
}

function getPartyBg(party: string | null): string {
  if (!party) return "bg-slate-700/50";
  const lower = party.toLowerCase();
  if (lower.includes("left") || lower.includes("labour") || lower.includes("socialist") || lower.includes("democrat"))
    return "bg-rose-500/10 border-rose-500/20";
  if (lower.includes("right") || lower.includes("conservative") || lower.includes("bjp") || lower.includes("liberal"))
    return "bg-blue-500/10 border-blue-500/20";
  if (lower.includes("green")) return "bg-green-500/10 border-green-500/20";
  if (lower.includes("approved") || lower === "yes") return "bg-green-500/10 border-green-500/20";
  if (lower.includes("rejected") || lower === "no") return "bg-red-500/10 border-red-500/20";
  return "bg-amber-500/10 border-amber-500/20";
}

// Region classification by country code
type Region = "all" | "americas" | "europe" | "asia_pacific" | "africa_me";

const REGION_MAP: Record<string, Region> = {
  // Americas
  US: "americas", CA: "americas", MX: "americas", BR: "americas", AR: "americas",
  CL: "americas", CO: "americas", PE: "americas", VE: "americas", EC: "americas",
  BO: "americas", PY: "americas", UY: "americas", GY: "americas", SR: "americas",
  HT: "americas", DO: "americas", CU: "americas", JM: "americas", TT: "americas",
  CR: "americas", PA: "americas", GT: "americas", HN: "americas", SV: "americas",
  NI: "americas", BZ: "americas",
  // Europe
  GB: "europe", FR: "europe", DE: "europe", IT: "europe", ES: "europe",
  PT: "europe", NL: "europe", BE: "europe", AT: "europe", CH: "europe",
  SE: "europe", NO: "europe", DK: "europe", FI: "europe", IE: "europe",
  PL: "europe", CZ: "europe", SK: "europe", HU: "europe", RO: "europe",
  BG: "europe", GR: "europe", HR: "europe", RS: "europe", BA: "europe",
  SI: "europe", ME: "europe", MK: "europe", AL: "europe", XK: "europe",
  LT: "europe", LV: "europe", EE: "europe", UA: "europe", MD: "europe",
  BY: "europe", RU: "europe", GE: "europe", AM: "europe", AZ: "europe",
  IS: "europe", MT: "europe", CY: "europe", LU: "europe",
  // Asia-Pacific
  CN: "asia_pacific", JP: "asia_pacific", KR: "asia_pacific", IN: "asia_pacific",
  PK: "asia_pacific", BD: "asia_pacific", LK: "asia_pacific", NP: "asia_pacific",
  MM: "asia_pacific", TH: "asia_pacific", VN: "asia_pacific", KH: "asia_pacific",
  LA: "asia_pacific", MY: "asia_pacific", SG: "asia_pacific", ID: "asia_pacific",
  PH: "asia_pacific", TW: "asia_pacific", AU: "asia_pacific", NZ: "asia_pacific",
  FJ: "asia_pacific", PG: "asia_pacific", CK: "asia_pacific", KZ: "asia_pacific",
  UZ: "asia_pacific", TM: "asia_pacific", KG: "asia_pacific", TJ: "asia_pacific",
  MN: "asia_pacific", AF: "asia_pacific",
  // Africa & Middle East
  ZA: "africa_me", NG: "africa_me", KE: "africa_me", ET: "africa_me",
  GH: "africa_me", TZ: "africa_me", UG: "africa_me", RW: "africa_me",
  SN: "africa_me", CI: "africa_me", CM: "africa_me", CD: "africa_me",
  AO: "africa_me", MZ: "africa_me", ZW: "africa_me", ZM: "africa_me",
  MW: "africa_me", BW: "africa_me", NA: "africa_me", MG: "africa_me",
  DZ: "africa_me", MA: "africa_me", TN: "africa_me", LY: "africa_me",
  EG: "africa_me", SD: "africa_me", SS: "africa_me", SO: "africa_me",
  ML: "africa_me", BF: "africa_me", NE: "africa_me", TD: "africa_me",
  GN: "africa_me", GW: "africa_me", GM: "africa_me", SL: "africa_me",
  LR: "africa_me", ST: "africa_me", CV: "africa_me", MR: "africa_me",
  IL: "africa_me", PS: "africa_me", SA: "africa_me", AE: "africa_me",
  QA: "africa_me", KW: "africa_me", BH: "africa_me", OM: "africa_me",
  YE: "africa_me", IQ: "africa_me", IR: "africa_me", JO: "africa_me",
  LB: "africa_me", SY: "africa_me", TR: "africa_me",
};

function getRegion(countryCode: string): Region {
  return REGION_MAP[countryCode] || "africa_me";
}

const REGION_LABELS: { key: Region; label: string; icon?: string }[] = [
  { key: "all", label: "All", icon: "🌍" },
  { key: "americas", label: "Americas", icon: "🌎" },
  { key: "europe", label: "Europe", icon: "🌍" },
  { key: "asia_pacific", label: "Asia-Pac", icon: "🌏" },
  { key: "africa_me", label: "Africa/ME", icon: "🌍" },
];

interface WorldResultsSummaryProps {
  onCountryClick: (code: string, name: string) => void;
  fullWidth?: boolean;
}

export default function WorldResultsSummary({ onCountryClick, fullWidth = false }: WorldResultsSummaryProps) {
  const { data: elections = [] } = trpc.worldElections.getAll.useQuery();
  const [region, setRegion] = useState<Region>("all");

  const { recentResults, upcomingNext } = useMemo(() => {
    const filtered = region === "all" ? elections : elections.filter((e) => getRegion(e.countryCode) === region);

    const completed = filtered
      .filter((e) => e.status === "Completed" && e.winner)
      .sort((a, b) => new Date(b.electionDate).getTime() - new Date(a.electionDate).getTime())
      .slice(0, fullWidth ? 12 : 5);

    const upcoming = filtered
      .filter((e) => e.status === "Upcoming" || e.status === "Voting Today")
      .sort((a, b) => new Date(a.electionDate).getTime() - new Date(b.electionDate).getTime())
      .slice(0, fullWidth ? 8 : 3);

    return { recentResults: completed, upcomingNext: upcoming };
  }, [elections, region, fullWidth]);

  if (elections.length === 0) return null;

  // Full-width tab view
  if (fullWidth) {
    return (
      <div className="w-full max-w-5xl">
        {/* Header with regional filter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-indigo-400" />
              World Election Results
            </h2>
            <span className="text-xs text-slate-500">Sources: AP, IFES Election Guide, Reuters</span>
          </div>
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
            {REGION_LABELS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRegion(r.key)}
                className={`text-xs font-semibold py-1.5 px-3 rounded-md transition-all ${
                  region === r.key
                    ? "bg-indigo-500/30 text-indigo-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/40"
                }`}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Results Section */}
        {recentResults.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Recent Winners</h3>
              <span className="text-xs text-slate-500 ml-1">({recentResults.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {recentResults.map((election) => (
                <button
                  key={election.id}
                  onClick={() => onCountryClick(election.countryCode, election.country)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer ${getPartyBg(election.winnerParty)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{countryFlag(election.countryCode)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 truncate">
                          {election.country}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">
                          {new Date(election.electionDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-bold truncate ${getPartyColor(election.winnerParty)}`}>
                          {election.winner}
                        </span>
                      </div>
                      {election.winnerParty && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 truncate">
                            {election.winnerParty}
                          </span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span className="text-[10px] text-slate-500">
                            {election.electionType}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {recentResults.length > 0 && upcomingNext.length > 0 && (
          <div className="border-t border-slate-700/50 my-4" />
        )}

        {/* Upcoming Section */}
        {upcomingNext.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Next Up</h3>
              <span className="text-xs text-slate-500 ml-1">({upcomingNext.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcomingNext.map((election) => {
                let pollingLeader: string | null = null;
                try {
                  if (election.pollingData) {
                    const pd = JSON.parse(election.pollingData as string);
                    pollingLeader = pd.leader || null;
                  }
                } catch {}

                const daysUntil = Math.ceil(
                  (new Date(election.electionDate + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <button
                    key={election.id}
                    onClick={() => onCountryClick(election.countryCode, election.country)}
                    className="w-full text-left px-3 py-3 rounded-xl border border-slate-700/30 bg-slate-800/40 hover:bg-slate-800/70 transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{countryFlag(election.countryCode)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">
                            {election.country}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            election.status === "Voting Today"
                              ? "bg-yellow-500/20 text-yellow-300 animate-pulse"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {election.status === "Voting Today" ? "LIVE" : `${daysUntil}d`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span className="text-[11px] text-slate-400">{election.electionType}</span>
                          {pollingLeader && (
                            <>
                              <span className="text-[9px] text-slate-600">•</span>
                              <TrendingUp className="w-3 h-3 text-indigo-400" />
                              <span className="text-[10px] text-indigo-300 truncate">{pollingLeader}</span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          {new Date(election.electionDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for filtered region */}
        {recentResults.length === 0 && upcomingNext.length === 0 && (
          <div className="py-12 text-center">
            <Globe2 className="w-8 h-8 mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500">No elections in this region</p>
          </div>
        )}
      </div>
    );
  }

  // Compact floating card (for globe overlay - kept for potential future use)
  return (
    <div className="absolute bottom-3 right-3 z-30 w-[280px] max-h-[calc(100%-6rem)] overflow-y-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl shadow-black/30 overflow-hidden">
        {/* Regional Filter */}
        <div className="px-2 pt-2 pb-1">
          <div className="flex gap-0.5 bg-slate-800/60 rounded-lg p-0.5">
            {REGION_LABELS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRegion(r.key)}
                className={`flex-1 text-[9px] font-semibold py-1 px-1 rounded-md transition-all ${
                  region === r.key
                    ? "bg-indigo-500/30 text-indigo-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Results Section */}
        {recentResults.length > 0 && (
          <div>
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Recent Winners</h3>
            </div>
            <div className="px-2 pb-2 space-y-1">
              {recentResults.map((election) => (
                <button
                  key={election.id}
                  onClick={() => onCountryClick(election.countryCode, election.country)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer ${getPartyBg(election.winnerParty)}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{countryFlag(election.countryCode)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-200 truncate">
                          {election.country}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {new Date(election.electionDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[10px] font-bold truncate ${getPartyColor(election.winnerParty)}`}>
                          {election.winner}
                        </span>
                      </div>
                      {election.winnerParty && (
                        <span className="text-[9px] text-slate-500 truncate block">
                          {election.winnerParty}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {recentResults.length > 0 && upcomingNext.length > 0 && (
          <div className="border-t border-slate-700/50" />
        )}

        {/* Upcoming Section */}
        {upcomingNext.length > 0 && (
          <div>
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Next Up</h3>
            </div>
            <div className="px-2 pb-2 space-y-1">
              {upcomingNext.map((election) => {
                let pollingLeader: string | null = null;
                try {
                  if (election.pollingData) {
                    const pd = JSON.parse(election.pollingData as string);
                    pollingLeader = pd.leader || null;
                  }
                } catch {}

                const daysUntil = Math.ceil(
                  (new Date(election.electionDate + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <button
                    key={election.id}
                    onClick={() => onCountryClick(election.countryCode, election.country)}
                    className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-700/30 bg-slate-800/40 hover:bg-slate-800/70 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{countryFlag(election.countryCode)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-200 truncate">
                            {election.country}
                          </span>
                          <span className={`text-[9px] font-bold ${
                            election.status === "Voting Today" ? "text-yellow-300 animate-pulse" : "text-amber-400"
                          }`}>
                            {election.status === "Voting Today" ? "TODAY" : `${daysUntil}d`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-400">{election.electionType}</span>
                          {pollingLeader && (
                            <>
                              <span className="text-[9px] text-slate-600">•</span>
                              <TrendingUp className="w-2.5 h-2.5 text-indigo-400" />
                              <span className="text-[9px] text-indigo-300 truncate">{pollingLeader}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for filtered region */}
        {recentResults.length === 0 && upcomingNext.length === 0 && (
          <div className="px-3 py-6 text-center">
            <Globe2 className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p className="text-[10px] text-slate-500">No elections in this region</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-slate-700/30 text-center">
          <span className="text-[9px] text-slate-500">Sources: AP, IFES Election Guide, Reuters</span>
        </div>
      </div>
    </div>
  );
}
