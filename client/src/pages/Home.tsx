import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import ElectionMap from "@/components/ElectionMap";
import Scoreboard from "@/components/Scoreboard";
import RacePopup from "@/components/RacePopup";
import RaceList from "@/components/RaceList";
import { Map, RefreshCw, Lock } from "lucide-react";
import { Link } from "wouter";
import type { SenateRace, HouseRace, RedistrictingState, Referendum } from "../../../drizzle/schema";

type MapView = "senate" | "house" | "redistricting";

const VIEW_LABELS: Record<MapView, string> = {
  senate: "U.S. Senate",
  house: "U.S. House",
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

  const { data: senateRaces = [], refetch: refetchSenate } = trpc.senate.list.useQuery();
  const { data: houseRaces = [], refetch: refetchHouse } = trpc.house.list.useQuery();
  const { data: redistrictingStates = [], refetch: refetchRedistricting } = trpc.redistricting.list.useQuery();
  const { data: referendums = [], refetch: refetchReferendums } = trpc.referendum.list.useQuery();

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
  }, []);

  const handleSelectHouse = useCallback((race: HouseRace) => {
    setPopup({ type: "house", data: race });
    setSelectedStateCode(race.stateCode);
    setSelectedId(race.id);
  }, []);

  const handleSelectRedistricting = useCallback((state: RedistrictingState) => {
    setPopup({ type: "redistricting", data: state });
    setSelectedStateCode(state.stateCode);
    setSelectedId(state.id);
  }, []);

  const handleSelectReferendum = useCallback((ref: Referendum) => {
    setPopup({ type: "referendum", data: ref });
    setSelectedStateCode(ref.stateCode);
    setSelectedId(ref.id);
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
    setSelectedStateCode(null);
    setSelectedId(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center">
                <Map className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">2026 U.S. Election Center</h1>
                <p className="text-xs text-muted-foreground leading-tight">Interactive Congressional Tracker</p>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["senate", "house", "redistricting"] as MapView[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); closePopup(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  view === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/admin">
              <a className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors border border-border">
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </a>
            </Link>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{VIEW_DESCRIPTIONS[view]}</span>
          {view === "redistricting" && (
            <div className="flex items-center gap-3 ml-2">
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-card/50">
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
        </aside>

        {/* Map area */}
        <main className="flex-1 relative overflow-hidden">
          <ElectionMap
            view={view}
            senateRaces={senateRaces}
            houseRaces={houseRaces}
            redistrictingStates={redistrictingStates}
            onStateClick={handleStateClick}
            selectedStateCode={selectedStateCode}
          />

          {/* Popup */}
          {popup && (
            <div className="absolute top-4 right-4 z-20">
              <RacePopup
                type={popup.type}
                data={popup.data}
                onClose={closePopup}
              />
            </div>
          )}

          {/* Map hint */}
          {!popup && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground pointer-events-none">
              Click any state to view race details · Scroll to zoom
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
