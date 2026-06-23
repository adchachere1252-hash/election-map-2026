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
const DEFAULT_COLOR = 0x1e293b;
const HOVER_COLOR = 0x60a5fa;
const SELECTED_COLOR = 0x3b82f6;
const OCEAN_COLOR = 0x0c1222;
const BORDER_COLOR = 0x334155;

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
    opacity: 0.85,
    side: THREE.DoubleSide,
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

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
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

    // Ocean sphere
    const oceanGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.999, 64, 64);
    const oceanMat = new THREE.MeshBasicMaterial({ color: OCEAN_COLOR });
    globeGroup.add(new THREE.Mesh(oceanGeo, oceanMat));

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

          // Filled mesh
          const mesh = buildCountryMesh(feature, GLOBE_RADIUS, color);
          if (mesh) {
            mesh.userData = { countryCode: alpha2, countryName: feature.properties?.name || "" };
            globeGroup.add(mesh);
            if (alpha2) countryMeshesRef.current.set(alpha2, mesh);
          }

          // Border lines
          const borders = buildCountryBorders(feature, GLOBE_RADIUS);
          if (borders) globeGroup.add(borders);
        }
      })
      .catch(err => console.error("Failed to load globe data:", err));

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Auto-rotate
      if (!userInteracted.current && autoRotate) {
        globeGroup.rotation.y += 0.002;
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
      if (code === selectedCountry) {
        mat.color.setHex(SELECTED_COLOR);
        mat.opacity = 1;
      } else {
        const election = electionMapRef.current.get(code);
        const color = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
        mat.color.setHex(color);
        mat.opacity = 0.85;
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
            mat.opacity = 0.85;
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
