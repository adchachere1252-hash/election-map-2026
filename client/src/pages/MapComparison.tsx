/**
 * Congressional Historical Map Atlas
 * Full-screen interactive map showing U.S. congressional district boundaries
 * for every Congress from the 89th (1965) through 119th (2025).
 * Uses D3 AlbersUSA projection — Alaska & Hawaii appear as insets, matching
 * the main House/Senate election map. No Leaflet, no tile layers.
 * Party data: Voteview / Clerk of the House
 * District boundaries: Jeffrey B. Lewis et al. (cdmaps.polisci.ucla.edu)
 *
 * Features:
 * - D3 zoom/pan (scroll wheel + drag)
 * - Hover tooltips (district, member, party)
 * - Synchronized zoom in compare mode
 * - Keyboard shortcuts (Space=play/pause, ←/→=step, C=compare)
 * - URL state persistence (shareable links)
 * - Mobile responsive layout
 * - Zoom controls UI
 */
import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Link } from "wouter";
import * as d3 from "d3";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";
import { STATE_CODES } from "@/lib/electionUtils";
import { useIsMobile } from "@/hooks/useMobile";
import StateDetailPanel from "@/components/StateDetailPanel";

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
  { label: "Slow", ms: 2500 },
  { label: "Normal", ms: 1200 },
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
const geoFetchInFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();

const GEO_CONCURRENCY = 20;
let geoActiveCount = 0;
const geoQueue: Array<() => void> = [];
function geoAcquire(): Promise<void> {
  if (geoActiveCount < GEO_CONCURRENCY) { geoActiveCount++; return Promise.resolve(); }
  return new Promise(resolve => geoQueue.push(resolve));
}
function geoRelease() {
  geoActiveCount = Math.max(0, geoActiveCount - 1);
  const next = geoQueue.shift();
  if (next) { geoActiveCount++; next(); }
}

async function fetchGeoJsonFile(fileName: string): Promise<GeoJSON.FeatureCollection | null> {
  if (geoCache.has(fileName)) return geoCache.get(fileName)!;
  if (geoFetchInFlight.has(fileName)) return geoFetchInFlight.get(fileName)!;
  const promise = (async () => {
    await geoAcquire();
    const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`/api/geojson/${encodeURIComponent(fileName)}`, { signal: timeoutSignal });
          if (res.ok) {
            const data = await res.json() as GeoJSON.FeatureCollection;
            geoCache.set(fileName, data);
            return data;
          }
          if (res.status === 404) return null;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return null;
        }
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

// Bundled fetch: get all GeoJSON files for a congress in one request
const bundleFetchInFlight = new Map<number, Promise<void>>();
async function fetchCongressBundle(congress: number): Promise<void> {
  if (bundleFetchInFlight.has(congress)) return bundleFetchInFlight.get(congress)!;
  const promise = (async () => {
    try {
      const res = await fetch(`/api/atlas/bundle/${congress}`);
      if (!res.ok) return;
      const bundle = await res.json() as Record<string, string>;
      // Parse each file and populate geoCache
      for (const [fileName, rawJson] of Object.entries(bundle)) {
        if (geoCache.has(fileName)) continue;
        try {
          const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
          geoCache.set(fileName, parsed as GeoJSON.FeatureCollection);
        } catch { /* skip malformed */ }
      }
    } catch { /* fallback to individual fetches */ }
  })();
  bundleFetchInFlight.set(congress, promise);
  promise.finally(() => bundleFetchInFlight.delete(congress));
  return promise;
}

async function fetchStateGeoJson(stateName: string, congress: number): Promise<GeoJSON.FeatureCollection | null> {
  const manifest = LEWIS_MANIFEST[stateName];
  if (!manifest) return null;
  const entry = manifest.find(e => congress >= e.start && congress <= e.end);
  if (!entry) return null;
  const cacheKey = entry.name;
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey)!;
  const data = await fetchGeoJsonFile(entry.name);
  if (data) geoCache.set(cacheKey, data);
  return data;
}

// ─── Lazy cache with background prefetch ──────────────────────────────────────
type LayerData = {
  features: GeoJSON.Feature[];
  fills: string[];
  fillOpacities: string[];
  strokes: string[];
};
const layerDataCache = new Map<number, LayerData>();
const warmupInFlight = new Map<number, Promise<void>>();

type WarmupState = { done: number; total: number; ready: boolean; initialReady: boolean };
const TOTAL_CONGRESSES = CONGRESS_END - CONGRESS_START + 1;
let warmupState: WarmupState = { done: 0, total: TOTAL_CONGRESSES, ready: false, initialReady: false };
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
  // Try bundled fetch first (single request for all 50 states)
  await fetchCongressBundle(congress);
  const results = await Promise.all([
    fetchPartyData(congress),
    fetchMembersData(congress),
    ...US_STATES.map(s => fetchStateGeoJson(s, congress)),
  ]);
  const partyData = results[0] as Record<string, string>;
  const geoResults = results.slice(2) as (GeoJSON.FeatureCollection | null)[];

  const failedStates: string[] = [];
  const features: GeoJSON.Feature[] = [];
  for (let si = 0; si < geoResults.length; si++) {
    const fc = geoResults[si];
    if (!fc) {
      failedStates.push(US_STATES[si]);
      continue;
    }
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

  if (failedStates.length > 0) {
    const retryResults = await Promise.all(
      failedStates.map(s => fetchStateGeoJson(s, congress))
    );
    for (let ri = 0; ri < retryResults.length; ri++) {
      const fc = retryResults[ri];
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
  }

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
  warmupState = {
    done: layerDataCache.size,
    total: TOTAL_CONGRESSES,
    ready: layerDataCache.size >= TOTAL_CONGRESSES,
    initialReady: warmupState.initialReady,
  };
  notifyWarmup();
}

// ─── Lazy loading strategy ───────────────────────────────────────────────────
let fullWarmupStarted = false;
let backgroundLoadingActive = false;

async function startAtlasWarmup(startFrom: number = CONGRESS_END) {
  if (fullWarmupStarted && layerDataCache.size > 0) return;
  if (layerDataCache.size === 0) {
    fullWarmupStarted = false;
    backgroundLoadingActive = false;
    warmupInFlight.clear();
    warmupState = { done: 0, total: TOTAL_CONGRESSES, ready: false, initialReady: false };
    notifyWarmup();
  }
  if (fullWarmupStarted) return;
  fullWarmupStarted = true;

  const center = Math.max(CONGRESS_START, Math.min(CONGRESS_END, startFrom));

  await warmupCongress(center);
  warmupState = { ...warmupState, done: layerDataCache.size, initialReady: true };
  notifyWarmup();

  const adjacent: number[] = [];
  for (let d = 1; d <= 3; d++) {
    if (center - d >= CONGRESS_START) adjacent.push(center - d);
    if (center + d <= CONGRESS_END) adjacent.push(center + d);
  }
  for (const c of adjacent) {
    await warmupCongress(c);
  }
  warmupState = { ...warmupState, done: layerDataCache.size };
  notifyWarmup();

  startBackgroundLoading(center);
}

async function startBackgroundLoading(center: number) {
  if (backgroundLoadingActive) return;
  backgroundLoadingActive = true;

  const all: number[] = [];
  for (let d = 0; d <= TOTAL_CONGRESSES; d++) {
    if (center - d >= CONGRESS_START && !layerDataCache.has(center - d)) all.push(center - d);
    if (d > 0 && center + d <= CONGRESS_END && !layerDataCache.has(center + d)) all.push(center + d);
  }

  for (const c of all) {
    if (layerDataCache.has(c)) continue;
    await warmupCongress(c);
    warmupState = {
      done: layerDataCache.size,
      total: TOTAL_CONGRESSES,
      ready: layerDataCache.size >= TOTAL_CONGRESSES,
      initialReady: true,
    };
    notifyWarmup();
    await new Promise(r => setTimeout(r, 100));
  }
  warmupState = { done: TOTAL_CONGRESSES, total: TOTAL_CONGRESSES, ready: true, initialReady: true };
  notifyWarmup();
}

// ─── URL state helpers ────────────────────────────────────────────────────────
function getUrlState(): { congressA: number; congressB: number; compare: boolean; state: string } {
  const p = new URLSearchParams(window.location.search);
  const a = Number(p.get('congress') || p.get('a'));
  const b = Number(p.get('b'));
  const compare = p.get('compare') === '1' || p.get('compare') === 'true';
  const state = p.get('state') || '';
  return {
    congressA: a >= CONGRESS_START && a <= CONGRESS_END ? a : CONGRESS_END,
    congressB: b >= CONGRESS_START && b <= CONGRESS_END ? b : CONGRESS_START,
    compare,
    state,
  };
}

function setUrlState(params: { congressA: number; congressB?: number; compare?: boolean; state?: string }) {
  const url = new URL(window.location.href);
  url.searchParams.set('congress', String(params.congressA));
  if (params.compare) {
    url.searchParams.set('b', String(params.congressB ?? CONGRESS_START));
    url.searchParams.set('compare', '1');
  } else {
    url.searchParams.delete('b');
    url.searchParams.delete('compare');
  }
  if (params.state) {
    url.searchParams.set('state', params.state);
  } else {
    url.searchParams.delete('state');
  }
  window.history.replaceState(null, '', url.toString());
}

// ─── D3 Map Panel ─────────────────────────────────────────────────────────────
interface D3MapPanelProps {
  congress: number;
  panelId: "A" | "B";
  compareMode: boolean;
  onDistrictClick?: (props: Record<string, unknown>) => void;
  onHover?: (info: { x: number; y: number; content: string } | null) => void;
  selectedState?: string;
  syncZoom?: d3.ZoomTransform | null;
  onZoomChange?: (transform: d3.ZoomTransform) => void;
}

export interface D3MapPanelHandle {
  jumpTo: (congress: number) => void;
  resetZoom: () => void;
  getZoom: () => d3.ZoomTransform | null;
}

const D3MapPanel = forwardRef(function D3MapPanel(
  { congress, panelId, compareMode, onDistrictClick, onHover, selectedState, syncZoom, onZoomChange }: D3MapPanelProps,
  ref: React.Ref<D3MapPanelHandle>
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [districtCount, setDistrictCount] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const congressRef = useRef(congress);
  const onDistrictClickRef = useRef(onDistrictClick);
  const onHoverRef = useRef(onHover);
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => { congressRef.current = congress; }, [congress]);
  useEffect(() => { onDistrictClickRef.current = onDistrictClick; }, [onDistrictClick]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

  // Zoom behavior ref
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const savedTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const isSyncingRef = useRef(false);

  // Pointer tracking for click-vs-drag detection
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  // ── Shared projection builder ──────────────────────────────────────────────
  function buildProjection(W: number, H: number) {
    const mapScale = Math.min(W, H * 1.6) * 0.95;
    return d3.geoAlbersUsa().scale(mapScale).translate([W / 2, H / 2 - H * 0.04]);
  }

  // Strip D3 AlbersUSA clip rectangles
  function removeClipRects(pathD: string | null): string {
    if (!pathD) return "";
    const subPaths = pathD.match(/M[^M]*/g) ?? [];
    return subPaths.filter(sp => {
      const lCount = (sp.match(/L/g) ?? []).length;
      if (lCount !== 3 || !sp.endsWith("Z")) return true;
      const nums = sp.match(/-?\d+\.?\d*/g) ?? [];
      if (nums.length < 8) return true;
      const [x1, y1, x2, y2, x3, y3, x4, y4] = nums.map(Number);
      const EPS = 0.1;
      const isRect = Math.abs(x1 - x4) < EPS && Math.abs(y1 - y2) < EPS &&
                     Math.abs(x2 - x3) < EPS && Math.abs(y3 - y4) < EPS;
      if (!isRect) return true;
      const area = Math.abs(x2 - x1) * Math.abs(y3 - y2);
      return area < 1000;
    }).join("");
  }

  // Direct DOM element array for fast updates
  const pathElementsRef = useRef<SVGPathElement[]>([]);
  const drawnCongressRef = useRef<number | null>(null);

  // ── Full redraw ──────────────────────────────────────────────────────────────
  const fullRedraw = useCallback((features: GeoJSON.Feature[], W: number, H: number, cachedColors?: LayerData) => {
    const g = gRef.current;
    if (!g) return;
    const projection = buildProjection(W, H);
    const pathGen = d3.geoPath().projection(projection);

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
      .on("mouseenter", function(_event, d) {
        // Highlight on hover
        d3.select(this).attr("stroke-width", 1.5).attr("stroke-opacity", 1).attr("fill-opacity", 0.9);
        // Build tooltip content
        const p = d.properties as Record<string, unknown>;
        const stateAbbrev = String(p._stateAbbrev ?? "");
        const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
        const stateName = String(p?.statename ?? p?.STATENAME ?? "");
        const party = String(p._party ?? "unknown");
        const partyLabel = party === "D" ? "Democrat" : party === "R" ? "Republican" : party === "I" ? "Independent" : "Unknown";
        const key = `${stateAbbrev}-${dist}`;
        const c = congressRef.current;
        const membersData = membersCache.get(c) ?? {};
        let member = membersData[key];
        if (!member && dist === 0) member = membersData[`${stateAbbrev}-1`];
        const distLabel = dist === 0 ? "At-Large" : `District ${dist}`;
        let content = `${stateName} ${distLabel}\n${partyLabel}`;
        if (member) content += `\n${member.name}`;
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseEvent = _event as MouseEvent;
          onHoverRef.current?.({
            x: mouseEvent.clientX - rect.left,
            y: mouseEvent.clientY - rect.top,
            content,
          });
        }
      })
      .on("mousemove", function(_event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseEvent = _event as MouseEvent;
        // Update tooltip position only (content stays the same until mouseenter fires on new element)
        const tipEl = document.querySelector(`[data-tooltip-panel="${panelId}"]`) as HTMLElement;
        if (tipEl) {
          const x = mouseEvent.clientX - rect.left;
          const y = mouseEvent.clientY - rect.top;
          tipEl.style.left = `${x + 14}px`;
          tipEl.style.top = `${y - 36}px`;
        }
      })
      .on("mouseleave", function(_event, d) {
        // Restore original style
        const idx = pathElementsRef.current.indexOf(this as SVGPathElement);
        const cached = layerDataCache.get(congressRef.current);
        if (cached && idx >= 0) {
          d3.select(this)
            .attr("stroke-width", 0.5)
            .attr("stroke-opacity", 0.7)
            .attr("fill-opacity", cached.fillOpacities[idx]);
        } else {
          const p = d.properties as Record<string, unknown>;
          const party = String(p._party ?? "unknown");
          d3.select(this)
            .attr("stroke-width", 0.5)
            .attr("stroke-opacity", 0.7)
            .attr("fill-opacity", String(PARTY_FILL_OPACITY[party] ?? 0.18));
        }
        onHoverRef.current?.(null);
      })
      .on("pointerdown", function(_event) {
        const e = _event as PointerEvent;
        pointerDownRef.current = { x: e.clientX, y: e.clientY };
      })
      .on("pointerup", function(_event, d) {
        const e = _event as PointerEvent;
        const pd = pointerDownRef.current;
        pointerDownRef.current = null;
        if (!pd) return;
        const dx = e.clientX - pd.x;
        const dy = e.clientY - pd.y;
        if (dx * dx + dy * dy > 25) return; // drag threshold
        // It's a click
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

    pathElementsRef.current = selection.nodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  // ── Color-only update ──────────────────────────────────────────────────────
  const recolor = useCallback((cached: LayerData): boolean => {
    const els = pathElementsRef.current;
    if (els.length !== cached.features.length) return false;
    const { fills, fillOpacities, strokes } = cached;
    for (let i = 0; i < els.length; i++) {
      const s = els[i].style;
      s.fill = fills[i];
      s.fillOpacity = fillOpacities[i];
      s.stroke = strokes[i];
    }
    return true;
  }, []);

  const fullRedrawRef = useRef(fullRedraw);
  useEffect(() => { fullRedrawRef.current = fullRedraw; }, [fullRedraw]);

  // ── Imperative handle ──────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    jumpTo(targetCongress: number) {
      const svg = svgRef.current;
      if (!svg) return;
      const cached = layerDataCache.get(targetCongress);
      if (!cached) return;

      const els = pathElementsRef.current;
      const { fills, fillOpacities, strokes, features } = cached;

      if (els.length === features.length) {
        for (let i = 0; i < els.length; i++) {
          const s = els[i].style;
          s.fill = fills[i];
          s.fillOpacity = fillOpacities[i];
          s.stroke = strokes[i];
        }
        drawnCongressRef.current = targetCongress;
        return;
      }

      const rect = svg.getBoundingClientRect();
      fullRedrawRef.current(cached.features, rect.width || 960, rect.height || 600, cached);
      drawnCongressRef.current = targetCongress;
    },
    resetZoom() {
      const svg = svgRef.current;
      if (!svg || !zoomRef.current) return;
      d3.select(svg).transition().duration(400)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    },
    getZoom() {
      return savedTransformRef.current;
    },
  }), []);

  // ── D3 Zoom setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const rect = svg.getBoundingClientRect();
    const width = rect.width || 960;
    const height = rect.height || 600;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .extent([[0, 0], [width, height]])
      .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]])
      .on("zoom", (event) => {
        d3.select(g).attr("transform", event.transform.toString());
        savedTransformRef.current = event.transform;
        setIsZoomed(event.transform.k > 1.05);
        if (!isSyncingRef.current) {
          onZoomChangeRef.current?.(event.transform);
        }
      });

    zoomRef.current = zoom;
    d3.select(svg).call(zoom);

    // Restore saved transform
    if (savedTransformRef.current.k > 1.01) {
      d3.select(svg).call(zoom.transform, savedTransformRef.current);
      d3.select(g).attr("transform", savedTransformRef.current.toString());
    }

    return () => {
      d3.select(svg).on(".zoom", null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync zoom from other panel ─────────────────────────────────────────────
  useEffect(() => {
    if (!syncZoom || !zoomRef.current || !svgRef.current) return;
    // Avoid feedback loop
    if (savedTransformRef.current.k === syncZoom.k &&
        savedTransformRef.current.x === syncZoom.x &&
        savedTransformRef.current.y === syncZoom.y) return;
    isSyncingRef.current = true;
    d3.select(svgRef.current).call(zoomRef.current.transform, syncZoom);
    isSyncingRef.current = false;
  }, [syncZoom]);

  // ── State zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedState || !svgRef.current || !zoomRef.current) return;
    const svg = svgRef.current;
    const cached = layerDataCache.get(congressRef.current);
    if (!cached) return;
    const stateAbbrev = STATE_CODES[selectedState] ?? "";
    if (!stateAbbrev) return;

    const stateFeatures = cached.features.filter(f => {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      return String(p._stateAbbrev ?? "") === stateAbbrev;
    });
    if (stateFeatures.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const W = rect.width || 960;
    const H = rect.height || 600;
    const projection = buildProjection(W, H);
    const pathGen = d3.geoPath().projection(projection);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of stateFeatures) {
      const b = pathGen.bounds(f);
      if (b[0][0] < minX) minX = b[0][0];
      if (b[0][1] < minY) minY = b[0][1];
      if (b[1][0] > maxX) maxX = b[1][0];
      if (b[1][1] > maxY) maxY = b[1][1];
    }
    if (!isFinite(minX)) return;

    const padX = (maxX - minX) * 0.12;
    const padY = (maxY - minY) * 0.12;
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const bW = maxX - minX;
    const bH = maxY - minY;
    const scale = Math.min(W / bW, H / bH) * 0.92;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = W / 2 - cx * scale;
    const ty = H / 2 - cy * scale;
    const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);

    d3.select(svg).transition().duration(650)
      .call(zoomRef.current.transform, targetTransform);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, congress]);

  // ── Clear state zoom when deselected ───────────────────────────────────────
  useEffect(() => {
    if (selectedState === "" && svgRef.current && zoomRef.current && savedTransformRef.current.k > 1.05) {
      d3.select(svgRef.current).transition().duration(400)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  // ── Main effect: runs on congress change ───────────────────────────────────
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
        const ok = recolor(cached);
        if (ok) {
          drawnCongressRef.current = congress;
          if (!cancelled) { setDistrictCount(cached.features.length); setIsLoading(false); }
          return;
        }
      }

      setIsLoading(true);
      fullRedraw(cached.features, W, H, cached);
      drawnCongressRef.current = congress;
      if (!cancelled) { setDistrictCount(cached.features.length); setIsLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [congress, fullRedraw, recolor]);

  // ── ResizeObserver ─────────────────────────────────────────────────────────
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
        style={{ background: "transparent", cursor: isZoomed ? "grab" : "default" }}
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

      {/* Zoom controls */}
      <div className="absolute bottom-12 left-3 flex flex-col gap-1" style={{ zIndex: 15 }}>
        <button
          onClick={() => {
            if (!svgRef.current || !zoomRef.current) return;
            d3.select(svgRef.current).transition().duration(300)
              .call(zoomRef.current.scaleBy, 1.5);
          }}
          className="w-7 h-7 flex items-center justify-center bg-black/60 backdrop-blur border border-white/20 rounded text-white/80 hover:bg-black/80 hover:text-white transition-colors text-sm font-bold"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => {
            if (!svgRef.current || !zoomRef.current) return;
            d3.select(svgRef.current).transition().duration(300)
              .call(zoomRef.current.scaleBy, 0.67);
          }}
          className="w-7 h-7 flex items-center justify-center bg-black/60 backdrop-blur border border-white/20 rounded text-white/80 hover:bg-black/80 hover:text-white transition-colors text-sm font-bold"
          title="Zoom out"
        >−</button>
        {isZoomed && (
          <button
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              d3.select(svgRef.current).transition().duration(400)
                .call(zoomRef.current.transform, d3.zoomIdentity);
            }}
            className="w-7 h-7 flex items-center justify-center bg-black/60 backdrop-blur border border-white/20 rounded text-white/80 hover:bg-black/80 hover:text-white transition-colors"
            title="Reset zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h6M3 3v6M21 3h-6M21 3v6M3 21h6M3 21v-6M21 21h-6M21 21v-6"/>
            </svg>
          </button>
        )}
      </div>

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

// ─── Tooltip Component ────────────────────────────────────────────────────────
function MapTooltip({ info, panelId }: { info: { x: number; y: number; content: string } | null; panelId: string }) {
  if (!info) return null;
  return (
    <div
      data-tooltip-panel={panelId}
      className="absolute pointer-events-none bg-black/85 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 text-xs text-white shadow-xl whitespace-pre-line"
      style={{ left: info.x + 14, top: info.y - 36, zIndex: 25, maxWidth: 220 }}
    >
      {info.content}
    </div>
  );
}

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
        disabled
={!atlasReady}
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
  const isMobile = useIsMobile();
  const urlState = getUrlState();
  const [congressA, setCongressA] = useState(urlState.congressA);
  const [congressB, setCongressB] = useState(urlState.congressB);
  const [compareMode, setCompareMode] = useState(urlState.compare);
  const [selectedState, setSelectedState] = useState(urlState.state);
  const [districtPopup, setDistrictPopup] = useState<Record<string, unknown> | null>(null);
  const [stateDetailOpen, setStateDetailOpen] = useState<string | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [speedIdxA, setSpeedIdxA] = useState(1);
  const [speedIdxB, setSpeedIdxB] = useState(1);
  const [tooltipA, setTooltipA] = useState<{ x: number; y: number; content: string } | null>(null);
  const [tooltipB, setTooltipB] = useState<{ x: number; y: number; content: string } | null>(null);
  const [syncZoomB, setSyncZoomB] = useState<d3.ZoomTransform | null>(null);
  const [syncZoomA, setSyncZoomA] = useState<d3.ZoomTransform | null>(null);
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

  const canPlayA = warmup.initialReady && layerDataCache.has(congressA) &&
    [1,2].every(d => congressA + d > CONGRESS_END || layerDataCache.has(congressA + d));
  const canPlayB = warmup.initialReady && layerDataCache.has(congressB) &&
    [1,2].every(d => congressB + d > CONGRESS_END || layerDataCache.has(congressB + d));

  // Clock
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── URL state persistence ──────────────────────────────────────────────────
  useEffect(() => {
    setUrlState({ congressA, congressB, compare: compareMode, state: selectedState });
  }, [congressA, congressB, compareMode, selectedState]);

  // ── Synchronized zoom in compare mode ──────────────────────────────────────
  const handleZoomChangeA = useCallback((transform: d3.ZoomTransform) => {
    if (compareMode) setSyncZoomB(transform);
  }, [compareMode]);
  const handleZoomChangeB = useCallback((transform: d3.ZoomTransform) => {
    if (compareMode) setSyncZoomA(transform);
  }, [compareMode]);

  // Stable refs for animation
  const congressARef = useRef(congressA);
  const congressBRef = useRef(congressB);
  useEffect(() => { congressARef.current = congressA; }, [congressA]);
  useEffect(() => { congressBRef.current = congressB; }, [congressB]);

  // ── Animation playback A ───────────────────────────────────────────────────
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
        if (!layerDataCache.has(next)) {
          lastTime = now;
          rafId = requestAnimationFrame(tick);
          return;
        }
        panelARef.current?.jumpTo(next);
        setCongressA(next);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingA, speedIdxA]);

  // ── Animation playback B ───────────────────────────────────────────────────
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
        if (!layerDataCache.has(next)) {
          lastTime = now;
          rafId = requestAnimationFrame(tick);
          return;
        }
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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ": // Space = play/pause
          e.preventDefault();
          if (compareMode) {
            handlePlayToggleA();
            handlePlayToggleB();
          } else {
            handlePlayToggleA();
          }
          break;
        case "ArrowLeft": // Step backward
          e.preventDefault();
          if (congressA > CONGRESS_START) {
            setCongressA(c => Math.max(CONGRESS_START, c - 1));
            setIsPlayingA(false);
          }
          if (compareMode && congressB > CONGRESS_START) {
            setCongressB(c => Math.max(CONGRESS_START, c - 1));
            setIsPlayingB(false);
          }
          break;
        case "ArrowRight": // Step forward
          e.preventDefault();
          if (congressA < CONGRESS_END) {
            setCongressA(c => Math.min(CONGRESS_END, c + 1));
            setIsPlayingA(false);
          }
          if (compareMode && congressB < CONGRESS_END) {
            setCongressB(c => Math.min(CONGRESS_END, c + 1));
            setIsPlayingB(false);
          }
          break;
        case "c": // Toggle compare mode
        case "C":
          if (!e.ctrlKey && !e.metaKey) {
            setCompareMode(m => !m);
          }
          break;
        case "r": // Reset zoom
        case "R":
          if (!e.ctrlKey && !e.metaKey) {
            panelARef.current?.resetZoom();
            panelBRef.current?.resetZoom();
          }
          break;
        case "Escape": // Close popup/panel
          if (stateDetailOpen) { setStateDetailOpen(null); }
          else { setDistrictPopup(null); }
          break;
        case "s": // Open state detail for selected state
        case "S":
          if (!e.ctrlKey && !e.metaKey && selectedState) {
            setStateDetailOpen(selectedState);
          }
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compareMode, congressA, congressB, handlePlayToggleA, handlePlayToggleB]);

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="relative w-screen h-screen overflow-hidden flex flex-col">
        {/* Sky video background */}
        <video key={sky.url} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
          <source src={sky.url} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ zIndex: 1, background: 'rgba(0,0,0,0.15)' }} />

        {/* Mobile header */}
        <header className="relative flex items-center gap-2 px-3 h-10 shrink-0 border-b border-white/10"
          style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-white font-semibold text-xs tracking-tight">Historical Atlas</span>
          <div className="flex-1" />
          <span className="text-amber-400 font-bold text-sm">{ordinal(congressA)}</span>
          <span className="text-white/40 text-[10px]">({congressYears(congressA)[0]})</span>
          <Link href="/" className="text-white/40 hover:text-white/80 text-xs ml-2">←</Link>
        </header>

        {/* Mobile congress selector */}
        <div className="relative shrink-0 flex items-center px-3 h-9 gap-2 border-b border-white/10"
          style={{ zIndex: 10, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
          <select value={congressA} onChange={e => { setCongressA(Number(e.target.value)); setIsPlayingA(false); }}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none flex-1">
            {Array.from({ length: CONGRESS_END - CONGRESS_START + 1 }, (_, i) => CONGRESS_START + i).map(n => {
              const [y] = congressYears(n);
              return <option key={n} value={n}>{ordinal(n)} ({y})</option>;
            })}
          </select>
          <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none">
            <option value="">All states</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Mobile map panel */}
        <div className="relative flex-1 min-h-0" style={{ zIndex: 5 }}>
          <D3MapPanel
            ref={panelARef}
            congress={congressA}
            panelId="A"
            compareMode={false}
            onDistrictClick={setDistrictPopup}
            onHover={setTooltipA}
            selectedState={selectedState || undefined}
          />
          <MapTooltip info={tooltipA} panelId="A" />
        </div>

        {/* Mobile timeline */}
        <div className="relative shrink-0 px-3 pt-3 pb-2 border-t border-white/10"
          style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
          {!warmup.initialReady && (
            <div className="mb-2">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: "linear-gradient(to right, #F59E0B, #EF4444)" }} />
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
            atlasReady={canPlayA}
          />
          <div className="mt-1 text-[9px] text-white/30 text-center">
            Pinch to zoom · Tap district for details
          </div>
        </div>

        {/* Mobile district popup */}
        {districtPopup && <MobileDistrictPopup popup={districtPopup} onClose={() => setDistrictPopup(null)} />}

        {/* Mobile state detail panel (full-screen overlay) */}
        {stateDetailOpen && (
          <div className="absolute inset-0" style={{ zIndex: 30 }}>
            <StateDetailPanel
              stateName={stateDetailOpen}
              currentCongress={congressA}
              onClose={() => setStateDetailOpen(null)}
              onCongressSelect={(c) => { setCongressA(c); setIsPlayingA(false); setStateDetailOpen(null); }}
              partyCache={partyCache}
              membersCache={membersCache}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
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
          {selectedState && (
            <button onClick={() => setStateDetailOpen(selectedState)}
              className="text-amber-400/70 hover:text-amber-300 text-xs border border-amber-400/30 rounded px-2 py-0.5 transition-colors"
              title="View state history">
              ▣ Detail
            </button>
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

      {/* ── Map panels ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 5 }}>
        <D3MapPanel
          ref={panelARef}
          congress={congressA}
          panelId="A"
          compareMode={compareMode}
          onDistrictClick={setDistrictPopup}
          onHover={setTooltipA}
          selectedState={selectedState || undefined}
          syncZoom={syncZoomA}
          onZoomChange={handleZoomChangeA}
        />
        <MapTooltip info={tooltipA} panelId="A" />
        {compareMode && (
          <>
            <div className="w-px bg-white/20 shrink-0" />
            <D3MapPanel
              ref={panelBRef}
              congress={congressB}
              panelId="B"
              compareMode={compareMode}
              onDistrictClick={setDistrictPopup}
              onHover={setTooltipB}
              selectedState={selectedState || undefined}
              syncZoom={syncZoomB}
              onZoomChange={handleZoomChangeB}
            />
            <MapTooltip info={tooltipB} panelId="B" />
          </>
        )}
      </div>

      {/* ── Timeline / Slider ── */}
      <div className="relative shrink-0 px-5 pt-5 pb-2 border-t border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
        {!warmup.initialReady && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-amber-300/70 font-mono uppercase tracking-widest">
                Loading initial map data…
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: "linear-gradient(to right, #F59E0B, #EF4444)" }} />
            </div>
          </div>
        )}
        {warmup.initialReady && !warmup.ready && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] text-white/40 font-mono">
              Caching history: {warmup.done}/{warmup.total}
            </span>
            <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(warmup.done / warmup.total) * 100}%`, background: "rgba(245,158,11,0.4)" }} />
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
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[10px] text-white/30">
            District boundaries: Jeffrey B. Lewis, Brandon DeVine, Lincoln Pitcher &amp; Kenneth C. Martis · cdmaps.polisci.ucla.edu · Party data: Voteview / UCLA
          </div>
          <div className="text-[9px] text-white/20 font-mono ml-4 shrink-0">
            Space: play · ←/→: step · C: compare · R: reset zoom
          </div>
        </div>
      </div>

      {/* ── District click popup ── */}
      {districtPopup && (() => {
        const party = districtPopup._party as string | null;
        const partyColor = party === "D" ? "#5b8fd4" : party === "R" ? "#e06060" : party === "I" ? "#a78bfa" : "#888";
        const partyLabel = party === "D" ? "Democrat" : party === "R" ? "Republican" : party === "I" ? "Independent" : "Unknown";
        const memberName = districtPopup._memberName as string | null;
        const bioguide = districtPopup._memberBioguide as string | null;
        const popupCongress = districtPopup._congress as number | null;
        const stateName = String(districtPopup.statename ?? districtPopup.STATENAME ?? "Unknown State");
        const distNum = Number(districtPopup.district ?? districtPopup.DISTRICT ?? 0);
        const distLabel = distNum === 0 ? "At-Large" : String(distNum);
        const [yearsStart] = popupCongress ? congressYears(popupCongress) : [null];
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
            {popupCongress && (
              <div className="text-white/50 text-xs border-t border-white/10 pt-2 mt-1">
                {ordinal(popupCongress)} Congress
                {yearsStart && <span className="text-white/30 ml-1">({yearsStart}–{yearsStart + 1})</span>}
              </div>
            )}
            {Boolean(districtPopup.startcong || districtPopup.STARTCONG) && (
              <div className="text-white/30 text-xs mt-0.5">
                Boundary valid: {ordinal(Number(districtPopup.startcong ?? districtPopup.STARTCONG))}–
                {ordinal(Number(districtPopup.endcong ?? districtPopup.ENDCONG ?? districtPopup.startcong ?? districtPopup.STARTCONG))} Congress
              </div>
            )}
            {/* State detail button */}
            <button
              onClick={() => {
                const sn = String(districtPopup.statename ?? districtPopup.STATENAME ?? "");
                if (sn) { setStateDetailOpen(sn); setDistrictPopup(null); }
              }}
              className="mt-2 w-full text-center text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg py-1.5 transition-colors"
            >
              View {String(districtPopup.statename ?? districtPopup.STATENAME ?? "State")} History →
            </button>
          </div>
        );
      })()}

      {/* State Detail Panel */}
      {stateDetailOpen && (
        <StateDetailPanel
          stateName={stateDetailOpen}
          currentCongress={congressA}
          onClose={() => setStateDetailOpen(null)}
          onCongressSelect={(c) => { setCongressA(c); setIsPlayingA(false); }}
          partyCache={partyCache}
          membersCache={membersCache}
        />
      )}
    </div>
  );
}

// ─── Mobile District Popup ────────────────────────────────────────────────────
function MobileDistrictPopup({ popup, onClose }: { popup: Record<string, unknown>; onClose: () => void }) {
  const party = popup._party as string | null;
  const partyColor = party === "D" ? "#5b8fd4" : party === "R" ? "#e06060" : party === "I" ? "#a78bfa" : "#888";
  const partyLabel = party === "D" ? "Democrat" : party === "R" ? "Republican" : party === "I" ? "Independent" : "Unknown";
  const memberName = popup._memberName as string | null;
  const bioguide = popup._memberBioguide as string | null;
  const popupCongress = popup._congress as number | null;
  const stateName = String(popup.statename ?? popup.STATENAME ?? "Unknown State");
  const distNum = Number(popup.district ?? popup.DISTRICT ?? 0);
  const distLabel = distNum === 0 ? "At-Large" : String(distNum);
  const [yearsStart] = popupCongress ? congressYears(popupCongress) : [null];

  return (
    <div className="absolute bottom-20 left-3 right-3 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white text-sm shadow-2xl"
      style={{ zIndex: 20 }}>
      <button onClick={onClose}
        className="absolute top-2 right-3 text-white/40 hover:text-white text-lg leading-none">×</button>
      <div className="font-bold text-sm mb-1">
        {stateName} — {distLabel === "At-Large" ? "At-Large" : `District ${distLabel}`}
      </div>
      {memberName && (
        <div className="flex items-center gap-2 mb-1">
          {bioguide && (
            <img src={`https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`}
              alt={memberName} className="w-7 h-7 rounded-full object-cover border border-white/20"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <div>
            <div className="text-white font-semibold text-xs">{memberName}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: partyColor }} />
              <span className="text-[10px] font-semibold" style={{ color: partyColor }}>{partyLabel}</span>
            </div>
          </div>
        </div>
      )}
      {!memberName && party && (
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: partyColor }} />
          <span className="text-xs font-semibold" style={{ color: partyColor }}>{partyLabel}</span>
        </div>
      )}
      {popupCongress && (
        <div className="text-white/50 text-[10px]">
          {ordinal(popupCongress)} Congress{yearsStart && ` (${yearsStart}–${yearsStart + 1})`}
        </div>
      )}
    </div>
  );
}
