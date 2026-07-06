import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { Link } from "wouter";
import {
  Radio, RefreshCw, Clock, Users, BarChart3, TrendingUp,
  ArrowLeft, Zap, Globe2, CheckCircle2, AlertTriangle, Timer,
} from "lucide-react";

// São Tomé election constants
const COUNTRY_CODE = "ST";
const COUNTRY_NAME = "São Tomé and Príncipe";
const ELECTION_DATE = "2026-07-19";
const POLLS_CLOSE_EST = "2026-07-19T13:00:00-04:00"; // Polls close 5PM local (UTC+0) = 1PM EST

// Candidate colors
const CANDIDATE_COLORS: Record<string, string> = {
  "Carlos Vila Nova": "#1d4ed8",
  "Delfim Neves": "#dc2626",
  "Jorge Bom Jesus": "#059669",
  "Guilherme Posser da Costa": "#d97706",
  default: "#6b7280",
};

function getColor(name: string): string {
  return CANDIDATE_COLORS[name] || CANDIDATE_COLORS.default;
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isElectionDay, setIsElectionDay] = useState(false);
  const [pollsClosed, setPollsClosed] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const electionStart = new Date(targetDate + "T03:00:00-04:00"); // Polls open 7AM local = 3AM EST
      const pollsClose = new Date(POLLS_CLOSE_EST);

      if (now >= pollsClose) {
        setPollsClosed(true);
        setIsElectionDay(true);
        return;
      }
      if (now >= electionStart) {
        setIsElectionDay(true);
        const diff = pollsClose.getTime() - now.getTime();
        setTimeLeft({
          days: 0,
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
        return;
      }

      const diff = electionStart.getTime() - now.getTime();
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (pollsClosed) {
    return (
      <div className="bg-gradient-to-r from-red-900/60 to-red-800/40 border border-red-500/40 rounded-xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-red-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="text-lg font-bold text-red-300 uppercase tracking-wider">Polls Closed — Counting Underway</span>
        </div>
        <p className="text-sm text-red-200/70">Results expected within 4-6 hours. Auto-refreshing every 30 seconds.</p>
      </div>
    );
  }

  if (isElectionDay) {
    return (
      <div className="bg-gradient-to-r from-yellow-900/60 to-amber-800/40 border border-yellow-500/40 rounded-xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl animate-pulse">🗳️</span>
          <span className="text-lg font-bold text-yellow-300 uppercase tracking-wider">Voting in Progress</span>
        </div>
        <p className="text-sm text-yellow-200/70 mb-3">Polls close in:</p>
        <div className="flex items-center justify-center gap-4">
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <span className="text-2xl text-yellow-400/50 font-light">:</span>
          <TimeUnit value={timeLeft.minutes} label="Min" />
          <span className="text-2xl text-yellow-400/50 font-light">:</span>
          <TimeUnit value={timeLeft.seconds} label="Sec" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-600/40 rounded-xl p-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Timer className="w-5 h-5 text-blue-400" />
        <span className="text-lg font-bold text-blue-300 uppercase tracking-wider">Countdown to Election</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="text-2xl text-slate-500 font-light">:</span>
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <span className="text-2xl text-slate-500 font-light">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <span className="text-2xl text-slate-500 font-light">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-mono font-bold text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

// ─── Candidate Card ──────────────────────────────────────────────────────────
interface CandidateData {
  name: string;
  party: string;
  photo?: string | null;
  pct?: number | string | null;
  votes?: number | null;
  is_winner?: boolean;
  description?: string | null;
}

function CandidateCard({ candidate, totalVotes, isLeading }: { candidate: CandidateData; totalVotes: number; isLeading: boolean }) {
  const color = getColor(candidate.name);
  const pct = typeof candidate.pct === "string" ? parseFloat(candidate.pct) : candidate.pct || 0;

  return (
    <div className={`relative bg-slate-800/50 rounded-xl border transition-all ${
      candidate.is_winner
        ? "border-green-500/50 shadow-lg shadow-green-500/10"
        : isLeading
        ? "border-blue-500/40 shadow-md shadow-blue-500/10"
        : "border-slate-700/40"
    }`}>
      {candidate.is_winner && (
        <div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          WINNER
        </div>
      )}
      {isLeading && !candidate.is_winner && (
        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          LEADING
        </div>
      )}

      <div className="p-4 flex items-center gap-4">
        {/* Photo */}
        <div className="shrink-0">
          <CandidateAvatar
            name={candidate.name}
            photo={candidate.photo}
            party={candidate.party.includes("ADI") ? "R" : candidate.party.includes("MLSTP") ? "D" : "I"}
            size={56}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white truncate">{candidate.name}</h3>
          <p className="text-xs text-slate-400 truncate">{candidate.party}</p>
          {candidate.description && (
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{candidate.description}</p>
          )}
        </div>

        {/* Results */}
        <div className="text-right shrink-0">
          {pct > 0 ? (
            <>
              <span className="text-2xl font-bold text-white">{pct.toFixed(1)}%</span>
              {candidate.votes && (
                <p className="text-[10px] text-slate-500 mt-0.5">{candidate.votes.toLocaleString()} votes</p>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-600 italic">Awaiting results</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {pct > 0 && (
        <div className="px-4 pb-3">
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SaoTomeLive() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  const { data: elections, refetch } = trpc.worldElections.getByCountry.useQuery(
    { countryCode: COUNTRY_CODE },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  // Find the presidential election
  const election = useMemo(() => {
    if (!elections) return null;
    return elections.find((e) => e.electionType === "Presidential") || elections[0];
  }, [elections]);

  // Parse candidates
  const candidates: CandidateData[] = useMemo(() => {
    if (!election?.candidates) return [];
    try {
      return JSON.parse(election.candidates);
    } catch {
      return [];
    }
  }, [election]);

  // Determine leading candidate
  const leadingCandidate = useMemo(() => {
    if (candidates.length === 0) return null;
    const withPct = candidates.filter((c) => {
      const pct = typeof c.pct === "string" ? parseFloat(c.pct) : c.pct || 0;
      return pct > 0;
    });
    if (withPct.length === 0) return null;
    return withPct.reduce((a, b) => {
      const aPct = typeof a.pct === "string" ? parseFloat(a.pct) : a.pct || 0;
      const bPct = typeof b.pct === "string" ? parseFloat(b.pct) : b.pct || 0;
      return aPct >= bPct ? a : b;
    });
  }, [candidates]);

  const totalVotes = useMemo(() => candidates.reduce((sum, c) => sum + (c.votes || 0), 0), [candidates]);

  // Parse polling data
  const pollingData = useMemo(() => {
    if (!election?.pollingData) return null;
    try {
      return JSON.parse(election.pollingData);
    } catch {
      return null;
    }
  }, [election]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev <= 1 ? 30 : prev - 1));
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

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "America/New_York" });

  const hasResults = candidates.some((c) => {
    const pct = typeof c.pct === "string" ? parseFloat(c.pct) : c.pct || 0;
    return pct > 0;
  });

  const isCompleted = election?.status === "Completed";
  const winner = candidates.find((c) => c.is_winner);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/world" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">World Map</span>
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <img
              src="https://flagcdn.com/w40/st.png"
              alt="São Tomé"
              className="w-6 h-4 rounded-sm object-cover"
            />
            <span className="text-sm font-semibold text-white">{COUNTRY_NAME}</span>
          </div>
        </div>

        {/* Refresh controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-all text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="text-slate-300 hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              autoRefresh
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-slate-800/60 border-slate-700/50 text-slate-500"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{autoRefresh ? "Auto 30s" : "Manual"}</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{formatTime(lastRefresh)} ET</span>
            {autoRefresh && <span className="text-red-400/70">({secondsUntilRefresh}s)</span>}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {!isCompleted && !hasResults && <Radio className="w-5 h-5 text-red-400 animate-pulse" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-400" />}
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isCompleted ? "Election Results" : "Election Night Live"}
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Presidential Election — {new Date(ELECTION_DATE + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {election?.notes && (
            <p className="text-xs text-slate-500 max-w-2xl mx-auto">{election.notes}</p>
          )}
        </div>

        {/* Countdown / Status */}
        <CountdownTimer targetDate={ELECTION_DATE} />

        {/* Winner announcement */}
        {winner && (
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-500/40 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-green-300 mb-1">Race Called</h2>
            <p className="text-2xl font-bold text-white">{winner.name}</p>
            <p className="text-sm text-green-200/70">{winner.party}</p>
          </div>
        )}

        {/* Candidate Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
              {hasResults ? "Results" : "Candidates"}
            </h2>
            {hasResults && election?.turnoutPct && (
              <span className="ml-auto text-xs text-slate-400">
                Turnout: <strong className="text-white">{election.turnoutPct}%</strong>
              </span>
            )}
          </div>
          {candidates.map((candidate, i) => (
            <CandidateCard
              key={i}
              candidate={candidate}
              totalVotes={totalVotes}
              isLeading={leadingCandidate?.name === candidate.name && !candidate.is_winner}
            />
          ))}
        </div>

        {/* Runoff info */}
        {!isCompleted && !winner && (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300 uppercase">Runoff Threshold</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A candidate must win more than <strong className="text-white">50%</strong> of valid votes to win outright in the first round.
              If no candidate reaches this threshold, a runoff between the top two candidates will be held on <strong className="text-white">August 9, 2026</strong>.
            </p>
          </div>
        )}

        {/* Prediction Markets / Polling */}
        {pollingData && !hasResults && (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300 uppercase">Pre-Election Forecast</span>
            </div>
            {pollingData.polls?.map((poll: any, i: number) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500">{poll.source}</span>
                  {poll.date && <span className="text-[10px] text-slate-600">{poll.date}</span>}
                </div>
                <div className="space-y-1.5">
                  {Object.entries(poll)
                    .filter(([key]) => !["source", "date", "note"].includes(key))
                    .map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-28 truncate capitalize">{name.replace(/_/g, " ")}</span>
                        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${value}%`,
                              backgroundColor: getColor(name) || "#6b7280",
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white w-10 text-right">{String(value)}%</span>
                      </div>
                    ))}
                </div>
                {poll.note && <p className="text-[10px] text-slate-500 mt-1.5 italic">{poll.note}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Key Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Election Details</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span>Presidential (1st Round)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Registered Voters</span><span>~130,000</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Polling Stations</span><span>~300</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Runoff Date</span><span>Aug 9, 2026</span></div>
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Observers</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2"><Globe2 className="w-3 h-3 text-blue-400" /><span>EU Election Observation Mission</span></div>
              <div className="flex items-center gap-2"><Globe2 className="w-3 h-3 text-green-400" /><span>African Union Observer Mission</span></div>
              <div className="flex items-center gap-2"><Globe2 className="w-3 h-3 text-purple-400" /><span>CPLP Electoral Observers</span></div>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="bg-slate-800/30 rounded-lg px-4 py-3 border border-slate-700/20">
          <p className="text-[10px] text-slate-500 font-medium">
            Sources: Comissão Eleitoral Nacional (CEN), EU EOM, Polymarket, Lansing Institute, AFP, Lusa
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            All times in Eastern Standard Time (EST). Results auto-refresh every 30 seconds when enabled.
            {refreshCount > 0 && ` Refreshed ${refreshCount} time${refreshCount > 1 ? "s" : ""} this session.`}
          </p>
        </div>
      </div>
    </div>
  );
}
