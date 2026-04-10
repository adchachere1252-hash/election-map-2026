import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { getRatingColor, getPartyColor } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Senator, GovernorRace } from "../../../drizzle/schema";

type MapView = "governor" | "senate" | "house" | "redistricting";

interface ElectionMapProps {
  view: MapView;
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  redistrictingStates: RedistrictingState[];
  governorRaces?: GovernorRace[];
  senators?: Senator[];
  onStateClick?: (stateCode: string) => void;
  onDistrictClick?: (race: HouseRace) => void;
  selectedStateCode?: string | null;
  selectedDistrictId?: number | null;
  /** When true, map colors called seats by winning party; uncalled = neutral gray */
  resultsMode?: boolean;
  /** Set of state codes or "stateCode-district" keys that match the active search query */
  searchHighlight?: Set<string> | null;
}

// FIPS to state code mapping
const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "12": "FL", "13": "GA",
  "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO",
  "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ",
  "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC",
  "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT",
  "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY",
};

// Results-mode colors
const CALLED_D_COLOR = "#1a4fa0";
const CALLED_R_COLOR = "#b22222";
const UNCALLED_COLOR = "#2a2f3a";
const DIM_OPACITY = 0.18;

export default function ElectionMap({
  view,
  senateRaces,
  houseRaces,
  redistrictingStates,
  governorRaces = [],
  senators = [],
  onStateClick,
  onDistrictClick,
  selectedStateCode,
  selectedDistrictId,
  resultsMode = false,
  searchHighlight = null,
}: ElectionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [statesData, setStatesData] = useState<any>(null);
  const [districtsData, setDistrictsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  // Use refs for callbacks to avoid stale closures in D3 event handlers
  const onStateClickRef = useRef(onStateClick);
  const onDistrictClickRef = useRef(onDistrictClick);
  useEffect(() => { onStateClickRef.current = onStateClick; }, [onStateClick]);
  useEffect(() => { onDistrictClickRef.current = onDistrictClick; }, [onDistrictClick]);

  // Load both topojson files in parallel
  useEffect(() => {
    Promise.all([
      fetch("/states-10m.json").then(r => r.json()),
      fetch("/districts-10m.json").then(r => r.json()),
    ]).then(([states, districts]) => {
      setStatesData(states);
      setDistrictsData(districts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Build lookup maps (memoized)
  const senateByState = useMemo(() =>
    Object.fromEntries(senateRaces.map(r => [r.stateCode, r])),
    [senateRaces]
  );

  const houseByStateDistrict = useMemo(() => {
    const map: Record<string, HouseRace> = {};
    for (const r of houseRaces) {
      map[`${r.stateCode}-${r.district}`] = r;
    }
    return map;
  }, [houseRaces]);

  const houseByState = useMemo(() => {
    const map: Record<string, HouseRace[]> = {};
    for (const r of houseRaces) {
      if (!map[r.stateCode]) map[r.stateCode] = [];
      map[r.stateCode].push(r);
    }
    return map;
  }, [houseRaces]);

  const redistrictingByState = useMemo(() =>
    Object.fromEntries(redistrictingStates.map(r => [r.stateCode, r])),
    [redistrictingStates]
  );

  const govByState = useMemo(() =>
    Object.fromEntries(governorRaces.map(r => [r.stateCode, r])),
    [governorRaces]
  );

  // Build party split map: stateCode -> { name, party }[]
  const senatorsByState = useMemo(() => {
    const map: Record<string, { name: string; party: string }[]> = {};
    for (const s of senators) {
      if (!map[s.stateCode]) map[s.stateCode] = [];
      map[s.stateCode].push({ name: s.name, party: s.party });
    }
    return map;
  }, [senators]);

  // Determine split/unified for each state
  const getStateSplitInfo = useCallback((stateCode: string): { split: boolean; parties: string[] } | null => {
    const sens = senatorsByState[stateCode];
    if (!sens || sens.length < 2) return null;
    const parties = sens.map(s => s.party);
    const unique = Array.from(new Set(parties));
    return { split: unique.length > 1, parties };
  }, [senatorsByState]);

  const getDistrictColor = useCallback((stateCode: string, district: number): string => {
    const key = `${stateCode}-${district}`;
    const race = houseByStateDistrict[key];
    if (!race) return "url(#no-race-stripe)";
    if (resultsMode) {
      if (race.calledParty === "D") return CALLED_D_COLOR;
      if (race.calledParty === "R") return CALLED_R_COLOR;
      return UNCALLED_COLOR;
    }
    if (race.calledParty) return getPartyColor(race.calledParty as any);
    return getRatingColor(race.rating as any);
  }, [houseByStateDistrict, resultsMode]);

  const getStateColor = useCallback((stateCode: string): string => {
    if (view === "senate") {
      const race = senateByState[stateCode];
      if (!race) return "url(#no-race-stripe)";
      if (resultsMode) {
        if (race.calledParty === "D") return CALLED_D_COLOR;
        if (race.calledParty === "R") return CALLED_R_COLOR;
        return UNCALLED_COLOR;
      }
      if (race.calledParty) return getPartyColor(race.calledParty as any);
      return getRatingColor(race.rating as any);
    }
    if (view === "governor") {
      const race = govByState[stateCode];
      if (!race) return "url(#no-race-stripe)";
      if (resultsMode) {
        if (race.calledWinner === race.demCandidate) return CALLED_D_COLOR;
        if (race.calledWinner === race.repCandidate) return CALLED_R_COLOR;
        return UNCALLED_COLOR;
      }
      if (race.calledWinner) return getPartyColor(race.calledWinner === race.demCandidate ? "D" : "R" as any);
      return getRatingColor(race.rating as any);
    }
    if (view === "redistricting") {
      const state = redistrictingByState[stateCode];
      if (!state) return "url(#no-race-stripe)";
      return state.enacted ? "#4a7c59" : "#8b6914";
    }
    return "url(#no-race-stripe)";
  }, [view, senateByState, redistrictingByState, govByState, resultsMode]);

  // Main D3 render effect
  useEffect(() => {
    if (!statesData || !svgRef.current) return;
    if (view === "house" && !districtsData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 960;
    const height = svgRef.current.clientHeight || 500;

    const projection = d3.geoAlbersUsa()
      .scale(width * 1.05)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // @ts-ignore
    const stateFeatures = topojson.feature(statesData, statesData.objects.states);
    // @ts-ignore
    const stateMesh = topojson.mesh(statesData, statesData.objects.states, (a: any, b: any) => a !== b);

     // Add defs for stripe pattern (no-race states in senate view)
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "no-race-stripe")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 8)
      .attr("height", 8)
      .attr("patternTransform", "rotate(45)");
    pattern.append("rect")
      .attr("width", 8)
      .attr("height", 8)
      .attr("fill", "#1e2433");
    pattern.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", 4).attr("height", 8)
      .attr("fill", "#3b82f699");
    pattern.append("rect")
      .attr("x", 4).attr("y", 0)
      .attr("width", 4).attr("height", 8)
      .attr("fill", "#ef444499");

    const g = svg.append("g");
    if (view === "house" && districtsData) {
      // ── House view: render individual districts ──────────────────────────────
      // @ts-ignore
      const districtFeatures = topojson.feature(districtsData, districtsData.objects.districts);

      g.selectAll(".map-district")
        // @ts-ignore
        .data(districtFeatures.features)
        .enter()
        .append("path")
        .attr("class", (d: any) => {
          const { stateCode, district } = d.properties;
          const key = `${stateCode}-${district}`;
          const race = houseByStateDistrict[key];
          return `map-district${race && selectedDistrictId === race.id ? " selected" : ""}`;
        })
        .attr("d", path as any)
        .attr("fill", (d: any) => {
          const { stateCode, district } = d.properties;
          return getDistrictColor(stateCode, district);
        })
        .attr("opacity", (d: any) => {
          if (!searchHighlight) return 1;
          const { stateCode, district } = d.properties;
          return searchHighlight.has(`${stateCode}-${district}`) ? 1 : DIM_OPACITY;
        })
        .attr("stroke", "#0d1117")
        .attr("stroke-width", 0.3)
        .on("mouseover", function (event: MouseEvent, d: any) {
          d3.select(this).attr("opacity", 0.8).attr("filter", "brightness(1.2)");
          const { stateCode, district, districtLabel } = d.properties;
          const key = `${stateCode}-${district}`;
          const race = houseByStateDistrict[key];
          let content = `${stateCode}-${districtLabel === "AL" ? "AL" : districtLabel}`;
          if (race) {
            content = `${race.stateName} — ${districtLabel === "AL" ? "At-Large" : `District ${district}`}`;
            if (race.rating) content += `\n${race.rating}`;
            if (race.incumbent) content += `\n${race.incumbent} (${race.incumbentParty})`;
          }
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 10, content });
        })
        .on("mousemove", function (event: MouseEvent) {
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 10 } : null);
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", 1).attr("filter", null);
          setTooltip(null);
        })
        .on("click", function (_event: MouseEvent, d: any) {
          const { stateCode, district } = d.properties;
          const key = `${stateCode}-${district}`;
          const race = houseByStateDistrict[key];
          if (race && onDistrictClickRef.current) onDistrictClickRef.current(race);
        });

      // State borders on top of districts
      g.append("path")
        .datum(stateMesh)
        .attr("fill", "none")
        .attr("stroke", "#1a1f2e")
        .attr("stroke-width", 1.2)
        .attr("d", path as any);

      // Outer nation border
      // @ts-ignore
      const nationFeature = topojson.feature(statesData, statesData.objects.nation);
      g.append("path")
        // @ts-ignore
        .datum(nationFeature)
        .attr("fill", "none")
        .attr("stroke", "#2a3040")
        .attr("stroke-width", 1.5)
        .attr("d", path as any);

    } else {
      // ── Senate / Redistricting view: render states ───────────────────────────
      g.selectAll(".map-state")
        // @ts-ignore
        .data(stateFeatures.features)
        .enter()
        .append("path")
        .attr("class", (d: any) => {
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          return `map-state${code === selectedStateCode ? " selected" : ""}`;
        })
        .attr("d", path as any)
        .attr("fill", (d: any) => {
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          return getStateColor(code);
        })
        .attr("stroke", "#1a1f2e")
        .attr("stroke-width", 0.5)
        .attr("opacity", (d: any) => {
          if (!searchHighlight) return 1;
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          return searchHighlight.has(code) ? 1 : DIM_OPACITY;
        })
        .on("mouseover", function (event: MouseEvent, d: any) {
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          d3.select(this).attr("opacity", 0.85).attr("filter", "brightness(1.15)");
          let content = code;
          if (view === "senate") {
            const race = senateByState[code];
            const sens = senatorsByState[code];
            if (race) {
              content = `${race.stateName} — ${race.rating || "No rating"}`;
              if (race.incumbent) content += `\n${race.incumbent} (${race.incumbentParty})`;
              // For split states, append both senators
              if (sens && sens.length >= 2) {
                const parties = sens.map(s => s.party);
                const isSplit = new Set(parties).size > 1;
                if (isSplit) {
                  const s1 = sens[0];
                  const s2 = sens[1];
                  content += `\n${s1.name} (${s1.party}) + ${s2.name} (${s2.party})`;
                }
              }
            } else if (sens && sens.length > 0) {
              // No 2026 race — show both senators and next race year
              const stateSens = senators.filter(s => s.stateCode === code);
              const stateName = stateSens[0]?.stateName || code;
              // Find the earliest next election year among the state's senators
              const nextYear = stateSens.reduce((min, s) => Math.min(min, s.nextElectionYear), 9999);
              content = `${stateName} — No 2026 Senate Race`;
              content += `\nNext race: ${nextYear === 9999 ? "Unknown" : nextYear}`;
              if (sens.length >= 2) {
                const s1 = sens[0];
                const s2 = sens[1];
                content += `\n${s1.name} (${s1.party}) · ${s2.name} (${s2.party})`;
              } else if (sens.length === 1) {
                content += `\n${sens[0].name} (${sens[0].party})`;
              }
            }
          } else if (view === "redistricting" && redistrictingByState[code]) {
            const r = redistrictingByState[code];
            content = `${r.stateName} — ${r.enacted ? "Enacted" : "Pending"}`;
          }
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 10, content });
        })
        .on("mousemove", function (event: MouseEvent) {
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 10 } : null);
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", 1).attr("filter", null);
          setTooltip(null);
        })
        .on("click", function (_event: MouseEvent, d: any) {
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          if (code && onStateClickRef.current) onStateClickRef.current(code);
        });

      // State borders
      g.append("path")
        .datum(stateMesh)
        .attr("fill", "none")
        .attr("stroke", "#0d1117")
        .attr("stroke-width", 0.8)
        .attr("d", path as any);

      // ── Party split/unified indicators (senate view only) ──────────────────
      if (view === "senate" && senators.length > 0) {
        // Build per-state senator data (name + party)
        const stateParties: Record<string, { name: string; party: string }[]> = {};
        for (const s of senators) {
          if (!stateParties[s.stateCode]) stateParties[s.stateCode] = [];
          stateParties[s.stateCode].push({ name: s.name, party: s.party });
        }

        // Render indicator group for each state
        // @ts-ignore
        stateFeatures.features.forEach((d: any) => {
          const fips = String(d.id).padStart(2, "0");
          const code = FIPS_TO_STATE[fips];
          if (!code) return;
          const sens = stateParties[code];
          if (!sens || sens.length < 2) return;

          const centroid = path.centroid(d);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

          const partyList = sens.map(s => s.party);
          const isSplit = new Set(partyList).size > 1;
          const cx = centroid[0];
          const cy = centroid[1];
          const r = 4;

          if (isSplit) {
            // Split: solid purple circle
            g.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", r)
              .attr("fill", "#8b5cf6")
              .attr("opacity", 0.95)
              .attr("stroke", "#0d1117")
              .attr("stroke-width", 0.8)
              .attr("pointer-events", "none");
          } else {
            // Unified: single solid circle
            const party = partyList[0];
            const color = party === "D" ? "#3b82f6" : party === "R" ? "#ef4444" : "#9ca3af";
            g.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", r)
              .attr("fill", color)
              .attr("opacity", 0.9)
              .attr("stroke", "#0d1117")
              .attr("stroke-width", 0.8)
              .attr("pointer-events", "none");
          }
        });
      }
    }

    // Add zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Reset zoom on view change
    svg.call(zoom.transform, d3.zoomIdentity);

  }, [statesData, districtsData, view, senateRaces, houseRaces, redistrictingStates, senators, selectedStateCode, selectedDistrictId, getStateColor, getDistrictColor, getStateSplitInfo, houseByStateDistrict, searchHighlight]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: "#0d1117" }}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover border border-border rounded px-2 py-1 text-xs text-popover-foreground shadow-lg z-10 whitespace-pre-line"
          style={{ left: tooltip.x + 12, top: tooltip.y - 30, maxWidth: 220 }}
        >
          {tooltip.content}
        </div>
      )}
      {view === "house" && (
        <div className="absolute bottom-12 right-3 bg-card/80 backdrop-blur border border-border rounded px-2 py-1 text-xs text-muted-foreground pointer-events-none">
          Scroll to zoom · Click district for details
        </div>
      )}

      {/* Party split/unified legend for senate view */}
      {view === "senate" && (
        <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground pointer-events-none shadow-lg">
          <p className="font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide text-[10px]">Senator Composition</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-black/30 flex-shrink-0" />
              <span>Unified Democrat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-black/30 flex-shrink-0" />
              <span>Unified Republican</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: "#8b5cf6", border: "1px solid rgba(0,0,0,0.3)" }} />
              <span>Split (D + R)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)", background: "repeating-linear-gradient(45deg, #3b82f699 0px, #3b82f699 4px, #ef444499 4px, #ef444499 8px), #1e2433" }} />
              <span>No 2026 Race</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
