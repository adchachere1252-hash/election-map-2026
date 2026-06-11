import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ElectionMap, { type ElectionMapHandle } from "@/components/ElectionMap";
import Scoreboard from "@/components/Scoreboard";
import RacePopup from "@/components/RacePopup";
import RaceList from "@/components/RaceList";
import ElectionCalendar from "@/components/ElectionCalendar";
import GlobalSearch from "@/components/GlobalSearch";
import { Map, RefreshCw, Lock, Calendar, ChevronRight, ChevronLeft, Menu, X, Zap, Radio, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { toast } from "sonner";
import type { SenateRace, HouseRace, RedistrictingState, Referendum, Senator } from "../../../drizzle/schema";
import SenatorDetailPopup from "@/components/SenatorDetailPopup";
import { useElectionSocket } from "@/contexts/ElectionSocketContext";
import ResultsTicker from "@/components/ResultsTicker";
import KeyRaces from "@/components/KeyRaces";
import { useElectionChime } from "@/hooks/useElectionChime";
import NoRaceStatePopup from "@/components/NoRaceStatePopup";
import GovernorRacePopup from "@/components/GovernorRacePopup";
import GovernorRaceList from "@/components/GovernorRaceList";
import GovernorMap, { type GovernorMapHandle } from "@/components/GovernorMap";
import { TwinklingStars } from "@/components/TwinklingStars";
import { ShootingStar } from "@/components/ShootingStar";

type MapView = "governor" | "house" | "redistricting" | "senate";

const VIEW_LABELS: Record<MapView, string> = {
  governor: "Governor",
  house: "House",
  redistricting: "Redistricting",
  senate: "Senate",
};

const VIEW_DESCRIPTIONS: Record<MapView, string> = {
  governor: "36 races · Nov 3, 2026",
  house: "435 districts · Nov 3, 2026",
  redistricting: "12 states · 2025–2026",
  senate: "35 races · Nov 3, 2026",
};

// Auto-refresh countdown hook — counts down from 10 to 0, resets on each tick
function useRefreshCountdown(intervalMs: number, onRefresh?: () => void) {
  const [countdown, setCountdown] = useState(Math.floor(intervalMs / 1000));
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  useEffect(() => {
    setCountdown(Math.floor(intervalMs / 1000));
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger actual data refetch when countdown resets
          setTimeout(() => onRefreshRef.current?.(), 0);
          return Math.floor(intervalMs / 1000);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [intervalMs]);
  return countdown;
}

// Election countdown hook — days until Nov 3, 2026
function useDaysUntilElection() {
  const electionDay = new Date("2026-11-03T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = electionDay.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

// Live clock hook — ticks every second
function usePSTClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pst = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return pst;
}

export default function Home() {
  const pstClock = usePSTClock();
  const daysUntilElection = useDaysUntilElection();
  // handleRefresh is defined below — we use a ref so countdown can call it before it's defined
  const handleRefreshRef = useRef<() => void>(() => {});
  const refreshCountdown = useRefreshCountdown(10_000, () => handleRefreshRef.current());
  const [view, setView] = useState<MapView>("senate");
  const [popup, setPopup] = useState<{
    type: "senate" | "house" | "redistricting" | "referendum" | "no-race" | "governor";
    data: SenateRace | HouseRace | RedistrictingState | Referendum | null;
    stateCode?: string;
    stateName?: string;
  } | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Mobile bottom sheet: snap positions — 'peek' (40vh) | 'full' (78vh) | closed
  type SheetSnap = 'peek' | 'full';
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('full');
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragStart = useRef<number | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  // Map refs for programmatic zoom control
  const electionMapRef = useRef<ElectionMapHandle>(null);
  const governorMapRef = useRef<GovernorMapHandle>(null);
  const [sheetCanScroll, setSheetCanScroll] = useState(false);

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    // Only begin drag if the scroll container is at the top (or we're in peek mode)
    const el = sheetScrollRef.current;
    if (el && el.scrollTop > 0 && sheetSnap === 'full') return;
    sheetDragStart.current = e.touches[0].clientY;
  }, [sheetSnap]);

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (sheetDragStart.current === null) return;
    const delta = e.touches[0].clientY - sheetDragStart.current;
    if (delta > 0) setSheetDragY(delta);
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    if (sheetDragY > 120) {
      // Large swipe down — close
      closePopup();
    } else if (sheetDragY > 40 && sheetSnap === 'full') {
      // Medium swipe down from full — snap to peek
      setSheetSnap('peek');
    } else if (sheetDragY < -40 && sheetSnap === 'peek') {
      // Swipe up from peek — snap to full
      setSheetSnap('full');
    }
    setSheetDragY(0);
    sheetDragStart.current = null;
  }, [sheetDragY, sheetSnap]);
  // Desktop sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Election night results mode
  const [resultsMode, setResultsMode] = useState(false);
  // Live search query for map highlighting
  const [liveSearchQuery, setLiveSearchQuery] = useState("");
  // Senator detail popup (opened from global search)
  const [selectedSenatorId, setSelectedSenatorId] = useState<number | null>(null);
  // Show/hide state abbreviation labels on the map
  const [showLabels, setShowLabels] = useState(true);

  // WebSocket live push — invalidates caches instantly when a race is called
  const { isConnected, lastEvent } = useElectionSocket();

  // Sound chime for election night watch parties
  const { soundEnabled, toggleSound, playChime } = useElectionChime();

  // Viewer count — polls every 30s (lightweight, no need for 10s)
  const { data: viewerData } = trpc.live.viewerCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const viewerCount = viewerData?.count ?? 0;

  // Toast queue — show one race-called toast at a time, 10.5s each
  const toastQueueRef = useRef<Array<{ title: string; description: string }>>([]);
  const toastActiveRef = useRef(false);
  // Client-side dedup: track which race+timestamp combos we've already toasted
  const seenToastIdsRef = useRef<Set<string>>(new Set());

  const showNextToast = useCallback(() => {
    if (toastQueueRef.current.length === 0) {
      toastActiveRef.current = false;
      return;
    }
    const next = toastQueueRef.current.shift()!;
    toastActiveRef.current = true;
    toast.success(next.title, {
      description: next.description,
      duration: 10500,
      onDismiss: showNextToast,
      onAutoClose: showNextToast,
    });
  }, []);

  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "race_called") return;
    // Show toasts for races from the current or recent election night (within 2 days).
    // This handles the case where the AP Engine assigns an older date (e.g. May 5)
    // to a race that was called during a later election night (e.g. May 19).
    if (lastEvent.electionDate) {
      const eventDate = new Date(lastEvent.electionDate + "T00:00:00");
      const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const diffDays = (nowET.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 2) return; // filter out stale races from more than 2 days ago
    }
    // Client-side dedup: skip if we've already shown a toast for this exact race+winner combo
    const toastId = `${lastEvent.stateCode}-${lastEvent.chamber}-${lastEvent.district ?? 0}-${lastEvent.calledWinner}`;
    if (seenToastIdsRef.current.has(toastId)) return;
    seenToastIdsRef.current.add(toastId);
    const partyLabel = lastEvent.calledParty === "D" ? "Democrat" : lastEvent.calledParty === "R" ? "Republican" : lastEvent.calledParty;
    const stateName = lastEvent.stateName ?? lastEvent.stateCode;
    // Build a clear "State · Chamber District" label
    const raceLabel = lastEvent.chamber === "senate"
      ? `${stateName} · Senate`
      : lastEvent.chamber === "governor"
      ? `${stateName} · Governor`
      : `${stateName} · District ${lastEvent.districtLabel ?? lastEvent.district ?? lastEvent.stateCode}`;
    const uncontestedNote = lastEvent.isUncontested ? " · Uncontested" : "";
    toastQueueRef.current.push({
      title: `⚡ Race called — ${raceLabel}`,
      description: `${lastEvent.calledWinner} (${partyLabel}) wins${uncontestedNote}`,
    });
    playChime();
    if (!toastActiveRef.current) showNextToast();
  }, [lastEvent, playChime, showNextToast]);

  // Fetch all races — interval is dynamic: 10s when Primary races are active (election night), 30s otherwise
  const [hasPrimaryRaces, setHasPrimaryRaces] = useState(false);
  const REFETCH_INTERVAL = hasPrimaryRaces ? 10_000 : 30_000;

  const { data: senateRaces = [], refetch: refetchSenate } = trpc.senate.list.useQuery(undefined, { refetchInterval: REFETCH_INTERVAL, refetchIntervalInBackground: true, refetchOnWindowFocus: true });
  const { data: houseRaces = [], refetch: refetchHouse } = trpc.house.list.useQuery(undefined, { refetchInterval: REFETCH_INTERVAL, refetchIntervalInBackground: true, refetchOnWindowFocus: true });
  const { data: redistrictingStates = [], refetch: refetchRedistricting } = trpc.redistricting.list.useQuery(undefined, { refetchInterval: REFETCH_INTERVAL, refetchIntervalInBackground: true, refetchOnWindowFocus: true });
  const { data: referendums = [], refetch: refetchReferendums } = trpc.referendum.list.useQuery(undefined, { refetchInterval: REFETCH_INTERVAL, refetchIntervalInBackground: true, refetchOnWindowFocus: true });
  const { data: senators = [] } = trpc.senators.list.useQuery();
  const { data: governorRaces = [], refetch: refetchGovernor } = trpc.governor.list.useQuery(undefined, { refetchInterval: REFETCH_INTERVAL, refetchIntervalInBackground: true, refetchOnWindowFocus: true });

  // Detect active Primary races to switch to faster refresh interval on election night
  useEffect(() => {
    const anyPrimary = senateRaces.some(r => r.status === "Primary") || houseRaces.some(r => r.status === "Primary");
    setHasPrimaryRaces(anyPrimary);
  }, [senateRaces, houseRaces]);

  // Hard interval as a safety net — fires at the same dynamic interval regardless of tab focus/visibility
  useEffect(() => {
    const id = setInterval(() => {
      refetchSenate();
      refetchHouse();
      refetchRedistricting();
      refetchReferendums();
      refetchGovernor();
    }, REFETCH_INTERVAL);
    return () => clearInterval(id);
  }, [REFETCH_INTERVAL, refetchSenate, refetchHouse, refetchRedistricting, refetchReferendums, refetchGovernor]);

  // Build a Set of matching keys for map highlighting based on live search query
  const searchHighlight = useMemo((): Set<string> | null => {
    const q = liveSearchQuery.trim().toLowerCase();
    if (!q) return null;
    const matches = new Set<string>();
    const hit = (fields: (string | null | undefined)[]) =>
      fields.some(f => f && f.toLowerCase().includes(q));
    for (const r of senateRaces) {
      if (hit([r.stateName, r.stateCode, r.incumbent, r.candidate1Name, r.candidate2Name, r.calledWinner, r.rating]))
        matches.add(r.stateCode);
    }
    for (const r of houseRaces) {
      if (hit([r.stateName, r.stateCode, r.incumbent, r.candidate1Name, r.candidate2Name, r.calledWinner, r.rating,
               `${r.stateCode}-${r.districtLabel}`, `${r.stateCode}-${r.district}`]))
        matches.add(`${r.stateCode}-${r.district}`);
    }
    for (const s of redistrictingStates) {
      if (hit([s.stateName, s.stateCode])) matches.add(s.stateCode);
    }
    return matches.size > 0 ? matches : new Set<string>();
  }, [liveSearchQuery, senateRaces, houseRaces, redistrictingStates]);

  // Close mobile sidebar on view change
  useEffect(() => {
    setSidebarOpen(false);
  }, [view]);

  // When a popup opens on mobile, start in peek mode so map stays visible
  useEffect(() => {
    if (popup) setSheetSnap('peek');
  }, [popup?.type, (popup?.data as any)?.id]);

  const handleRefresh = useCallback(() => {
    refetchSenate();
    refetchHouse();
    refetchRedistricting();
    refetchReferendums();
    refetchGovernor();
  }, [refetchSenate, refetchHouse, refetchRedistricting, refetchReferendums, refetchGovernor]);
  // Keep ref in sync so countdown timer always calls the latest version
  handleRefreshRef.current = handleRefresh;

  const handleStateClick = useCallback((stateCode: string) => {
    setSelectedStateCode(stateCode);
    if (view === "governor") {
      const race = governorRaces.find((r: any) => r.stateCode === stateCode);
      if (race) { setPopup({ type: "governor", data: race as any }); setSelectedId(race.id); }
    } else if (view === "senate") {
      const race = senateRaces.find(r => r.stateCode === stateCode);
      if (race) { setPopup({ type: "senate", data: race }); setSelectedId(race.id); }
      else {
        // No 2026 race — show senator info popup for this state
        const STATE_NAMES: Record<string, string> = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming" };
        setPopup({ type: "no-race", data: null, stateCode, stateName: STATE_NAMES[stateCode] ?? stateCode });
      }
    } else if (view === "house") {
      const stateRaces = houseRaces.filter(r => r.stateCode === stateCode);
      if (stateRaces.length === 1) { setPopup({ type: "house", data: stateRaces[0] }); setSelectedId(stateRaces[0].id); }
    } else if (view === "redistricting") {
      // If an active (non-voided) referendum exists for this state, show the referendum popup.
      // If the referendum was struck down / voided by a court, show the redistricting state popup instead.
      const ref = referendums.find(r => r.stateCode === stateCode);
      const redistState = redistrictingStates.find(r => r.stateCode === stateCode);
      const isVoided = redistState?.status === 'Struck Down';
      if (ref && !isVoided) {
        setPopup({ type: "referendum", data: ref });
        setSelectedId(ref.id);
      } else if (redistState) {
        setPopup({ type: "redistricting", data: redistState });
        setSelectedId(redistState.id);
      } else if (ref) {
        // Fallback: show referendum if no redistricting record
        setPopup({ type: "referendum", data: ref });
        setSelectedId(ref.id);
      }
    }
  }, [view, governorRaces, senateRaces, houseRaces, redistrictingStates, referendums]);

  const handleSelectSenate = useCallback((race: SenateRace) => {
    setPopup({ type: "senate", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
    setCalendarOpen(false);
    setSearchOpen(false);
    setSidebarOpen(false);
    setLiveSearchQuery("");
  }, []);

  const handleSelectHouse = useCallback((race: HouseRace) => {
    setPopup({ type: "house", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
    setSearchOpen(false);
    setSidebarOpen(false);
    setLiveSearchQuery("");
  }, []);

  const handleSelectRedistricting = useCallback((state: RedistrictingState) => {
    setPopup({ type: "redistricting", data: state });
    setSelectedStateCode(state.stateCode);
    setSelectedId(state.id);
    setSearchOpen(false);
    setSidebarOpen(false);
    setLiveSearchQuery("");
  }, []);

  const handleSelectReferendum = useCallback((ref: Referendum) => {
    setPopup({ type: "referendum", data: ref });
    setSelectedStateCode(ref.stateCode);
    setSelectedId(ref.id);
    setCalendarOpen(false);
    setSearchOpen(false);
    setSidebarOpen(false);
    setLiveSearchQuery("");
  }, []);

  const handleSelectGovernor = useCallback((race: any) => {
    setPopup({ type: "governor", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
    setSearchOpen(false);
    setSidebarOpen(false);
    setLiveSearchQuery("");
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
    setSelectedStateCode(null);
    setSelectedId(null);
    setSheetDragY(0);
    setSheetCanScroll(false);
    setSheetSnap('full');
    // Zoom back out to full map when popup is closed
    electionMapRef.current?.resetZoom();
    governorMapRef.current?.resetZoom();
  }, []);

  // Focus-on-map: zoom the active map to the state from the current popup
  const focusOnMap = useCallback(() => {
    const stateCode = popup?.stateCode ?? (popup?.data as any)?.stateCode;
    if (!stateCode) return;
    if (view === "governor") {
      governorMapRef.current?.zoomToState(stateCode);
    } else {
      electionMapRef.current?.zoomToState(stateCode);
    }
  }, [popup, view]);

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

  // Always derive live popup data from the refreshed arrays — never use stale popup.data snapshot
  const livePopupData = useMemo(() => {
    if (!popup) return null;
    if (popup.type === 'senate') {
      return senateRaces.find(r => r.id === (popup.data as any)?.id) ?? popup.data;
    }
    if (popup.type === 'house') {
      return houseRaces.find(r => r.id === (popup.data as any)?.id) ?? popup.data;
    }
    if (popup.type === 'redistricting') {
      return redistrictingStates.find(r => r.id === (popup.data as any)?.id) ?? popup.data;
    }
    if (popup.type === 'referendum') {
      return referendums.find(r => r.id === (popup.data as any)?.id) ?? popup.data;
    }
    if (popup.type === 'governor') {
      return governorRaces.find((r: any) => r.id === (popup.data as any)?.id) ?? popup.data;
    }
    return popup.data;
  }, [popup, senateRaces, houseRaces, redistrictingStates, referendums, governorRaces]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      {/* Results Ticker — only visible when races have been called */}
      <ResultsTicker />

      <header className="flex-shrink-0 border-b border-border bg-card px-3 py-2">
        {/* ── Row 1: Logo + Tabs + Actions ── */}
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

          {/* Live PST clock */}
          <div className="hidden xl:flex flex-col items-end flex-shrink-0 ml-1 mr-1">
            <span className="text-xs font-mono text-muted-foreground leading-tight" title="Pacific Standard Time">
              {pstClock}
            </span>
            <span className="text-xs text-muted-foreground/50 leading-tight">PST</span>
          </div>

          {/* Spacer — pushes tabs and actions to the right */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 flex-shrink-0">
            {(["governor", "house", "redistricting", "senate"] as MapView[]).map(v => (
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
            {/* Historical Atlas link */}
            <Link
              to="/map-comparison"
              className="px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap text-muted-foreground hover:text-foreground"
              title="Congressional Historical Map Atlas (89th\u2013119th Congress)"
            >
              <span className="hidden sm:inline">Historical Atlas</span>
              <span className="sm:hidden">Atlas</span>
            </Link>
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

            {/* Labels toggle switch */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded border border-border text-xs text-muted-foreground">
              <Switch
                id="labels-toggle"
                checked={showLabels}
                onCheckedChange={setShowLabels}
                className="scale-75 origin-left"
              />
              <Label htmlFor="labels-toggle" className="text-xs cursor-pointer select-none">Labels</Label>
            </div>

            {/* Election Night Mode toggle */}
            <button
              onClick={() => setResultsMode(o => !o)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors border ${
                resultsMode
                  ? "border-yellow-500 text-yellow-400 bg-yellow-900/20"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title={resultsMode ? "Switch to Ratings view" : "Switch to Election Night Results view"}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{resultsMode ? "Results" : "Ratings"}</span>
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
              <RefreshCw className={`w-3.5 h-3.5 ${refreshCountdown === 10 ? 'animate-spin' : ''}`} style={{ animationDuration: '0.5s', animationIterationCount: 1 }} />
              <span className="hidden lg:inline">Refresh</span>
              <span className="tabular-nums text-xs font-mono text-yellow-400">{refreshCountdown}s</span>
            </button>

            {/* Sound toggle — chime on race called */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border transition-colors ${
                soundEnabled
                  ? "border-yellow-600 text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/30"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={soundEnabled ? "Sound ON — click to mute election chime" : "Sound OFF — click to enable election chime"}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden lg:inline">{soundEnabled ? "Sound ON" : "Sound OFF"}</span>
            </button>

            {/* Live WebSocket indicator with viewer count */}
            <div
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border transition-colors ${
                isConnected
                  ? "border-green-600 text-green-400 bg-green-900/20"
                  : "border-border text-muted-foreground"
              }`}
              title={isConnected ? `Live push connected — ${viewerCount} viewer${viewerCount !== 1 ? "s" : ""} watching` : "Connecting to live feed..."}
            >
              <Radio className={`w-3 h-3 ${isConnected ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline text-xs font-semibold">
                {isConnected ? (
                  <>
                    <span className="text-green-400">● LIVE</span>
                    {viewerCount > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">· {viewerCount} watching</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Connecting...</span>
                )}
              </span>
            </div>

            <Link href="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors border border-border">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Search bar — full width, always visible on sm+, below toolbar */}
        <div className="hidden sm:block mt-1.5">
          <GlobalSearch
            senateRaces={senateRaces}
            houseRaces={houseRaces}
            redistrictingStates={redistrictingStates}
            referendums={referendums}
            governorRaces={governorRaces as any}
            onSelectSenate={handleSelectSenate}
            onSelectHouse={handleSelectHouse}
            onSelectRedistricting={handleSelectRedistricting}
            onSelectReferendum={handleSelectReferendum}
            onSelectGovernor={handleSelectGovernor}
            onQueryChange={setLiveSearchQuery}
            onSelectSenator={(s: Senator) => setSelectedSenatorId(s.id)}
          />
        </div>

        {/* Mobile search bar — full width below header */}
        {searchOpen && (
          <div className="sm:hidden mt-2">
            <GlobalSearch
              senateRaces={senateRaces}
              houseRaces={houseRaces}
              redistrictingStates={redistrictingStates}
              referendums={referendums}
              governorRaces={governorRaces as any}
              onSelectSenate={handleSelectSenate}
              onSelectHouse={handleSelectHouse}
              onSelectRedistricting={handleSelectRedistricting}
              onSelectReferendum={handleSelectReferendum}
              onSelectGovernor={handleSelectGovernor}
              onQueryChange={setLiveSearchQuery}
              onSelectSenator={(s: Senator) => setSelectedSenatorId(s.id)}
            />
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{VIEW_DESCRIPTIONS[view]}</span>
          {resultsMode && (view === "senate" || view === "house") && (
            <span className="flex items-center gap-1.5 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" />
              Election Night Mode
            </span>
          )}
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
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#7f1d1d" }} />
                <span className="text-muted-foreground">Struck Down</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm inline-block bg-muted-foreground/30" />
                <span className="text-muted-foreground">No activity</span>
              </span>
              <Link href="/map-comparison">
                <button className="flex items-center gap-1.5 text-xs bg-violet-900/40 hover:bg-violet-800/60 border border-violet-600/40 text-violet-300 hover:text-violet-100 px-2.5 py-1 rounded-full transition-all font-semibold">
                  <Map className="w-3 h-3" />
                  Historical Map Atlas →
                </button>
              </Link>
            </div>
          )}
          {(view === "senate" || view === "house") && !resultsMode && (
            <div className="flex items-center gap-2 ml-2 flex-wrap">
              {[
                { label: "Solid D", color: "#1a4fa0" },
                { label: "Likely D", color: "#3a6fc0" },
                { label: "Lean D", color: "#5b8fd4" },
                { label: "Toss-up", color: "#7c3aed" },
                { label: "Lean R", color: "#d96b4a" },
                { label: "Likely R", color: "#c04040" },
                { label: "Solid R", color: "#b22222" },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
              ))}
            </div>
          )}
          {(view === "senate" || view === "house") && resultsMode && (
            <div className="flex items-center gap-2 ml-2 flex-wrap">
              {[
                { label: "Called D", color: "#1a4fa0" },
                { label: "Called R", color: "#b22222" },
                { label: "Uncalled", color: "#2a2f3a" },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block border border-border/50" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
              ))}
            </div>
          )}
          {liveSearchQuery.trim() && searchHighlight && (
            <span className="flex items-center gap-1.5 text-xs bg-blue-900/30 border border-blue-700/40 text-blue-400 px-2 py-0.5 rounded-full">
              {searchHighlight.size} match{searchHighlight.size !== 1 ? "es" : ""} highlighted
              <button onClick={() => setLiveSearchQuery("")} className="ml-0.5 hover:text-blue-200">×</button>
            </span>
          )}
          {/* Election countdown */}
          <span className="ml-auto flex items-center gap-1.5 text-xs bg-amber-950/40 border border-amber-700/40 text-amber-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
            ⏳ {daysUntilElection > 0 ? `${daysUntilElection} days until Nov 3, 2026` : daysUntilElection === 0 ? "Election Day — Nov 3, 2026" : "Election has passed"}
          </span>
        </div>
      </header>

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Mobile Bottom-Sheet Sidebar ── */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Bottom sheet */}
            <div className="relative bg-card border-t border-border rounded-t-2xl shadow-2xl flex flex-col z-10" style={{ maxHeight: "78vh" }}>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-pointer" onClick={() => setSidebarOpen(false)}>
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
                <span className="text-sm font-bold text-foreground">Races & Scoreboard</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 border-b border-border">
                  <Scoreboard />
                </div>
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-3.5 bg-yellow-500 rounded-sm inline-block flex-shrink-0" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Key Races</span>
                    <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">most competitive contests</span>
                  </div>
                  <KeyRaces />
                </div>
                {view === "governor" ? (
                  <GovernorRaceList
                    governorRaces={governorRaces as any}
                    onSelectGovernor={(race) => { handleSelectGovernor(race); setSidebarOpen(false); }}
                    selectedId={selectedId}
                  />
                ) : (
                  <RaceList
                    view={view}
                    senateRaces={senateRaces}
                    houseRaces={houseRaces}
                    redistrictingStates={redistrictingStates}
                    referendums={referendums}
                    onSelectSenate={(race) => { handleSelectSenate(race); setSidebarOpen(false); }}
                    onSelectHouse={(race) => { handleSelectHouse(race); setSidebarOpen(false); }}
                    onSelectRedistricting={(state) => { handleSelectRedistricting(state); setSidebarOpen(false); }}
                    onSelectReferendum={(ref) => { handleSelectReferendum(ref); setSidebarOpen(false); }}
                    selectedId={selectedId}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Left Sidebar (desktop only) ── */}
        <aside
          className={`
            hidden md:flex flex-shrink-0 border-r border-border flex-col overflow-hidden bg-card/95
            transition-all duration-300 ease-in-out
            /* Desktop: collapsible width */
            ${sidebarCollapsed ? "md:w-0 md:border-r-0 md:overflow-hidden" : "md:w-64"}
          `}
        >
          {/* Sidebar content — hidden when collapsed on desktop */}
          <div className={`flex flex-col h-full overflow-hidden ${sidebarCollapsed ? "md:hidden" : ""}`}>
            {/* placeholder for mobile close button removed — desktop only now */}
            <div className="hidden" />

            {/* Single scrollable column: Scoreboard on top, Key Races, then RaceList below */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-border">
                <Scoreboard />
              </div>
              {/* Key Races Section */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-3.5 bg-yellow-500 rounded-sm inline-block flex-shrink-0" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Key Races</span>
                  <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">most competitive contests</span>
                </div>
                <KeyRaces />
              </div>
              {view === "governor" ? (
                <GovernorRaceList
                  governorRaces={governorRaces as any}
                  onSelectGovernor={handleSelectGovernor}
                  selectedId={selectedId}
                />
              ) : (
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
              )}
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
        <main className="flex-1 relative overflow-hidden" style={{ background: "#080b14 url('https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/bg-starfield-mockup-JqYe2bKJ8FLDDszMe8FmV9.webp') center/cover no-repeat" }}>
          <TwinklingStars />
          <ShootingStar />
          {view === "governor" ? (
            <GovernorMap
              ref={governorMapRef}
              governorRaces={governorRaces as any}
              onStateClick={handleStateClick}
              selectedStateCode={selectedStateCode}
              showLabels={showLabels}
            />
          ) : (
            <ElectionMap
              ref={electionMapRef}
              view={view}
              senateRaces={senateRaces}
              houseRaces={houseRaces}
              redistrictingStates={redistrictingStates}
              senators={senators}
              onStateClick={handleStateClick}
              onDistrictClick={handleSelectHouse}
              selectedStateCode={selectedStateCode}
              selectedDistrictId={selectedId}
              resultsMode={resultsMode}
              searchHighlight={searchHighlight}
              showLabels={showLabels}
            />
          )}

          {/* Map hint */}
          {!popup && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground pointer-events-none whitespace-nowrap">
              <span className="hidden sm:inline">Click any state to view race details · Scroll to zoom</span>
              <span className="sm:hidden">Tap any state to view race details</span>
            </div>
          )}

        </main>

        {/* Desktop popup — fixed top-right, outside main so overflow-hidden doesn't clip it */}
        {popup && popup.type === "governor" && (
          <div className="hidden md:block fixed top-20 right-4 z-30 max-w-xs w-full overflow-y-auto max-h-[calc(100vh-6rem)]">
            <GovernorRacePopup
              race={livePopupData as any}
              onClose={closePopup}
              onFocusMap={focusOnMap}
            />
          </div>
        )}
        {popup && popup.type !== "no-race" && popup.type !== "governor" && (
          <div className="hidden md:block fixed top-20 right-4 z-30 max-w-xs w-full">
            <RacePopup
              type={popup.type as any}
              data={livePopupData as any}
              onClose={closePopup}
              onFocusMap={focusOnMap}
            />
          </div>
        )}
        {popup && popup.type === "no-race" && popup.stateCode && popup.stateName && (
          <div className="hidden md:block fixed top-20 right-4 z-30 max-w-xs w-full bg-card border border-border rounded-xl shadow-xl p-4 overflow-y-auto max-h-[calc(100vh-6rem)]">
            <NoRaceStatePopup
              stateCode={popup.stateCode}
              stateName={popup.stateName}
              onClose={closePopup}
              onFocusMap={focusOnMap}
            />
          </div>
        )}

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
                governorRaces={governorRaces as any}
                onSelectSenate={handleSelectSenate}
                onSelectReferendum={handleSelectReferendum}
                onSelectGovernor={handleSelectGovernor}
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
          {/* Sheet — snaps between peek (40vh) and full (78vh) */}
          <div
            className="relative bg-card border-t border-border rounded-t-2xl shadow-2xl flex flex-col"
            style={{
              maxHeight: sheetSnap === 'peek' ? '42vh' : '78vh',
              transform: sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined,
              transition: sheetDragY === 0
                ? 'max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1), transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
                : 'none',
              opacity: sheetDragY > 0 ? Math.max(0.5, 1 - sheetDragY / 200) : 1,
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            {/* Drag handle — tap to toggle peek/full, swipe down to dismiss */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
              onClick={() => {
                if (sheetDragY !== 0) return;
                if (sheetSnap === 'peek') setSheetSnap('full');
                else setSheetSnap('peek');
              }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
              {/* Snap indicator chevron */}
              <span className="absolute text-muted-foreground/40 text-xs" style={{ top: '10px', right: '16px' }}>
                {sheetSnap === 'peek' ? '↑' : '↓'}
              </span>
            </div>
            {/* Scrollable content with bottom fade indicator */}
            <div
              ref={sheetScrollRef}
              className="overflow-y-auto flex-1 relative"
              onScroll={(e) => setSheetCanScroll((e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) > 20)}
            >
              <div className="px-4 pb-8">
                {popup.type === "governor" ? (
                  <GovernorRacePopup
                    race={livePopupData as any}
                    onClose={closePopup}
                  />
                ) : popup.type === "no-race" && popup.stateCode && popup.stateName ? (
                  <NoRaceStatePopup
                    stateCode={popup.stateCode}
                    stateName={popup.stateName}
                    onClose={closePopup}
                  />
                ) : (
                  <RacePopup
                    type={popup.type as any}
                    data={livePopupData as any}
                    onClose={closePopup}
                  />
                )}
              </div>
              {/* Scroll fade indicator — shows when more content is below */}
              <div
                className="pointer-events-none sticky bottom-0 left-0 right-0 h-10 transition-opacity duration-200"
                style={{ background: "linear-gradient(to top, hsl(var(--card)) 30%, transparent)", opacity: sheetCanScroll ? 1 : 0 }}
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
                governorRaces={governorRaces as any}
                onSelectSenate={handleSelectSenate}
                onSelectReferendum={handleSelectReferendum}
                onSelectGovernor={handleSelectGovernor}
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

      {/* Senator detail popup — opened from global search */}
      {selectedSenatorId !== null && (
        <SenatorDetailPopup
          senatorId={selectedSenatorId}
          onClose={() => setSelectedSenatorId(null)}
        />
      )}

      {/* ── Mobile floating Races button ──────────────────────────────────── */}
      {!sidebarOpen && (
        <button
          className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-blue-900/40 transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open races panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Races
        </button>
      )}

      {/* ── Data Sources Footer ──────────────────────────────────── */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-full px-5 py-1.5 hidden md:block shadow-lg shadow-black/30">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">Data Sources:</span>
          <a href="https://www.congress.gov" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2">Congress.gov</a>
          <span className="text-slate-600">·</span>
          <a href="https://www.ap.org/elections" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2">Associated Press</a>
          <span className="text-slate-600">·</span>
          <a href="https://ballotpedia.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2">Ballotpedia</a>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">Photos via U.S. Congress Bioguide</span>
        </div>
      </footer>
    </div>
  );
}
