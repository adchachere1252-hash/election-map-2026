/**
 * Congressional Historical Map Atlas
 * Full-screen interactive map showing U.S. congressional district boundaries
 * for every Congress from the 89th (1965) through 119th (2025).
 * Design: transparent SVG map floating over animated sky video background.
 * Party data: Voteview / Clerk of the House / Wikipedia
 * District boundaries: Jeffrey B. Lewis et al. (cdmaps.polisci.ucla.edu)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { LEWIS_MANIFEST } from "@/lib/lewisManifest";

// ─── Congress metadata ────────────────────────────────────────────────────────
const CONGRESS_START = 89;
const CONGRESS_END = 119;

function congressYears(n: number): [number, number] {
  const start = 1963 + (n - 88) * 2;
  return [start, start + 1];
}
function ordinal(n: number): string {
  if (n === 11 || n === 12 || n === 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Party seat composition per Congress (House) ─────────────────────────────
// Source: Clerk of the House / Voteview / Wikipedia
const HOUSE_SEATS: Record<number, { D: number; R: number; O: number }> = {
  89: { D: 295, R: 140, O: 0 }, 90: { D: 248, R: 187, O: 0 },
  91: { D: 243, R: 192, O: 0 }, 92: { D: 255, R: 180, O: 0 },
  93: { D: 242, R: 192, O: 1 }, 94: { D: 291, R: 144, O: 0 },
  95: { D: 292, R: 143, O: 0 }, 96: { D: 277, R: 158, O: 0 },
  97: { D: 243, R: 192, O: 0 }, 98: { D: 269, R: 166, O: 0 },
  99: { D: 253, R: 182, O: 0 }, 100: { D: 258, R: 177, O: 0 },
  101: { D: 260, R: 175, O: 0 }, 102: { D: 267, R: 167, O: 1 },
  103: { D: 258, R: 176, O: 1 }, 104: { D: 204, R: 230, O: 1 },
  105: { D: 207, R: 227, O: 1 }, 106: { D: 211, R: 223, O: 1 },
  107: { D: 212, R: 221, O: 2 }, 108: { D: 205, R: 229, O: 1 },
  109: { D: 202, R: 232, O: 1 }, 110: { D: 233, R: 202, O: 0 },
  111: { D: 257, R: 178, O: 0 }, 112: { D: 193, R: 242, O: 0 },
  113: { D: 201, R: 234, O: 0 }, 114: { D: 188, R: 247, O: 0 },
  115: { D: 194, R: 241, O: 0 }, 116: { D: 235, R: 199, O: 1 },
  117: { D: 222, R: 213, O: 0 }, 118: { D: 213, R: 222, O: 0 },
  119: { D: 215, R: 220, O: 1 },
};

// ─── Timeline milestones ──────────────────────────────────────────────────────
const MILESTONES: { congress: number; label: string }[] = [
  { congress: 89, label: "VRA" },
  { congress: 93, label: "Nixon" },
  { congress: 97, label: "Reagan" },
  { congress: 104, label: "Gingrich" },
  { congress: 111, label: "Obama" },
  { congress: 112, label: "Tea Party" },
  { congress: 119, label: "119th" },
];

// ─── Sky video config ─────────────────────────────────────────────────────────
const SKY_VIDEOS = [
  { label: "Dawn", hours: [5, 6], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dawn_bf4762d3.mp4" },
  { label: "Morning", hours: [7, 9], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-morning_4e02649d.mp4" },
  { label: "Midday", hours: [10, 14], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-midday_190395b8.mp4" },
  { label: "Afternoon", hours: [15, 16], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-afternoon_a64ba7ff.mp4" },
  { label: "Evening", hours: [17, 18], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-evening_8fcbd657.mp4" },
  { label: "Dusk", hours: [19, 20], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dusk_c5616f3b.mp4" },
  { label: "Night", hours: [21, 4], url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-night_221c4237.mp4" },
];

function getSkyVideo() {
  const h = new Date().getHours();
  for (const v of SKY_VIDEOS) {
    const [a, b] = v.hours;
    if (a <= b ? h >= a && h <= b : h >= a || h <= b) return v;
  }
  return SKY_VIDEOS[2];
}

// ─── US states list ───────────────────────────────────────────────────────────
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

// ─── GeoJSON cache ────────────────────────────────────────────────────────────
const geoCache = new Map<string, GeoJSON.FeatureCollection>();

async function fetchStateGeoJson(stateName: string, congress: number): Promise<GeoJSON.FeatureCollection | null> {
  const key = `${stateName}-${congress}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  const files = LEWIS_MANIFEST[stateName];
  if (!files) return null;
  const file = files.find(f => congress >= f.start && congress <= f.end);
  if (!file) return null;
  // Use server-side proxy to avoid CORS restrictions in browser sandbox
  const url = `/api/geojson/${file.name}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as GeoJSON.FeatureCollection;
    geoCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

// ─── D3 Map Panel ─────────────────────────────────────────────────────────────
interface D3MapPanelProps {
  congress: number;
  panelId: "A" | "B";
  compareMode: boolean;
  onZoomChange?: (transform: d3.ZoomTransform) => void;
  externalTransform?: d3.ZoomTransform | null;
  selectedState: string;
  onDistrictClick?: (props: Record<string, unknown>) => void;
}

function D3MapPanel({
  congress,
  panelId,
  compareMode,
  onZoomChange,
  externalTransform,
  selectedState,
  onDistrictClick,
}: D3MapPanelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Wrapper must be transparent to show sky video through the SVG
  const gRef = useRef<SVGGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathRef = useRef<d3.GeoPath | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const suppressSync = useRef(false);
  const [districtCount, setDistrictCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [d3Ready, setD3Ready] = useState(false);

  // Initialize D3 when wrapper has real dimensions
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const initD3 = (width: number, height: number) => {
      if (gRef.current) return; // already initialized
      if (width < 10 || height < 10) return;
      const svg = svgRef.current!;
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      const projection = d3.geoAlbersUsa()
        .scale(width * 1.1)
        .translate([width / 2, height / 2]);
      projectionRef.current = projection;
      pathRef.current = d3.geoPath().projection(projection);
      const g = d3.select(svg).append("g");
      gRef.current = g.node();
      console.log(`[D3MapPanel ${panelId}] init: ${width}x${height}`);
      // Load base state outlines
      fetch("/states-10m.json")
        .then(r => r.json())
        .then((us: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const usTyped = us as any;
          const stateFeatures = topojson.feature(usTyped, usTyped.objects.states) as unknown as GeoJSON.FeatureCollection;
          const stateMesh = topojson.mesh(usTyped, usTyped.objects.states, (a: unknown, b: unknown) => a !== b);
          g.append("g").attr("class", "base-states")
            .selectAll("path")
            .data(stateFeatures.features)
            .join("path")
            .attr("class", "state-bg")
            .attr("d", pathRef.current as unknown as string)
            .attr("fill", "rgba(255,255,255,0.06)")
            .attr("stroke", "none");
          g.append("path")
            .attr("class", "state-borders")
            .datum(stateMesh as unknown as GeoJSON.Feature)
            .attr("d", pathRef.current as unknown as string)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,255,255,0.35)")
            .attr("stroke-width", "0.5");
        });
      // Zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.8, 20])
        .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr("transform", event.transform.toString());
          if (!suppressSync.current && onZoomChange) {
            onZoomChange(event.transform);
          }
        });
      zoomRef.current = zoom;
      d3.select(svg).call(zoom);
      setD3Ready(true);
    };

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      initD3(width, height);
    });
    ro.observe(wrapper);
    // Also try immediately — ResizeObserver may not fire if element already has size
    const rect = wrapper.getBoundingClientRect();
    initD3(rect.width, rect.height);
    return () => ro.disconnect();
  }, [panelId]);

  // Apply external zoom transform (sync mode)
  useEffect(() => {
    if (!externalTransform || !svgRef.current || !zoomRef.current) return;
    suppressSync.current = true;
    d3.select(svgRef.current).call(zoomRef.current.transform, externalTransform);
    suppressSync.current = false;
  }, [externalTransform]);

  // Load district GeoJSON when congress or d3Ready changes
  useEffect(() => {
    if (!d3Ready || !gRef.current || !pathRef.current) return;
    const g = d3.select(gRef.current);
    g.selectAll(".district-layer").remove();
    setDistrictCount(0);
    setIsLoading(true);
    const districtGroup = g.append("g").attr("class", "district-layer");
    let total = 0;
    let cancelled = false;
    const localPath = pathRef.current;
    const statesToLoad = selectedState ? [selectedState] : US_STATES;
    (async () => {
      for (const state of statesToLoad) {
        if (cancelled) break;
        const data = await fetchStateGeoJson(state, congress);
        if (!data || cancelled) continue;
        districtGroup.selectAll(`.d-${state.replace(/\s/g, "_")}`)
          .data(data.features)
          .join("path")
          .attr("class", `district d-${state.replace(/\s/g, "_")}`)
          .attr("d", (f: GeoJSON.Feature) => localPath(f) ?? "")
          .attr("fill", (f: GeoJSON.Feature) => {
            const p = f.properties as Record<string, unknown>;
            const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
            // Alternate subtle colors for visual distinction between adjacent districts
            // Keep very transparent so sky video background shows through
            return dist % 2 === 0 ? "rgba(40,100,200,0.08)" : "rgba(20,60,160,0.05)";
          })
          .attr("stroke", "rgba(100,160,255,0.7)")
          .attr("stroke-width", "0.5")
          .style("cursor", "pointer")
          .on("click", (_event: MouseEvent, f: GeoJSON.Feature) => {
            if (onDistrictClick) onDistrictClick(f.properties as Record<string, unknown>);
          });
        total += data.features.length;
        setDistrictCount(total);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [d3Ready, congress, selectedState]);

  // Zoom to selected state
  useEffect(() => {
    if (!selectedState || !d3Ready || !svgRef.current || !zoomRef.current || !pathRef.current || !gRef.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    const stateData = geoCache.get(`${selectedState}-${congress}`);
    if (!stateData) return;
    const bounds = pathRef.current.bounds({ type: "FeatureCollection", features: stateData.features } as GeoJSON.FeatureCollection);
    if (bounds[0][0] === Infinity) return;
    const [[x0, y0], [x1, y1]] = bounds;
    const bw = x1 - x0, bh = y1 - y0;
    const scale = Math.min(8, 0.85 / Math.max(bw / w, bh / h));
    const tx = w / 2 - scale * (x0 + bw / 2);
    const ty = h / 2 - scale * (y0 + bh / 2);
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
    d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, t);
  }, [selectedState, d3Ready, congress]);

  const seats = HOUSE_SEATS[congress] ?? { D: 0, R: 0, O: 0 };
  const total = seats.D + seats.R + seats.O;

  return (
    <div ref={wrapperRef} className="relative flex-1 w-full h-full min-h-0 overflow-hidden" style={{ background: 'transparent' }}>
      <svg
        ref={svgRef}
        style={{ position: "absolute", top: 0, left: 0, background: "transparent", width: "100%", height: "100%" }}
      />
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-3 left-3 text-xs font-mono text-white/60 bg-black/30 px-2 py-1 rounded">
          {districtCount} districts loaded…
        </div>
      )}
      {!isLoading && (
        <div className="absolute bottom-3 left-3 text-xs font-mono text-white/50 bg-black/20 px-2 py-1 rounded">
          {districtCount} districts loaded
        </div>
      )}
      {/* Party seats legend */}
      {!compareMode && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/10">
          <div className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-semibold">Party Seats</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm bg-[#4285F4]" />
            <span className="text-white/80">Democrat</span>
            <span className="ml-auto font-bold text-[#4285F4]">{seats.D}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm bg-[#EA4335]" />
            <span className="text-white/80">Republican</span>
            <span className="ml-auto font-bold text-[#EA4335]">{seats.R}</span>
          </div>
          {seats.O > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm bg-[#9B59B6]" />
              <span className="text-white/80">Split / Ind.</span>
              <span className="ml-auto font-bold text-[#9B59B6]">{seats.O}</span>
            </div>
          )}
          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
            <span className="text-white/50 uppercase text-[10px]">Total</span>
            <span className="font-bold">{total}</span>
          </div>
        </div>
      )}
      {/* Panel label in compare mode */}
      {compareMode && (
        <div className="absolute top-3 left-3 text-xs font-mono text-white/50 bg-black/30 px-2 py-1 rounded uppercase tracking-widest">
          {panelId === "A" ? "LEFT" : "RIGHT"}
        </div>
      )}
      {/* Compare mode seats */}
      {compareMode && (
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/70 border border-white/10">
          <span className="text-[#4285F4] font-bold">{seats.D}</span>
          <span className="text-white/30 mx-1">D</span>
          <span className="text-white/30 mx-1">·</span>
          <span className="text-[#EA4335] font-bold">{seats.R}</span>
          <span className="text-white/30 mx-1">R</span>
          {seats.O > 0 && <><span className="text-white/30 mx-1">·</span><span className="text-[#9B59B6] font-bold">{seats.O}</span><span className="text-white/30 mx-1">O</span></>}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapComparison() {
  const [congressA, setCongressA] = useState(CONGRESS_END);
  const [congressB, setCongressB] = useState(CONGRESS_START);
  const [compareMode, setCompareMode] = useState(false);
  const [synced, setSynced] = useState(true);
  const [selectedState, setSelectedState] = useState("");
  const [districtPopup, setDistrictPopup] = useState<Record<string, unknown> | null>(null);
  const [transformA, setTransformA] = useState<d3.ZoomTransform | null>(null);
  const [transformB, setTransformB] = useState<d3.ZoomTransform | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const playIntervalA = useRef<ReturnType<typeof setInterval> | null>(null);
  const playIntervalB = useRef<ReturnType<typeof setInterval> | null>(null);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  const sky = getSkyVideo();

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Play animation for Panel A
  useEffect(() => {
    if (isPlayingA) {
      playIntervalA.current = setInterval(() => {
        setCongressA(prev => {
          if (prev >= CONGRESS_END) { setIsPlayingA(false); return prev; }
          return prev + 1;
        });
      }, 800);
    } else {
      if (playIntervalA.current) clearInterval(playIntervalA.current);
    }
    return () => { if (playIntervalA.current) clearInterval(playIntervalA.current); };
  }, [isPlayingA]);

  // Play animation for Panel B
  useEffect(() => {
    if (isPlayingB) {
      playIntervalB.current = setInterval(() => {
        setCongressB(prev => {
          if (prev >= CONGRESS_END) { setIsPlayingB(false); return prev; }
          return prev + 1;
        });
      }, 800);
    } else {
      if (playIntervalB.current) clearInterval(playIntervalB.current);
    }
    return () => { if (playIntervalB.current) clearInterval(playIntervalB.current); };
  }, [isPlayingB]);

  const handleZoomA = useCallback((t: d3.ZoomTransform) => {
    if (synced) setTransformB(t);
  }, [synced]);

  const handleZoomB = useCallback((t: d3.ZoomTransform) => {
    if (synced) setTransformA(t);
  }, [synced]);

  const congressList = Array.from({ length: CONGRESS_END - CONGRESS_START + 1 }, (_, i) => CONGRESS_START + i);
  const totalCongresses = CONGRESS_END - CONGRESS_START;

  function sliderPct(congress: number) {
    return ((congress - CONGRESS_START) / totalCongresses) * 100;
  }

  const [yearsA] = congressYears(congressA);
  const [yearsB] = congressYears(congressB);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: '#000' }}>
      {/* Sky video background */}
      <video
        key={sky.url}
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src={sky.url} type="video/mp4" />
      </video>
      {/* Dark overlay for readability */}
      <div className="absolute inset-0" style={{ zIndex: 1, background: 'rgba(0,0,0,0.15)' }} />

      {/* ── Header ── */}
      <header
        className="relative flex items-center gap-3 px-4 h-11 shrink-0 border-b border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-white font-semibold text-sm tracking-tight">Congressional Historical Map Atlas</span>
          <span className="text-white/40 text-xs ml-1">{ordinal(CONGRESS_START)} – {ordinal(CONGRESS_END)} Congress · 1965–2025</span>
        </div>
        <div className="flex-1" />
        {/* Jump to state */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs uppercase tracking-widest">Jump to State</span>
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-1 focus:outline-none"
          >
            <option value="">Select state…</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {selectedState && (
            <button onClick={() => setSelectedState("")} className="text-white/50 hover:text-white text-xs">✕</button>
          )}
        </div>
        {/* Compare toggle */}
        <button
          onClick={() => setCompareMode(m => !m)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition-colors ${
            compareMode
              ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
              : "bg-white/10 border-white/20 text-white/70 hover:text-white"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
          COMPARE
        </button>
        {/* Sync toggle (compare mode only) */}
        {compareMode && (
          <button
            onClick={() => setSynced(s => !s)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
              synced ? "bg-white/15 border-white/30 text-white" : "bg-transparent border-white/10 text-white/40"
            }`}
            title={synced ? "Synced pan/zoom" : "Independent pan/zoom"}
          >
            {synced ? "🔒" : "🔓"} {synced ? "Synced" : "Unsynced"}
          </button>
        )}
        {/* Clock & sky */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-white/60 text-xs font-mono">{clock}</span>
          <span className="text-amber-300 text-xs font-semibold uppercase tracking-widest">✦ {sky.label}</span>
        </div>
        {/* Back link */}
        <Link href="/" className="text-white/40 hover:text-white/80 text-xs ml-2 transition-colors">← Election Map</Link>
      </header>

      {/* ── Congress selector bar ── */}
      <div
        className="relative shrink-0 flex items-stretch border-b border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      >
        {/* Panel A selector */}
        <div className={`flex items-center gap-4 px-5 py-2 ${compareMode ? "flex-1 border-r border-white/10" : "flex-1"}`}>
          <div className="flex flex-col">
            <span className="text-amber-400 text-3xl font-black leading-none">{ordinal(congressA)}</span>
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Congress</span>
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px] uppercase tracking-widest">Select Congress</span>
              <span className="text-white/30 text-xs ml-auto">{yearsA}–{yearsA + 1}</span>
            </div>
            <select
              value={congressA}
              onChange={e => setCongressA(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none"
            >
              {congressList.map(n => {
                const [y] = congressYears(n);
                return <option key={n} value={n}>{ordinal(n)} Congress ({y}–{y + 1})</option>;
              })}
            </select>
          </div>
          <span className="text-white/30 text-xs font-mono self-end pb-1">PANEL {compareMode ? "A" : ""}</span>
        </div>
        {/* Panel B selector (compare mode only) */}
        {compareMode && (
          <div className="flex items-center gap-4 px-5 py-2 flex-1">
            <div className="flex flex-col">
              <span className="text-red-400 text-3xl font-black leading-none">{ordinal(congressB)}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Congress</span>
            </div>
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-[10px] uppercase tracking-widest">Select Congress</span>
                <span className="text-white/30 text-xs ml-auto">{yearsB}–{yearsB + 1}</span>
              </div>
              <select
                value={congressB}
                onChange={e => setCongressB(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none"
              >
                {congressList.map(n => {
                  const [y] = congressYears(n);
                  return <option key={n} value={n}>{ordinal(n)} Congress ({y}–{y + 1})</option>;
                })}
              </select>
            </div>
            <span className="text-white/30 text-xs font-mono self-end pb-1">PANEL B</span>
          </div>
        )}
      </div>

      {/* ── Map panels ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 5, background: 'transparent' }}>
        <D3MapPanel
          congress={congressA}
          panelId="A"
          compareMode={compareMode}
          onZoomChange={handleZoomA}
          externalTransform={synced && compareMode ? transformB : null}
          selectedState={selectedState}
          onDistrictClick={setDistrictPopup}
        />
        {compareMode && (
          <>
            <div className="w-px bg-white/20 shrink-0" />
            <D3MapPanel
              congress={congressB}
              panelId="B"
              compareMode={compareMode}
              onZoomChange={handleZoomB}
              externalTransform={synced && compareMode ? transformA : null}
              selectedState={selectedState}
              onDistrictClick={setDistrictPopup}
            />
          </>
        )}
      </div>

      {/* ── Timeline slider(s) ── */}
      <div
        className="relative shrink-0 px-6 pt-3 pb-4 border-t border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      >
        {/* Panel A slider */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => { setIsPlayingA(p => !p); if (congressA >= CONGRESS_END) setCongressA(CONGRESS_START); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 hover:bg-amber-500/30 transition-colors shrink-0"
            title={isPlayingA ? "Pause" : "Play animation"}
          >
            {isPlayingA ? "⏸" : "▶"}
          </button>
          <div className="flex-1 relative">
            {/* Milestone ticks */}
            <div className="absolute -top-4 left-0 right-0 flex pointer-events-none">
              {MILESTONES.map(m => (
                <div
                  key={m.congress}
                  className="absolute text-[9px] text-amber-300/60 font-semibold uppercase tracking-widest"
                  style={{ left: `${sliderPct(m.congress)}%`, transform: "translateX(-50%)" }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Milestone dots */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex pointer-events-none" style={{ height: "2px" }}>
              {MILESTONES.map(m => (
                <div
                  key={m.congress}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/50 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${sliderPct(m.congress)}%`, top: "50%" }}
                />
              ))}
            </div>
            <input
              type="range"
              min={CONGRESS_START}
              max={CONGRESS_END}
              value={congressA}
              onChange={e => { setCongressA(Number(e.target.value)); setIsPlayingA(false); }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #F59E0B ${sliderPct(congressA)}%, rgba(255,255,255,0.15) ${sliderPct(congressA)}%)`,
                accentColor: "#F59E0B",
              }}
            />
          </div>
          <span className="text-amber-400 text-sm font-bold w-12 text-right shrink-0">{ordinal(congressA)}</span>
        </div>
        {/* Panel B slider (compare mode only) */}
        {compareMode && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { setIsPlayingB(p => !p); if (congressB >= CONGRESS_END) setCongressB(CONGRESS_START); }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 transition-colors shrink-0"
              title={isPlayingB ? "Pause" : "Play animation"}
            >
              {isPlayingB ? "⏸" : "▶"}
            </button>
            <div className="flex-1 relative">
              <div className="absolute -top-4 left-0 right-0 flex pointer-events-none">
                {MILESTONES.map(m => (
                  <div
                    key={m.congress}
                    className="absolute text-[9px] text-red-300/50 font-semibold uppercase tracking-widest"
                    style={{ left: `${sliderPct(m.congress)}%`, transform: "translateX(-50%)" }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex pointer-events-none" style={{ height: "2px" }}>
                {MILESTONES.map(m => (
                  <div
                    key={m.congress}
                    className="absolute w-1.5 h-1.5 rounded-full bg-red-400/50 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${sliderPct(m.congress)}%`, top: "50%" }}
                  />
                ))}
              </div>
              <input
                type="range"
                min={CONGRESS_START}
                max={CONGRESS_END}
                value={congressB}
                onChange={e => { setCongressB(Number(e.target.value)); setIsPlayingB(false); }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #EF4444 ${sliderPct(congressB)}%, rgba(255,255,255,0.15) ${sliderPct(congressB)}%)`,
                  accentColor: "#EF4444",
                }}
              />
            </div>
            <span className="text-red-400 text-sm font-bold w-12 text-right shrink-0">{ordinal(congressB)}</span>
          </div>
        )}
        {/* Attribution */}
        <div className="mt-2 text-[10px] text-white/30 text-center">
          District boundaries: Jeffrey B. Lewis, Brandon DeVine, Lincoln Pitcher &amp; Kenneth C. Martis · cdmaps.polisci.ucla.edu · Party data: Voteview / UCLA
        </div>
      </div>

      {/* ── District click popup ── */}
      {districtPopup && (
        <div
          className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-white text-sm shadow-2xl"
          style={{ zIndex: 20, minWidth: 240 }}
        >
          <button
            onClick={() => setDistrictPopup(null)}
            className="absolute top-2 right-3 text-white/40 hover:text-white text-lg leading-none"
          >×</button>
          <div className="font-bold text-base mb-1">
            {String(districtPopup.statename ?? districtPopup.STATENAME ?? "Unknown State")}
            {" — District "}
            {String(districtPopup.district ?? districtPopup.DISTRICT ?? "?")}
          </div>
          <div className="text-white/60 text-xs">
            {ordinal(Number(districtPopup.startcong ?? districtPopup.STARTCONG ?? 0))}–
            {ordinal(Number(districtPopup.endcong ?? districtPopup.ENDCONG ?? 0))} Congress
          </div>
          {Boolean(districtPopup.startcong || districtPopup.STARTCONG) && (
            <div className="text-white/40 text-xs mt-0.5">
              {String(congressYears(Number(districtPopup.startcong ?? districtPopup.STARTCONG))[0])}–
              {String(congressYears(Number(districtPopup.endcong ?? districtPopup.ENDCONG ?? districtPopup.startcong ?? districtPopup.STARTCONG))[1])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
