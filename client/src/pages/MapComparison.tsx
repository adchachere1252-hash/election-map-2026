/**
 * Congressional Historical Map Atlas
 * Full-screen interactive map showing U.S. congressional district boundaries
 * for every Congress from the 89th (1965) through 119th (2025).
 * Design: GeoJSON district shapes floating organically over animated sky video background.
 * Uses Leaflet with NO tile layer — only district outlines are visible.
 * Party data: Voteview / Clerk of the House / Wikipedia
 * District boundaries: Jeffrey B. Lewis et al. (cdmaps.polisci.ucla.edu)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";
import { STATE_CODES } from "@/lib/electionUtils";

// ─── Party colors matching the main election map ──────────────────────────────
const PARTY_FILL = {
  D: "#1a4fa0",
  R: "#b22222",
  I: "#7c3aed",
  unknown: "rgba(80,80,100,0.3)",
};
const PARTY_FILL_OPACITY = { D: 0.55, R: 0.55, I: 0.55, unknown: 0.18 };
const PARTY_STROKE = {
  D: "#82aaff",
  R: "#ff7878",
  I: "#c896ff",
  unknown: "#aaaacc",
};
const PARTY_STROKE_OPACITY = { D: 0.75, R: 0.75, I: 0.75, unknown: 0.35 };

// ─── Voteview party data cache ────────────────────────────────────────────────
const partyCache = new Map<number, Record<string, string>>();
const membersCache = new Map<number, Record<string, { name: string; party: string; bioguide: string }>>();

async function fetchPartyData(congress: number): Promise<Record<string, string>> {
  if (partyCache.has(congress)) return partyCache.get(congress)!;
  try {
    const res = await fetch(`/api/voteview/${congress}`);
    if (!res.ok) return {};
    const data = await res.json() as Record<string, string>;
    partyCache.set(congress, data);
    return data;
  } catch {
    return {};
  }
}

async function fetchMembersData(congress: number): Promise<Record<string, { name: string; party: string; bioguide: string }>> {
  if (membersCache.has(congress)) return membersCache.get(congress)!;
  try {
    const res = await fetch(`/api/voteview/members/${congress}`);
    if (!res.ok) return {};
    const data = await res.json() as Record<string, { name: string; party: string; bioguide: string }>;
    membersCache.set(congress, data);
    return data;
  } catch {
    return {};
  }
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
// All labels on a single row above the slider track
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
  { label: "Slow", ms: 1600 },
  { label: "Med", ms: 800 },
  { label: "Fast", ms: 300 },
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

async function fetchStateGeoJson(stateName: string, congress: number): Promise<GeoJSON.FeatureCollection | null> {
  const key = `${stateName}-${congress}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  const manifest = LEWIS_MANIFEST[stateName];
  if (!manifest) return null;
  // Find the entry that covers this congress
  const entry = manifest.find(e => congress >= e.start && congress <= e.end);
  if (!entry) return null;
  try {
    const res = await fetch(`/api/geojson/${encodeURIComponent(entry.name)}`);
    if (!res.ok) return null;
    const data = await res.json() as GeoJSON.FeatureCollection;
    geoCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

// ─── Background prefetch ──────────────────────────────────────────────────────
// Silently warm the cache for a given congress without touching the UI
const prefetchInProgress = new Set<string>();
async function prefetchCongress(congress: number): Promise<void> {
  if (congress < CONGRESS_START || congress > CONGRESS_END) return;
  const key = `prefetch-${congress}`;
  if (prefetchInProgress.has(key)) return;
  prefetchInProgress.add(key);
  // Prefetch party + member data (fast, single CSV per congress)
  await Promise.all([fetchPartyData(congress), fetchMembersData(congress)]);
  // Prefetch GeoJSON for all states in batches of 8 (low priority — fire and forget)
  const BATCH = 8;
  for (let i = 0; i < US_STATES.length; i += BATCH) {
    const batch = US_STATES.slice(i, i + BATCH);
    await Promise.all(batch.map(s => fetchStateGeoJson(s, congress)));
  }
  prefetchInProgress.delete(key);
}

// ─── Leaflet Map Panel ────────────────────────────────────────────────────────
interface LeafletMapPanelProps {
  congress: number;
  panelId: "A" | "B";
  compareMode: boolean;
  selectedState: string;
  onDistrictClick?: (props: Record<string, unknown>) => void;
  syncView?: { center: L.LatLng; zoom: number } | null;
  onViewChange?: (center: L.LatLng, zoom: number) => void;
  synced: boolean;
}

function LeafletMapPanel({
  congress,
  panelId,
  compareMode,
  selectedState,
  onDistrictClick,
  syncView,
  onViewChange,
  synced,
}: LeafletMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const suppressSyncRef = useRef(false);
  const [districtCount, setDistrictCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const usBounds = L.latLngBounds([[20, -130], [52, -60]]);
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
    });
    map.fitBounds(usBounds, { padding: [0, 0] });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    const container = map.getContainer();
    container.style.background = "transparent";
    const panes = container.querySelectorAll(".leaflet-tile-pane, .leaflet-shadow-pane");
    panes.forEach(p => ((p as HTMLElement).style.display = "none"));

    mapRef.current = map;

    map.on("moveend zoomend", () => {
      if (suppressSyncRef.current) return;
      onViewChange?.(map.getCenter(), map.getZoom());
    });

    // Leaflet measures container size at init — call invalidateSize after the
    // browser has painted so flex-1 has resolved to real pixels.
    const t1 = setTimeout(() => { map.invalidateSize(); map.fitBounds(usBounds, { padding: [0, 0] }); }, 50);
    const t2 = setTimeout(() => { map.invalidateSize(); map.fitBounds(usBounds, { padding: [0, 0] }); }, 300);

    // Also watch for container resize (e.g. compare mode toggling panel width)
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync view from external source
  useEffect(() => {
    if (!synced || !syncView || !mapRef.current) return;
    suppressSyncRef.current = true;
    mapRef.current.setView(syncView.center, syncView.zoom, { animate: false });
    suppressSyncRef.current = false;
  }, [syncView, synced]);

  // Jump to selected state
  useEffect(() => {
    if (!selectedState || !mapRef.current) return;
    const stateData = geoCache.get(`${selectedState}-${congress}`);
    if (!stateData) return;
    const layer = L.geoJSON(stateData);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
    }
  }, [selectedState, congress]);

  // Load district GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (districtLayerRef.current) {
      map.removeLayer(districtLayerRef.current);
      districtLayerRef.current = null;
    }
    setDistrictCount(0);
    setIsLoading(true);

    let cancelled = false;
    const statesToLoad = selectedState ? [selectedState] : US_STATES;
    let total = 0;

    const layer = L.geoJSON(undefined, {
      style: (feature) => {
        const p = feature?.properties as Record<string, unknown> ?? {};
        const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
        const stateAbbrev = STATE_CODES[String(p?.statename ?? p?.STATENAME ?? "")] ?? "";
        const key = `${stateAbbrev}-${dist}`;
        const partyData = partyCache.get(congress) ?? {};
        let party = partyData[key];
        if (!party && dist === 0) party = partyData[`${stateAbbrev}-1`];
        const pk = (party ?? "unknown") as keyof typeof PARTY_FILL;
        return {
          fillColor: PARTY_FILL[pk] ?? PARTY_FILL.unknown,
          fillOpacity: PARTY_FILL_OPACITY[pk] ?? 0.18,
          color: PARTY_STROKE[pk] ?? PARTY_STROKE.unknown,
          strokeOpacity: PARTY_STROKE_OPACITY[pk] ?? 0.35,
          weight: 0.8,
        };
      },
      onEachFeature: (feature, lyr) => {
        lyr.on("click", () => {
          const p = feature.properties as Record<string, unknown>;
          const dist = Number(p?.district ?? p?.DISTRICT ?? 0);
          const stateAbbrev = STATE_CODES[String(p?.statename ?? p?.STATENAME ?? "")] ?? "";
          const key = `${stateAbbrev}-${dist}`;
          const partyData = partyCache.get(congress) ?? {};
          let party = partyData[key];
          if (!party && dist === 0) party = partyData[`${stateAbbrev}-1`];
          // Look up member name
          const membersData = membersCache.get(congress) ?? {};
          let member = membersData[key];
          if (!member && dist === 0) member = membersData[`${stateAbbrev}-1`];
          onDistrictClick?.({
            ...p,
            _party: party ?? null,
            _stateAbbrev: stateAbbrev,
            _memberName: member?.name ?? null,
            _memberBioguide: member?.bioguide ?? null,
            _congress: congress,
          });
        });
      },
    });
    layer.addTo(map);
    districtLayerRef.current = layer;

    (async () => {
      // Pre-fetch party and member data in parallel
      await Promise.all([fetchPartyData(congress), fetchMembersData(congress)]);
      if (cancelled) return;

      // Fetch all states in parallel batches of 8 for faster loading
      const BATCH = 8;
      for (let i = 0; i < statesToLoad.length; i += BATCH) {
        if (cancelled) break;
        const batch = statesToLoad.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(s => fetchStateGeoJson(s, congress)));
        if (cancelled) break;
        for (const data of results) {
          if (!data) continue;
          layer.addData(data);
          total += data.features.length;
        }
        setDistrictCount(total);
      }
      if (!cancelled) setIsLoading(false);

      if (!cancelled && selectedState) {
        const stateData = geoCache.get(`${selectedState}-${congress}`);
        if (stateData) {
          const bounds = L.geoJSON(stateData).getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [congress, selectedState]);

  const seats = HOUSE_SEATS[congress] ?? { D: 0, R: 0, O: 0 };
  const total = seats.D + seats.R + seats.O;

  return (
    <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden" style={{ background: "transparent" }}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: "transparent" }}
      />
      {/* Loading indicator */}
      <div className="absolute bottom-3 left-3 text-xs font-mono text-white/60 bg-black/30 px-2 py-1 rounded pointer-events-none" style={{ zIndex: 1000 }}>
        {isLoading ? `${districtCount} districts loaded…` : `${districtCount} districts`}
      </div>
      {/* Party seats legend */}
      {!compareMode && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/10" style={{ zIndex: 1000 }}>
          <div className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-semibold">Party Seats</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#1a4fa0' }} />
            <span className="text-white/80">Democrat</span>
            <span className="ml-auto font-bold" style={{ color: '#5b8fd4' }}>{seats.D}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#b22222' }} />
            <span className="text-white/80">Republican</span>
            <span className="ml-auto font-bold" style={{ color: '#e06060' }}>{seats.R}</span>
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
      {/* Panel label in compare mode */}
      {compareMode && (
        <div className="absolute top-3 left-3 text-xs font-mono text-white/50 bg-black/30 px-2 py-1 rounded uppercase tracking-widest" style={{ zIndex: 1000 }}>
          {panelId === "A" ? "LEFT" : "RIGHT"}
        </div>
      )}
      {compareMode && (
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/70 border border-white/10" style={{ zIndex: 1000 }}>
          <span className="font-bold" style={{ color: '#5b8fd4' }}>{seats.D}</span>
          <span className="text-white/30 mx-1">D</span>
          <span className="text-white/30 mx-1">·</span>
          <span className="font-bold" style={{ color: '#e06060' }}>{seats.R}</span>
          <span className="text-white/30 mx-1">R</span>
          {seats.O > 0 && <><span className="text-white/30 mx-1">·</span><span className="font-bold" style={{ color: '#a78bfa' }}>{seats.O}</span><span className="text-white/30 mx-1">O</span></>}
        </div>
      )}
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
}

function TimelineSlider({ congress, onChange, isPlaying, onPlayToggle, speedIdx, onSpeedChange, color, label }: TimelineSliderProps) {
  const totalCongresses = CONGRESS_END - CONGRESS_START;
  function sliderPct(c: number) {
    return ((c - CONGRESS_START) / totalCongresses) * 100;
  }
  const accentColor = color === "amber" ? "#F59E0B" : "#EF4444";
  const accentClass = color === "amber" ? "text-amber-400" : "text-red-400";
  const playBtnClass = color === "amber"
    ? "bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30"
    : "bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30";
  const milestoneTextClass = color === "amber" ? "text-amber-300/60" : "text-red-300/60";
  const milestoneDotClass = color === "amber" ? "bg-amber-400/50" : "bg-red-400/50";

  return (
    <div className="flex items-center gap-3">
      {/* Play/pause button */}
      <button
        onClick={onPlayToggle}
        className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors shrink-0 ${playBtnClass}`}
        title={isPlaying ? "Pause" : "Play animation"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
      {/* Speed selector */}
      <div className="flex gap-0.5 shrink-0">
        {PLAY_SPEEDS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => onSpeedChange(i)}
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-colors ${
              speedIdx === i
                ? color === "amber"
                  ? "bg-amber-500/30 border-amber-400/50 text-amber-300"
                  : "bg-red-500/30 border-red-400/50 text-red-300"
                : "bg-white/5 border-white/10 text-white/30 hover:text-white/60"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Slider track with milestone labels */}
      <div className="flex-1 relative" style={{ paddingTop: "18px" }}>
        {/* Milestone labels — all on one row, 18px above the slider */}
        {MILESTONES.map(m => (
          <div
            key={m.congress}
            className={`absolute text-[9px] font-semibold uppercase tracking-widest pointer-events-none ${milestoneTextClass}`}
            style={{
              left: `${sliderPct(m.congress)}%`,
              transform: "translateX(-50%)",
              top: "0px",
              whiteSpace: "nowrap",
            }}
          >
            {m.label}
          </div>
        ))}
        {/* Slider input — sits at the bottom of the padded area */}
        <input
          type="range"
          min={CONGRESS_START}
          max={CONGRESS_END}
          value={congress}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${accentColor} ${sliderPct(congress)}%, rgba(255,255,255,0.15) ${sliderPct(congress)}%)`,
            accentColor,
          }}
        />
        {/* Milestone tick marks on the track */}
        {MILESTONES.map(m => (
          <div
            key={m.congress}
            className={`absolute w-px h-2 -translate-x-1/2 ${milestoneDotClass}`}
            style={{ left: `${sliderPct(m.congress)}%`, bottom: "calc(100% - 18px - 6px)" }}
          />
        ))}
      </div>
      {/* Congress label */}
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
  const [congressA, setCongressA] = useState(CONGRESS_END);
  const [congressB, setCongressB] = useState(CONGRESS_START);
  const [compareMode, setCompareMode] = useState(false);
  const [synced, setSynced] = useState(true);
  const [selectedState, setSelectedState] = useState("");
  const [districtPopup, setDistrictPopup] = useState<Record<string, unknown> | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [speedIdxA, setSpeedIdxA] = useState(1); // default: Medium
  const [speedIdxB, setSpeedIdxB] = useState(1);
  const [syncViewA, setSyncViewA] = useState<{ center: L.LatLng; zoom: number } | null>(null);
  const [syncViewB, setSyncViewB] = useState<{ center: L.LatLng; zoom: number } | null>(null);
  const sky = getSkyVideo();

  // Clock
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Animation playback A
  useEffect(() => {
    if (!isPlayingA) return;
    const ms = PLAY_SPEEDS[speedIdxA].ms;
    const t = setInterval(() => {
      setCongressA(c => {
        if (c >= CONGRESS_END) { setIsPlayingA(false); return c; }
        return c + 1;
      });
    }, ms);
    return () => clearInterval(t);
  }, [isPlayingA, speedIdxA]);

  // Animation playback B
  useEffect(() => {
    if (!isPlayingB) return;
    const ms = PLAY_SPEEDS[speedIdxB].ms;
    const t = setInterval(() => {
      setCongressB(c => {
        if (c >= CONGRESS_END) { setIsPlayingB(false); return c; }
        return c + 1;
      });
    }, ms);
    return () => clearInterval(t);
  }, [isPlayingB, speedIdxB]);

  const handleViewChangeA = useCallback((center: L.LatLng, zoom: number) => {
    if (synced) setSyncViewB({ center, zoom });
  }, [synced]);
  const handleViewChangeB = useCallback((center: L.LatLng, zoom: number) => {
    if (synced) setSyncViewA({ center, zoom });
  }, [synced]);

  // Prefetch adjacent Congresses whenever congressA or congressB changes
  useEffect(() => {
    // Prefetch ±1 immediately, ±2 after a short delay to avoid competing with the current load
    prefetchCongress(congressA - 1);
    prefetchCongress(congressA + 1);
    const t = setTimeout(() => {
      prefetchCongress(congressA - 2);
      prefetchCongress(congressA + 2);
    }, 1500);
    return () => clearTimeout(t);
  }, [congressA]);

  useEffect(() => {
    if (!compareMode) return;
    prefetchCongress(congressB - 1);
    prefetchCongress(congressB + 1);
    const t = setTimeout(() => {
      prefetchCongress(congressB - 2);
      prefetchCongress(congressB + 2);
    }, 1500);
    return () => clearTimeout(t);
  }, [congressB, compareMode]);

  const handlePlayToggleA = () => {
    setIsPlayingA(p => !p);
    if (congressA >= CONGRESS_END) setCongressA(CONGRESS_START);
  };
  const handlePlayToggleB = () => {
    setIsPlayingB(p => !p);
    if (congressB >= CONGRESS_END) setCongressB(CONGRESS_START);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
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
          <span className="text-white/40 text-xs uppercase tracking-widest hidden sm:inline">Jump to State</span>
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-1 focus:outline-none"
          >
            <option value="">Select state…</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {selectedState && (
            <button
              onClick={() => setSelectedState("")}
              className="text-white/40 hover:text-white text-xs"
              title="Clear state filter"
            >✕</button>
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
        className="relative shrink-0 flex items-center border-b border-white/10 px-4 h-10 gap-4"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      >
        {/* Panel A selector */}
        <div className="flex items-center gap-2 flex-1">
          <span className={`text-base font-black ${compareMode ? "text-amber-400" : "text-amber-400"}`}>{ordinal(congressA)}</span>
          <span className="text-white/30 text-xs">{congressYears(congressA)[0]}–{congressYears(congressA)[1]}</span>
          <select
            value={congressA}
            onChange={e => { setCongressA(Number(e.target.value)); setIsPlayingA(false); }}
            className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none ml-1"
          >
            {Array.from({ length: CONGRESS_END - CONGRESS_START + 1 }, (_, i) => CONGRESS_START + i).map(n => {
              const [y] = congressYears(n);
              return <option key={n} value={n}>{ordinal(n)} Congress ({y}–{y + 1})</option>;
            })}
          </select>
          {compareMode && <span className="text-white/30 text-[10px] font-mono uppercase ml-1">Panel A</span>}
        </div>
        {/* Panel B selector (compare mode only) */}
        {compareMode && (
          <>
            <div className="w-px h-5 bg-white/20 shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-base font-black text-red-400">{ordinal(congressB)}</span>
              <span className="text-white/30 text-xs">{congressYears(congressB)[0]}–{congressYears(congressB)[1]}</span>
              <select
                value={congressB}
                onChange={e => { setCongressB(Number(e.target.value)); setIsPlayingB(false); }}
                className="bg-white/10 border border-white/20 rounded text-white text-xs px-2 py-0.5 focus:outline-none ml-1"
              >
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
        <LeafletMapPanel
          congress={congressA}
          panelId="A"
          compareMode={compareMode}
          selectedState={selectedState}
          onDistrictClick={setDistrictPopup}
          syncView={synced && compareMode ? syncViewA : null}
          onViewChange={handleViewChangeA}
          synced={synced}
        />
        {compareMode && (
          <>
            <div className="w-px bg-white/20 shrink-0" />
            <LeafletMapPanel
              congress={congressB}
              panelId="B"
              compareMode={compareMode}
              selectedState={selectedState}
              onDistrictClick={setDistrictPopup}
              syncView={synced && compareMode ? syncViewB : null}
              onViewChange={handleViewChangeB}
              synced={synced}
            />
          </>
        )}
      </div>

      {/* ── Timeline / Slider ── */}
      <div
        className="relative shrink-0 px-5 pt-5 pb-2 border-t border-white/10"
        style={{ zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      >
        <TimelineSlider
          congress={congressA}
          onChange={c => { setCongressA(c); setIsPlayingA(false); }}
          isPlaying={isPlayingA}
          onPlayToggle={handlePlayToggleA}
          speedIdx={speedIdxA}
          onSpeedChange={setSpeedIdxA}
          color="amber"
          label={compareMode ? "Panel A" : undefined}
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
            />
          </div>
        )}
        {/* Attribution */}
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
        const distLabel = distNum === 0 || distNum === 1
          ? (distNum === 0 ? "At-Large" : "1")
          : String(distNum);
        const [yearsStart] = congress ? congressYears(congress) : [null];
        return (
          <div
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-white text-sm shadow-2xl"
            style={{ zIndex: 20, minWidth: 280 }}
          >
            <button
              onClick={() => setDistrictPopup(null)}
              className="absolute top-2 right-3 text-white/40 hover:text-white text-lg leading-none"
            >×</button>
            {/* State + District heading */}
            <div className="font-bold text-base mb-1">
              {stateName}
              {" — "}
              {distLabel === "At-Large" ? "At-Large District" : `District ${distLabel}`}
            </div>
            {/* Member name */}
            {memberName ? (
              <div className="flex items-center gap-2 mb-2">
                {bioguide && (
                  <img
                    src={`https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`}
                    alt={memberName}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
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
            ) : (
              party && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: partyColor }} />
                  <span className="text-xs font-semibold" style={{ color: partyColor }}>{partyLabel}</span>
                </div>
              )
            )}
            {/* Congress info */}
            {congress && (
              <div className="text-white/50 text-xs border-t border-white/10 pt-2 mt-1">
                {ordinal(congress)} Congress
                {yearsStart && <span className="text-white/30 ml-1">({yearsStart}–{yearsStart + 1})</span>}
              </div>
            )}
            {/* District boundary range from GeoJSON */}
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
