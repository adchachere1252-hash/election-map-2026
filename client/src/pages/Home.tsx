import { useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ElectionMap from "@/components/ElectionMap";
import Scoreboard from "@/components/Scoreboard";
import RacePopup from "@/components/RacePopup";
import RaceList from "@/components/RaceList";
import ElectionCalendar from "@/components/ElectionCalendar";
import GlobalSearch from "@/components/GlobalSearch";
import { Map, RefreshCw, Lock, Calendar, ChevronRight, ChevronLeft, Menu, X } from "lucide-react";
import { Link } from "wouter";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";

type MapView = "senate" | "house" | "redistricting";

const VIEW_LABELS: Record<MapView, string> = {
  senate: "Senate",
  house: "House",
  redistricting: "Redistricting",
};

const VIEW_DESCRIPTIONS: Record<MapView, string> = {
  senate: "35 races · Nov 3, 2026",
  house: "435 districts · Nov 3, 2026",
  redistricting: "12 states · 2025–2026",
};

export default function Home() {
  const [view, setView] = useState<MapView>("senate");
  const [popup, setPopup] = useState<{
    type: "senate" | "house" | "redistricting" | "referendum";
    data: SenateRace | HouseRace | RedistrictingState | Referendum | null;
  } | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: senateRaces = [], refetch: refetchSenate } = trpc.senate.list.useQuery();
  const { data: houseRaces = [], refetch: refetchHouse } = trpc.house.list.useQuery();
  const { data: redistrictingStates = [], refetch: refetchRedistricting } = trpc.redistricting.list.useQuery();
  const { data: referendums = [], refetch: refetchReferendums } = trpc.referendum.list.useQuery();

  // Close mobile sidebar on view change
  useEffect(() => {
    setSidebarOpen(false);
  }, [view]);

  const handleRefresh = useCallback(() => {
    refetchSenate();
    refetchHouse();
    refetchRedistricting();
    refetchReferendums();
  }, [refetchSenate, refetchHouse, refetchRedistricting, refetchReferendums]);

  const handleStateClick = useCallback((stateCode: string) => {
    setSelectedStateCode(stateCode);
    if (view === "senate") {
      const race = senateRaces.find(r => r.stateCode === stateCode);
      if (race) { setPopup({ type: "senate", data: race }); setSelectedId(race.id); }
    } else if (view === "house") {
      const stateRaces = houseRaces.filter(r => r.stateCode === stateCode);
      if (stateRaces.length === 1) { setPopup({ type: "house", data: stateRaces[0] }); setSelectedId(stateRaces[0].id); }
    } else if (view === "redistricting") {
      const state = redistrictingStates.find(r => r.stateCode === stateCode);
      if (state) {
        setPopup({ type: "redistricting", data: state });
        setSelectedId(state.id);
      } else {
        const ref = referendums.find(r => r.stateCode === stateCode);
        if (ref) { setPopup({ type: "referendum", data: ref }); setSelectedId(ref.id); }
      }
    }
  }, [view, senateRaces, houseRaces, redistrictingStates, referendums]);

  const handleSelectSenate = useCallback((race: SenateRace) => {
    setPopup({ type: "senate", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
    setCalendarOpen(false);
    setSearchOpen(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectHouse = useCallback((race: HouseRace) => {
    setPopup({ type: "house", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
    setSearchOpen(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectRedistricting = useCallback((state: RedistrictingState) => {
    setPopup({ type: "redistricting", data: state });
    setSelectedStateCode(state.stateCode);
    setSelectedId(state.id);
    setSearchOpen(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectReferendum = useCallback((ref: Referendum) => {
    setPopup({ type: "referendum", data: ref });
    setSelectedStateCode(ref.stateCode);
    setSelectedId(ref.id);
    setCalendarOpen(false);
    setSearchOpen(false);
    setSidebarOpen(false);
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
    setSelectedStateCode(null);
    setSelectedId(null);
  }, []);

  // Count upcoming events for calendar badge
  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    for (const r of senateRaces) {
      if (r.primaryDate) {
        const d = new Date(r.primaryDate);
        if (!isNaN(d.getTime()) && d >= today) count++;
      }
    }
    for (const ref of referendums) {
      if (ref.electionDate) {
        const d = new Date(ref.electionDate);
        if (!isNaN(d.getTime()) && d >= today && ref.status !== "Certified") count++;
      }
    }
    return count;
  }, [senateRaces, referendums]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground leading-tight">2026 U.S. Election Center</h1>
              <p className="text-xs text-muted-foreground leading-tight hidden md:block">Interactive Congressional Tracker</p>
            </div>
          </div>

          {/* Global Search — center, hidden on very small screens */}
          <div className="flex-1 min-w-0 max-w-md relative hidden sm:block">
            {searchOpen ? (
              <GlobalSearch
                senateRaces={senateRaces}
                houseRaces={houseRaces}
                redistrictingStates={redistrictingStates}
                referendums={referendums}
                onSelectSenate={handleSelectSenate}
                onSelectHouse={handleSelectHouse}
                onSelectRedistricting={handleSelectRedistricting}
                onSelectReferendum={handleSelectReferendum}
              />
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="truncate">Search races, states, candidates...</span>
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 flex-shrink-0">
            {(["senate", "house", "redistricting"] as MapView[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); closePopup(); }}
                className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  view === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Mobile search */}
            <button
              className="sm:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
              onClick={() => setSearchOpen(o => !o)}
              aria-label="Search"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Calendar toggle */}
            <button
              onClick={() => setCalendarOpen(o => !o)}
              className={`relative flex items-center gap-1.5 text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors border ${
                calendarOpen ? "border-blue-600 text-blue-400 bg-blue-900/20" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Election Calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Calendar</span>
              {upcomingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center leading-none">
                  {upcomingCount > 9 ? "9+" : upcomingCount}
                </span>
              )}
            </button>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Refresh</span>
            </button>

            <Link href="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors border border-border">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          </div>
        </div>

        {/* Mobile search bar — full width below header */}
        {searchOpen && (
          <div className="sm:hidden mt-2">
            <GlobalSearch
              senateRaces={senateRaces}
              houseRaces={houseRaces}
              redistrictingStates={redistrictingStates}
              referendums={referendums}
              onSelectSenate={handleSelectSenate}
              onSelectHouse={handleSelectHouse}
              onSelectRedistricting={handleSelectRedistricting}
              onSelectReferendum={handleSelectReferendum}
            />
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{VIEW_DESCRIPTIONS[view]}</span>
          {view === "redistricting" && (
            <div className="flex items-center gap-3 ml-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#4a7c59" }} />
                <span className="text-muted-foreground">Enacted</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#8b6914" }} />
                <span className="text-muted-foreground">Pending</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full inline-block bg-muted-foreground/30" />
                <span className="text-muted-foreground">No activity</span>
              </span>
            </div>
          )}
          {(view === "senate" || view === "house") && (
            <div className="flex items-center gap-2 ml-2 flex-wrap">
              {[
                { label: "Solid D", color: "#1a4fa0" },
                { label: "Lean D", color: "#5b8fd4" },
                { label: "Toss-up", color: "#c8a951" },
                { label: "Lean R", color: "#d96b4a" },
                { label: "Solid R", color: "#b22222" },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Mobile sidebar overlay backdrop ── */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left Sidebar ── */}
        <aside
          className={`
            flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-card/95
            transition-all duration-300 ease-in-out
            /* Mobile: fixed overlay drawer */
            fixed md:relative inset-y-0 left-0 z-40
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            /* Desktop: collapsible width */
            ${sidebarCollapsed ? "md:w-0 md:border-r-0 md:overflow-hidden" : "md:w-64"}
            w-72
          `}
          style={{ top: 0, bottom: 0 }}
        >
          {/* Sidebar content — hidden when collapsed on desktop */}
          <div className={`flex flex-col h-full overflow-hidden ${sidebarCollapsed ? "md:hidden" : ""}`}>
            {/* Mobile close button */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Races & Scoreboard</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-shrink-0 p-3 border-b border-border">
              <Scoreboard />
            </div>
            <div className="flex-1 overflow-hidden">
              <RaceList
                view={view}
                senateRaces={senateRaces}
                houseRaces={houseRaces}
                redistrictingStates={redistrictingStates}
                referendums={referendums}
                onSelectSenate={handleSelectSenate}
                onSelectHouse={handleSelectHouse}
                onSelectRedistricting={handleSelectRedistricting}
                onSelectReferendum={handleSelectReferendum}
                selectedId={selectedId}
              />
            </div>
          </div>
        </aside>

        {/* Desktop sidebar collapse toggle */}
        <button
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-12 bg-card border border-border rounded-r-md items-center justify-center hover:bg-muted transition-colors"
          style={{ left: sidebarCollapsed ? 0 : "256px" }}
          onClick={() => setSidebarCollapsed(o => !o)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
            : <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          }
        </button>

        {/* ── Map area ── */}
        <main className="flex-1 relative overflow-hidden">
          <ElectionMap
            view={view}
            senateRaces={senateRaces}
            houseRaces={houseRaces}
            redistrictingStates={redistrictingStates}
            onStateClick={handleStateClick}
            onDistrictClick={handleSelectHouse}
            selectedStateCode={selectedStateCode}
            selectedDistrictId={selectedId}
          />

          {/* Desktop popup — top-right corner */}
          {popup && (
            <div className="hidden md:block absolute top-4 right-4 z-20 max-w-xs w-full">
              <RacePopup
                type={popup.type}
                data={popup.data}
                onClose={closePopup}
              />
            </div>
          )}

          {/* Map hint */}
          {!popup && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground pointer-events-none whitespace-nowrap">
              <span className="hidden sm:inline">Click any state to view race details · Scroll to zoom</span>
              <span className="sm:hidden">Tap any state to view race details</span>
            </div>
          )}
        </main>

        {/* ── Right Panel: Election Calendar ── */}
        {calendarOpen && (
          <aside className="hidden md:flex w-72 flex-shrink-0 border-l border-border flex-col overflow-hidden bg-card/50">
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-foreground">Election Calendar</span>
              </div>
              <button
                onClick={() => setCalendarOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close calendar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <ElectionCalendar
                senateRaces={senateRaces}
                houseRaces={houseRaces}
                referendums={referendums}
                onSelectSenate={handleSelectSenate}
                onSelectReferendum={handleSelectReferendum}
              />
            </div>
          </aside>
        )}
      </div>

      {/* ─── Mobile Bottom Sheet: Race Popup ────────────────────────────────── */}
      {popup && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePopup}
          />
          {/* Sheet */}
          <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pb-6">
              <RacePopup
                type={popup.type}
                data={popup.data}
                onClose={closePopup}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Calendar Bottom Sheet ───────────────────────────────────── */}
      {calendarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCalendarOpen(false)}
          />
          <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-foreground">Election Calendar</span>
              </div>
              <button onClick={() => setCalendarOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ElectionCalendar
                senateRaces={senateRaces}
                houseRaces={houseRaces}
                referendums={referendums}
                onSelectSenate={handleSelectSenate}
                onSelectReferendum={handleSelectReferendum}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search overlay backdrop */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:block hidden"
          onClick={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
