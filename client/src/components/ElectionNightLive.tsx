import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Radio, RefreshCw, Clock, Users, BarChart3, TrendingUp, X, Zap } from "lucide-react";

interface ElectionNightLiveProps {
  countryCode: string;
  countryName: string;
  onClose: () => void;
}

interface PartyResult {
  name: string;
  shortName: string;
  seats: number;
  pct: number;
  color: string;
  isLeading?: boolean;
}

// Party colors for Algeria
const PARTY_COLORS: Record<string, string> = {
  FLN: "#2563eb",
  RND: "#059669",
  MSP: "#d97706",
  Independent: "#6b7280",
  Other: "#8b5cf6",
  default: "#64748b",
};

function getColor(party: string): string {
  return PARTY_COLORS[party] || PARTY_COLORS.default;
}

export default function ElectionNightLive({ countryCode, countryName, onClose }: ElectionNightLiveProps) {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  const { data: elections, refetch } = trpc.worldElections.getByCountry.useQuery(
    { countryCode },
    { enabled: !!countryCode, refetchInterval: autoRefresh ? 30000 : false }
  );

  // Find the "Voting Today" election
  const liveElection = useMemo(() => {
    if (!elections) return null;
    return elections.find((e) => e.status === "Voting Today") || elections[0];
  }, [elections]);

  // Parse candidates for live results
  const partyResults: PartyResult[] = useMemo(() => {
    if (!liveElection?.candidates) return [];
    try {
      const candidates = JSON.parse(liveElection.candidates);
      return candidates.map((c: any) => ({
        name: c.name,
        shortName: c.party?.split(" ")[0] || c.name.slice(0, 3),
        seats: c.seats || 0,
        pct: typeof c.pct === "string" ? parseFloat(c.pct) : c.pct || 0,
        color: getColor(c.party?.split(" ")[0] || "default"),
        isLeading: c.is_winner || false,
      }));
    } catch {
      return [];
    }
  }, [liveElection]);

  // Total seats
  const totalSeats = useMemo(() => {
    if (!liveElection?.electionName) return 407; // Algeria NPA default
    const match = liveElection.electionName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 407;
  }, [liveElection]);

  const seatsReported = useMemo(() => partyResults.reduce((sum, p) => sum + p.seats, 0), [partyResults]);
  const reportingPct = totalSeats > 0 ? Math.round((seatsReported / totalSeats) * 100) : 0;

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setLastRefresh(new Date());
    setRefreshCount((c) => c + 1);
    setSecondsUntilRefresh(30);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetch]);

  // Format time
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "America/New_York" });

  if (!liveElection) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950/98 backdrop-blur-xl border-l border-red-500/30 z-50 overflow-y-auto shadow-2xl">
      {/* Live Header */}
      <div className="sticky top-0 bg-gradient-to-b from-red-950/80 to-slate-950/95 backdrop-blur-sm border-b border-red-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-5 h-5 text-red-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ELECTION NIGHT LIVE</h2>
              <p className="text-[10px] text-red-300/80 font-medium">{countryName} — {liveElection.electionType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Refresh bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/60 rounded-md border border-slate-700/50 hover:border-red-500/30 transition-all text-xs"
            >
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="text-slate-300">Refresh</span>
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all ${
                autoRefresh
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-slate-800/60 border-slate-700/50 text-slate-500"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{autoRefresh ? "Auto" : "Manual"}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" />
            <span>Updated {formatTime(lastRefresh)} ET</span>
            {autoRefresh && (
              <span className="text-red-400/70">({secondsUntilRefresh}s)</span>
            )}
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="p-4 space-y-4">
        {/* Reporting Progress */}
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">SEATS REPORTING</span>
            </div>
            <span className="text-lg font-bold text-white">{reportingPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-1000"
              style={{ width: `${reportingPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
            <span>{seatsReported} of {totalSeats} seats declared</span>
            <span>{liveElection.electionName}</span>
          </div>
        </div>

        {/* Seat Breakdown Bar */}
        {partyResults.length > 0 && (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">SEAT BREAKDOWN</span>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-8 bg-slate-700/30 rounded-lg overflow-hidden flex">
              {partyResults
                .filter((p) => p.seats > 0)
                .sort((a, b) => b.seats - a.seats)
                .map((party, i) => (
                  <div
                    key={i}
                    className="h-full flex items-center justify-center text-[9px] font-bold text-white transition-all duration-700"
                    style={{
                      width: `${(party.seats / totalSeats) * 100}%`,
                      backgroundColor: party.color,
                      minWidth: party.seats > 0 ? "20px" : "0",
                    }}
                  >
                    {party.seats >= 20 && party.shortName}
                  </div>
                ))}
              {seatsReported < totalSeats && (
                <div
                  className="h-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-500"
                  style={{ width: `${((totalSeats - seatsReported) / totalSeats) * 100}%` }}
                >
                  {totalSeats - seatsReported > 30 && "Remaining"}
                </div>
              )}
            </div>

            {/* Majority line */}
            <div className="relative mt-1">
              <div
                className="absolute top-0 w-px h-3 bg-white/50"
                style={{ left: `${(Math.ceil(totalSeats / 2) / totalSeats) * 100}%` }}
              />
              <span
                className="absolute top-3 text-[8px] text-slate-500 -translate-x-1/2"
                style={{ left: `${(Math.ceil(totalSeats / 2) / totalSeats) * 100}%` }}
              >
                {Math.ceil(totalSeats / 2)} majority
              </span>
            </div>

            {/* Party list */}
            <div className="mt-6 space-y-2">
              {partyResults
                .sort((a, b) => b.seats - a.seats)
                .map((party, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: party.color }} />
                    <span className="text-xs text-slate-300 flex-1 truncate">{party.name}</span>
                    <span className="text-xs font-bold text-white">{party.seats}</span>
                    <span className="text-[10px] text-slate-500 w-10 text-right">
                      {party.pct > 0 ? `${party.pct}%` : "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Turnout */}
        {liveElection.turnoutPct && (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">VOTER TURNOUT</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{liveElection.turnoutPct}%</span>
              <span className="text-xs text-slate-500">of registered voters</span>
            </div>
          </div>
        )}

        {/* Key Context */}
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Context</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {liveElection.notes || `${countryName} ${liveElection.electionType.toLowerCase()} election. Results updating as they are reported.`}
          </p>
        </div>

        {/* Sources */}
        <div className="bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
          <p className="text-[9px] text-slate-500 font-medium">
            Live data via AP, Reuters, {countryName} Electoral Commission
          </p>
        </div>

        {/* Refresh stats */}
        <div className="text-center text-[9px] text-slate-600 pt-2">
          {refreshCount > 0 && <span>Refreshed {refreshCount} time{refreshCount > 1 ? "s" : ""} this session</span>}
        </div>
      </div>
    </div>
  );
}
