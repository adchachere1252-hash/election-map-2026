import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import earcut from "earcut";
import { numericToAlpha2 } from "@/lib/countryCodeMap";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ElectionData {
  countryCode: string;
  status: string;
  country: string;
}

interface GlobeProps {
  elections: ElectionData[];
  onCountryClick: (countryCode: string, countryName: string) => void;
  onCountryHover: (countryCode: string | null, countryName: string | null) => void;
  selectedCountry: string | null;
  autoRotate?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 2;
const TOPO_URL = "/manus-storage/countries-110m_b4a7267c.json";

const STATUS_COLORS: Record<string, number> = {
  "Upcoming": 0xf59e0b,
  "Voting Today": 0xeab308,
  "Completed": 0x22c55e,
  "Postponed": 0x6b7280,
  "Cancelled": 0xef4444,
};
const DEFAULT_COLOR = 0x0a1628;
const HOVER_COLOR = 0x60a5fa;
const SELECTED_COLOR = 0x3b82f6;
const OCEAN_COLOR = 0x0c1222;
const BORDER_COLOR = 0x334155;

// ─── Ocean label positions (lon, lat) ────────────────────────────────────────
const OCEAN_LABELS: { name: string; lon: number; lat: number }[] = [
  { name: "Pacific Ocean", lon: -160, lat: 0 },
  { name: "Atlantic Ocean", lon: -35, lat: 15 },
  { name: "Indian Ocean", lon: 75, lat: -20 },
  { name: "Arctic Ocean", lon: 0, lat: 80 },
  { name: "Southern Ocean", lon: 0, lat: -65 },
];

// ─── Country centroid positions for labels (lon, lat) ────────────────────────
const COUNTRY_CENTROIDS: Record<string, { lon: number; lat: number }> = {
  CO: { lon: -74, lat: 4 },
  GB: { lon: -3, lat: 54 },
  DE: { lon: 10, lat: 51 },
  FR: { lon: 2, lat: 47 },
  BR: { lon: -53, lat: -10 },
  AU: { lon: 134, lat: -25 },
  IN: { lon: 79, lat: 22 },
  JP: { lon: 138, lat: 36 },
  KR: { lon: 128, lat: 36 },
  MX: { lon: -102, lat: 23 },
  CA: { lon: -106, lat: 56 },
  NG: { lon: 8, lat: 10 },
  ZA: { lon: 25, lat: -29 },
  EG: { lon: 30, lat: 27 },
  SA: { lon: 45, lat: 24 },
  TR: { lon: 35, lat: 39 },
  PL: { lon: 20, lat: 52 },
  NL: { lon: 5, lat: 52 },
  CL: { lon: -71, lat: -35 },
  AR: { lon: -64, lat: -34 },
  PH: { lon: 122, lat: 12 },
  ID: { lon: 118, lat: -2 },
  TH: { lon: 101, lat: 15 },
  VN: { lon: 106, lat: 16 },
  MY: { lon: 110, lat: 4 },
  SG: { lon: 104, lat: 1 },
  NO: { lon: 10, lat: 62 },
  SE: { lon: 17, lat: 63 },
  DK: { lon: 10, lat: 56 },
  FI: { lon: 26, lat: 64 },
  PT: { lon: -8, lat: 40 },
  ES: { lon: -4, lat: 40 },
  IT: { lon: 12, lat: 43 },
  GR: { lon: 22, lat: 39 },
  RO: { lon: 25, lat: 46 },
  CZ: { lon: 16, lat: 50 },
  AT: { lon: 14, lat: 47 },
  CH: { lon: 8, lat: 47 },
  BE: { lon: 4, lat: 51 },
  IE: { lon: -8, lat: 53 },
  NZ: { lon: 172, lat: -41 },
  HU: { lon: 19, lat: 47 },
  SK: { lon: 19, lat: 49 },
  ST: { lon: 7, lat: 1 },
  CK: { lon: -160, lat: -21 },
  IS: { lon: -19, lat: 65 },
  LV: { lon: 25, lat: 57 },
  BA: { lon: 18, lat: 44 },
  CV: { lon: -24, lat: 16 },
  BG: { lon: 25, lat: 43 },
  GM: { lon: -15, lat: 14 },
  SS: { lon: 30, lat: 8 },
  AM: { lon: 45, lat: 40 },
  KE: { lon: 38, lat: 1 },
  GH: { lon: -2, lat: 8 },
  TZ: { lon: 35, lat: -6 },
  ET: { lon: 39, lat: 9 },
  UG: { lon: 32, lat: 1 },
  ZM: { lon: 28, lat: -13 },
  MW: { lon: 34, lat: -14 },
  HT: { lon: -72, lat: 19 },
  DO: { lon: -70, lat: 19 },
  JM: { lon: -77, lat: 18 },
  TT: { lon: -61, lat: 10 },
  PE: { lon: -76, lat: -10 },
  EC: { lon: -78, lat: -2 },
  BO: { lon: -65, lat: -17 },
  PY: { lon: -58, lat: -23 },
  UY: { lon: -56, lat: -33 },
  VE: { lon: -66, lat: 8 },
  CU: { lon: -79, lat: 22 },
  PA: { lon: -80, lat: 9 },
  CR: { lon: -84, lat: 10 },
  GT: { lon: -90, lat: 15 },
  HN: { lon: -87, lat: 15 },
  SV: { lon: -89, lat: 14 },
  NI: { lon: -85, lat: 13 },
  BZ: { lon: -89, lat: 17 },
  PK: { lon: 69, lat: 30 },
  BD: { lon: 90, lat: 24 },
  LK: { lon: 81, lat: 8 },
  MM: { lon: 96, lat: 20 },
  KH: { lon: 105, lat: 13 },
  LA: { lon: 103, lat: 18 },
  NP: { lon: 84, lat: 28 },
  AF: { lon: 67, lat: 33 },
  IQ: { lon: 44, lat: 33 },
  IR: { lon: 53, lat: 32 },
  SY: { lon: 38, lat: 35 },
  JO: { lon: 36, lat: 31 },
  LB: { lon: 36, lat: 34 },
  IL: { lon: 35, lat: 31 },
  AE: { lon: 54, lat: 24 },
  QA: { lon: 51, lat: 25 },
  KW: { lon: 48, lat: 29 },
  BH: { lon: 51, lat: 26 },
  OM: { lon: 57, lat: 21 },
  YE: { lon: 48, lat: 15 },
  UA: { lon: 32, lat: 49 },
  RU: { lon: 100, lat: 60 },
  CN: { lon: 105, lat: 35 },
  MN: { lon: 104, lat: 47 },
  KZ: { lon: 67, lat: 48 },
  UZ: { lon: 64, lat: 41 },
  TM: { lon: 59, lat: 39 },
  KG: { lon: 75, lat: 41 },
  TJ: { lon: 69, lat: 39 },
  GE: { lon: 44, lat: 42 },
  AZ: { lon: 48, lat: 41 },
  LY: { lon: 17, lat: 27 },
  TN: { lon: 9, lat: 34 },
  DZ: { lon: 3, lat: 30 },
  MA: { lon: -7, lat: 31 },
  SD: { lon: 30, lat: 15 },
  CD: { lon: 24, lat: -3 },
  AO: { lon: 18, lat: -12 },
  MZ: { lon: 35, lat: -18 },
  MG: { lon: 47, lat: -19 },
  CM: { lon: 12, lat: 6 },
  CI: { lon: -5, lat: 7 },
  SN: { lon: -14, lat: 14 },
  ML: { lon: -4, lat: 17 },
  BF: { lon: -2, lat: 12 },
  NE: { lon: 8, lat: 17 },
  TD: { lon: 19, lat: 15 },
  SO: { lon: 46, lat: 6 },
  ER: { lon: 39, lat: 15 },
  DJ: { lon: 43, lat: 12 },
  RW: { lon: 30, lat: -2 },
  BI: { lon: 30, lat: -3 },
  TW: { lon: 121, lat: 24 },
  HK: { lon: 114, lat: 22 },
  US: { lon: -97, lat: 39 },
};

// ─── Create text sprite for labels ──────────────────────────────────────────
function createTextSprite(
  text: string,
  options: { fontSize?: number; color?: string; fontStyle?: string; opacity?: number } = {}
): THREE.Sprite {
  const { fontSize = 48, color = "#ffffff", fontStyle = "bold", opacity = 0.9 } = options;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${fontStyle} ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const padding = 20;
  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize * 1.4 + padding;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect, 1, 1); // Base scale, will be overridden per-label
  return sprite;
}

// ─── Utility: Convert lat/lon to 3D ──────────────────────────────────────────
function latLonToVec3(lon: number, lat: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Build country mesh from GeoJSON feature (earcut triangulation) ──────────
function buildCountryMesh(feature: any, radius: number, color: number): THREE.Mesh | null {
  const coords: number[][][][] = [];
  if (feature.geometry.type === "Polygon") {
    coords.push(feature.geometry.coordinates);
  } else if (feature.geometry.type === "MultiPolygon") {
    coords.push(...feature.geometry.coordinates);
  } else {
    return null;
  }

  const allVertices: number[] = [];
  const allIndices: number[] = [];

  for (const polygon of coords) {
    const outerRing = polygon[0];
    if (!outerRing || outerRing.length < 3) continue;

    // Flatten 2D coordinates for earcut
    const flatCoords: number[] = [];
    const holeIndices: number[] = [];

    // Outer ring - remove closing duplicate if present
    const outer = (outerRing.length > 1 &&
      outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
      outerRing[0][1] === outerRing[outerRing.length - 1][1])
      ? outerRing.slice(0, -1) : outerRing;
    for (const [lon, lat] of outer) {
      flatCoords.push(lon, lat);
    }

    // Holes (inner rings)
    for (let h = 1; h < polygon.length; h++) {
      holeIndices.push(flatCoords.length / 2);
      const hole = polygon[h];
      const holeRing = (hole.length > 1 &&
        hole[0][0] === hole[hole.length - 1][0] &&
        hole[0][1] === hole[hole.length - 1][1])
        ? hole.slice(0, -1) : hole;
      for (const [lon, lat] of holeRing) {
        flatCoords.push(lon, lat);
      }
    }

    // Triangulate with earcut
    const triangles = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
    if (triangles.length === 0) continue;

    // Convert 2D triangulated points to 3D sphere positions
    const baseIdx = allVertices.length / 3;
    const numPoints = flatCoords.length / 2;
    for (let i = 0; i < numPoints; i++) {
      const lon = flatCoords[i * 2];
      const lat = flatCoords[i * 2 + 1];
      const v = latLonToVec3(lon, lat, radius * 1.001);
      allVertices.push(v.x, v.y, v.z);
    }
    for (const idx of triangles) {
      allIndices.push(baseIdx + idx);
    }
  }

  if (allVertices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(allVertices, 3));
  geometry.setIndex(allIndices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}

// ─── Build country border lines ──────────────────────────────────────────────
function buildCountryBorders(feature: any, radius: number): THREE.LineSegments | null {
  const coords: number[][][][] = [];
  if (feature.geometry.type === "Polygon") {
    coords.push(feature.geometry.coordinates);
  } else if (feature.geometry.type === "MultiPolygon") {
    coords.push(...feature.geometry.coordinates);
  } else {
    return null;
  }

  const points: THREE.Vector3[] = [];
  for (const polygon of coords) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        points.push(latLonToVec3(ring[i][0], ring[i][1], radius));
        points.push(latLonToVec3(ring[i + 1][0], ring[i + 1][1], radius));
      }
    }
  }

  if (points.length === 0) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: BORDER_COLOR, transparent: true, opacity: 0.5 });
  return new THREE.LineSegments(geometry, material);
}

// ─── Main Globe Component ─────────────────────────────────────────────────────
export default function Globe({
  elections,
  onCountryClick,
  onCountryHover,
  selectedCountry,
  autoRotate = true,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const countryMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const electionMapRef = useRef<Map<string, ElectionData>>(new Map());
  const raycaster = useRef(new THREE.Raycaster());
  const mouseVec = useRef(new THREE.Vector2());

  // Hover tracking for click
  const hoveredCountryRef = useRef<{ code: string; name: string } | null>(null);

  // Drag state
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const userInteracted = useRef(false);
  const interactTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DRAG_THRESHOLD = 5; // pixels

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; status: string } | null>(null);

  // Keep election map in sync
  useEffect(() => {
    const map = new Map<string, ElectionData>();
    elections.forEach(e => map.set(e.countryCode, e));
    electionMapRef.current = map;
  }, [elections]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting (brighter for texture visibility)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Stars
    const starPositions = new Float32Array(3000);
    for (let i = 0; i < 3000; i++) starPositions[i] = (Math.random() - 0.5) * 100;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Globe group (rotatable)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Ocean sphere — solid navy blue
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x0a1a3a });
    globeGroup.add(new THREE.Mesh(earthGeo, earthMat));

    // Atmosphere glow (back-side additive)
    const atmosVert = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmosFrag = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `;
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: atmosVert,
      fragmentShader: atmosFrag,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    globeGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Load countries
    fetch(TOPO_URL)
      .then(r => r.json())
      .then(topo => {
        const geo = topojson.feature(topo, topo.objects.countries) as any;
        const features = geo.features;

        for (const feature of features) {
          const alpha2 = numericToAlpha2[String(feature.id)] || "";
          const election = electionMapRef.current.get(alpha2);
          const color = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

          // Filled mesh — countries without elections are nearly invisible to show texture
          const mesh = buildCountryMesh(feature, GLOBE_RADIUS * 1.002, color);
          if (mesh) {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = election ? 0.85 : 0.2;
            mesh.userData = { countryCode: alpha2, countryName: feature.properties?.name || "" };
            globeGroup.add(mesh);
            if (alpha2) countryMeshesRef.current.set(alpha2, mesh);
          }

          // Border lines
          const borders = buildCountryBorders(feature, GLOBE_RADIUS * 1.003);
          if (borders) globeGroup.add(borders);
        }
      })
      .catch(err => console.error("Failed to load globe data:", err));

    // ─── Add ocean labels (small, subtle) ─────────────────────────────────────
    for (const ocean of OCEAN_LABELS) {
      const sprite = createTextSprite(ocean.name, {
        fontSize: 28,
        color: "#475569",
        fontStyle: "italic",
        opacity: 0.5,
      });
      const pos = latLonToVec3(ocean.lon, ocean.lat, GLOBE_RADIUS * 1.01);
      sprite.position.copy(pos);
      // Scale ocean labels small
      const aspect = sprite.scale.x / sprite.scale.y;
      const oceanScale = 0.18;
      sprite.scale.set(oceanScale * aspect, oceanScale, 1);
      sprite.userData = { isLabel: true };
      globeGroup.add(sprite);
    }

    // ─── Add election country labels (scaled to fit country size) ──────────────
    // Approximate country "size" for label scaling
    const COUNTRY_SCALE: Record<string, number> = {
      US: 0.16, RU: 0.18, BR: 0.14, KZ: 0.12, DZ: 0.10, ET: 0.09,
      CO: 0.08, SE: 0.07, NZ: 0.07, SO: 0.07, ZM: 0.07, MA: 0.07,
      HU: 0.04, CZ: 0.04, BG: 0.04, SK: 0.03, BA: 0.03, LV: 0.03,
      IS: 0.04, GB: 0.06, IL: 0.03, BD: 0.05, AM: 0.04, SS: 0.06,
      GM: 0.03, HT: 0.04, BH: 0.03, CV: 0.03, ST: 0.03, CK: 0.03,
    };
    // Short display names for long country names
    const SHORT_NAMES: Record<string, string> = {
      US: "U.S.",
      GB: "U.K.",
      NZ: "N.Z.",
      BA: "Bosnia",
      CZ: "Czechia",
      SA: "S. Arabia",
      ZA: "S. Africa",
      SS: "S. Sudan",
      BD: "Bangladesh",
      KZ: "Kazakhstan",
      DZ: "Algeria",
      ET: "Ethiopia",
    };
    // Status → label color (matches legend)
    const STATUS_LABEL_COLORS: Record<string, string> = {
      "Upcoming": "#f59e0b",
      "Voting Today": "#eab308",
      "Completed": "#22c55e",
      "Postponed": "#6b7280",
      "Cancelled": "#ef4444",
    };
    const addCountryLabels = () => {
      const map = electionMapRef.current;
      map.forEach((election, code) => {
        const centroid = COUNTRY_CENTROIDS[code];
        if (!centroid) return;
        const labelScale = COUNTRY_SCALE[code] || 0.06;
        const displayName = SHORT_NAMES[code] || election.country;
        const labelColor = STATUS_LABEL_COLORS[election.status] || "#e2e8f0";
        const sprite = createTextSprite(displayName, {
          fontSize: 28,
          color: labelColor,
          fontStyle: "600",
          opacity: 0.9,
        });
        const pos = latLonToVec3(centroid.lon, centroid.lat, GLOBE_RADIUS * 1.02);
        sprite.position.copy(pos);
        // Scale label to fit within country outline
        const aspect = sprite.scale.x / sprite.scale.y;
        sprite.scale.set(labelScale * aspect, labelScale, 1);
        sprite.userData = { isLabel: true, countryLabel: code };
        globeGroup.add(sprite);
      });
    };
    // Delay slightly to ensure elections data is populated
    setTimeout(addCountryLabels, 100);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Auto-rotate
      if (!userInteracted.current && autoRotate) {
        globeGroup.rotation.y += 0.0003; // Slow, realistic planetary rotation
      }

      // Momentum
      if (!isDragging.current) {
        if (Math.abs(velocity.current.x) > 0.0001 || Math.abs(velocity.current.y) > 0.0001) {
          globeGroup.rotation.y += velocity.current.x;
          globeGroup.rotation.x += velocity.current.y;
          velocity.current.x *= 0.95;
          velocity.current.y *= 0.95;
        }
      }

      // Clamp vertical
      globeGroup.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, globeGroup.rotation.x));

      // Pulse "Voting Today" countries
      const time = Date.now() * 0.003;
      countryMeshesRef.current.forEach((mesh, code) => {
        const election = electionMapRef.current.get(code);
        if (election?.status === "Voting Today") {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.6 + 0.4 * Math.sin(time);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update colors when elections or selectedCountry changes
  useEffect(() => {
    countryMeshesRef.current.forEach((mesh, code) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const election = electionMapRef.current.get(code);
      if (code === selectedCountry) {
        // Selected country uses its legend color at full opacity (brighter)
        const color = election ? (STATUS_COLORS[election.status] ?? SELECTED_COLOR) : SELECTED_COLOR;
        mat.color.setHex(color);
        mat.opacity = 1.0;
      } else {
        const color = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
        mat.color.setHex(color);
        mat.opacity = election ? 0.85 : 0.2;
      }
    });
  }, [elections, selectedCountry]);

  // ─── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    userInteracted.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    dragDistance.current = 0;
    velocity.current = { x: 0, y: 0 };
    if (interactTimeout.current) clearTimeout(interactTimeout.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDragging.current && globeGroupRef.current) {
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      dragDistance.current += Math.abs(dx) + Math.abs(dy);
      globeGroupRef.current.rotation.y += dx * 0.005;
      globeGroupRef.current.rotation.x += dy * 0.005;
      velocity.current = { x: dx * 0.005, y: dy * 0.005 };
      prevMouse.current = { x: e.clientX, y: e.clientY };
      setTooltip(null);
    } else if (globeGroupRef.current) {
      // Raycast for hover
      mouseVec.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouseVec.current, cameraRef.current);
      globeGroupRef.current.updateMatrixWorld(true);
      const allHits = raycaster.current.intersectObjects(globeGroupRef.current.children, true);

      // Find first hit with a countryCode
      let foundCountry = false;
      for (const hit of allHits) {
        const { countryCode, countryName } = hit.object.userData;
        if (countryCode) {
          foundCountry = true;
          hoveredCountryRef.current = { code: countryCode, name: countryName };
          onCountryHover(countryCode, countryName);
          const election = electionMapRef.current.get(countryCode);
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            name: election?.country || countryName || countryCode,
            status: election?.status || "No Election Tracked",
          });
          // Highlight
          const mat = (hit.object as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (countryCode !== selectedCountry) {
            mat.color.setHex(HOVER_COLOR);
            mat.opacity = 1;
          }
          break;
        }
      }
      if (!foundCountry) {
        hoveredCountryRef.current = null;
        onCountryHover(null, null);
        setTooltip(null);
        // Reset non-selected colors
        countryMeshesRef.current.forEach((mesh, code) => {
          if (code !== selectedCountry) {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            const election = electionMapRef.current.get(code);
            const color = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
            mat.color.setHex(color);
            mat.opacity = election ? 0.85 : 0.2;
          }
        });
      }
    }
  }, [onCountryHover, selectedCountry]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    interactTimeout.current = setTimeout(() => { userInteracted.current = false; }, 4000);
  }, []);

  const handleClick = useCallback(() => {
    // Only fire click if mouse didn't move much (not a drag)
    if (dragDistance.current > DRAG_THRESHOLD) return;
    // Use the currently hovered country (tracked by mousemove raycasting)
    const hovered = hoveredCountryRef.current;
    if (hovered) {
      onCountryClick(hovered.code, hovered.name);
    }
  }, [onCountryClick]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    e.preventDefault();
    const z = cameraRef.current.position.z + e.deltaY * 0.003;
    cameraRef.current.position.z = Math.max(2.8, Math.min(8, z));
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 15, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-white">{tooltip.name}</div>
          <div className={`text-xs mt-0.5 ${
            tooltip.status === "Upcoming" ? "text-amber-400" :
            tooltip.status === "Voting Today" ? "text-yellow-400" :
            tooltip.status === "Completed" ? "text-green-400" :
            tooltip.status === "Postponed" ? "text-gray-400" :
            tooltip.status === "Cancelled" ? "text-red-400" :
            "text-gray-500"
          }`}>
            {tooltip.status}
          </div>
        </div>
      )}
    </div>
  );
}
