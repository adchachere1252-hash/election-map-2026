/**
 * Congressional Historical Map Atlas
 * Full-screen interactive map showing U.S. congressional district boundaries
 * for every Congress from the 89th (1965) through 119th (2025).
 * Uses D3 AlbersUSA projection — Alaska & Hawaii appear as insets, matching
 * the main House/Senate election map. No Leaflet, no tile layers.
 * Party data: Voteview / Clerk of the House
 * District boundaries: Jeffrey B. Lewis et al. (cdmaps.polisci.ucla.edu)
 */
import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Link } from "wouter";
import * as d3 from "d3";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";
import { STATE_CODES } from "@/lib/electionUtils";

// ─── Party colors matching the main election map ──────────────────────────────
const PARTY_FILL: Record<string, string> = {
  D: "#1a4fa0",
  R: "#b22222",
  I: "#7c3aed",
  unknown: "rgba(80,80,100,0.25)",
};
const PARTY_FILL_OPACITY: Record<string, number> = {
  D: 0.65, R: 0.65, I: 0.65, unknown: 0.18,
};
const PARTY_STROKE: Record<string, string> = {
  D: "#82aaff", R: "#ff7878", I: "#c896ff", unknown: "#aaaacc",
};

// ─── Voteview party data cache ────────────────────────────────────────────────
const partyCache = new Map<number, Record<string, string>>();
const membersCache = new Map<number, Record<string, { name: string; party: string; bioguide: string }>>();

async function fetchPartyData(congress: number): Promise<Record<string, string>> {
  if (partyCache.has(congress)) return partyCache.get(congress)!;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800 * attempt));
      const res = await fetch(`/api/voteview/${congress}`);
      if (!res.ok) continue;
      const data = await res.json() as Record<string, string>;
      if (Object.keys(data).length > 0) {
        partyCache.set(congress, data);
        return data;
      }
    } catch { /* retry */ }
  }
  return {};
}

async function fetchMembersData(congress: number): Promise<Record<string, { name: string; party: string; bioguide: string }>> {
  if (membersCache.has(congress)) return membersCache.get(congress)!;
  try {
    const res = await fetch(`/api/voteview/members/${congress}`);
    if (!res.ok) return {};
    const data = await res.json() as Record<string, { name: string; party: string; bioguide: string }>;
    membersCache.set(congress, data);
    return data;
  } catch { return {}; }
}

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
  { congress: 119, label: "119th" },
];

// ─── Play speed options ───────────────────────────────────────────────────────
const PLAY_SPEEDS = [
  { label: "Slow", ms: 3000 },
  { label: "Normal", ms: 1800 },
];

// ─── Sky video backgrounds ────────────────────────────────────────────────────
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
// Pending fetches by file name — deduplicate concurrent requests for the same file
const geoFetchInFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();

// Global semaphore: cap total concurrent GeoJSON HTTP requests to avoid
// overwhelming the proxy (which forwards to GitHub CDN with rate limits).
const GEO_CONCURRENCY = 6;
let geoActiveCount = 0;
const geoQueue: Array<() => void> = [];
function geoAcquire(): Promise<void> {
  if (geoActiveCount < GEO_CONCURRENCY) { geoActiveCount++; return Promise.resolve(); }
  return new Promise(resolve => geoQueue.push(resolve));
}
function geoRelease() {
  const next = geoQueue.shift();
  if (next) { next(); } else { geoActiveCount--; }
}

async function fetchGeoJsonFile(fileName: string): Promise<GeoJSON.FeatureCollection | null> {
  // Deduplicate: if the same file is already being fetched, wait for that promise
  if (geoFetchInFlight.has(fileName)) return geoFetchInFlight.get(fileName)!;
  const promise = (async () => {
    await geoAcquire();
    try {
      // Retry up to 3 times with exponential backoff for transient failures
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`/api/geojson/${encodeURIComponent(fileName)}`);
          if (res.ok) {
            const data = await res.json() as GeoJSON.FeatureCollection;
            return data;
          }
          if (res.status === 404) return null; // File genuinely missing — don't retry
        } catch { /* network error — retry */ }
        if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
      return null;
    } finally {
      geoRelease();
      geoFetchInFlight.delete(fileName);
    }
  })();
  geoFetchInFlight.set(fileName, promise);
  return promise;
}

async function fetchStateGeoJson(stateName: string, congress: number): Promise<GeoJSON.FeatureCollection | null> {
  const manifest = LEWIS_MANIFEST[stateName];
  if (!manifest) return null;
  const entry = manifest.find(e => congress >= e.start && congress <= e.end);
  if (!entry) return null;
  // Cache by file name (not state+congress) since many congresses share the same file
  const cacheKey = entry.name;
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey)!;
  const data = await fetchGeoJsonFile(entry.name);
  if (data) geoCache.set(cacheKey, data);
  return data;
}

// ─── Full eager cache — all 31 Congresses kept in memory (~15 MB) ─────────────
// Pre-computed color arrays avoid per-frame property lookups during playback.
type LayerData = {
  features: GeoJSON.Feature[];
  fills: string[];        // pre-computed fill color per feature
  fillOpacities: string[]; // pre-computed fill-opacity per feature
  strokes: string[];      // pre-computed stroke color per feature
};
const layerDataCache = new Map<number, LayerData>();
const warmupInFlight = new Map<number, Promise<void>>();

type WarmupState = { done: number; total: number; ready: boolean };
const TOTAL_CONGRESSES = CONGRESS_END - CONGRESS_START + 1; // 31
let warmupState: WarmupState = { done: 0, total: TOTAL_CONGRESSES, ready: false };
const warmupListeners = new Set<() => void>();
function notifyWarmup() { warmupListeners.forEach(fn => fn()); }

async function warmupCongress(congress: number): Promise<void> {
  if (layerDataCache.has(congress)) return;
  if (warmupInFlight.has(congress)) return warmupInFlight.get(congress)!;
  const promise = _doWarmupCongress(congress);
  warmupInFlight.set(congress, promise);
  try { await promise; } finally { warmupInFlight.delete(congress); }
}

async function _doWarmupCongress(congress: number): Promise<void> {
  if (layerDataCache.has(congress)) return;
  const results = await Promise.all([
    fetchPartyData(congress),
    fetchMembersData(congress),
    ...US_STATES.map(s => fetchStateGeoJson(s, congress)),
  ]);
  const partyData = results[0] as Record<string, string>;
  const geoResults = results.slice(2) as (GeoJSON.FeatureCollection | null)[];
  const features: GeoJSON.Feature[] = [];
  for (const fc of geoResults) {
    if (!fc) continue;
    for (const f of fc.features) {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
      const stateAbbrev = STATE_CODES[String(p?.statename ?? p?.STATENAME ?? "")] ?? "";
      const key = `${stateAbbrev}-${dist}`;
      let party = partyData[key];
      if (!party && dist === 0) party = partyData[`${stateAbbrev}-1`];
      if (!party && dist === 0) party = partyData[`${stateAbbrev}-98`];
      features.push({ ...f, properties: { ...p, _party: party ?? null, _stateAbbrev: stateAbbrev } });
    }
  }
  // Pre-compute color arrays so jumpTo() never needs to touch feature.properties
  const fills: string[] = new Array(features.length);
  const fillOpacities: string[] = new Array(features.length);
  const strokes: string[] = new Array(features.length);
  for (let i = 0; i < features.length; i++) {
    const p = (features[i].properties ?? {}) as Record<string, unknown>;
    const party = String(p._party ?? "unknown");
    fills[i] = PARTY_FILL[party] ?? PARTY_FILL.unknown;
    fillOpacities[i] = String(PARTY_FILL_OPACITY[party] ?? 0.18);
    strokes[i] = PARTY_STROKE[party] ?? PARTY_STROKE.unknown;
  }
  layerDataCache.set(congress, { features, fills, fillOpacities, strokes });
  // Update global warmup progress
  warmupState = {
    done: layerDataCache.size,
    total: TOTAL_CONGRESSES,
    ready: layerDataCache.size >= TOTAL_CONGRESSES,
  };
  notifyWarmup();
}

// Concurrency-limited queue: load all 31 Congresses in the background.
// Priority order: start from the current congress, expand outward so nearby
// Congresses are ready first, enabling play to start quickly.
let fullWarmupStarted = false;
async function startFullWarmup(startFrom: number = CONGRESS_START) {
  if (fullWarmupStarted) return;
  fullWarmupStarted = true;

  // Build priority-ordered list: startFrom, startFrom-1, startFrom+1, ...
  const all: number[] = [];
  const center = Math.max(CONGRESS_START, Math.min(CONGRESS_END, startFrom));
  all.push(center);
  for (let d = 1; d <= TOTAL_CONGRESSES; d++) {
    if (center - d >= CONGRESS_START) all.push(center - d);
    if (center + d <= CONGRESS_END) all.push(center + d);
  }

  // Run up to 2 concurrent warmups — each warmup fires up to 50 state fetches,
  // but the global semaphore (GEO_CONCURRENCY=6) caps total HTTP requests.
  const CONCURRENCY = 2;
  let idx = 0;
  async function worker() {
    while (idx < all.length) {
      const c = all[idx++];
      await warmupCongress(c);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  warmupState = { done: TOTAL_CONGRESSES, total: TOTAL_CONGRESSES, ready: true };
  notifyWarmup();
}

// Kept for backward compat — just delegates to startFullWarmup
function startAtlasWarmup(center: number = CONGRESS_START) {
  startFullWarmup(center);
}

// ─── D3 Map Panel ─────────────────────────────────────────────────────────────
// Uses d3.geoAlbersUsa() — Alaska & Hawaii appear as insets, matching the
// main House/Senate election map. No Leaflet, no tiles, no zoom instability.
interface D3MapPanelProps {
  congress: number;
  panelId: "A" | "B";
  compareMode: boolean;
  onDistrictClick?: (props: Record<string, unknown>) => void;
}

export interface D3MapPanelHandle {
  /** Imperatively jump to a congress — updates D3 immediately, bypassing React scheduling */
  jumpTo: (congress: number) => void;
}

const D3MapPanel = forwardRef(function D3MapPanel({ congress, panelId, compareMode, onDistrictClick }: D3MapPanelProps, ref: React.Ref<D3MapPanelHandle>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [districtCount, setDistrictCount] = useState(0);

  // Refs to avoid stale closures in ResizeObserver / click handlers
  const congressRef = useRef(congress);
  const onDistrictClickRef = useRef(onDistrictClick);
  useEffect(() => { congressRef.current = congress; }, [congress]);
  useEffect(() => { onDistrictClickRef.current = onDistrictClick; }, [onDistrictClick]);

  // ── Shared projection builder ──────────────────────────────────────────────
  function buildProjection(W: number, H: number) {
    const mapScale = Math.min(W, H * 1.6) * 0.95;
    return d3.geoAlbersUsa().scale(mapScale).translate([W / 2, H / 2 - H * 0.04]);
  }

  // Strip D3 AlbersUSA axis-aligned clip rectangles from path strings
  function removeClipRects(pathD: string | null): string {
    if (!pathD) return "";
    const subPaths = pathD.match(/M[^M]*/g) ?? [];
    return subPaths.filter(sp => {
      const lCount = (sp.match(/L/g) ?? []).length;
      if (lCount !== 3 || !sp.endsWith("Z")) return true;
      const nums = sp.match(/-?\d+\.?\d*/g) ?? [];
      if (nums.length < 8) return true;
      const ys = [nums[1], nums[3], nums[5], nums[7]].map(Number);
      return new Set(ys.map(y => y.toFixed(3))).size !== 2;
    }).join("");
  }

  // ── Full redraw: create/replace all SVG paths ──────────────────────────────
  // Called on first render and on SVG resize. Expensive but infrequent.
  // After drawing, captures pathElementsRef for O(1) per-frame color swaps.
  const fullRedraw = useCallback((features: GeoJSON.Feature[], W: number, H: number, cachedColors?: LayerData) => {
    const g = gRef.current;
    if (!g) return;
    const projection = buildProjection(W, H);
    const pathGen = d3.geoPath().projection(projection);

    // Use pre-computed colors if available, otherwise fall back to property lookup
    const fills = cachedColors?.fills;
    const fillOpacities = cachedColors?.fillOpacities;
    const strokes = cachedColors?.strokes;

    d3.select(g).selectAll("path").remove();
    const selection = d3.select(g)
      .selectAll<SVGPathElement, GeoJSON.Feature>("path")
      .data(features, (_d, i) => String(i))
      .join("path")
      .attr("d", d => removeClipRects(pathGen(d)))
      .attr("fill", (d, i) => fills?.[i] ?? (PARTY_FILL[String((d.properties ?? {} as Record<string,unknown>)._party ?? "unknown")] ?? PARTY_FILL.unknown))
      .attr("fill-opacity", (d, i) => fillOpacities?.[i] ?? String(PARTY_FILL_OPACITY[String((d.properties ?? {} as Record<string,unknown>)._party ?? "unknown")] ?? 0.18))
      .attr("stroke", (d, i) => strokes?.[i] ?? (PARTY_STROKE[String((d.properties ?? {} as Record<string,unknown>)._party ?? "unknown")] ?? PARTY_STROKE.unknown))
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.7)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        const c = congressRef.current;
        const p = d.properties as Record<string, unknown>;
        const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
        const stateAbbrev = String(p?._stateAbbrev ?? "");
        const key = `${stateAbbrev}-${dist}`;
        const membersData = membersCache.get(c) ?? {};
        let member = membersData[key];
        if (!member && dist === 0) member = membersData[`${stateAbbrev}-1`];
        onDistrictClickRef.current?.({
          ...p,
          _party: p._party ?? null,
          _stateAbbrev: stateAbbrev,
          _memberName: member?.name ?? null,
          _memberBioguide: member?.bioguide ?? null,
          _congress: c,
        });
      });
    // Capture direct DOM references for ultra-fast per-frame color swaps
    pathElementsRef.current = selection.nodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Color-only update: direct DOM array writes with pre-computed colors ─────────
  // Zero allocations, zero property lookups — just a tight loop over DOM elements.
  const recolor = useCallback((cached: LayerData): boolean => {
    const els = pathElementsRef.current;
    if (els.length !== cached.features.length) return false; // need full redraw
    const { fills, fillOpacities, strokes } = cached;
    for (let i = 0; i < els.length; i++) {
      const s = els[i].style;
      s.fill = fills[i];
      s.fillOpacity = fillOpacities[i];
      s.stroke = strokes[i];
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Direct DOM element array — avoids D3 .selectAll() on every frame
  const pathElementsRef = useRef<SVGPathElement[]>([]);

  // Track the congress that the current paths were drawn for
  const drawnCongressRef = useRef<number | null>(null);

  // Refs so jumpTo can call the latest versions without stale closures
  const fullRedrawRef = useRef(fullRedraw);
  useEffect(() => { fullRedrawRef.current = fullRedraw; }, [fullRedraw]);

  // Expose jumpTo for imperative use by the play loop (bypasses React scheduling)
  useImperativeHandle(ref, () => ({
    jumpTo(targetCongress: number) {
      const svg = svgRef.current;
      if (!svg) return;
      const cached = layerDataCache.get(targetCongress);
      if (!cached) return; // data not ready yet

      const els = pathElementsRef.current;
      const { fills, fillOpacities, strokes, features } = cached;

      if (els.length === features.length) {
        // ⚡ Ultra-fast path: direct typed array writes, zero allocations
        for (let i = 0; i < els.length; i++) {
          const s = els[i].style;
          s.fill = fills[i];
          s.fillOpacity = fillOpacities[i];
          s.stroke = strokes[i];
        }
        drawnCongressRef.current = targetCongress;
        return;
      }

      // District count changed — full redraw
      const rect = svg.getBoundingClientRect();
      fullRedrawRef.current(cached.features, rect.width || 960, rect.height || 600);
      drawnCongressRef.current = targetCongress;
    },
  }), []);

  // ── Main effect: runs on congress change ───────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let cancelled = false;

    (async () => {
      if (!layerDataCache.has(congress)) {
        setIsLoading(true);
        await warmupCongress(congress);
      }
      if (cancelled) return;

      const cached = layerDataCache.get(congress);
      if (!cached) { setIsLoading(false); return; }

      const rect = svg.getBoundingClientRect();
      const W = rect.width || 960;
      const H = rect.height || 600;

      const prevCongress = drawnCongressRef.current;
      const prevCached = prevCongress !== null ? layerDataCache.get(prevCongress) : null;

      if (prevCached && prevCached.features.length === cached.features.length) {
        // Same district count → fast color-only update (direct DOM writes)
        const ok = recolor(cached);
        if (ok) {
          drawnCongressRef.current = congress;
          if (!cancelled) { setDistrictCount(cached.features.length); setIsLoading(false); }
          return;
        }
      }

      // Different district count or first render → full redraw
      setIsLoading(true);
      fullRedraw(cached.features, W, H, cached);
      drawnCongressRef.current = congress;
      if (!cancelled) { setDistrictCount(cached.features.length); setIsLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [congress, fullRedraw, recolor]);

  // ── ResizeObserver: re-project paths when SVG dimensions change ────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(() => {
      const g = gRef.current;
      if (!g) return;
      const c = congressRef.current;
      const cached = layerDataCache.get(c);
      if (!cached) return;
      const rect = svg.getBoundingClientRect();
      const W = rect.width || 960;
      const H = rect.height || 600;
      fullRedraw(cached.features, W, H, cached);
      drawnCongressRef.current = c;
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [fullRedraw]);

  const seats = HOUSE_SEATS[congress] ?? { D: 0, R: 0, O: 0 };
  const prevSeats = HOUSE_SEATS[congress - 1];
  const shiftD = prevSeats ? seats.D - prevSeats.D : null;
  const shiftR = prevSeats ? seats.R - prevSeats.R : null;
  const total = seats.D + seats.R + seats.O;

  return (
    <div className="relative flex-1 h-full overflow-hidden" style={{ background: "transparent" }}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        <g ref={gRef} />
      </svg>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white/70 text-sm font-mono">
            Loading districts…
          </div>
        </div>
      )}

      {/* District count */}
      {!isLoading && (
        <div className="absolute bottom-3 left-3 text-xs font-mono text-white/50 bg-black/30 px-2 py-1 rounded pointer-events-none" style={{ zIndex: 10 }}>
          {districtCount} districts
        </div>
      )}

      {/* Party seats legend — single panel mode */}
      {!compareMode && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/10" style={{ zIndex: 10 }}>
          <div className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-semibold">Party Seats</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#1a4fa0' }} />
            <span className="text-white/80">Democrat</span>
            <span className="ml-auto font-bold" style={{ color: '#5b8fd4' }}>{seats.D}</span>
            {shiftD !== null && shiftD !== 0 && (
              <span className="ml-1 text-[10px] font-bold px-1 rounded"
                style={{ color: shiftD > 0 ? '#5b8fd4' : '#e06060', background: shiftD > 0 ? 'rgba(91,143,212,0.15)' : 'rgba(224,96,96,0.15)' }}>
                {shiftD > 0 ? `+${shiftD}` : shiftD}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#b22222' }} />
            <span className="text-white/80">Republican</span>
            <span className="ml-auto font-bold" style={{ color: '#e06060' }}>{seats.R}</span>
            {shiftR !== null && shiftR !== 0 && (
              <span className="ml-1 text-[10px] font-bold px-1 rounded"
                style={{ color: shiftR > 0 ? '#e06060' : '#5b8fd4', background: shiftR > 0 ? 'rgba(224,96,96,0.15)' : 'rgba(91,143,212,0.15)' }}>
                {shiftR > 0 ? `+${shiftR}` : shiftR}
              </span>
            )}
          </div>
          {seats.O > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#7c3aed' }} />
              <span className="text-white/80">Split / Ind.</span>
              <span className="ml-auto font-bold" style={{ color: '#a78bfa' }}>{seats.O}</span>
            </div>
          )}
          <div className="mt-2 h-2 rounded-full overflow-hidden flex">
            <div style={{ width: `${(seats.D / total) * 100}%`, background: '#1a4fa0' }} />
            {seats.O > 0 && <div style={{ width: `${(seats.O / total) * 100}%`, background: '#7c3aed' }} />}
            <div style={{ width: `${(seats.R / total) * 100}%`, background: '#b22222' }} />
          </div>
          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
            <span className="text-white/50 uppercase text-[10px]">Total</span>
            <span className="font-bold">{total}</span>
          </div>
        </div>
      )}

      {/* Panel label + compact seat count in compare mode */}
      {compareMode && (
        <>
          <div className="absolute top-3 left-3 text-xs font-mono text-white/50 bg-black/30 px-2 py-1 rounded uppercase tracking-widest" style={{ zIndex: 10 }}>
            {panelId === "A" ? "LEFT" : "RIGHT"}
          </div>
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/70 border border-white/10" style={{ zIndex: 10 }}>
            <span className="font-bold" style={{ color: '#5b8fd4' }}>{seats.D}</span>
            <span className="text-white/30 mx-1">D</span>
            <span className="text-white/30 mx-1">·</span>
            <span className="font-bold" style={{ color: '#e06060' }}>{seats.R}</span>
            <span className="text-white/30 mx-1">R</span>
            {seats.O > 0 && <><span className="text-white/30 mx-1">·</span><span className="font-bold" style={{ color: '#a78bfa' }}>{seats.O}</span><span className="text-white/30 mx-1">O</span></>}
          </div>
        </>
      )}
    </div>
  );
});

// ─── Timeline Slider ──────────────────────────────────────────────────────────
interface TimelineSliderProps {
  congress: number;
  onChange: (c: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  speedIdx: number;
  onSpeedChange: (i: number) => void;
  color: "amber" | "red";
  label?: string;
  atlasReady?: boolean;
}

function TimelineSlider({ congress, onChange, isPlaying, onPlayToggle, speedIdx, onSpeedChange, color, label, atlasReady = true }: TimelineSliderProps) {
  const totalCongresses = CONGRESS_END - CONGRESS_START;
  function sliderPct(c: number) { return ((c - CONGRESS_START) / totalCongresses) * 100; }
  const accentColor = color === "amber" ? "#F59E0B" : "#EF4444";
  const accentClass = color === "amber" ? "text-amber-400" : "text-red-400";
  const playBtnClass = color === "amber"
    ? "bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30"
    : "bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30";
  const milestoneTextClass = color === "amber" ? "text-amber-300/60" : "text-red-300/60";
  const milestoneDotClass = color === "amber" ? "bg-amber-400/50" : "bg-red-400/50";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={atlasReady ? onPlayToggle : undefined}
        disabled={!atlasReady}
        className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors shrink-0 ${atlasReady ? playBtnClass : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed"}`}
        title={!atlasReady ? "Loading atlas…" : isPlaying ? "Pause" : "Play animation"}
      >
        {!atlasReady ? "⧗" : isPlaying ? "⏸" : "▶"}
      </button>
      <div className="flex gap-0.5 shrink-0">
        {PLAY_SPEEDS.map((s, i) => (
          <button key={s.label} onClick={() => onSpeedChange(i)}
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-colors ${
              speedIdx === i
                ? color === "amber" ? "bg-amber-500/30 border-amber-400/50 text-amber-300" : "bg-red-500/30 border-red-400/50 text-red-300"
                : "bg-white/5 border-white/10 text-white/30 hover:text-white/60"
            }`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 relative" style={{ paddingTop: "18px" }}>
        {MILESTONES.map(m => (
          <div key={m.congress}
            className={`absolute text-[9px] font-semibold uppercase tracking-widest pointer-events-none ${milestoneTextClass}`}
            style={{ left: `${sliderPct(m.congress)}%`, transform: "translateX(-50%)", top: "0px", whiteSpace: "nowrap" }}>
            {m.label}
          </div>
        ))}
        <input
          type="range" min={CONGRESS_START} max={CONGRESS_END} value={congress}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${accentColor} ${sliderPct(congress)}%, rgba(255,255,255,0.15) ${sliderPct(congress)}%)`, accentColor }}
        />
        {MILESTONES.map(m => (
          <div key={m.congress}
            className={`absolute w-px h-2 -translate-x-1/2 ${milestoneDotClass}`}
            style={{ left: `${sliderPct(m.congress)}%`, bottom: "calc(100% - 18px - 6px)" }} />
        ))}
      </div>
      <div className="shrink-0 text-right w-28">
        {label && <div className="text-white/30 text-[9px] uppercase tracking-widest">{label}</div>}
        <span className={`text-sm font-bold ${accentClass}`}>{ordinal(congress)}</span>
        <span className="text-white/40 text-xs ml-1">({congressYears(congress)[0]})</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapComparison() {
  const [congressA, setCongressA] = useState(CONGRESS_START);
  const [congressB, setCongressB] = useState(CONGRESS_START);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [districtPopup, setDistrictPopup] = useState<Record<string, unknown> | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [speedIdxA, setSpeedIdxA] = useState(0);
  const [speedIdxB, setSpeedIdxB] = useState(0);
  const panelARef = useRef<D3MapPanelHandle>(null);
  const panelBRef = useRef<D3MapPanelHandle>(null);
  const sky = getSkyVideo();

  // Atlas warmup progress
  const [warmup, setWarmup] = useState<WarmupState>(() => ({ ...warmupState }));
  useEffect(() => {
    const listener = () => setWarmup({ ...warmupState });
    warmupListeners.add(listener);
    startAtlasWarmup(congressA);
    return () => { warmupListeners.delete(listener); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play is ready as soon as the current congress + next 4 are cached.
  // warmup.done is included so this re-evaluates on every cache update.
  const canPlayA = warmup.done > 0 && layerDataCache.has(congressA) &&
    [1,2,3,4].every(d => congressA + d > CONGRESS_END || layerDataCache.has(congressA + d));
  const canPlayB = warmup.done > 0 && layerDataCache.has(congressB) &&
    [1,2,3,4].every(d => congressB + d > CONGRESS_END || layerDataCache.has(congressB + d));

  // Clock
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stable refs so setInterval callbacks always see latest congress without re-creating
  const congressARef = useRef(congressA);
  const congressBRef = useRef(congressB);
  useEffect(() => { congressARef.current = congressA; }, [congressA]);
  useEffect(() => { congressBRef.current = congressB; }, [congressB]);

  // Animation playback A — rAF ticker for frame-perfect timing
  useEffect(() => {
    if (!isPlayingA) return;
    const ms = PLAY_SPEEDS[speedIdxA].ms;
    let rafId: number;
    let lastTime = performance.now();
    function tick(now: number) {
      if (now - lastTime >= ms) {
        lastTime = now;
        const c = congressARef.current;
        if (c >= CONGRESS_END) { setIsPlayingA(false); return; }
        const next = c + 1;
        panelARef.current?.jumpTo(next); // D3 update: synchronous, zero React overhead
        setCongressA(next);              // UI update: slider, seat counts
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingA, speedIdxA]);

  // Animation playback B — rAF ticker
  useEffect(() => {
    if (!isPlayingB) return;
    const ms = PLAY_SPEEDS[speedIdxB].ms;
    let rafId: number;
    let lastTime = performance.now();
    function tick(now: number) {
      if (now - lastTime >= ms) {
        lastTime = now;
        const c = congressBRef.current;
        if (c >= CONGRESS_END) { setIsPlayingB(false); return; }
        const next = c + 1;
        panelBRef.current?.jumpTo(next);
        setCongressB(next);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingB, speedIdxB]);

  const handlePlayToggleA = useCallback(() => {
    setIsPlayingA(p => !p);
    if (congressA >= CONGRESS_END) setCongressA(CONGRESS_START);
  }, [congressA]);
  const handlePlayToggleB = useCallback(() => {
    setIsPlayingB(p => !p);
    if (congressB >= CONGRESS_END) setCongressB(CONGRESS_START);
  }, [congressB]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
      {/* Sky video background */}
      <video key={sky.url} autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src={sky.url} type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ zIndex: 1, background: 'rgba(0,0,0,0.15)' }} />

      {/* ── Header ── */}
      <header className="relative flex items-center gap-3 px-4 h-11 shrink-0 border-b border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
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
          <span className="text-white/40 text-xs uppercase tracking-widest hidden sm:inline">Jump to State</span>
          <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-1 focus:outline-none">
            <option value="">Select state…</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {selectedState && (
            <button onClick={() => setSelectedState("")} className="text-white/40 hover:text-white text-xs" title="Clear state filter">✕</button>
          )}
        </div>
        {/* Compare toggle */}
        <button onClick={() => setCompareMode(m => !m)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition-colors ${
            compareMode ? "bg-amber-500/20 border-amber-400/50 text-amber-300" : "bg-white/10 border-white/20 text-white/70 hover:text-white"
          }`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
          COMPARE
        </button>
        {/* Clock & sky */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-white/60 text-xs font-mono">{clock}</span>
          <span className="text-amber-300 text-xs font-semibold uppercase tracking-widest">✦ {sky.label}</span>
        </div>
        <Link href="/" className="text-white/40 hover:text-white/80 text-xs ml-2 transition-colors">← Election Map</Link>
      </header>

      {/* ── Congress selector bar ── */}
      <div className="relative shrink-0 flex items-center border-b border-white/10 px-4 h-10 gap-4"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base font-black text-amber-400">{ordinal(congressA)}</span>
          <span className="text-white/30 text-xs">{congressYears(congressA)[0]}–{congressYears(congressA)[1]}</span>
          <select value={congressA} onChange={e => { setCongressA(Number(e.target.value)); setIsPlayingA(false); }}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none ml-1">
            {Array.from({ length: CONGRESS_END - CONGRESS_START + 1 }, (_, i) => CONGRESS_START + i).map(n => {
              const [y] = congressYears(n);
              return <option key={n} value={n}>{ordinal(n)} Congress ({y}–{y + 1})</option>;
            })}
          </select>
          {compareMode && <span className="text-white/30 text-[10px] font-mono uppercase ml-1">Panel A</span>}
        </div>
        {compareMode && (
          <>
            <div className="w-px h-5 bg-white/20 shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-base font-black text-red-400">{ordinal(congressB)}</span>
              <span className="text-white/30 text-xs">{congressYears(congressB)[0]}–{congressYears(congressB)[1]}</span>
              <select value={congressB} onChange={e => { setCongressB(Number(e.target.value)); setIsPlayingB(false); }}
                className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none ml-1">
                {Array.from({ length: CONGRESS_END - CONGRESS_START + 1 }, (_, i) => CONGRESS_START + i).map(n => {
                  const [y] = congressYears(n);
                  return <option key={n} value={n}>{ordinal(n)} Congress ({y}–{y + 1})</option>;
                })}
              </select>
              <span className="text-white/30 text-[10px] font-mono uppercase ml-1">Panel B</span>
            </div>
          </>
        )}
      </div>

      {/* ── Map panels — flex-1 fills all remaining space ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 5 }}>
        <D3MapPanel
          ref={panelARef}
          congress={congressA}
          panelId="A"
          compareMode={compareMode}
          onDistrictClick={setDistrictPopup}
        />
        {compareMode && (
          <>
            <div className="w-px bg-white/20 shrink-0" />
            <D3MapPanel
              ref={panelBRef}
              congress={congressB}
              panelId="B"
              compareMode={compareMode}
              onDistrictClick={setDistrictPopup}
            />
          </>
        )}
      </div>

      {/* ── Timeline / Slider ── */}
      <div className="relative shrink-0 px-5 pt-5 pb-2 border-t border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
        {!warmup.ready && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-amber-300/70 font-mono uppercase tracking-widest">
                Loading atlas… {warmup.done}/{warmup.total} congresses
              </span>
              <span className="text-[10px] text-white/30 font-mono">
                {Math.round((warmup.done / warmup.total) * 100)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(warmup.done / warmup.total) * 100}%`, background: "linear-gradient(to right, #F59E0B, #EF4444)" }} />
            </div>
          </div>
        )}
        <TimelineSlider
          congress={congressA}
          onChange={c => { setCongressA(c); setIsPlayingA(false); }}
          isPlaying={isPlayingA}
          onPlayToggle={handlePlayToggleA}
          speedIdx={speedIdxA}
          onSpeedChange={setSpeedIdxA}
          color="amber"
          label={compareMode ? "Panel A" : undefined}
          atlasReady={canPlayA}
        />
        {compareMode && (
          <div className="mt-3">
            <TimelineSlider
              congress={congressB}
              onChange={c => { setCongressB(c); setIsPlayingB(false); }}
              isPlaying={isPlayingB}
              onPlayToggle={handlePlayToggleB}
              speedIdx={speedIdxB}
              onSpeedChange={setSpeedIdxB}
              color="red"
              label="Panel B"
              atlasReady={canPlayB}
            />
          </div>
        )}
        <div className="mt-2 text-[10px] text-white/30 text-center">
          District boundaries: Jeffrey B. Lewis, Brandon DeVine, Lincoln Pitcher &amp; Kenneth C. Martis · cdmaps.polisci.ucla.edu · Party data: Voteview / UCLA
        </div>
      </div>

      {/* ── District click popup ── */}
      {districtPopup && (() => {
        const party = districtPopup._party as string | null;
        const partyColor = party === "D" ? "#5b8fd4" : party === "R" ? "#e06060" : party === "I" ? "#a78bfa" : "#888";
        const partyLabel = party === "D" ? "Democrat" : party === "R" ? "Republican" : party === "I" ? "Independent" : "Unknown";
        const memberName = districtPopup._memberName as string | null;
        const bioguide = districtPopup._memberBioguide as string | null;
        const congress = districtPopup._congress as number | null;
        const stateName = String(districtPopup.statename ?? districtPopup.STATENAME ?? "Unknown State");
        const distNum = Number(districtPopup.district ?? districtPopup.DISTRICT ?? 0);
        const distLabel = distNum === 0 ? "At-Large" : String(distNum);
        const [yearsStart] = congress ? congressYears(congress) : [null];
        return (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-white text-sm shadow-2xl"
            style={{ zIndex: 20, minWidth: 280 }}>
            <button onClick={() => setDistrictPopup(null)}
              className="absolute top-2 right-3 text-white/40 hover:text-white text-lg leading-none">×</button>
            <div className="font-bold text-base mb-1">
              {stateName} — {distLabel === "At-Large" ? "At-Large District" : `District ${distLabel}`}
            </div>
            {memberName ? (
              <div className="flex items-center gap-2 mb-2">
                {bioguide && (
                  <img src={`https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`}
                    alt={memberName} className="w-8 h-8 rounded-full object-cover border border-white/20"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div>
                  <div className="text-white font-semibold text-sm">{memberName}</div>
                  {party && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: partyColor }} />
                      <span className="text-xs font-semibold" style={{ color: partyColor }}>{partyLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : party && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: partyColor }} />
                <span className="text-xs font-semibold" style={{ color: partyColor }}>{partyLabel}</span>
              </div>
            )}
            {congress && (
              <div className="text-white/50 text-xs border-t border-white/10 pt-2 mt-1">
                {ordinal(congress)} Congress
                {yearsStart && <span className="text-white/30 ml-1">({yearsStart}–{yearsStart + 1})</span>}
              </div>
            )}
            {Boolean(districtPopup.startcong || districtPopup.STARTCONG) && (
              <div className="text-white/30 text-xs mt-0.5">
                Boundary valid: {ordinal(Number(districtPopup.startcong ?? districtPopup.STARTCONG))}–
                {ordinal(Number(districtPopup.endcong ?? districtPopup.ENDCONG ?? districtPopup.startcong ?? districtPopup.STARTCONG))} Congress
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
