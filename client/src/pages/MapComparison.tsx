import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowLeft, Info, X } from "lucide-react";
import { MapView } from "@/components/Map";
import { cn } from "@/lib/utils";

// ─── Time-of-day sky videos ────────────────────────────────────────────────────
interface SkySlot {
  label: string;
  location: string;
  videoUrl: string;
  posterUrl: string;
  /** hours (0–23) this slot is active */
  hours: number[];
  /** overlay opacity — lighter skies need more overlay for text readability */
  overlayOpacity: number;
}

const SKY_SLOTS: SkySlot[] = [
  {
    label: "Dawn",
    location: "Sahara Desert, Morocco",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dawn_bf4762d3.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-dawn-C4NEGmxMBmPAbBv5CjZxv2.webp",
    hours: [5, 6],
    overlayOpacity: 0.25,
  },
  {
    label: "Morning",
    location: "Swiss Alps",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-morning_4e02649d.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-morning-YiBACdPTy7M9g3Z6MtoMqy.webp",
    hours: [7, 8, 9, 10],
    overlayOpacity: 0.3,
  },
  {
    label: "Midday",
    location: "Mediterranean Sea",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-midday_190395b8.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-midday-5ghZCUXyPdvTxWkA9jKmmh.webp",
    hours: [11, 12, 13],
    overlayOpacity: 0.3,
  },
  {
    label: "Afternoon",
    location: "Serengeti, Tanzania",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-afternoon_a64ba7ff.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-afternoon-Dppp6eqZmvCDq9TVtGURt7.webp",
    hours: [14, 15, 16],
    overlayOpacity: 0.25,
  },
  {
    label: "Evening",
    location: "Amalfi Coast, Italy",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-evening_8fcbd657.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-evening-Rq497YHshz5qkysgHhBAng.webp",
    hours: [17, 18, 19],
    overlayOpacity: 0.2,
  },
  {
    label: "Dusk",
    location: "Southeast Asia",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-dusk_c5616f3b.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-dusk-8WJHCzQeHpQZFNbpqtmgzm.webp",
    hours: [20, 21],
    overlayOpacity: 0.2,
  },
  {
    label: "Night",
    location: "Patagonia, Chile",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/sky-video-night_221c4237.mp4",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/skyref-night-FKxeETcLvAKtEQ2og9ZcmD.webp",
    hours: [22, 23, 0, 1, 2, 3, 4],
    overlayOpacity: 0.15,
  },
];

function getCurrentSky(): SkySlot {
  const hour = new Date().getHours();
  return SKY_SLOTS.find(s => s.hours.includes(hour)) ?? SKY_SLOTS[6]; // default night
}

// ─── Congress definitions: 89th (1965) → 119th (2025) ────────────────────────
interface CongressInfo {
  number: number;
  label: string;
  years: string;
  startYear: number;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const CONGRESSES: CongressInfo[] = Array.from({ length: 31 }, (_, i) => {
  const num = 89 + i;
  const startYear = 1965 + i * 2;
  const endYear = startYear + 1;
  const endShort = String(endYear).slice(-2);
  return {
    number: num,
    label: ordinal(num),
    years: `${startYear}–${endShort}`,
    startYear,
  };
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

// ─── Notable preset comparisons ───────────────────────────────────────────────
const PRESETS = [
  { label: "Post-VRA 1965 → Today", congressA: 89, congressB: 119, stateIdx: 21 },
  { label: "Pre/Post Shelby County", congressA: 112, congressB: 113, stateIdx: 9 },
  { label: "Pre/Post 2020 Census", congressA: 116, congressB: 118, stateIdx: 32 },
  { label: "Pre/Post 2010 Census", congressA: 110, congressB: 113, stateIdx: 32 },
];

// ─── GeoJSON loader ───────────────────────────────────────────────────────────
const geoJsonCache = new Map<string, GeoJSON.FeatureCollection | null>();
const dirListingCache = new Map<string, string[]>();

async function fetchStateDirListing(stateName: string): Promise<string[]> {
  if (dirListingCache.has(stateName)) return dirListingCache.get(stateName)!;
  const url = `https://api.github.com/repos/JeffreyBLewis/congressional-district-boundaries/contents/GeoJson?per_page=300`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("GitHub API error");
    const files: { name: string }[] = await res.json();
    const stateFiles = files
      .map(f => f.name)
      .filter(n => n.startsWith(stateName.replace(/ /g, "_") + "_") && n.endsWith(".geojson"));
    // Also try with spaces replaced by underscores
    dirListingCache.set(stateName, stateFiles);
    return stateFiles;
  } catch {
    return [];
  }
}

async function fetchGeoJsonForStateCongress(
  stateName: string,
  congressNum: number
): Promise<GeoJSON.FeatureCollection | null> {
  const cacheKey = `${stateName}_${congressNum}`;
  if (geoJsonCache.has(cacheKey)) return geoJsonCache.get(cacheKey)!;

  const files = await fetchStateDirListing(stateName);
  const match = files.find(f => {
    const m = f.match(/_(\d{3})_to_(\d{3})\.geojson$/);
    if (!m) return false;
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    return congressNum >= start && congressNum <= end;
  });

  if (!match) {
    geoJsonCache.set(cacheKey, null);
    return null;
  }

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
  if (!props) return `rgba(100,100,180,${alpha})`;
  const party = (props.party as string | undefined)?.toUpperCase();
  if (party === "D" || party === "DEM" || party === "DEMOCRAT") return `rgba(30,100,200,${alpha})`;
  if (party === "R" || party === "REP" || party === "REPUBLICAN") return `rgba(200,50,50,${alpha})`;
  const dist = Number(props.district ?? props.DISTRICT ?? 0);
  return dist % 2 === 0 ? `rgba(30,100,200,${alpha})` : `rgba(200,50,50,${alpha})`;
}

// ─── Sky video background ─────────────────────────────────────────────────────
function SkyBackground({ sky }: { sky: SkySlot }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {/* autoplay blocked, poster shows */});
    }
  }, [sky.videoUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        key={sky.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={sky.posterUrl}
        style={{ transition: "opacity 1s ease" }}
      >
        <source src={sky.videoUrl} type="video/mp4" />
      </video>
      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${sky.overlayOpacity})` }}
      />
    </div>
  );
}

// ─── Map panel component ──────────────────────────────────────────────────────
interface MapPanelProps {
  congress: CongressInfo;
  state: typeof STATES[0];
  label: string;
  onMapReady: (map: google.maps.Map) => void;
}

interface DistrictPopupInfo {
  district: string | number;
  statename: string;
  startCong: number;
  endCong: number;
}

function MapPanel({ congress, state, label, onMapReady }: MapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [districtCount, setDistrictCount] = useState<number | null>(null);
  const [popup, setPopup] = useState<DistrictPopupInfo | null>(null);

  const loadDistricts = useCallback(async (map: google.maps.Map, stateName: string, congressNum: number) => {
    setLoading(true);
    setError(null);
    setDistrictCount(null);
    setPopup(null);

    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
    }

    const data = await fetchGeoJsonForStateCongress(stateName, congressNum);
    if (!data) {
      setLoading(false);
      setError(`No boundary data for ${stateName} · ${ordinal(congressNum)} Congress`);
      return;
    }

    const dataLayer = new window.google.maps.Data({ map });
    dataLayerRef.current = dataLayer;
    dataLayer.addGeoJson(data);
    setDistrictCount(data.features.length);

    dataLayer.setStyle((feature) => {
      const geoFeature = feature as unknown as GeoJSON.Feature;
      const fillColor = getDistrictColor(geoFeature, 0.5);
      const strokeColor = getDistrictColor(geoFeature, 0.9);
      return { fillColor, strokeColor, strokeWeight: 1.5, fillOpacity: 0.5, strokeOpacity: 0.9, clickable: true };
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

    setLoading(false);
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    onMapReady(map);
    loadDistricts(map, state.name, congress.number);
  }, [state.name, congress.number, onMapReady, loadDistricts]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(state.center);
    mapRef.current.setZoom(state.zoom);
    loadDistricts(mapRef.current, state.name, congress.number);
  }, [congress.number, state, loadDistricts]);

  return (
    <div className="relative flex-1 flex flex-col min-w-0">
      {/* Panel label */}
      <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 pointer-events-none">
        {label}: {congress.label} Congress ({congress.startYear})
      </div>

      {districtCount !== null && (
        <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm text-white/80 text-xs px-2.5 py-1 rounded-full border border-white/15 pointer-events-none">
          {districtCount} district{districtCount !== 1 ? "s" : ""}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white/80 text-xs">Loading {congress.label} Congress…</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-black/70 border border-white/20 rounded-xl px-5 py-4 max-w-xs text-center">
            <Info className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-white/80 text-xs">{error}</p>
          </div>
        </div>
      )}

      {popup && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur border border-white/20 rounded-xl px-4 py-3 min-w-[200px] max-w-[280px] shadow-xl">
          <button className="absolute top-2 right-2 text-white/50 hover:text-white" onClick={() => setPopup(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="text-white font-semibold text-sm mb-1">
            {popup.statename} — District {popup.district}
          </div>
          <div className="text-white/60 text-xs">
            {ordinal(popup.startCong)}–{ordinal(popup.endCong)} Congress
            ({1787 + popup.startCong * 2}–{1787 + popup.endCong * 2 + 1})
          </div>
        </div>
      )}

      <MapView
        className="flex-1 w-full h-full min-h-0"
        initialCenter={state.center}
        initialZoom={state.zoom}
        onMapReady={handleMapReady}
      />
    </div>
  );
}

// ─── Congress selector ────────────────────────────────────────────────────────
function CongressSelector({ value, onChange, label }: { value: CongressInfo; onChange: (c: CongressInfo) => void; label: string }) {
  const idx = CONGRESSES.findIndex(c => c.number === value.number);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30"
          onClick={() => idx > 0 && onChange(CONGRESSES[idx - 1])}
          disabled={idx === 0}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-white" />
        </button>
        <select
          className="bg-black/40 border border-white/20 text-white text-sm font-semibold rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-black/60 transition-colors min-w-[190px] text-center"
          value={value.number}
          onChange={e => {
            const c = CONGRESSES.find(c => c.number === Number(e.target.value));
            if (c) onChange(c);
          }}
        >
          {CONGRESSES.map(c => (
            <option key={c.number} value={c.number} className="bg-gray-900">
              {c.label} Congress · {c.years}
            </option>
          ))}
        </select>
        <button
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30"
          onClick={() => idx < CONGRESSES.length - 1 && onChange(CONGRESSES[idx + 1])}
          disabled={idx === CONGRESSES.length - 1}
        >
          <ChevronRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MapComparison() {
  const [sky] = useState<SkySlot>(() => getCurrentSky());
  const [congressA, setCongressA] = useState<CongressInfo>(CONGRESSES[0]);
  const [congressB, setCongressB] = useState<CongressInfo>(CONGRESSES[CONGRESSES.length - 1]);
  const [selectedStateIdx, setSelectedStateIdx] = useState(21); // Michigan
  const mapARef = useRef<google.maps.Map | null>(null);
  const mapBRef = useRef<google.maps.Map | null>(null);
  const syncingRef = useRef(false);

  const selectedState = STATES[selectedStateIdx];

  const syncMap = useCallback((source: google.maps.Map, target: google.maps.Map) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const center = source.getCenter();
    const zoom = source.getZoom();
    if (center) target.setCenter(center);
    if (zoom !== undefined) target.setZoom(zoom);
    syncingRef.current = false;
  }, []);

  const handleMapAReady = useCallback((map: google.maps.Map) => {
    mapARef.current = map;
    map.addListener("center_changed", () => { if (mapBRef.current) syncMap(map, mapBRef.current); });
    map.addListener("zoom_changed", () => { if (mapBRef.current) syncMap(map, mapBRef.current); });
  }, [syncMap]);

  const handleMapBReady = useCallback((map: google.maps.Map) => {
    mapBRef.current = map;
    map.addListener("center_changed", () => { if (mapARef.current) syncMap(map, mapARef.current); });
    map.addListener("zoom_changed", () => { if (mapARef.current) syncMap(map, mapARef.current); });
  }, [syncMap]);

  useEffect(() => {
    if (mapARef.current) { mapARef.current.setCenter(selectedState.center); mapARef.current.setZoom(selectedState.zoom); }
    if (mapBRef.current) { mapBRef.current.setCenter(selectedState.center); mapBRef.current.setZoom(selectedState.zoom); }
  }, [selectedState]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const cA = CONGRESSES.find(c => c.number === preset.congressA);
    const cB = CONGRESSES.find(c => c.number === preset.congressB);
    if (cA) setCongressA(cA);
    if (cB) setCongressB(cB);
    setSelectedStateIdx(preset.stateIdx);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* ── Animated sky background ── */}
      <SkyBackground sky={sky} />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-2.5 bg-black/50 backdrop-blur-md border-b border-white/10">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Election Map</span>
          </button>
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm sm:text-base">Congressional Map Comparison</span>
          <span className="hidden sm:inline text-white/40 text-xs">· 1965–2026 Historical Atlas</span>
        </div>
        {/* Sky indicator */}
        <div className="ml-auto flex items-center gap-2 text-white/50 text-xs">
          <span className="hidden md:inline">{sky.label} · {sky.location}</span>
          <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
        </div>
      </header>

      {/* ── Control bar ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-4 py-3 bg-black/40 backdrop-blur-md border-b border-white/10">
        {/* State selector */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">State</span>
          <select
            className="bg-black/40 border border-white/20 text-white text-sm font-semibold rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-black/60 transition-colors min-w-[160px] text-center"
            value={selectedStateIdx}
            onChange={e => setSelectedStateIdx(Number(e.target.value))}
          >
            {STATES.map((s, i) => (
              <option key={s.abbr} value={i} className="bg-gray-900">{s.name}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-10 bg-white/15 hidden sm:block" />
        <CongressSelector value={congressA} onChange={setCongressA} label="Before" />
        <div className="flex items-center text-white/40 text-xs font-bold px-1">VS</div>
        <CongressSelector value={congressB} onChange={setCongressB} label="After" />
        <div className="w-px h-10 bg-white/15 hidden md:block" />

        {/* Preset shortcuts */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/15 transition-all whitespace-nowrap"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map panels ── */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-0.5">
        <MapPanel congress={congressA} state={selectedState} label="BEFORE" onMapReady={handleMapAReady} />
        <div className="w-0.5 bg-white/20 flex-shrink-0" />
        <MapPanel congress={congressB} state={selectedState} label="AFTER" onMapReady={handleMapBReady} />
      </div>

      {/* ── Legend ── */}
      <div className="relative z-10 flex items-center justify-center gap-4 px-4 py-2 bg-black/50 backdrop-blur-md border-t border-white/10">
        {[
          { color: "#1a4fa0", label: "Solid D" },
          { color: "#5b8fd4", label: "Lean D" },
          { color: "#7c3aed", label: "Toss-up" },
          { color: "#d96b4a", label: "Lean R" },
          { color: "#b22222", label: "Solid R" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
            <span className="text-white/60 text-xs">{item.label}</span>
          </div>
        ))}
        <div className="w-px h-4 bg-white/20" />
        <span className="text-white/30 text-[10px] hidden sm:inline">Click district for details · Drag to pan · Maps sync · Source: UCLA/Lewis</span>
      </div>
    </div>
  );
}
