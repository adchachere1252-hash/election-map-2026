import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { getRatingColor, getPartyColor } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState } from "../../../drizzle/schema";

type MapView = "senate" | "house" | "redistricting";

interface ElectionMapProps {
  view: MapView;
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  redistrictingStates: RedistrictingState[];
  onStateClick?: (stateCode: string) => void;
  onDistrictClick?: (raceId: number) => void;
  selectedStateCode?: string | null;
  selectedDistrictId?: number | null;
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

const STATE_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_STATE).map(([fips, code]) => [code, fips])
);

export default function ElectionMap({
  view,
  senateRaces,
  houseRaces,
  redistrictingStates,
  onStateClick,
  onDistrictClick,
  selectedStateCode,
  selectedDistrictId,
}: ElectionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [topoData, setTopoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Load topojson
  useEffect(() => {
    fetch("/states-10m.json")
      .then(r => r.json())
      .then(data => { setTopoData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build lookup maps
  const senateByState = Object.fromEntries(senateRaces.map(r => [r.stateCode, r]));
  const houseByState: Record<string, HouseRace[]> = {};
  for (const r of houseRaces) {
    if (!houseByState[r.stateCode]) houseByState[r.stateCode] = [];
    houseByState[r.stateCode].push(r);
  }
  const redistrictingByState = Object.fromEntries(redistrictingStates.map(r => [r.stateCode, r]));

  const getStateColor = useCallback((stateCode: string): string => {
    if (view === "senate") {
      const race = senateByState[stateCode];
      if (!race) return "#2a2f3a";
      if (race.calledParty) return getPartyColor(race.calledParty as any);
      return getRatingColor(race.rating as any);
    }
    if (view === "house") {
      const races = houseByState[stateCode] || [];
      if (races.length === 0) return "#2a2f3a";
      // For state view in house mode, show dominant party
      let d = 0, r = 0;
      for (const race of races) {
        if (race.calledParty === "D" || race.incumbentParty === "D") d++;
        else if (race.calledParty === "R" || race.incumbentParty === "R") r++;
      }
      if (d > r) return "#1a4fa0";
      if (r > d) return "#b22222";
      return "#c8a951";
    }
    if (view === "redistricting") {
      const state = redistrictingByState[stateCode];
      if (!state) return "#2a2f3a";
      return state.enacted ? "#4a7c59" : "#8b6914";
    }
    return "#2a2f3a";
  }, [view, senateByState, houseByState, redistrictingByState]);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 960;
    const height = svgRef.current.clientHeight || 500;

    const projection = d3.geoAlbersUsa()
      .scale(width * 1.25)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // @ts-ignore
    const states = topojson.feature(topoData, topoData.objects.states);
    // @ts-ignore
    const stateMesh = topojson.mesh(topoData, topoData.objects.states, (a, b) => a !== b);

    const g = svg.append("g");

    // Draw states
    g.selectAll(".map-state")
      // @ts-ignore
      .data(states.features)
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
      .on("mouseover", function (event: MouseEvent, d: any) {
        const fips = String(d.id).padStart(2, "0");
        const code = FIPS_TO_STATE[fips];
        d3.select(this).attr("opacity", 0.85).attr("filter", "brightness(1.15)");
        
        let content = code;
        if (view === "senate" && senateByState[code]) {
          const r = senateByState[code];
          content = `${r.stateName} — ${r.rating || "No rating"}`;
          if (r.incumbent) content += `\n${r.incumbent} (${r.incumbentParty})`;
        } else if (view === "redistricting" && redistrictingByState[code]) {
          const r = redistrictingByState[code];
          content = `${r.stateName} — ${r.enacted ? "Enacted" : "Pending"}`;
        } else if (view === "house" && houseByState[code]) {
          content = `${code} — ${houseByState[code].length} districts`;
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
        if (code && onStateClick) onStateClick(code);
      });

    // State borders
    g.append("path")
      .datum(stateMesh)
      .attr("fill", "none")
      .attr("stroke", "#0d1117")
      .attr("stroke-width", 0.8)
      .attr("d", path as any);

    // Add zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

  }, [topoData, view, senateRaces, houseRaces, redistrictingStates, selectedStateCode, getStateColor]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Loading map...</p>
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
          style={{ left: tooltip.x + 10, top: tooltip.y - 30, maxWidth: 200 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
