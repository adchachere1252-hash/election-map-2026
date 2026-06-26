import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Globe2, MapPin, Search, Filter, Vote, ChevronRight, Calendar, CheckCircle2, Clock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Referendum {
  id: number;
  stateCode: string;
  stateName: string;
  name: string;
  description: string | null;
  category: string | null;
  measureType: string | null;
  measureTypeFull: string | null;
  scope: string | null;
  country: string | null;
  countryCode: string | null;
  yesLabel: string | null;
  noLabel: string | null;
  yesVotes: number;
  noVotes: number;
  pctReporting: string | null;
  electionDate: string;
  status: string;
  calledResult: string | null;
  notes: string | null;
}

interface WorldReferendum {
  id: number;
  country: string;
  countryCode: string;
  electionName: string;
  electionDate: string;
  status: string;
  candidates: string | null;
  pollingData: string | null;
  keyIssues: string | null;
  notes: string | null;
  systemType: string | null;
}

// ─── Category colors ─────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Healthcare": "bg-pink-500/20 text-pink-300 border-pink-500/40",
  "Education": "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Taxes & Revenue": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "Civil Rights": "bg-purple-500/20 text-purple-300 border-purple-500/40",
  "Criminal Justice": "bg-red-500/20 text-red-300 border-red-500/40",
  "Environment": "bg-green-500/20 text-green-300 border-green-500/40",
  "Government Reform": "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  "Labor & Employment": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "Infrastructure": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "Constitutional": "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  "Immigration": "bg-teal-500/20 text-teal-300 border-teal-500/40",
  "Elections & Voting": "bg-violet-500/20 text-violet-300 border-violet-500/40",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
}

// ─── Format date ─────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ReferendumsView() {
  const { data: usReferendums = [], isLoading: loadingUS } = trpc.referendum.list.useQuery();
  const { data: worldElections = [], isLoading: loadingWorld } = trpc.worldElections.getAll.useQuery();

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "us" | "global">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<{ type: "us" | "global"; data: any } | null>(null);

  // Extract global referendums from world elections
  const globalReferendums = useMemo(() => {
    return worldElections.filter((e: any) => e.electionType === "Referendum");
  }, [worldElections]);

  // Get unique categories from US referendums
  const categories = useMemo(() => {
    const cats = new Set<string>();
    usReferendums.forEach((r: any) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [usReferendums]);

  // Build unified list
  const unifiedList = useMemo(() => {
    const items: Array<{
      id: string;
      type: "us" | "global";
      title: string;
      subtitle: string;
      location: string;
      locationCode: string;
      date: string;
      status: string;
      category: string | null;
      data: any;
    }> = [];

    // Add US referendums (exclude global ones that are also in world_elections)
    usReferendums
      .filter((r: any) => !r.scope || r.scope === "state" || r.country === "United States")
      .forEach((r: any) => {
        items.push({
          id: `us-${r.id}`,
          type: "us",
          title: r.name,
          subtitle: r.measureTypeFull || r.measureType || "Ballot Measure",
          location: r.stateName,
          locationCode: r.stateCode,
          date: r.electionDate,
          status: r.status === "Called" || r.status === "Certified" ? "completed" : "upcoming",
          category: r.category,
          data: r,
        });
      });

    // Add global referendums
    globalReferendums.forEach((r: any) => {
      items.push({
        id: `global-${r.id}`,
        type: "global",
        title: r.electionName,
        subtitle: r.systemType || "National Referendum",
        location: r.country,
        locationCode: r.countryCode,
        date: r.electionDate,
        status: r.status === "Completed" ? "completed" : "upcoming",
        category: "Constitutional",
        data: r,
      });
    });

    // Sort by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return items;
  }, [usReferendums, globalReferendums]);

  // Apply filters
  const filteredList = useMemo(() => {
    return unifiedList.filter((item) => {
      if (scopeFilter === "us" && item.type !== "us") return false;
      if (scopeFilter === "global" && item.type !== "global") return false;
      if (statusFilter === "upcoming" && item.status !== "upcoming") return false;
      if (statusFilter === "completed" && item.status !== "completed") return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unifiedList, scopeFilter, statusFilter, categoryFilter, search]);

  // Stats
  const stats = useMemo(() => ({
    total: unifiedList.length,
    usTotal: unifiedList.filter(i => i.type === "us").length,
    globalTotal: unifiedList.filter(i => i.type === "global").length,
    upcoming: unifiedList.filter(i => i.status === "upcoming").length,
    completed: unifiedList.filter(i => i.status === "completed").length,
  }), [unifiedList]);

  if (loadingUS || loadingWorld) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading referendums...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Main list panel */}
      <div className={`flex-1 flex flex-col overflow-hidden ${selectedItem ? "hidden lg:flex" : ""}`}>
        {/* Stats header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-slate-500 uppercase">Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{stats.usTotal}</div>
              <div className="text-[10px] text-slate-500 uppercase">U.S.</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{stats.globalTotal}</div>
              <div className="text-[10px] text-slate-500 uppercase">Global</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">{stats.upcoming}</div>
              <div className="text-[10px] text-slate-500 uppercase">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-[10px] text-slate-500 uppercase">Decided</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search measures, states, countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Scope filter */}
            <div className="flex bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-hidden">
              {(["all", "us", "global"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScopeFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    scopeFilter === s
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === "all" ? "All" : s === "us" ? "U.S. States" : "Global"}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-hidden">
              {(["all", "upcoming", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === "all" ? "All" : s === "upcoming" ? "Upcoming" : "Decided"}
                </button>
              ))}
            </div>

            {/* Category filter */}
            {scopeFilter !== "global" && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-2 border-b border-slate-700/30 bg-slate-900/30">
          <p className="text-xs text-slate-500">
            Showing {filteredList.length} of {unifiedList.length} measures
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredList.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Vote className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No referendums match your filters</p>
            </div>
          )}
          {filteredList.map((item) => {
            const days = daysUntil(item.date);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem({ type: item.type, data: item.data })}
                className={`w-full text-left p-3.5 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group ${
                  selectedItem && ((selectedItem.type === "us" && item.id === `us-${selectedItem.data.id}`) || (selectedItem.type === "global" && item.id === `global-${selectedItem.data.id}`))
                    ? "bg-slate-800/60 border-l-2 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Location icon */}
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === "global" ? (
                      <img
                        src={`https://flagcdn.com/w40/${item.locationCode.toLowerCase()}.png`}
                        alt={item.location}
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300">{item.locationCode}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight">
                        {item.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">{item.location}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                      {item.status === "upcoming" && days > 0 && days <= 60 && (
                        <span className="text-xs text-amber-400">{days}d</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {/* Type badge */}
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                        item.type === "global"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      }`}>
                        {item.type === "global" ? "GLOBAL" : "U.S."}
                      </span>
                      {/* Status badge */}
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                        item.status === "completed"
                          ? "bg-green-500/20 text-green-300 border-green-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}>
                        {item.status === "completed" ? "DECIDED" : "UPCOMING"}
                      </span>
                      {/* Category badge */}
                      {item.category && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="w-full lg:w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                {selectedItem.type === "global" ? (
                  <img
                    src={`https://flagcdn.com/w40/${selectedItem.data.countryCode.toLowerCase()}.png`}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <MapPin className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {selectedItem.type === "us" ? selectedItem.data.stateName : selectedItem.data.country}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedItem.type === "us" ? "United States" : selectedItem.data.systemType || "Referendum"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors lg:hidden"
            >
              Back
            </button>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors hidden lg:block"
            >
              <span className="text-xs">Close</span>
            </button>
          </div>

          {/* Detail content */}
          <div className="p-4 space-y-4">
            {selectedItem.type === "us" ? (
              <USReferendumDetail referendum={selectedItem.data} />
            ) : (
              <GlobalReferendumDetail referendum={selectedItem.data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── US Referendum Detail ────────────────────────────────────────────────────
function USReferendumDetail({ referendum }: { referendum: Referendum }) {
  const yes = Number(referendum.yesVotes) || 0;
  const no = Number(referendum.noVotes) || 0;
  const total = yes + no;
  const yesPct = total > 0 ? (yes / total * 100) : 0;
  const noPct = total > 0 ? (no / total * 100) : 0;
  const pctReporting = referendum.pctReporting ? parseFloat(String(referendum.pctReporting)) : 0;

  return (
    <>
      {/* Title and meta */}
      <div>
        <h2 className="text-lg font-bold text-white leading-tight">{referendum.name}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {referendum.measureTypeFull && (
            <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded border border-slate-600/50">
              {referendum.measureTypeFull}
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs rounded border ${
            referendum.status === "Called" || referendum.status === "Certified"
              ? "bg-green-500/20 text-green-300 border-green-500/40"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            {referendum.status}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(referendum.electionDate)}</span>
        {referendum.status === "Scheduled" && daysUntil(referendum.electionDate) > 0 && (
          <span className="text-amber-400 text-xs">({daysUntil(referendum.electionDate)} days away)</span>
        )}
      </div>

      {/* Called result */}
      {referendum.calledResult && (
        <div className={`p-3 rounded-lg border ${
          referendum.calledResult === "Yes"
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${referendum.calledResult === "Yes" ? "text-green-400" : "text-red-400"}`} />
            <span className="text-sm font-bold text-white">
              {referendum.calledResult === "Yes" ? (referendum.yesLabel || "Yes") : (referendum.noLabel || "No")} Wins
            </span>
          </div>
        </div>
      )}

      {/* Description */}
      {referendum.description && (
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
          <p className="text-sm text-slate-300 leading-relaxed">{referendum.description}</p>
        </div>
      )}

      {/* Vote bars */}
      {total > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Results</h4>
          {/* Yes bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-green-300">{referendum.yesLabel || "Yes"}</span>
              <span className="text-sm font-mono text-green-300">{yesPct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all"
                style={{ width: `${yesPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{yes.toLocaleString()} votes</p>
          </div>
          {/* No bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-red-300">{referendum.noLabel || "No"}</span>
              <span className="text-sm font-mono text-red-300">{noPct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all"
                style={{ width: `${noPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{no.toLocaleString()} votes</p>
          </div>
          {/* Reporting */}
          {pctReporting > 0 && (
            <p className="text-xs text-amber-400/80 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pctReporting.toFixed(1)}% reporting
            </p>
          )}
        </div>
      )}

      {/* Category */}
      {referendum.category && (
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className={`px-2 py-0.5 text-xs rounded border ${getCategoryColor(referendum.category)}`}>
            {referendum.category}
          </span>
        </div>
      )}

      {/* Notes */}
      {referendum.notes && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
          <p className="text-xs text-slate-400 italic">{referendum.notes}</p>
        </div>
      )}
    </>
  );
}

// ─── Global Referendum Detail ────────────────────────────────────────────────
function GlobalReferendumDetail({ referendum }: { referendum: any }) {
  const candidates = referendum.candidates ? JSON.parse(referendum.candidates) : [];
  const pollingData = referendum.pollingData ? JSON.parse(referendum.pollingData) : null;
  const keyIssues = referendum.keyIssues ? JSON.parse(referendum.keyIssues) : [];

  return (
    <>
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white leading-tight">{referendum.electionName}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {referendum.systemType && (
            <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded border border-slate-600/50">
              {referendum.systemType}
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs rounded border ${
            referendum.status === "Completed"
              ? "bg-green-500/20 text-green-300 border-green-500/40"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            {referendum.status}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(referendum.electionDate)}</span>
        {referendum.status === "Upcoming" && daysUntil(referendum.electionDate) > 0 && (
          <span className="text-amber-400 text-xs">({daysUntil(referendum.electionDate)} days away)</span>
        )}
      </div>

      {/* Yes/No positions */}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Positions</h4>
          {candidates.map((c: any, i: number) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 border ${
                c.name === "Yes" ? "bg-green-500/10 border-green-500/30" :
                c.name === "No" ? "bg-red-500/10 border-red-500/30" :
                "bg-slate-700/30 border-slate-600/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${
                  c.name === "Yes" ? "text-green-300" :
                  c.name === "No" ? "text-red-300" :
                  "text-slate-200"
                }`}>{c.name}</span>
                {c.pct && (
                  <span className={`text-sm font-mono ${
                    c.name === "Yes" ? "text-green-300" :
                    c.name === "No" ? "text-red-300" :
                    "text-slate-300"
                  }`}>{c.pct}%</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{c.party}</p>
              {c.description && (
                <p className="text-xs text-slate-500 mt-1 italic">{c.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Polling data */}
      {pollingData && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-2">Latest Polling</h4>
          {pollingData.leader && (
            <p className="text-sm text-white">
              <span className="font-semibold">{pollingData.leader}</span> leads by{" "}
              <span className="text-indigo-300 font-mono">{pollingData.margin}pts</span>
            </p>
          )}
          {pollingData.polls && pollingData.polls.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Source: {pollingData.polls[0].source} ({pollingData.polls[0].date})
            </p>
          )}
        </div>
      )}

      {/* Key issues */}
      {keyIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Key Issues</h4>
          {keyIssues.map((issue: any, i: number) => (
            <div key={i} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-sm font-medium text-slate-200">{issue.issue}</p>
              <p className="text-xs text-slate-400 mt-0.5">{issue.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {referendum.notes && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
          <p className="text-xs text-slate-400 italic">{referendum.notes}</p>
        </div>
      )}
    </>
  );
}
