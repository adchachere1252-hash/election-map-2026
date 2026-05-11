import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, X, Lock, Unlock, BookOpen, Map as MapIcon } from "lucide-react";
import { MapView } from "@/components/Map";

// ─── Time-of-day sky videos ────────────────────────────────────────────────────
interface SkySlot {
  label: string;
  location: string;
  videoUrl: string;
  posterUrl: string;
  hours: number[];
  overlayOpacity: number;
}

const SKY_SLOTS: SkySlot[] = [
  {
    label: "Dawn", location: "Sahara Desert, Morocco",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dawn_bf4762d3.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-dawn-C4NEGmxMBmPAbBv5CjZxv2.webp",
    hours: [5, 6], overlayOpacity: 0.2,
  },
  {
    label: "Morning", location: "Swiss Alps",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-morning_4e02649d.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-morning-YiBACdPTy7M9g3Z6MtoMqy.webp",
    hours: [7, 8, 9, 10], overlayOpacity: 0.25,
  },
  {
    label: "Midday", location: "Mediterranean Sea",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-midday_190395b8.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-midday-5ghZCUXyPdvTxWkA9jKmmh.webp",
    hours: [11, 12, 13], overlayOpacity: 0.25,
  },
  {
    label: "Afternoon", location: "Serengeti, Tanzania",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-afternoon_a64ba7ff.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-afternoon-Dppp6eqZmvCDq9TVtGURt7.webp",
    hours: [14, 15, 16], overlayOpacity: 0.2,
  },
  {
    label: "Evening", location: "Amalfi Coast, Italy",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-evening_8fcbd657.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-evening-Rq497YHshz5qkysgHhBAng.webp",
    hours: [17, 18, 19], overlayOpacity: 0.15,
  },
  {
    label: "Dusk", location: "Southeast Asia",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dusk_c5616f3b.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-dusk-8WJHCzQeHpQZFNbpqtmgzm.webp",
    hours: [20, 21], overlayOpacity: 0.15,
  },
  {
    label: "Night", location: "Patagonia, Chile",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-night_221c4237.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-night-FKxeETcLvAKtEQ2og9ZcmD.webp",
    hours: [22, 23, 0, 1, 2, 3, 4], overlayOpacity: 0.1,
  },
];

function getCurrentSky(): SkySlot {
  const hour = new Date().getHours();
  return SKY_SLOTS.find(s => s.hours.includes(hour)) ?? SKY_SLOTS[4];
}

// ─── Congress definitions: 89th (1965) → 119th (2025) ────────────────────────
export interface CongressInfo {
  number: number;
  label: string;
  years: string;
  startYear: number;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const CONGRESSES: CongressInfo[] = Array.from({ length: 31 }, (_, i) => {
  const num = 89 + i;
  const startYear = 1965 + i * 2;
  const endShort = String(startYear + 1).slice(-2);
  return { number: num, label: ordinal(num), years: `${startYear}–${endShort}`, startYear };
});

// ─── State list ───────────────────────────────────────────────────────────────
const STATES = [
  { name: "Alabama", abbr: "AL", center: { lat: 32.8, lng: -86.8 }, zoom: 7 },
  { name: "Alaska", abbr: "AK", center: { lat: 64.2, lng: -153.4 }, zoom: 4 },
  { name: "Arizona", abbr: "AZ", center: { lat: 34.3, lng: -111.1 }, zoom: 7 },
  { name: "Arkansas", abbr: "AR", center: { lat: 34.8, lng: -92.2 }, zoom: 7 },
  { name: "California", abbr: "CA", center: { lat: 37.2, lng: -119.4 }, zoom: 6 },
  { name: "Colorado", abbr: "CO", center: { lat: 39.0, lng: -105.5 }, zoom: 7 },
  { name: "Connecticut", abbr: "CT", center: { lat: 41.6, lng: -72.7 }, zoom: 9 },
  { name: "Delaware", abbr: "DE", center: { lat: 38.9, lng: -75.5 }, zoom: 9 },
  { name: "Florida", abbr: "FL", center: { lat: 28.1, lng: -81.6 }, zoom: 7 },
  { name: "Georgia", abbr: "GA", center: { lat: 32.7, lng: -83.4 }, zoom: 7 },
  { name: "Hawaii", abbr: "HI", center: { lat: 20.3, lng: -156.4 }, zoom: 7 },
  { name: "Idaho", abbr: "ID", center: { lat: 44.4, lng: -114.6 }, zoom: 6 },
  { name: "Illinois", abbr: "IL", center: { lat: 40.0, lng: -89.2 }, zoom: 7 },
  { name: "Indiana", abbr: "IN", center: { lat: 40.3, lng: -86.1 }, zoom: 7 },
  { name: "Iowa", abbr: "IA", center: { lat: 42.0, lng: -93.5 }, zoom: 7 },
  { name: "Kansas", abbr: "KS", center: { lat: 38.5, lng: -98.4 }, zoom: 7 },
  { name: "Kentucky", abbr: "KY", center: { lat: 37.5, lng: -85.3 }, zoom: 7 },
  { name: "Louisiana", abbr: "LA", center: { lat: 31.1, lng: -91.9 }, zoom: 7 },
  { name: "Maine", abbr: "ME", center: { lat: 45.4, lng: -69.0 }, zoom: 7 },
  { name: "Maryland", abbr: "MD", center: { lat: 39.0, lng: -76.8 }, zoom: 8 },
  { name: "Massachusetts", abbr: "MA", center: { lat: 42.3, lng: -71.8 }, zoom: 8 },
  { name: "Michigan", abbr: "MI", center: { lat: 44.3, lng: -85.4 }, zoom: 7 },
  { name: "Minnesota", abbr: "MN", center: { lat: 46.4, lng: -93.2 }, zoom: 7 },
  { name: "Mississippi", abbr: "MS", center: { lat: 32.7, lng: -89.7 }, zoom: 7 },
  { name: "Missouri", abbr: "MO", center: { lat: 38.5, lng: -92.5 }, zoom: 7 },
  { name: "Montana", abbr: "MT", center: { lat: 47.0, lng: -110.0 }, zoom: 6 },
  { name: "Nebraska", abbr: "NE", center: { lat: 41.5, lng: -99.9 }, zoom: 7 },
  { name: "Nevada", abbr: "NV", center: { lat: 38.5, lng: -117.1 }, zoom: 6 },
  { name: "New Hampshire", abbr: "NH", center: { lat: 43.7, lng: -71.6 }, zoom: 8 },
  { name: "New Jersey", abbr: "NJ", center: { lat: 40.1, lng: -74.5 }, zoom: 8 },
  { name: "New Mexico", abbr: "NM", center: { lat: 34.5, lng: -106.1 }, zoom: 7 },
  { name: "New York", abbr: "NY", center: { lat: 42.9, lng: -75.6 }, zoom: 7 },
  { name: "North Carolina", abbr: "NC", center: { lat: 35.5, lng: -79.4 }, zoom: 7 },
  { name: "North Dakota", abbr: "ND", center: { lat: 47.5, lng: -100.5 }, zoom: 7 },
  { name: "Ohio", abbr: "OH", center: { lat: 40.4, lng: -82.8 }, zoom: 7 },
  { name: "Oklahoma", abbr: "OK", center: { lat: 35.6, lng: -97.5 }, zoom: 7 },
  { name: "Oregon", abbr: "OR", center: { lat: 44.1, lng: -120.5 }, zoom: 7 },
  { name: "Pennsylvania", abbr: "PA", center: { lat: 40.9, lng: -77.8 }, zoom: 7 },
  { name: "Rhode Island", abbr: "RI", center: { lat: 41.7, lng: -71.5 }, zoom: 10 },
  { name: "South Carolina", abbr: "SC", center: { lat: 33.9, lng: -80.9 }, zoom: 8 },
  { name: "South Dakota", abbr: "SD", center: { lat: 44.4, lng: -100.2 }, zoom: 7 },
  { name: "Tennessee", abbr: "TN", center: { lat: 35.9, lng: -86.4 }, zoom: 7 },
  { name: "Texas", abbr: "TX", center: { lat: 31.5, lng: -99.3 }, zoom: 6 },
  { name: "Utah", abbr: "UT", center: { lat: 39.3, lng: -111.1 }, zoom: 7 },
  { name: "Vermont", abbr: "VT", center: { lat: 44.0, lng: -72.7 }, zoom: 8 },
  { name: "Virginia", abbr: "VA", center: { lat: 37.5, lng: -78.5 }, zoom: 7 },
  { name: "Washington", abbr: "WA", center: { lat: 47.4, lng: -120.5 }, zoom: 7 },
  { name: "West Virginia", abbr: "WV", center: { lat: 38.6, lng: -80.6 }, zoom: 7 },
  { name: "Wisconsin", abbr: "WI", center: { lat: 44.6, lng: -89.8 }, zoom: 7 },
  { name: "Wyoming", abbr: "WY", center: { lat: 43.0, lng: -107.6 }, zoom: 7 },
];

const US_CENTER = { lat: 39.5, lng: -98.35 };
const US_ZOOM = 4;

// ─── Preset comparisons ───────────────────────────────────────────────────────
const PRESETS = [
  { label: "Post-VRA 1965 → Today", congressA: 89, congressB: 119, icon: "⚖️" },
  { label: "Pre/Post Shelby County", congressA: 112, congressB: 113, icon: "🏛️" },
  { label: "Pre/Post 2020 Census", congressA: 116, congressB: 118, icon: "📊" },
  { label: "Pre/Post 2010 Census", congressA: 110, congressB: 113, icon: "📊" },
  { label: "Nixon → Reagan Era", congressA: 91, congressB: 99, icon: "🇺🇸" },
  { label: "Pre/Post Contract w/ America", congressA: 103, congressB: 104, icon: "📜" },
];

// ─── Dark map style ───────────────────────────────────────────────────────────
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6e7f8d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060a12" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5068" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#2a3a4a" }, { weight: 1.5 }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#1e2a38" }, { weight: 0.8 }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111827" }] },
];

// ─── GeoJSON loader ───────────────────────────────────────────────────────────
const geoJsonCache = new Map<string, GeoJSON.FeatureCollection | null>();
let dirListingPromise: Promise<string[]> | null = null;
let cachedDirListing: string[] | null = null;

async function fetchDirListing(): Promise<string[]> {
  if (cachedDirListing) return cachedDirListing;
  if (dirListingPromise) return dirListingPromise;
  dirListingPromise = (async () => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/JeffreyBLewis/congressional-district-boundaries/contents/GeoJson?per_page=300`
      );
      if (!res.ok) throw new Error("GitHub API error");
      const files: { name: string }[] = await res.json();
      cachedDirListing = files.map(f => f.name).filter(n => n.endsWith(".geojson"));
      return cachedDirListing;
    } catch {
      return [];
    }
  })();
  return dirListingPromise;
}

async function fetchGeoJsonForStateCongress(
  stateName: string,
  congressNum: number
): Promise<GeoJSON.FeatureCollection | null> {
  const cacheKey = `${stateName}_${congressNum}`;
  if (geoJsonCache.has(cacheKey)) return geoJsonCache.get(cacheKey)!;

  const files = await fetchDirListing();
  const prefix = stateName.replace(/ /g, "_") + "_";
  const stateFiles = files.filter(n => n.startsWith(prefix));

  const match = stateFiles.find(f => {
    const m = f.match(/_(\d{3})_to_(\d{3})\.geojson$/);
    if (!m) return false;
    return congressNum >= parseInt(m[1], 10) && congressNum <= parseInt(m[2], 10);
  });

  if (!match) { geoJsonCache.set(cacheKey, null); return null; }

  const url = `https://raw.githubusercontent.com/JeffreyBLewis/congressional-district-boundaries/master/GeoJson/${match}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch error");
    const data = await res.json();
    geoJsonCache.set(cacheKey, data);
    return data;
  } catch {
    geoJsonCache.set(cacheKey, null);
    return null;
  }
}

function getDistrictColor(feature: GeoJSON.Feature, alpha = 0.55): string {
  const props = feature.properties as Record<string, unknown> | null;
  if (!props) return `rgba(80,80,160,${alpha})`;
  const party = (props.party as string | undefined)?.toUpperCase();
  if (party === "D" || party === "DEM") return `rgba(30,100,200,${alpha})`;
  if (party === "R" || party === "REP") return `rgba(200,50,50,${alpha})`;
  const dist = Number(props.district ?? props.DISTRICT ?? 0);
  return dist % 2 === 0 ? `rgba(30,100,200,${alpha})` : `rgba(200,50,50,${alpha})`;
}

// ─── Sky background ───────────────────────────────────────────────────────────
function SkyBackground({ sky }: { sky: SkySlot }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [sky.videoUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <video
        ref={videoRef}
        key={sky.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline
        poster={sky.posterUrl}
      >
        <source src={sky.videoUrl} type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${sky.overlayOpacity})` }} />
    </div>
  );
}

// ─── Timeline slider ──────────────────────────────────────────────────────────
function TimelineSlider({
  value,
  onChange,
  accentColor,
  label,
}: {
  value: CongressInfo;
  onChange: (c: CongressInfo) => void;
  accentColor: string;
  label: string;
}) {
  const idx = CONGRESSES.findIndex(c => c.number === value.number);
  const pct = (idx / (CONGRESSES.length - 1)) * 100;

  // Milestone years to show on the track
  const milestones = [
    { congress: 89, label: "1965" },
    { congress: 94, label: "1975" },
    { congress: 99, label: "1985" },
    { congress: 104, label: "1995" },
    { congress: 109, label: "2005" },
    { congress: 114, label: "2015" },
    { congress: 119, label: "2025" },
  ];

  return (
    <div className="flex flex-col gap-1.5 w-full px-2">
      {/* Label + current value */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tabular-nums">
            {value.label} Congress
          </span>
          <span className="text-white/50 text-xs tabular-nums">
            {value.startYear}–{value.startYear + 1}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative w-full">
        {/* Filled track */}
        <div className="relative h-1.5 rounded-full bg-white/10 w-full">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-100"
            style={{ width: `${pct}%`, background: accentColor }}
          />
        </div>

        {/* Milestone ticks */}
        <div className="absolute top-0 left-0 w-full h-1.5 pointer-events-none">
          {milestones.map(m => {
            const mIdx = CONGRESSES.findIndex(c => c.number === m.congress);
            const mPct = (mIdx / (CONGRESSES.length - 1)) * 100;
            return (
              <div
                key={m.congress}
                className="absolute top-0 w-px h-1.5 bg-white/30"
                style={{ left: `${mPct}%` }}
              />
            );
          })}
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={CONGRESSES.length - 1}
          value={idx}
          onChange={e => onChange(CONGRESSES[Number(e.target.value)])}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
          style={{ zIndex: 2 }}
        />

        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all duration-100"
          style={{ left: `calc(${pct}% - 8px)`, background: accentColor, zIndex: 1 }}
        />
      </div>

      {/* Milestone year labels */}
      <div className="relative w-full h-4">
        {milestones.map(m => {
          const mIdx = CONGRESSES.findIndex(c => c.number === m.congress);
          const mPct = (mIdx / (CONGRESSES.length - 1)) * 100;
          return (
            <span
              key={m.congress}
              className="absolute text-[9px] text-white/30 -translate-x-1/2 select-none"
              style={{ left: `${mPct}%` }}
            >
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Map panel ────────────────────────────────────────────────────────────────
interface DistrictPopupInfo {
  district: string | number;
  statename: string;
  startCong: number;
  endCong: number;
}

interface MapPanelProps {
  congress: CongressInfo;
  panelLabel: string;
  accentColor: string;
  onMapReady: (map: google.maps.Map) => void;
  loadedCount: number;
  totalCount: number;
  onStateLoaded?: () => void;
}

function MapPanel({ congress, panelLabel, accentColor, onMapReady, loadedCount, totalCount, onStateLoaded }: MapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayersRef = useRef<google.maps.Data[]>([]);
  const [popup, setPopup] = useState<DistrictPopupInfo | null>(null);
  const congressRef = useRef(congress);
  congressRef.current = congress;

  const clearLayers = useCallback(() => {
    dataLayersRef.current.forEach(dl => dl.setMap(null));
    dataLayersRef.current = [];
  }, []);

  const addStateLayer = useCallback((map: google.maps.Map, data: GeoJSON.FeatureCollection, stateName: string, congressNum: number) => {
    const dataLayer = new window.google.maps.Data({ map });
    dataLayersRef.current.push(dataLayer);
    dataLayer.addGeoJson(data);
    dataLayer.setStyle((feature) => {
      const geoFeature = feature as unknown as GeoJSON.Feature;
      return {
        fillColor: getDistrictColor(geoFeature, 0.5),
        strokeColor: getDistrictColor(geoFeature, 0.9),
        strokeWeight: 1,
        fillOpacity: 0.5,
        strokeOpacity: 0.85,
        clickable: true,
      };
    });
    dataLayer.addListener("click", (event: google.maps.Data.MouseEvent) => {
      const getP = (k: string) => event.feature.getProperty(k);
      setPopup({
        district: (getP("district") ?? getP("DISTRICT") ?? "At-large") as string | number,
        statename: (getP("statename") ?? getP("STATENAME") ?? stateName) as string,
        startCong: Number(getP("startcong") ?? getP("STARTCONG") ?? congressNum),
        endCong: Number(getP("endcong") ?? getP("ENDCONG") ?? congressNum),
      });
    });
    dataLayer.addListener("mouseover", (event: google.maps.Data.MouseEvent) => {
      dataLayer.overrideStyle(event.feature, { fillOpacity: 0.75, strokeWeight: 2.5 });
    });
    dataLayer.addListener("mouseout", (event: google.maps.Data.MouseEvent) => {
      dataLayer.revertStyle(event.feature);
    });
  }, []);

  const loadAllStates = useCallback(async (map: google.maps.Map, congressNum: number) => {
    clearLayers();
    setPopup(null);
    const batches: (typeof STATES)[] = [];
    for (let i = 0; i < STATES.length; i += 10) batches.push(STATES.slice(i, i + 10));
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (state) => {
          const data = await fetchGeoJsonForStateCongress(state.name, congressNum);
          if (data && mapRef.current && congressRef.current.number === congressNum) {
            addStateLayer(mapRef.current, data, state.name, congressNum);
          }
          onStateLoaded?.();
        })
      );
    }
  }, [clearLayers, addStateLayer, onStateLoaded]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    onMapReady(map);
    loadAllStates(map, congress.number);
  }, [congress.number, onMapReady, loadAllStates]);

  useEffect(() => {
    if (!mapRef.current) return;
    loadAllStates(mapRef.current, congress.number);
  }, [congress.number, loadAllStates]);

  const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;
  const isLoading = loadedCount < totalCount;

  return (
    <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Panel label badge */}
      <div
        className="absolute top-3 left-3 z-10 text-white text-xs font-bold px-3 py-1.5 rounded-full border pointer-events-none backdrop-blur-sm"
        style={{ background: `${accentColor}22`, borderColor: `${accentColor}55` }}
      >
        <span style={{ color: accentColor }}>{panelLabel}</span>
        <span className="text-white/70 ml-1.5">· {congress.label} Congress · {congress.startYear}</span>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-3 right-3 z-10 bg-black/70 backdrop-blur-sm text-white/80 text-xs px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading {pct}%</span>
        </div>
      )}
      {!isLoading && (
        <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-green-400/80 text-xs px-3 py-1.5 rounded-full border border-green-500/20 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span>Loaded</span>
        </div>
      )}

      {/* District popup */}
      {popup && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 min-w-[220px] max-w-[300px] shadow-2xl">
          <button
            className="absolute top-2.5 right-2.5 text-white/40 hover:text-white transition-colors"
            onClick={() => setPopup(null)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-3.5 h-3.5 text-white/40" />
            <span className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">District Info</span>
          </div>
          <div className="text-white font-bold text-base mb-0.5">
            {popup.statename}
          </div>
          <div className="text-white/70 text-sm mb-2">
            {popup.district === "AL" || popup.district === 0 || popup.district === "0"
              ? "At-Large District"
              : `Congressional District ${popup.district}`}
          </div>
          <div className="border-t border-white/10 pt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Congress range</span>
              <span className="text-white/80 font-semibold">
                {ordinal(popup.startCong)}–{ordinal(popup.endCong)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Years active</span>
              <span className="text-white/80 font-semibold">
                {1787 + popup.startCong * 2}–{1787 + popup.endCong * 2 + 1}
              </span>
            </div>
          </div>
        </div>
      )}

      <MapView
        className="flex-1 w-full h-full min-h-0"
        initialCenter={US_CENTER}
        initialZoom={US_ZOOM}
        onMapReady={handleMapReady}
        mapOptions={{
          mapId: null as unknown as string,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: "transparent",
          styles: DARK_MAP_STYLE,
        } as google.maps.MapOptions}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MapComparison() {
  const [sky] = useState<SkySlot>(() => getCurrentSky());
  const [congressA, setCongressA] = useState<CongressInfo>(CONGRESSES[0]);       // 89th (1965)
  const [congressB, setCongressB] = useState<CongressInfo>(CONGRESSES[CONGRESSES.length - 1]); // 119th (2025)
  const [synced, setSynced] = useState(true);
  const [loadedA, setLoadedA] = useState(0);
  const [loadedB, setLoadedB] = useState(0);
  const [selectedState, setSelectedState] = useState<string>("");

  const mapARef = useRef<google.maps.Map | null>(null);
  const mapBRef = useRef<google.maps.Map | null>(null);
  const syncingRef = useRef(false);
  const syncedRef = useRef(true);

  useEffect(() => { setLoadedA(0); }, [congressA]);
  useEffect(() => { setLoadedB(0); }, [congressB]);
  useEffect(() => { syncedRef.current = synced; }, [synced]);

  const handleStateLoadedA = useCallback(() => setLoadedA(prev => prev + 1), []);
  const handleStateLoadedB = useCallback(() => setLoadedB(prev => prev + 1), []);

  const syncMap = useCallback((source: google.maps.Map, target: google.maps.Map) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const center = source.getCenter();
    const zoom = source.getZoom();
    if (center) target.setCenter(center);
    if (zoom !== undefined) target.setZoom(zoom);
    setTimeout(() => { syncingRef.current = false; }, 50);
  }, []);

  const handleMapAReady = useCallback((map: google.maps.Map) => {
    mapARef.current = map;
    map.addListener("center_changed", () => { if (syncedRef.current && mapBRef.current) syncMap(map, mapBRef.current); });
    map.addListener("zoom_changed", () => { if (syncedRef.current && mapBRef.current) syncMap(map, mapBRef.current); });
  }, [syncMap]);

  const handleMapBReady = useCallback((map: google.maps.Map) => {
    mapBRef.current = map;
    map.addListener("center_changed", () => { if (syncedRef.current && mapARef.current) syncMap(map, mapARef.current); });
    map.addListener("zoom_changed", () => { if (syncedRef.current && mapARef.current) syncMap(map, mapARef.current); });
  }, [syncMap]);

  const zoomToState = useCallback((abbr: string) => {
    const state = STATES.find(s => s.abbr === abbr);
    if (!state) return;
    if (mapARef.current) { mapARef.current.setCenter(state.center); mapARef.current.setZoom(state.zoom); }
    if (mapBRef.current) { mapBRef.current.setCenter(state.center); mapBRef.current.setZoom(state.zoom); }
  }, []);

  const zoomToNation = useCallback(() => {
    if (mapARef.current) { mapARef.current.setCenter(US_CENTER); mapARef.current.setZoom(US_ZOOM); }
    if (mapBRef.current) { mapBRef.current.setCenter(US_CENTER); mapBRef.current.setZoom(US_ZOOM); }
    setSelectedState("");
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    const cA = CONGRESSES.find(c => c.number === preset.congressA);
    const cB = CONGRESSES.find(c => c.number === preset.congressB);
    if (cA) setCongressA(cA);
    if (cB) setCongressB(cB);
    zoomToNation();
  }, [zoomToNation]);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-black">
      {/* Animated sky background */}
      <SkyBackground sky={sky} />

      {/* ── Header ── */}
      <header className="relative flex items-center gap-3 px-4 py-2.5 bg-black/60 backdrop-blur-md border-b border-white/10" style={{ zIndex: 20 }}>
        <Link href="/">
          <button className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Election Map</span>
          </button>
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-white font-bold text-sm sm:text-base">Congressional Historical Map Atlas</span>
            <span className="hidden sm:inline text-white/35 text-xs ml-2">· 89th–119th Congress · 1965–2025</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-white/40 text-xs">
          <span className="hidden md:inline">{sky.label} · {sky.location}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
        </div>
      </header>

      {/* ── Timeline sliders + controls ── */}
      <div className="relative flex flex-col gap-2 px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10" style={{ zIndex: 20 }}>
        {/* Two timeline sliders */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <TimelineSlider
              value={congressA}
              onChange={setCongressA}
              accentColor="#3b82f6"
              label="Panel A — Before"
            />
          </div>

          {/* Sync toggle */}
          <div className="flex flex-row sm:flex-col items-center gap-1.5 flex-shrink-0 self-center">
            <button
              onClick={() => setSynced(s => !s)}
              title={synced ? "Maps are synced — click to unlock" : "Maps are independent — click to sync"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                synced
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                  : "bg-white/10 border-white/20 text-white/50 hover:bg-white/15"
              }`}
            >
              {synced ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span className="hidden sm:inline">{synced ? "Synced" : "Unsynced"}</span>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <TimelineSlider
              value={congressB}
              onChange={setCongressB}
              accentColor="#ef4444"
              label="Panel B — After"
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
          {/* State zoom */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-black/50 border border-white/20 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 appearance-none cursor-pointer hover:bg-black/70 transition-colors"
              value={selectedState}
              onChange={e => {
                setSelectedState(e.target.value);
                if (e.target.value) zoomToState(e.target.value);
              }}
            >
              <option value="" className="bg-gray-900">— Zoom to state —</option>
              {STATES.map(s => (
                <option key={s.abbr} value={s.abbr} className="bg-gray-900">{s.name}</option>
              ))}
            </select>
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/15 transition-all whitespace-nowrap"
              onClick={zoomToNation}
            >
              Full U.S.
            </button>
          </div>

          <div className="w-px h-5 bg-white/15 hidden sm:block" />

          {/* Preset shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.label}
                className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white border border-white/15 transition-all whitespace-nowrap flex items-center gap-1"
                onClick={() => applyPreset(p)}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map panels ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 10 }}>
        <MapPanel
          congress={congressA}
          panelLabel="A"
          accentColor="#3b82f6"
          onMapReady={handleMapAReady}
          loadedCount={loadedA}
          totalCount={50}
          onStateLoaded={handleStateLoadedA}
        />
        {/* Divider */}
        <div className="w-0.5 bg-white/15 flex-shrink-0 relative" style={{ zIndex: 15 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-white/20 rounded-full px-2 py-1 text-white/50 text-[10px] font-bold select-none">
            VS
          </div>
        </div>
        <MapPanel
          congress={congressB}
          panelLabel="B"
          accentColor="#ef4444"
          onMapReady={handleMapBReady}
          loadedCount={loadedB}
          totalCount={50}
          onStateLoaded={handleStateLoadedB}
        />
      </div>

      {/* ── Footer legend ── */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-black/60 backdrop-blur-md border-t border-white/10" style={{ zIndex: 20 }}>
        <div className="flex items-center gap-4">
          {[
            { color: "#1a4fa0", label: "Democrat" },
            { color: "#b22222", label: "Republican" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
              <span className="text-white/60 text-xs">{item.label}</span>
            </div>
          ))}
          <div className="w-px h-4 bg-white/15" />
          <span className="text-white/30 text-[10px] hidden sm:inline">Click any district for details</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/25 text-[10px]">
          <span>Source:</span>
          <span className="text-white/40">UCLA/Lewis Congressional District Boundaries</span>
          <span>·</span>
          <span className="text-white/40">cdmaps.polisci.ucla.edu</span>
        </div>
      </div>
    </div>
  );
}
