import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { getRatingColor } from "@/lib/electionUtils";

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

// States with no 2026 gubernatorial election
const NO_GOV_RACE_2026 = new Set([
  "AL", "AK", "AZ", "CA", "CO", "CT", "FL", "GA", "HI", "ID",
  "IL", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
  "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
  "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
].filter(() => false)); // Placeholder — will be computed from governorRaces

const NO_RACE_COLOR = "#1e2433";
const DIM_OPACITY = 0.18;

interface GovernorRace {
  id: number;
  stateCode: string;
  stateName: string;
  rating: string | null;
  incumbentName: string | null;
  incumbentParty: string | null;
  isOpen: boolean;
  isTermLimited: boolean;
  calledParty: string | null;
  demCandidate: string | null;
  repCandidate: string | null;
}

interface GovernorMapProps {
  governorRaces: GovernorRace[];
  onStateClick?: (stateCode: string) => void;
  selectedStateCode?: string | null;
}

export default function GovernorMap({
  governorRaces,
  onStateClick,
  selectedStateCode,
}: GovernorMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [statesData, setStatesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const onStateClickRef = useRef(onStateClick);
  useEffect(() => { onStateClickRef.current = onStateClick; }, [onStateClick]);

  // Load states topojson
  useEffect(() => {
    fetch("/states-10m.json")
      .then(r => r.json())
      .then(data => { setStatesData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build lookup by stateCode
  const raceByState = useMemo(() =>
    Object.fromEntries(governorRaces.map(r => [r.stateCode, r])),
    [governorRaces]
  );

  // Set of states WITH a 2026 governor race
  const racingStates = useMemo(() => new Set(governorRaces.map(r => r.stateCode)), [governorRaces]);

  const getStateColor = useCallback((stateCode: string): string => {
    const race = raceByState[stateCode];
    if (!race) return NO_RACE_COLOR;
    if (race.calledParty === "D") return "#1a4fa0";
    if (race.calledParty === "R") return "#b22222";
    return getRatingColor(race.rating as any);
  }, [raceByState]);

  // Main D3 render
  useEffect(() => {
    if (!statesData || !svgRef.current) return;

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

    // Stripe pattern for states with no 2026 governor race
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "no-gov-race-stripe")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 8)
      .attr("height", 8)
      .attr("patternTransform", "rotate(45)");
    pattern.append("rect")
      .attr("width", 8).attr("height", 8)
      .attr("fill", "#1e2433");
    pattern.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", 4).attr("height", 8)
      .attr("fill", "#3b82f633");
    pattern.append("rect")
      .attr("x", 4).attr("y", 0)
      .attr("width", 4).attr("height", 8)
      .attr("fill", "#ef444433");

    const g = svg.append("g");

    g.selectAll(".gov-state")
      // @ts-ignore
      .data(stateFeatures.features)
      .enter()
      .append("path")
      .attr("class", (d: any) => {
        const code = FIPS_TO_STATE[String(d.id).padStart(2, "0")];
        return `gov-state${code === selectedStateCode ? " selected" : ""}`;
      })
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const code = FIPS_TO_STATE[String(d.id).padStart(2, "0")];
        if (!racingStates.has(code)) return "url(#no-gov-race-stripe)";
        return getStateColor(code);
      })
      .attr("stroke", "#1a1f2e")
      .attr("stroke-width", 0.5)
      .on("mouseover", function (event: MouseEvent, d: any) {
        const code = FIPS_TO_STATE[String(d.id).padStart(2, "0")];
        d3.select(this).attr("opacity", 0.85).attr("filter", "brightness(1.15)");
        const race = raceByState[code];
        let content = code;
        if (race) {
          content = `${race.stateName} — ${race.rating || "No rating"}`;
          if (race.isOpen || race.isTermLimited) {
            content += `\nOpen Seat${race.isTermLimited ? " (Term-Limited)" : ""}`;
          } else if (race.incumbentName) {
            content += `\n${race.incumbentName} (${race.incumbentParty}) — Incumbent`;
          }
          if (race.demCandidate) content += `\nDem: ${race.demCandidate}`;
          if (race.repCandidate) content += `\nRep: ${race.repCandidate}`;
        } else {
          content = `${code} — No 2026 Governor Race`;
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
        const code = FIPS_TO_STATE[String(d.id).padStart(2, "0")];
        if (code && onStateClickRef.current) onStateClickRef.current(code);
      });

    // State borders
    g.append("path")
      .datum(stateMesh)
      .attr("fill", "none")
      .attr("stroke", "#0d1117")
      .attr("stroke-width", 0.8)
      .attr("d", path as any);

    // Rating dots — one per state with a 2026 governor race
    const RATING_DOT_COLORS: Record<string, string> = {
      "Solid D": "#1a4fa0",
      "Likely D": "#3b82f6",
      "Lean D": "#60a5fa",
      "Toss-up": "#c8a951",
      "Lean R": "#f87171",
      "Likely R": "#ef4444",
      "Solid R": "#b22222",
    };
    // @ts-ignore
    stateFeatures.features.forEach((d: any) => {
      const fips = String(d.id).padStart(2, "0");
      const code = FIPS_TO_STATE[fips];
      if (!code) return;
      const race = raceByState[code];
      if (!race) return; // no 2026 race — skip dot
      const centroid = path.centroid(d);
      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
      const cx = centroid[0];
      const cy = centroid[1];
      const r = 5;
      const dotColor = race.calledParty === "D" ? "#1a4fa0"
        : race.calledParty === "R" ? "#b22222"
        : RATING_DOT_COLORS[race.rating ?? ""] ?? "#c8a951";
      // Outer ring for open/term-limited seats
      if (race.isOpen || race.isTermLimited) {
        g.append("circle")
          .attr("cx", cx).attr("cy", cy)
          .attr("r", r + 2.5)
          .attr("fill", "none")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.2)
          .attr("opacity", 0.7)
          .attr("pointer-events", "none");
      }
      g.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", r)
        .attr("fill", dotColor)
        .attr("opacity", 0.95)
        .attr("stroke", "#0d1117")
        .attr("stroke-width", 0.8)
        .attr("pointer-events", "none");
    });

    // Zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => { g.attr("transform", event.transform.toString()); });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);

  }, [statesData, governorRaces, selectedStateCode, getStateColor, racingStates, raceByState]);

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
          style={{ left: tooltip.x + 12, top: tooltip.y - 30, maxWidth: 240 }}
        >
          {tooltip.content}
        </div>
      )}
      {/* Governor legend */}
      <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground pointer-events-none shadow-lg">
        <p className="font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide text-[10px]">Governor Race Rating</p>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#1a4fa0" }} />
            <span>Solid D</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#3b82f6" }} />
            <span>Likely D</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#c8a951" }} />
            <span>Toss-up</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
            <span>Likely R</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#b22222" }} />
            <span>Solid R</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/60" style={{ background: "transparent" }} />
            <span>Open / Term-Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "repeating-linear-gradient(45deg, #3b82f633 0px, #3b82f633 4px, #ef444433 4px, #ef444433 8px), #1e2433" }} />
            <span>No 2026 Race</span>
          </div>
        </div>
      </div>
    </div>
  );
}
