import { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import type React from "react";
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

export interface GovernorMapHandle {
  resetZoom: () => void;
  zoomToState: (stateCode: string) => void;
}

interface GovernorMapProps {
  governorRaces: GovernorRace[];
  onStateClick?: (stateCode: string) => void;
  selectedStateCode?: string | null;
  /** Whether to render state abbreviation labels on the map */
  showLabels?: boolean;
}

const GovernorMap = forwardRef(function GovernorMap({
  governorRaces,
  onStateClick,
  selectedStateCode,
  showLabels = true,
}: GovernorMapProps, ref: React.ForwardedRef<GovernorMapHandle>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const savedTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const pendingZoomRef = useRef<d3.ZoomTransform | null>(null);
  const pathRef = useRef<d3.GeoPath | null>(null);
  const stateFeaturesRef = useRef<any>(null);
  const [statesData, setStatesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const onStateClickRef = useRef(onStateClick);
  useEffect(() => { onStateClickRef.current = onStateClick; }, [onStateClick]);

  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition().duration(600)
        .call(zoomRef.current.transform as any, d3.zoomIdentity);
      savedTransformRef.current = d3.zoomIdentity;
      setIsZoomed(false);
    }
  }, []);

  const zoomToState = useCallback((stateCode: string) => {
    if (!svgRef.current || !zoomRef.current || !pathRef.current || !stateFeaturesRef.current) return;
    const fips = Object.entries(FIPS_TO_STATE).find(([, code]) => code === stateCode)?.[0];
    if (!fips) return;
    const feature = stateFeaturesRef.current.features.find((d: any) => String(d.id).padStart(2, '0') === fips);
    if (!feature) return;
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 500;
    const [[x0, y0], [x1, y1]] = pathRef.current.bounds(feature);
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;
    const scale = Math.min(8, 0.9 / Math.max(bw / width, bh / height));
    const tx = width / 2 - scale * (x0 + bw / 2);
    const ty = height / 2 - scale * (y0 + bh / 2);
    const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    savedTransformRef.current = targetTransform;
    pendingZoomRef.current = targetTransform;
    d3.select(svgEl)
      .transition().duration(650)
      .call(zoomRef.current.transform as any, targetTransform);
    setIsZoomed(true);
  }, []);

  useImperativeHandle(ref, () => ({ resetZoom, zoomToState }), [resetZoom, zoomToState]);

  const zoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      const w = svgRef.current.clientWidth;
      const h = svgRef.current.clientHeight;
      d3.select(svgRef.current)
        .transition().duration(300)
        .call(zoomRef.current.scaleBy as any, 1.5, [w / 2, h / 2]);
    }
  };

  const zoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      const w = svgRef.current.clientWidth;
      const h = svgRef.current.clientHeight;
      d3.select(svgRef.current)
        .transition().duration(300)
        .call(zoomRef.current.scaleBy as any, 1 / 1.5, [w / 2, h / 2]);
    }
  };

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
    // Save current zoom transform before clearing so it can be restored
    const prevTransform = savedTransformRef.current;
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 960;
    const height = svgRef.current.clientHeight || 500;

    const projection = d3.geoAlbersUsa()
      .scale(width * 0.95)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    pathRef.current = path;

    // @ts-ignore
    const stateFeatures = topojson.feature(statesData, statesData.objects.states);
    stateFeaturesRef.current = stateFeatures;
    // @ts-ignore
    const stateMesh = topojson.mesh(statesData, statesData.objects.states, (a: any, b: any) => a !== b);

    // Stripe pattern for states with no 2026 governor race
    // Subtle: dark base with thin low-opacity red/blue lines — avoids optical illusion
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "no-gov-race-stripe")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 10)
      .attr("height", 10)
      .attr("patternTransform", "rotate(45)");
    // Dark neutral base
    pattern.append("rect")
      .attr("width", 10).attr("height", 10)
      .attr("fill", "#252b3b");
    // Thin blue line
    pattern.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", 3).attr("height", 10)
      .attr("fill", "#4a7fc1")
      .attr("opacity", "0.55");
    // Thin red line
    pattern.append("rect")
      .attr("x", 5).attr("y", 0)
      .attr("width", 3).attr("height", 10)
      .attr("fill", "#c04040")
      .attr("opacity", "0.55");

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
        // Apply zoom directly to the SVG element NOW, before React re-renders.
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        const bw = x1 - x0;
        const bh = y1 - y0;
        if (bw > 0 && bh > 0 && zoomRef.current && svgRef.current) {
          const scale = Math.min(8, 0.9 / Math.max(bw / width, bh / height));
          const tx = width / 2 - scale * (x0 + bw / 2);
          const ty = height / 2 - scale * (y0 + bh / 2);
          const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
          savedTransformRef.current = targetTransform;
          pendingZoomRef.current = targetTransform;
          d3.select(svgRef.current)
            .transition().duration(650)
            .call(zoomRef.current.transform as any, targetTransform);
        }
        if (code && onStateClickRef.current) onStateClickRef.current(code);
      });

    // State borders
    g.append("path")
      .datum(stateMesh)
      .attr("fill", "none")
      .attr("stroke", "#0d1117")
      .attr("stroke-width", 0.8)
      .attr("d", path as any);

    // ── State abbreviation labels for all 50 states ────────────────────────────────────────
    if (showLabels) {
    const CENTROID_NUDGE_GOV: Record<string, [number, number]> = {
      "MI": [6, 12], "FL": [8, -4], "LA": [-8, 0], "VA": [-4, 0], "NY": [0, 4],
      "ME": [-4, 0],   // nudge ME dot left to separate from VT dot
      "VT": [0, 0],    // VT callout goes left, dot stays at natural centroid
      "HI": [10, -8],
      "DE": [6, 2],   // nudge DE dot toward eastern edge
      "MD": [4, -2],  // nudge MD dot toward eastern edge
    };
    const NE_CALLOUTS_GOV: Record<string, { lx: number; ly: number; anchor?: string }> = {
      // ME is the top label — it's the largest/most northern NE state
      "ME": { lx:  62, ly: -60 },
      // VT is below ME — tiny state tucked left of ME's lower body
      "VT": { lx: -68, ly: -14, anchor: "end" },  // VT label sits just to the LEFT of Vermont
      "NH": { lx:  54, ly: -24 },
      "MA": { lx:  54, ly:   0 },
      "RI": { lx:  54, ly:  14 },
      "CT": { lx:  52, ly:  28 },
      "NJ": { lx:  46, ly:  42 },
      "DE": { lx:  42, ly:  56 },
      "MD": { lx:  36, ly:  70 },
      // Hawaii callout — leader line going down-right toward open ocean label
      "HI": { lx:  38, ly:  36, anchor: "start" },
    };
    // @ts-ignore
    stateFeatures.features.forEach((d: any) => {
      const fips = String(d.id).padStart(2, "0");
      const code = FIPS_TO_STATE[fips];
      if (!code) return;
      const centroid = path.centroid(d);
      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
      const nudge = CENTROID_NUDGE_GOV[code] ?? [0, 0];
      const cx = centroid[0] + nudge[0];
      const cy = centroid[1] + nudge[1];
      const callout = NE_CALLOUTS_GOV[code];
      if (callout) {
        const lx = cx + callout.lx;
        const ly = cy + callout.ly;
        const elbowX = cx + callout.lx * 0.55;
        g.append("polyline")
          .attr("points", `${cx},${cy} ${elbowX},${cy} ${lx},${ly}`)
          .attr("fill", "none")
          .attr("stroke", "rgba(255,255,255,0.45)")
          .attr("stroke-width", "0.7")
          .attr("pointer-events", "none");
        g.append("circle")
          .attr("cx", cx).attr("cy", cy).attr("r", 2.2)
          .attr("fill", "rgba(255,255,255,0.9)")
          .attr("stroke", "rgba(0,0,0,0.7)")
          .attr("stroke-width", "1px")
          .attr("pointer-events", "none");
        g.append("text")
          .attr("x", lx).attr("y", ly + 4)
          .attr("text-anchor", callout.anchor ?? "start")
          .attr("font-size", "8.5px")
          .attr("font-family", "system-ui, sans-serif")
          .attr("font-weight", "700")
          .attr("fill", "rgba(255,255,255,0.92)")
          .attr("stroke", "rgba(0,0,0,0.65)")
          .attr("stroke-width", "2.5px")
          .attr("paint-order", "stroke")
          .attr("pointer-events", "none")
          .text(code);
      } else {
        g.append("text")
          .attr("x", cx).attr("y", cy + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("font-family", "system-ui, sans-serif")
          .attr("font-weight", "700")
          .attr("fill", "rgba(255,255,255,0.92)")
          .attr("stroke", "rgba(0,0,0,0.65)")
          .attr("stroke-width", "2.8px")
          .attr("paint-order", "stroke")
          .attr("pointer-events", "none")
          .attr("letter-spacing", "0.02em")
          .text(code);
      }
    });
    } // end showLabels

    // Zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      // Explicit extent prevents D3 from reading SVG width/height SVGLength attributes
      // (which fail when the SVG uses CSS sizing only — NotSupportedError)
      .extent([[0, 0], [width, height]])
      .translateExtent([[-width * 0.5, -height * 0.5], [width * 1.5, height * 1.5]])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        savedTransformRef.current = event.transform;
        setIsZoomed(event.transform.k > 1.05);
      });
    zoomRef.current = zoom;
    svg.call(zoom);
    // Apply pending zoom (click-to-zoom) or restore saved transform after rebuild
    if (pendingZoomRef.current) {
      const t = pendingZoomRef.current;
      pendingZoomRef.current = null;
      svg.call(zoom.transform, d3.zoomIdentity);
      svg.transition().duration(650)
        .call(zoom.transform as any, t);
      setIsZoomed(true);
    } else if (prevTransform && prevTransform.k > 1.01) {
      svg.call(zoom.transform, prevTransform);
      g.attr("transform", prevTransform.toString());
      setIsZoomed(true);
    } else {
      svg.call(zoom.transform, d3.zoomIdentity);
      setIsZoomed(false);
    }

  }, [statesData, governorRaces, selectedStateCode, getStateColor, racingStates, raceByState, showLabels]);

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
        style={{ background: "transparent" }}
      />
      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center bg-card/90 backdrop-blur border border-border rounded-md text-foreground shadow-md hover:bg-card transition-colors text-base font-bold leading-none"
          title="Zoom in"
        >+</button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center bg-card/90 backdrop-blur border border-border rounded-md text-foreground shadow-md hover:bg-card transition-colors text-base font-bold leading-none"
          title="Zoom out"
        >−</button>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="w-8 h-8 flex items-center justify-center bg-card/90 backdrop-blur border border-border rounded-md text-foreground shadow-md hover:bg-card transition-colors"
            title="Reset zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h6M3 3v6M21 3h-6M21 3v6M3 21h6M3 21v-6M21 21h-6M21 21v-6"/>
            </svg>
          </button>
        )}
      </div>
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
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
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
            <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.2)", background: "repeating-linear-gradient(45deg, #252b3b 0px, #252b3b 2px, #4a7fc1 2px, #4a7fc1 5px, #252b3b 5px, #252b3b 7px, #c04040 7px, #c04040 10px)" }} />
            <span>No 2026 Race</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GovernorMap;
