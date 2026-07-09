import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import earcut from "earcut";
import { numericToAlpha2 } from "@/lib/countryCodeMap";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// ─── LOD Quality Detection ───────────────────────────────────────────────────
function detectQuality(): "high" | "medium" | "low" {
  const isMobile = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency || 2;
  const isLowEnd = cores <= 4;
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isMobile || (isLowEnd && isTouchDevice)) return "low";
  if (isLowEnd || isTouchDevice) return "medium";
  return "high";
}

const LOD_CONFIG = {
  high: { sphereSegments: 64, starCounts: [6000, 3000, 800, 400], maxDeg: 5, pixelRatio: 2, outerGlow: true, twinkle: true, colorStars: true, shootingStars: true, nebula: true },
  medium: { sphereSegments: 48, starCounts: [4000, 2000, 500, 200], maxDeg: 7, pixelRatio: 1.5, outerGlow: true, twinkle: true, colorStars: true, shootingStars: true, nebula: false },
  low: { sphereSegments: 32, starCounts: [2000, 800, 200, 80], maxDeg: 10, pixelRatio: 1.5, outerGlow: false, twinkle: false, colorStars: false, shootingStars: false, nebula: false },
} as const;

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
  showLabels?: boolean;
  focusCountry?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 2;
const TOPO_URL = "/manus-storage/countries-50m_da91a9ab.json";

const STATUS_COLORS: Record<string, number> = {
  "Upcoming": 0xfbbf24,    // Brighter amber-400
  "Voting Today": 0xfde047, // Vivid yellow-300
  "Completed": 0x4ade80,   // Brighter green-400
  "Postponed": 0x9ca3af,   // Lighter gray
  "Cancelled": 0xf87171,   // Brighter red-400
};
const DEFAULT_COLOR = 0x0a1628;
const HOVER_COLOR = 0x60a5fa;
const SELECTED_COLOR = 0x3b82f6;
const OCEAN_COLOR = 0x0c1222;
const BORDER_COLOR = 0xfbbf24;  // amber-400 — gold glow for borders

// ─── Ocean label positions (lon, lat) ────────────────────────────────────────
const OCEAN_LABELS: { name: string; lon: number; lat: number }[] = [
  { name: "Pacific Ocean", lon: -160, lat: 0 },
  { name: "Atlantic Ocean", lon: -35, lat: 15 },
  { name: "Indian Ocean", lon: 75, lat: -20 },
  { name: "Arctic Ocean", lon: 0, lat: 80 },
  { name: "Southern Ocean", lon: 0, lat: -65 },
];

// ─── Country centroid positions for labels (lon, lat) ────────────────────────
export const COUNTRY_CENTROIDS: Record<string, { lon: number; lat: number }> = {
  CO: { lon: -74, lat: 4 },
  GB: { lon: -2, lat: 54 },
  DE: { lon: 10, lat: 51 },
  FR: { lon: 3, lat: 46 },
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
  CL: { lon: -72, lat: -36 },
  AR: { lon: -64, lat: -34 },
  PH: { lon: 122.8, lat: 12 },
  ID: { lon: 113, lat: -2 },
  TH: { lon: 101, lat: 15 },
  VN: { lon: 106, lat: 16 },
  MY: { lon: 102, lat: 4 },
  SG: { lon: 104, lat: 1 },
  NO: { lon: 9, lat: 61 },
  SE: { lon: 16, lat: 62 },
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
  NZ: { lon: 172, lat: -42 },
  HU: { lon: 19, lat: 47 },
  SK: { lon: 19, lat: 49 },
  ST: { lon: 7, lat: 1 },
  CK: { lon: -160, lat: -21 },
  IS: { lon: -19, lat: 65 },
  LV: { lon: 25, lat: 57 },
  BA: { lon: 18, lat: 44 },
  CV: { lon: -24, lat: 16 },
  BG: { lon: 25, lat: 43 },
  GM: { lon: -15.3, lat: 13.5 },
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
  TT: { lon: -61.5, lat: 10.5 },
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
  RU: { lon: 105, lat: 62 },
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
  US: { lon: -98, lat: 40 },
  // Added to cover ALL TopoJSON countries
  AL: { lon: 20, lat: 41 },
  AQ: { lon: 0, lat: -82 },
  BJ: { lon: 2, lat: 10 },
  BN: { lon: 115, lat: 5 },
  BS: { lon: -77.9, lat: 25.8 },
  BT: { lon: 90, lat: 27 },
  BW: { lon: 24, lat: -22 },
  BY: { lon: 28, lat: 53 },
  CF: { lon: 21, lat: 7 },
  CG: { lon: 16, lat: -1 },
  CY: { lon: 33, lat: 35 },
  EE: { lon: 26, lat: 59 },
  EH: { lon: -13, lat: 24 },
  FJ: { lon: 178, lat: -18 },
  FK: { lon: -59, lat: -52 },
  GA: { lon: 12, lat: -1 },
  GL: { lon: -42, lat: 72 },
  GN: { lon: -10, lat: 10 },
  GQ: { lon: 10, lat: 2 },
  GW: { lon: -15, lat: 12 },
  GY: { lon: -59, lat: 5 },
  HR: { lon: 16.4, lat: 44.9 },
  KP: { lon: 127, lat: 40 },
  LR: { lon: -10, lat: 6 },
  LS: { lon: 29, lat: -30 },
  LT: { lon: 24, lat: 56 },
  LU: { lon: 6, lat: 50 },
  MD: { lon: 29, lat: 47 },
  ME: { lon: 19, lat: 43 },
  MK: { lon: 22, lat: 41 },
  MR: { lon: -11, lat: 20 },
  NA: { lon: 17, lat: -22 },
  NC: { lon: 165, lat: -22 },
  PG: { lon: 147, lat: -6 },
  PR: { lon: -66, lat: 18 },
  PS: { lon: 35, lat: 32 },
  RS: { lon: 21, lat: 44 },
  SB: { lon: 160, lat: -9 },
  SI: { lon: 15, lat: 46 },
  SL: { lon: -12, lat: 9 },
  SR: { lon: -56, lat: 4 },
  SZ: { lon: 31, lat: -27 },
  TF: { lon: 69, lat: -49 },
  TG: { lon: 1, lat: 8 },
  TL: { lon: 126, lat: -9 },
  VU: { lon: 167, lat: -16 },
  ZW: { lon: 30, lat: -20 },
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

// ─── Create text mesh that lies tangent to globe surface (flows with rotation) ─
// Convert ISO 3166-1 alpha-2 code to flag emoji
function countryCodeToFlag(code: string): string {
  if (code === "XK") return "\uD83C\uDDFD\uD83C\uDDF0"; // Kosovo
  const upper = code.toUpperCase();
  const cp1 = 0x1F1E6 + (upper.charCodeAt(0) - 65);
  const cp2 = 0x1F1E6 + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(cp1, cp2);
}

function createTextMesh(
  text: string,
  lon: number,
  lat: number,
  radius: number,
  options: { fontSize?: number; color?: string; fontStyle?: string; opacity?: number; scale?: number; flag?: string } = {}
): THREE.Mesh {
  const { fontSize = 48, color = "#ffffff", fontStyle = "bold", opacity = 0.9, scale = 0.5, flag } = options;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${fontStyle} ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  const flagFont = `${fontSize}px 'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', sans-serif`;
  ctx.font = font;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  // Measure flag width if present
  let flagWidth = 0;
  const flagGap = flag ? 6 : 0;
  if (flag) {
    ctx.font = flagFont;
    flagWidth = ctx.measureText(flag).width;
  }
  const totalWidth = flagWidth + flagGap + textWidth;
  const padding = 20;
  canvas.width = totalWidth + padding * 2;
  canvas.height = fontSize * 1.4 + padding;

  const centerY = canvas.height / 2;
  const startX = padding + flagWidth + flagGap;
  const textCenterX = startX + textWidth / 2;

  // Draw flag emoji first (no stroke needed)
  if (flag) {
    ctx.font = flagFont;
    ctx.globalAlpha = opacity;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(flag, padding, centerY);
  }

  // Draw text with outline
  ctx.font = font;
  ctx.globalAlpha = opacity;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Draw dark outline/stroke for contrast against any background
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.strokeText(text, textCenterX, centerY);
  // Fill with the label color on top
  ctx.fillStyle = color;
  ctx.fillText(text, textCenterX, centerY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const aspect = canvas.width / canvas.height;
  const geo = new THREE.PlaneGeometry(scale * aspect, scale);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Position on globe surface
  const pos = latLonToVec3Internal(lon, lat, radius);
  mesh.position.copy(pos);

  // Orient tangent to globe surface: normal points outward from center
  const normal = pos.clone().normalize();
  // For poles, use a different reference vector to avoid degenerate cross product
  const ref = Math.abs(lat) > 70
    ? new THREE.Vector3(0, 0, 1)  // Use Z-axis for polar regions
    : new THREE.Vector3(0, 1, 0); // Use Y-axis (up) for equatorial regions
  // Tangent (east direction)
  const east = new THREE.Vector3().crossVectors(ref, normal).normalize();
  // Corrected up (north on surface)
  const north = new THREE.Vector3().crossVectors(normal, east).normalize();

  // Build rotation matrix: mesh faces outward, text reads left-to-right along east
  const rotMatrix = new THREE.Matrix4();
  rotMatrix.makeBasis(east, north, normal);
  mesh.setRotationFromMatrix(rotMatrix);

  mesh.userData = { isLabel: true, baseMat: mat };
  return mesh;
}

// Internal helper for latLonToVec3 (used before the main function is defined)
function latLonToVec3Internal(lon: number, lat: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
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
// Subdivide a triangle in lon/lat space into smaller triangles to approximate sphere curvature.
// Uses an iterative stack to avoid stack overflow for large polygons.
// Normalize longitude to [-180, 180] range (handles shifted antimeridian coords)
function normLon(lon: number): number {
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function subdivideTri(
  lon0: number, lat0: number,
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  maxDeg: number,
  outVerts: number[],
  outIndices: number[],
  radius: number
) {
  // Use iterative stack instead of recursion
  const stack: [number, number, number, number, number, number][] = [[lon0, lat0, lon1, lat1, lon2, lat2]];

  while (stack.length > 0) {
    const [a0, b0, a1, b1, a2, b2] = stack.pop()!;
    const d01 = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0));
    const d12 = Math.max(Math.abs(a2 - a1), Math.abs(b2 - b1));
    const d20 = Math.max(Math.abs(a0 - a2), Math.abs(b0 - b2));
    const maxEdge = Math.max(d01, d12, d20);

    if (maxEdge <= maxDeg) {
      // Small enough — emit triangle directly (normalize lon before projecting)
      const baseIdx = outVerts.length / 3;
      const v0 = latLonToVec3(normLon(a0), b0, radius);
      const v1 = latLonToVec3(normLon(a1), b1, radius);
      const v2 = latLonToVec3(normLon(a2), b2, radius);
      outVerts.push(v0.x, v0.y, v0.z);
      outVerts.push(v1.x, v1.y, v1.z);
      outVerts.push(v2.x, v2.y, v2.z);
      outIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    } else {
      // Subdivide by splitting each edge at midpoint
      const m01a = (a0 + a1) / 2, m01b = (b0 + b1) / 2;
      const m12a = (a1 + a2) / 2, m12b = (b1 + b2) / 2;
      const m20a = (a2 + a0) / 2, m20b = (b2 + b0) / 2;
      stack.push([a0, b0, m01a, m01b, m20a, m20b]);
      stack.push([m01a, m01b, a1, b1, m12a, m12b]);
      stack.push([m20a, m20b, m12a, m12b, a2, b2]);
      stack.push([m01a, m01b, m12a, m12b, m20a, m20b]);
    }
  }
}

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
  // Max triangle edge in degrees before subdivision — LOD-dependent
  const MAX_DEG = (window as any).__globeMaxDeg ?? 5;

  for (const polygon of coords) {
    const outerRing = polygon[0];
    if (!outerRing || outerRing.length < 3) continue;

    // Detect antimeridian-crossing polygon (has points both > 160 and < -160)
    let hasEast = false, hasWest = false;
    for (const [lon] of outerRing) {
      if (lon > 160) hasEast = true;
      if (lon < -160) hasWest = true;
    }
    const crossesAntimeridian = hasEast && hasWest;

    // Flatten 2D coordinates for earcut
    const flatCoords: number[] = [];
    const holeIndices: number[] = [];

    // Outer ring - remove closing duplicate if present
    const outer = (outerRing.length > 1 &&
      outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
      outerRing[0][1] === outerRing[outerRing.length - 1][1])
      ? outerRing.slice(0, -1) : outerRing;
    for (const [lon, lat] of outer) {
      // Shift negative longitudes by +360 for antimeridian-crossing polygons
      const adjustedLon = (crossesAntimeridian && lon < 0) ? lon + 360 : lon;
      flatCoords.push(adjustedLon, lat);
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
        const adjustedLon = (crossesAntimeridian && lon < 0) ? lon + 360 : lon;
        flatCoords.push(adjustedLon, lat);
      }
    }

    // Triangulate with earcut
    const triangles = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
    if (triangles.length === 0) continue;

    // For each triangle, subdivide if too large, then project onto sphere
    for (let t = 0; t < triangles.length; t += 3) {
      const i0 = triangles[t], i1 = triangles[t + 1], i2 = triangles[t + 2];
      const lon0 = flatCoords[i0 * 2], lat0 = flatCoords[i0 * 2 + 1];
      const lon1 = flatCoords[i1 * 2], lat1 = flatCoords[i1 * 2 + 1];
      const lon2 = flatCoords[i2 * 2], lat2 = flatCoords[i2 * 2 + 1];
      subdivideTri(lon0, lat0, lon1, lat1, lon2, lat2, MAX_DEG, allVertices, allIndices, radius * 1.001);
    }
  }

  if (allVertices.length === 0) return null;

  // Skip extremely tiny meshes that render as visible squares/dots
  // (tiny island nations with < 6 vertices often produce degenerate geometry)
  if (allVertices.length < 18) return null; // Less than 6 vertices (18 floats for x,y,z)

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(allVertices, 3));
  geometry.setIndex(allIndices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  // Skip meshes with very small bounding sphere (tiny islands that appear as squares)
  if (geometry.boundingSphere && geometry.boundingSphere.radius < 0.02) return null;

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: false,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: true,
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
        // Skip line segments that cross the antimeridian (creates visual artifacts)
        const lon0 = ring[i][0], lon1 = ring[i + 1][0];
        if (Math.abs(lon1 - lon0) > 180) continue;
        points.push(latLonToVec3(lon0, ring[i][1], radius));
        points.push(latLonToVec3(lon1, ring[i + 1][1], radius));
      }
    }
  }

  if (points.length === 0) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: BORDER_COLOR, transparent: true, opacity: 0.7 });
  return new THREE.LineSegments(geometry, material);
}

// ─── Build thin gold glowing border (additive blending for glow effect) ───────
function buildGoldGlowBorder(feature: any, radius: number, color: number, opacity: number): THREE.LineSegments | null {
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
        const lon0 = ring[i][0], lon1 = ring[i + 1][0];
        if (Math.abs(lon1 - lon0) > 180) continue;
        points.push(latLonToVec3(lon0, ring[i][1], radius));
        points.push(latLonToVec3(lon1, ring[i + 1][1], radius));
      }
    }
  }

  if (points.length === 0) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geometry, material);
}

// ─── Build THICK country border lines using Line2 (supports real line width) ───────
function buildThickBorders(feature: any, radius: number, color: number, lineWidth: number, resolution: THREE.Vector2): LineSegments2 | null {
  const coords: number[][][][] = [];
  if (feature.geometry.type === "Polygon") {
    coords.push(feature.geometry.coordinates);
  } else if (feature.geometry.type === "MultiPolygon") {
    coords.push(...feature.geometry.coordinates);
  } else {
    return null;
  }

  const positions: number[] = [];
  for (const polygon of coords) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        const lon0 = ring[i][0], lon1 = ring[i + 1][0];
        if (Math.abs(lon1 - lon0) > 180) continue;
        const p0 = latLonToVec3(lon0, ring[i][1], radius);
        const p1 = latLonToVec3(lon1, ring[i + 1][1], radius);
        positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
  }

  if (positions.length === 0) return null;
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  const material = new LineMaterial({
    color,
    linewidth: lineWidth,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    worldUnits: false,
    resolution,
    blending: THREE.AdditiveBlending,
  });
  return new LineSegments2(geometry, material);
}

// ─── Main Globe Component ─────────────────────────────────────────────────────
export default function Globe({
  elections,
  onCountryClick,
  onCountryHover,
  selectedCountry,
  autoRotate = true,
  showLabels = true,
  focusCountry = null,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const countryMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const countryBordersRef = useRef<Map<string, THREE.LineSegments>>(new Map());
  const electionMapRef = useRef<Map<string, ElectionData>>(new Map());
  const raycaster = useRef(new THREE.Raycaster());
  const mouseVec = useRef(new THREE.Vector2());

  // Hover tracking for click
  const hoveredCountryRef = useRef<{ code: string; name: string } | null>(null);

  // Labels visibility ref (used in animation loop)
  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;

  // Focus country rotation target
  const focusTargetRef = useRef<{ y: number; x: number } | null>(null);

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

    // Camera — pulled back for a smaller globe with breathing room
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // LOD quality detection
    const quality = detectQuality();
    const lod = LOD_CONFIG[quality];
    (window as any).__globeMaxDeg = lod.maxDeg;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: quality !== "low", alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lod.pixelRatio));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting (brighter for texture visibility)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // ═══════════════════════════════════════════════════════════════════════════
    // RICH GALAXY STARFIELD — Multi-layer deep space background
    // ═══════════════════════════════════════════════════════════════════════════
    const MIN_STAR_DISTANCE = GLOBE_RADIUS * 1.8;
    const starLayers: { mat: THREE.PointsMaterial; baseOpacity: number; speed: number }[] = [];

    // ─── Star texture generator (circular glow, prevents square rendering) ───
    function createStarTexture(glowIntensity = 1.0, sharpness = 0.15): THREE.CanvasTexture {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const center = size / 2;
      const radius = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glowIntensity})`);
      gradient.addColorStop(sharpness, `rgba(255, 255, 255, ${glowIntensity * 0.85})`);
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${glowIntensity * 0.25})`);
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${glowIntensity * 0.05})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // Soft diffuse glow texture for nebula/dust clouds
    function createNebulaTexture(): THREE.CanvasTexture {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const center = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
      gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.3)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    const starTexture = createStarTexture(1.0, 0.12);
    const brightStarTexture = createStarTexture(1.0, 0.08); // sharper core for bright stars
    const nebulaTexture = createNebulaTexture();

    // ─── Layer 1: Ultra-fine background dust (thousands of tiny dim points) ───
    const addStarLayer = (count: number, size: number, opacity: number, spread: number, twinkleSpeed: number, color = 0xffffff, tex?: THREE.Texture) => {
      const positions = new Float32Array(count * 3);
      let placed = 0;
      while (placed < count) {
        const x = (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread;
        const z = (Math.random() - 0.5) * spread;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > MIN_STAR_DISTANCE) {
          positions[placed * 3] = x;
          positions[placed * 3 + 1] = y;
          positions[placed * 3 + 2] = z;
          placed++;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size,
        color,
        transparent: true,
        opacity,
        map: tex || starTexture,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(geo, mat));
      starLayers.push({ mat, baseOpacity: opacity, speed: twinkleSpeed });
    };

    // Background dust — very fine, very numerous
    addStarLayer(lod.starCounts[0] * 2, 0.02, 0.35, 150, 0.5);    // ultra-distant faint dust
    addStarLayer(lod.starCounts[0], 0.035, 0.5, 130, 0.7);        // distant dim stars
    addStarLayer(lod.starCounts[1], 0.06, 0.7, 100, 1.0);         // mid-field stars
    addStarLayer(lod.starCounts[1], 0.09, 0.85, 80, 1.3);         // mid-bright stars
    addStarLayer(lod.starCounts[2], 0.14, 1.0, 60, 1.8, 0xffffff, brightStarTexture); // bright nearby
    addStarLayer(Math.floor(lod.starCounts[2] * 0.3), 0.22, 1.0, 50, 2.2, 0xffffff, brightStarTexture); // very bright feature stars

    // ─── Layer 2: Colored stars (blue, amber, red) for spectral realism ───
    if (lod.colorStars) {
      const colorCount = lod.starCounts[3];
      // Cool blue stars (hot young stars)
      addStarLayer(colorCount, 0.08, 0.55, 100, 1.4, 0xaaccff);
      // Warm amber/gold stars (older stars)
      addStarLayer(Math.floor(colorCount * 0.6), 0.07, 0.45, 90, 0.9, 0xffd699);
      // Red giant stars (sparse, larger)
      addStarLayer(Math.floor(colorCount * 0.25), 0.12, 0.35, 80, 0.6, 0xff9977);
    }

    // ─── Layer 3: Milky Way band (dense star concentration along galactic plane) ───
    {
      const milkyWayCount = quality === "high" ? 8000 : quality === "medium" ? 4000 : 2000;
      const positions = new Float32Array(milkyWayCount * 3);
      let placed = 0;
      // Galactic plane: tilted ~60° from horizontal, running diagonally across the sky
      const tiltAngle = Math.PI * 0.33; // tilt of the galactic plane
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);
      while (placed < milkyWayCount) {
        // Gaussian distribution concentrated near the plane
        const along = (Math.random() - 0.5) * 200; // spread along the band
        const perp = (Math.random() - 0.5) * 12 * (1 + Math.random()); // narrow perpendicular spread (Gaussian-ish)
        const depth = (Math.random() - 0.5) * 80;
        // Rotate into tilted galactic plane
        const x = along;
        const y = perp * cosT - depth * sinT * 0.3;
        const z = perp * sinT + depth * cosT * 0.3 - 40; // push behind globe
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > MIN_STAR_DISTANCE) {
          positions[placed * 3] = x;
          positions[placed * 3 + 1] = y;
          positions[placed * 3 + 2] = z;
          placed++;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0xddeeff,
        transparent: true,
        opacity: 0.4,
        map: starTexture,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(geo, mat));
      starLayers.push({ mat, baseOpacity: 0.4, speed: 0.3 });

      // Brighter core stars along the Milky Way center
      const coreCount = Math.floor(milkyWayCount * 0.15);
      const corePositions = new Float32Array(coreCount * 3);
      let corePlaced = 0;
      while (corePlaced < coreCount) {
        const along = (Math.random() - 0.5) * 140;
        const perp = (Math.random() - 0.5) * 4; // very tight to center
        const depth = (Math.random() - 0.5) * 40;
        const x = along;
        const y = perp * cosT - depth * sinT * 0.3;
        const z = perp * sinT + depth * cosT * 0.3 - 40;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > MIN_STAR_DISTANCE) {
          corePositions[corePlaced * 3] = x;
          corePositions[corePlaced * 3 + 1] = y;
          corePositions[corePlaced * 3 + 2] = z;
          corePlaced++;
        }
      }
      const coreGeo = new THREE.BufferGeometry();
      coreGeo.setAttribute("position", new THREE.BufferAttribute(corePositions, 3));
      const coreMat = new THREE.PointsMaterial({
        size: 0.06,
        color: 0xffeedd,
        transparent: true,
        opacity: 0.6,
        map: brightStarTexture,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(coreGeo, coreMat));
      starLayers.push({ mat: coreMat, baseOpacity: 0.6, speed: 0.4 });
    }

    // ─── Layer 4: Nebula clouds in a parallax group (rotates independently) ───
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);
    {
      const nebulaConfigs = [
        // Large blue nebula (upper-left)
        { color: 0x3355bb, count: 500, cx: -35, cy: 20, cz: -50, spreadX: 25, spreadY: 18, spreadZ: 12, size: 0.4, opacity: 0.08 },
        // Purple/violet nebula (lower-right)
        { color: 0x6633aa, count: 400, cx: 30, cy: -15, cz: -45, spreadX: 20, spreadY: 15, spreadZ: 10, size: 0.35, opacity: 0.07 },
        // Teal nebula (center-back)
        { color: 0x225588, count: 350, cx: 5, cy: 5, cz: -60, spreadX: 30, spreadY: 20, spreadZ: 15, size: 0.5, opacity: 0.06 },
        // Pink/magenta nebula (upper-right)
        { color: 0x883366, count: 300, cx: 40, cy: 25, cz: -55, spreadX: 18, spreadY: 14, spreadZ: 10, size: 0.3, opacity: 0.06 },
        // Deep blue diffuse cloud (fills gaps)
        { color: 0x1a2a55, count: 600, cx: 0, cy: 0, cz: -70, spreadX: 60, spreadY: 40, spreadZ: 20, size: 0.6, opacity: 0.04 },
        // Warm orange emission nebula (small, bright)
        { color: 0xaa5522, count: 200, cx: -20, cy: -25, cz: -40, spreadX: 12, spreadY: 10, spreadZ: 8, size: 0.25, opacity: 0.09 },
      ];

      const nebulaSubset = quality === "low" ? nebulaConfigs.slice(0, 2) : quality === "medium" ? nebulaConfigs.slice(0, 4) : nebulaConfigs;

      nebulaSubset.forEach((cfg) => {
        const positions = new Float32Array(cfg.count * 3);
        for (let i = 0; i < cfg.count; i++) {
          const gx = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2;
          const gy = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2;
          const gz = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2;
          positions[i * 3] = cfg.cx + gx * cfg.spreadX;
          positions[i * 3 + 1] = cfg.cy + gy * cfg.spreadY;
          positions[i * 3 + 2] = cfg.cz + gz * cfg.spreadZ;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
          size: cfg.size,
          color: cfg.color,
          transparent: true,
          opacity: cfg.opacity,
          map: nebulaTexture,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        nebulaGroup.add(new THREE.Points(geo, mat));
      });
    }

    // ─── Layer 5: Cosmic dust lanes (in parallax group) ───
    if (quality !== "low") {
      const dustCount = quality === "high" ? 3000 : 1500;
      const dustPositions = new Float32Array(dustCount * 3);
      let dustPlaced = 0;
      while (dustPlaced < dustCount) {
        const band = Math.floor(Math.random() * 3);
        const bandY = [-8, 3, 15][band];
        const x = (Math.random() - 0.5) * 160;
        const y = bandY + (Math.random() - 0.5) * 6;
        const z = -20 - Math.random() * 60;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > MIN_STAR_DISTANCE) {
          dustPositions[dustPlaced * 3] = x;
          dustPositions[dustPlaced * 3 + 1] = y;
          dustPositions[dustPlaced * 3 + 2] = z;
          dustPlaced++;
        }
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = new THREE.PointsMaterial({
        size: 0.08,
        color: 0x8899bb,
        transparent: true,
        opacity: 0.15,
        map: nebulaTexture,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      nebulaGroup.add(new THREE.Points(dustGeo, dustMat));
    }

    // ─── Layer 5b: Star cluster hotspots (dense groupings like Pleiades) ───
    {
      const clusterCount = quality === "high" ? 8 : quality === "medium" ? 5 : 3;
      const clusterColors = [0xffffff, 0xddeeff, 0xffeedd, 0xccddff, 0xfff5e0, 0xe8e0ff, 0xffe8d0, 0xd0e8ff];
      for (let c = 0; c < clusterCount; c++) {
        const starCount = 40 + Math.floor(Math.random() * 60); // 40-100 stars per cluster
        const positions = new Float32Array(starCount * 3);
        // Random cluster center in space (outside globe)
        let cx: number, cy: number, cz: number, dist: number;
        do {
          cx = (Math.random() - 0.5) * 100;
          cy = (Math.random() - 0.5) * 70;
          cz = -15 - Math.random() * 60;
          dist = Math.sqrt(cx * cx + cy * cy + cz * cz);
        } while (dist < MIN_STAR_DISTANCE);
        // Tight Gaussian spread (cluster radius ~2-5 units)
        const clusterRadius = 2 + Math.random() * 3;
        for (let i = 0; i < starCount; i++) {
          // Box-Muller-like via sum of randoms for Gaussian distribution
          const gx = ((Math.random() + Math.random() + Math.random() + Math.random()) / 4 - 0.5) * 2;
          const gy = ((Math.random() + Math.random() + Math.random() + Math.random()) / 4 - 0.5) * 2;
          const gz = ((Math.random() + Math.random() + Math.random() + Math.random()) / 4 - 0.5) * 2;
          positions[i * 3] = cx + gx * clusterRadius;
          positions[i * 3 + 1] = cy + gy * clusterRadius;
          positions[i * 3 + 2] = cz + gz * clusterRadius;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const clusterColor = clusterColors[c % clusterColors.length];
        const mat = new THREE.PointsMaterial({
          size: 0.05 + Math.random() * 0.04, // slightly varied sizes per cluster
          color: clusterColor,
          transparent: true,
          opacity: 0.7 + Math.random() * 0.3,
          map: brightStarTexture,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        scene.add(new THREE.Points(geo, mat));
        starLayers.push({ mat, baseOpacity: mat.opacity, speed: 0.4 + Math.random() * 0.6 });
      }
    }

    // ─── Layer 6: Shooting stars (animated streaks) ───
    const shootingStarMeshes: THREE.Mesh[] = [];
    if ((lod as any).shootingStars) {
      for (let i = 0; i < 5; i++) {
        const streakGeo = new THREE.CylinderGeometry(0.004, 0.001, 2.0, 4);
        streakGeo.rotateZ(Math.PI / 2);
        const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const streak = new THREE.Mesh(streakGeo, streakMat);
        streak.userData = {
          active: false,
          progress: 0,
          speed: 0.6 + Math.random() * 1.5,
          startDelay: i * 3 + Math.random() * 8,
          startPos: new THREE.Vector3(),
          direction: new THREE.Vector3(),
        };
        scene.add(streak);
        shootingStarMeshes.push(streak);
      }
    }

    // Globe group (rotatable)
    const globeGroup = new THREE.Group();
    globeGroup.position.y = -1.0; // Shift globe down so northern hemisphere (Europe) is more visible
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Ocean sphere — solid navy blue (base layer)
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, lod.sphereSegments, lod.sphereSegments);
    const earthMat = new THREE.MeshBasicMaterial({ color: OCEAN_COLOR });
    globeGroup.add(new THREE.Mesh(earthGeo, earthMat));

    // No texture overlay needed - countries are fully opaque solid fills on top of the ocean sphere

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
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, lod.sphereSegments, lod.sphereSegments);
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
          // Skip fill for Postponed/Cancelled elections (tiny countries like Bahrain render as squares)
          const isActiveElection = election && election.status !== "Postponed" && election.status !== "Cancelled";
          const color = isActiveElection ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
          // Filled mesh — active election countries get vivid solid fill, others get dark solid fill
          const solidColor = isActiveElection ? color : 0x162040;
          const mesh = buildCountryMesh(feature, GLOBE_RADIUS * 1.002, solidColor);
          if (mesh) {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mesh.userData = { countryCode: alpha2, countryName: feature.properties?.name || "" };
            globeGroup.add(mesh);
            if (alpha2) countryMeshesRef.current.set(alpha2, mesh);
          } else if (election) {
            console.warn(`[Globe] FAILED to build mesh for ${alpha2} (feature.id=${feature.id})`);
          }

          // ALL countries get thin gold GLOWING borders (multiple additive layers)
          // Layer 1: soft outer glow
          const glow1 = buildGoldGlowBorder(feature, GLOBE_RADIUS * 1.003, 0xffd700, 0.6);
          if (glow1) { glow1.userData = { isUltraGlow: true }; glow1.raycast = () => {}; globeGroup.add(glow1); }
          // Layer 2: mid glow
          const glow2 = buildGoldGlowBorder(feature, GLOBE_RADIUS * 1.004, 0xffbf00, 0.8);
          if (glow2) { glow2.userData = { isOuterGlow: true }; glow2.raycast = () => {}; globeGroup.add(glow2); }
          // Layer 3: bright core (still stores countryCode for border highlight but excluded from raycast)
          const glow3 = buildGoldGlowBorder(feature, GLOBE_RADIUS * 1.005, 0xffd700, 1.0);
          if (glow3) { glow3.userData = { countryCode: alpha2, isGlowBorder: true }; glow3.raycast = () => {}; globeGroup.add(glow3); if (alpha2) countryBordersRef.current.set(alpha2, glow3 as any); }
        }
      })
      .catch(err => console.error("Failed to load globe data:", err));

    // ─── Add ocean labels (tangent to globe surface, flow with rotation) ────────
    for (const ocean of OCEAN_LABELS) {
      const mesh = createTextMesh(ocean.name, ocean.lon, ocean.lat, GLOBE_RADIUS * 1.01, {
        fontSize: 28,
        color: "#475569",
        fontStyle: "italic",
        opacity: 0.5,
        scale: 0.25,
      });
      globeGroup.add(mesh);
    }

    // ─── Add ALL country labels (scaled to fit country size) ──────────────────
    // Approximate country "size" for label scaling
    const COUNTRY_SCALE: Record<string, number> = {
      US: 0.16, RU: 0.18, BR: 0.14, CA: 0.16, CN: 0.14, AU: 0.14,
      KZ: 0.12, DZ: 0.10, ET: 0.09, IN: 0.12, AR: 0.10,
      CO: 0.08, SE: 0.09, NZ: 0.07, SO: 0.07, ZM: 0.07, MA: 0.07,
      MX: 0.09, ID: 0.10, SA: 0.08, IR: 0.08, MN: 0.08,
      LY: 0.08, SD: 0.07, CD: 0.08, AO: 0.07, ML: 0.07,
      NE: 0.07, TD: 0.07, EG: 0.07, NG: 0.07, ZA: 0.07,
      TR: 0.06, PK: 0.06, AF: 0.06, UA: 0.07, FR: 0.06,
      ES: 0.06, DE: 0.05, PL: 0.05, IT: 0.08, GB: 0.08,
      JP: 0.05, PH: 0.05, VN: 0.07, TH: 0.05, MM: 0.05,
      PE: 0.06, VE: 0.06, CL: 0.05, BO: 0.06, PY: 0.05,
      EC: 0.04, UY: 0.04, GY: 0.04, SR: 0.03,
      KE: 0.05, TZ: 0.05, MZ: 0.05, MG: 0.05, CM: 0.05,
      CI: 0.04, GH: 0.04, SN: 0.04, BF: 0.04, GN: 0.04,
      UG: 0.04, MW: 0.04, RW: 0.03, BI: 0.03,
      NO: 0.06, FI: 0.06, DK: 0.04, IE: 0.04,
      NL: 0.03, BE: 0.03, CH: 0.06, AT: 0.04, PT: 0.04,
      GR: 0.04, RO: 0.05, HU: 0.07, CZ: 0.07, BG: 0.07,
      SK: 0.06, BA: 0.06, LV: 0.06, HR: 0.03, RS: 0.04,
      IS: 0.07, IL: 0.03, BD: 0.07, AM: 0.03, SS: 0.06,
      GM: 0.03, HT: 0.04, BH: 0.03, CV: 0.03, ST: 0.03, CK: 0.03,
      IQ: 0.05, SY: 0.04, JO: 0.03, LB: 0.03, AE: 0.04,
      OM: 0.04, YE: 0.05, KW: 0.03, QA: 0.03,
      GE: 0.03, AZ: 0.03, UZ: 0.05, TM: 0.05, KG: 0.04, TJ: 0.03,
      NP: 0.04, LK: 0.03, KH: 0.06, LA: 0.04, MY: 0.05,
      CU: 0.05, DO: 0.03, JM: 0.03, TT: 0.03,
      PA: 0.03, CR: 0.03, GT: 0.04, HN: 0.04, NI: 0.04, SV: 0.03, BZ: 0.03,
      KR: 0.04, TW: 0.07, BY: 0.05, LT: 0.03, EE: 0.03,
      AL: 0.03, MK: 0.03, ME: 0.03, SI: 0.03, XK: 0.03,
      // Newly added countries
      AQ: 0.14, GL: 0.12, PG: 0.06, NC: 0.03, FJ: 0.03,
      NA: 0.07, BW: 0.06, ZW: 0.05, MR: 0.07, GA: 0.04,
      CG: 0.04, CF: 0.05, GQ: 0.03, GW: 0.03, SL: 0.03,
      LR: 0.03, TG: 0.03, BJ: 0.03, SZ: 0.03, LS: 0.03,
      MD: 0.03, LU: 0.03, CY: 0.03, PS: 0.03, BN: 0.03,
      BT: 0.03, BS: 0.03, FK: 0.03, TF: 0.03, EH: 0.05,
      TL: 0.03, VU: 0.03, SB: 0.03, PR: 0.03, KP: 0.04,
    };
    // Short display names — use initials for small countries, short names for medium, full for large
    const SHORT_NAMES: Record<string, string> = {
      // AP Style abbreviations — periods in abbreviations, spelled-out where space allows
      // Very large countries (scale >= 0.12): full names
      US: "United States", RU: "Russia", CN: "China", CA: "Canada", BR: "Brazil",
      AU: "Australia", IN: "India", KZ: "Kazakhstan", DZ: "Algeria",
      GL: "Greenland", AQ: "Antarctica",
      // Large countries (scale 0.08-0.11): AP short names
      AR: "Argentina", MX: "Mexico", ID: "Indonesia", SA: "S. Arabia",
      IR: "Iran", MN: "Mongolia", LY: "Libya", SD: "Sudan",
      CD: "D.R. Congo", CO: "Colombia", ET: "Ethiopia",
      // Medium countries (scale 0.06-0.07): AP abbreviated
      TR: "Turkey", PK: "Pakistan", AF: "Afghanistan", UA: "Ukraine", FR: "France",
      ES: "Spain", DE: "Germany", PL: "Poland", IT: "Italy", GB: "U.K.",
      JP: "Japan", PH: "Philippines", VN: "Vietnam", TH: "Thailand", MM: "Myanmar",
      PE: "Peru", VE: "Venezuela", CL: "Chile", BO: "Bolivia",
      SE: "Sweden", NO: "Norway", FI: "Finland", SS: "S. Sudan",
      KE: "Kenya", TZ: "Tanzania", MZ: "Mozambique", MG: "Madagascar", CM: "Cameroon",
      ZM: "Zambia", MA: "Morocco", SO: "Somalia", NG: "Nigeria", ZA: "S. Africa",
      EG: "Egypt", AO: "Angola", ML: "Mali", NE: "Niger", TD: "Chad",
      NZ: "N. Zealand", NA: "Namibia", BW: "Botswana", MR: "Mauritania", PG: "Papua N.G.",
      BY: "Belarus", UZ: "Uzbekistan", TM: "Turkmenistan", IQ: "Iraq", YE: "Yemen",
      MY: "Malaysia", BD: "Bangladesh", ZW: "Zimbabwe", RO: "Romania", EH: "W. Sahara",
      CF: "C.A.R.",
      // Small countries (scale <= 0.05): AP short forms
      NP: "Nepal", LK: "Sri Lanka", KH: "Cambodia", LA: "Laos",
      DK: "Denmark", IE: "Ireland", NL: "Netherlands", BE: "Belgium", CH: "Switzerland",
      AT: "Austria", PT: "Portugal", GR: "Greece", HU: "Hungary", CZ: "Czechia", BG: "Bulgaria",
      SK: "Slovakia", BA: "Bosnia", LV: "Latvia", HR: "Croatia", RS: "Serbia",
      IS: "Iceland", IL: "Israel", AM: "Armenia", GH: "Ghana",
      CI: "Ivory Coast", SN: "Senegal", BF: "Burkina Faso", GN: "Guinea",
      UG: "Uganda", MW: "Malawi", RW: "Rwanda", BI: "Burundi",
      CU: "Cuba", DO: "Dom. Rep.", JM: "Jamaica", HT: "Haiti", TT: "Trinidad",
      PA: "Panama", CR: "Costa Rica", GT: "Guatemala", HN: "Honduras", NI: "Nicaragua",
      SV: "El Salvador", BZ: "Belize", EC: "Ecuador", GY: "Guyana", SR: "Suriname",
      PY: "Paraguay", UY: "Uruguay",
      GE: "Georgia", AZ: "Azerbaijan", KG: "Kyrgyzstan", TJ: "Tajikistan",
      JO: "Jordan", LB: "Lebanon", KW: "Kuwait", QA: "Qatar",
      BH: "Bahrain", OM: "Oman", AE: "U.A.E.", PS: "Palestine",
      SY: "Syria", KR: "S. Korea", KP: "N. Korea", TW: "Taiwan", HK: "Hong Kong",
      SG: "Singapore", BN: "Brunei", BT: "Bhutan",
      GA: "Gabon", CG: "Congo", GQ: "Eq. Guinea", GW: "Guinea-Bissau",
      SL: "Sierra Leone", LR: "Liberia", TG: "Togo", BJ: "Benin", GM: "Gambia",
      ER: "Eritrea", DJ: "Djibouti", SZ: "Eswatini", LS: "Lesotho",
      AL: "Albania", MK: "N. Macedonia", ME: "Montenegro", SI: "Slovenia", XK: "Kosovo",
      MD: "Moldova", LU: "Luxembourg", CY: "Cyprus", LT: "Lithuania", EE: "Estonia",
      NC: "N. Caledonia", FJ: "Fiji", VU: "Vanuatu", SB: "Solomon Is.", TL: "Timor-Leste",
      PR: "Puerto Rico", BS: "Bahamas", FK: "Falklands", TF: "Fr. S. Terr.",
      CV: "Cabo Verde", ST: "S. Tome", CK: "Cook Is.",
    };
    // Status → label color (matches legend)
    const STATUS_LABEL_COLORS: Record<string, string> = {
      "Upcoming": "#fbbf24",
      "Voting Today": "#fde047",
      "Completed": "#4ade80",
      "Postponed": "#6b7280",
      "Cancelled": "#ef4444",
    };
    // ─── Countries to HIDE labels for in crowded regions (non-election, small, just clutter) ───
    const HIDE_LABELS: Set<string> = new Set([
      // Western Europe non-election major countries (declutter)
      "FR", "DE", "ES", "LU", "NL", "BE", "IE", "PT", "AT", "IT",
      // Northern Europe non-election (declutter)
      "NO", "FI", "DK", "IS",
      // Eastern Europe non-election major countries (declutter)
      "PL", "UA", "RO", "MD", "BY", "EE", "LT", "LV",
      // Balkans non-election small countries (declutter)
      "SI", "XK", "HR", "RS", "ME", "AL", "MK", "GR",
      // Other non-election European countries
      "CY", "GE", "AZ",
      // Middle East/Africa non-election (removed from tracker)
      "BH", "SO",
      // UK removed (no confirmed 2026 election)
      "GB",
      // Central America non-election small countries (too clustered near Mexico)
      "GT", "HN", "SV", "BZ", "NI", "CR", "PA",
      // Caribbean non-election small countries
      "JM", "DO", "PR", "TT", "BS", "BB",
    ]);

    // ─── Callout offsets for crowded regions (lon offset, lat offset, altitude multiplier) ───
    // These push labels outward with leader lines, like the NE callouts on the U.S. map
    // European ELECTION countries get LARGE offsets to spread them out clearly like spokes
    const CALLOUT_OFFSETS: Record<string, { dLon: number; dLat: number; alt: number }> = {
      // ── European countries — only small election countries get callout offsets ──
      // Large countries (FR, DE, ES, PL, UA, RO, IT, GB, SE, HU, BG) have labels on territory
      CH: { dLon: -5, dLat: -4, alt: 1.13 },    // Switzerland → small, push SW
      CZ: { dLon: 4, dLat: 3, alt: 1.12 },      // Czech Republic → small, push NE
      SK: { dLon: 5, dLat: -2, alt: 1.12 },     // Slovakia → small, push SE
      BA: { dLon: 3, dLat: -5, alt: 1.12 },     // Bosnia → small, push south
      // ── Middle East (crowded) ──
      IL: { dLon: -6, dLat: -4, alt: 1.15 },
      PS: { dLon: -7, dLat: 0, alt: 1.14 },
      LB: { dLon: -6, dLat: 4, alt: 1.15 },
      JO: { dLon: -6, dLat: -7, alt: 1.14 },
      KW: { dLon: 6, dLat: 5, alt: 1.14 },
      QA: { dLon: 6, dLat: 0, alt: 1.13 },
      BH: { dLon: 7, dLat: 3, alt: 1.15 },
      AE: { dLon: 6, dLat: -4, alt: 1.13 },
      // ── Caribbean ──
      JM: { dLon: -5, dLat: -5, alt: 1.14 },
      HT: { dLon: -4, dLat: 5, alt: 1.14 },
      DO: { dLon: 5, dLat: 5, alt: 1.14 },
      PR: { dLon: 6, dLat: 3, alt: 1.15 },
      TT: { dLon: 5, dLat: -4, alt: 1.15 },
      BS: { dLon: 5, dLat: 5, alt: 1.13 },
      // ── Central America (stacked) ──
      BZ: { dLon: 5, dLat: 5, alt: 1.13 },
      SV: { dLon: -5, dLat: -4, alt: 1.13 },
      CR: { dLon: -5, dLat: -5, alt: 1.13 },
      PA: { dLon: 5, dLat: -5, alt: 1.13 },
      // ── Caucasus ──
      AM: { dLon: -6, dLat: -3, alt: 1.14 },
      // ── SE Asia small ──
      SG: { dLon: 3, dLat: -3, alt: 1.15 },    // Singapore → short stick south-east from tip of peninsula
      BN: { dLon: 5, dLat: 5, alt: 1.14 },
      TL: { dLon: 5, dLat: -5, alt: 1.14 },
      // ── West Africa (crowded coast) ──
      GM: { dLon: -6, dLat: -5, alt: 1.14 },
      GW: { dLon: -7, dLat: -2, alt: 1.13 },
      SL: { dLon: -6, dLat: -5, alt: 1.13 },
      TG: { dLon: 4, dLat: -5, alt: 1.13 },
      BJ: { dLon: 4, dLat: 5, alt: 1.13 },
      GQ: { dLon: 5, dLat: 5, alt: 1.14 },
      // ── East Africa small ──
      SO: { dLon: 6, dLat: 0, alt: 1.18 },     // Somalia → callout east with visible leader line (stick)
      RW: { dLon: -5, dLat: 4, alt: 1.13 },
      BI: { dLon: -5, dLat: -4, alt: 1.13 },
      DJ: { dLon: 5, dLat: 4, alt: 1.14 },
      // ── Southern Africa small ──
      SZ: { dLon: 5, dLat: 4, alt: 1.13 },
      LS: { dLon: 5, dLat: -5, alt: 1.13 },
      // ── Archipelago nations (label in ocean/between islands → push to clear space) ──
      ID: { dLon: 5, dLat: 0, alt: 1.14 },      // Indonesia → short stick east of archipelago
      PH: { dLon: 6, dLat: -5, alt: 1.12 },    // Philippines → push south-east into Philippine Sea
      JP: { dLon: 6, dLat: 5, alt: 1.12 },     // Japan → push north-east into Pacific
      MY: { dLon: 0, dLat: -3, alt: 1.12 },    // Malaysia → short stick south below peninsula
      NZ: { dLon: 5, dLat: -6, alt: 1.12 },    // New Zealand → push south-east below islands
      // ── South/East Asia small ──
      TW: { dLon: 3, dLat: -2, alt: 1.13 },    // Taiwan → short stick east of island
      BD: { dLon: 3, dLat: -3, alt: 1.13 },    // Bangladesh → short stick SE into Bay of Bengal
      VN: { dLon: 4, dLat: 0, alt: 1.12 },     // Vietnam → short stick east into South China Sea
      KH: { dLon: -3, dLat: -3, alt: 1.12 },   // Cambodia → short stick SW to separate from Vietnam
      NP: { dLon: -5, dLat: 5, alt: 1.13 },    // Nepal → push north-west away from India label
      // ── Atlantic/Gulf islands ──
      CV: { dLon: -6, dLat: -4, alt: 1.14 },   // Cape Verde → push west into Atlantic
      ST: { dLon: -5, dLat: -5, alt: 1.14 },   // São Tomé → push south-west
      // ── Pacific islands ──
      CK: { dLon: 0, dLat: -6, alt: 1.14 },    // Cook Islands → push south
    };

    // Create a leader line (tube mesh) from country centroid to offset label position
    function createLeaderLine(fromLon: number, fromLat: number, toLon: number, toLat: number, fromRadius: number, toRadius: number): THREE.Mesh {
      const from = latLonToVec3Internal(fromLon, fromLat, fromRadius);
      const to = latLonToVec3Internal(toLon, toLat, toRadius);
      // Create a tube along a straight path for visible thickness
      const path = new THREE.LineCurve3(from, to);
      const geometry = new THREE.TubeGeometry(path, 4, 0.007, 6, false);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      return new THREE.Mesh(geometry, material);
    }

    const addCountryLabels = () => {
      const map = electionMapRef.current;
      // Add labels for countries that have centroids (skip hidden ones in crowded regions)
      Object.entries(COUNTRY_CENTROIDS).forEach(([code, centroid]) => {
        const election = map.get(code);
        // Skip labels for small non-election countries in crowded regions
        // (they just add clutter without providing useful info)
        if (HIDE_LABELS.has(code) && !election) return;
        const labelScale = COUNTRY_SCALE[code] || 0.04;
        const displayName = SHORT_NAMES[code] || code;
        // Election countries get BRIGHT WHITE (pops with dark outline against colored fills)
        // Non-election countries get a softer slate color
        let labelColor: string;
        if (election && election.status !== "Postponed" && election.status !== "Cancelled") {
          labelColor = "#ffffff"; // Bright white for election countries
        } else {
          labelColor = "#94a3b8"; // Slate-400 for non-election (visible but subdued)
        }
        // Generate flag emoji for this country
        const flagEmoji = countryCodeToFlag(code);

        // Check if this country needs a callout offset (crowded region)
        const callout = CALLOUT_OFFSETS[code];
        let labelLon = centroid.lon;
        let labelLat = centroid.lat;
        let labelRadius = GLOBE_RADIUS * 1.02;



        if (callout) {
          labelLon = centroid.lon + callout.dLon;
          labelLat = centroid.lat + callout.dLat;
          labelRadius = GLOBE_RADIUS * callout.alt;
          // Create leader line from country surface to label
          const line = createLeaderLine(
            centroid.lon, centroid.lat,
            labelLon, labelLat,
            GLOBE_RADIUS * 1.01,
            labelRadius * 0.99
          );
          line.userData = { isLabel: true, isLeaderLine: true, countryLabel: code, countryCode: code, countryName: SHORT_NAMES[code] || code };
          globeGroup.add(line);
          // Add a small dot at the country centroid (clickable)
          const dotGeo = new THREE.SphereGeometry(0.012, 8, 8);
          const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          const dotPos = latLonToVec3Internal(centroid.lon, centroid.lat, GLOBE_RADIUS * 1.015);
          dot.position.copy(dotPos);
          dot.userData = { isLabel: true, isLeaderDot: true, countryLabel: code, countryCode: code, countryName: SHORT_NAMES[code] || code };
          globeGroup.add(dot);
        }

        const mesh = createTextMesh(displayName, labelLon, labelLat, labelRadius, {
          fontSize: 32,
          color: labelColor,
          fontStyle: "bold",
          opacity: 1.0,
          scale: labelScale * 1.5,
          flag: flagEmoji,
        });
        mesh.userData = { isLabel: true, countryLabel: code, countryCode: code, countryName: SHORT_NAMES[code] || code };
        globeGroup.add(mesh);
      });
    };
    // Delay slightly to ensure elections data is populated
    setTimeout(addCountryLabels, 100);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Auto-rotate
      if (!userInteracted.current && autoRotate) {
        globeGroup.rotation.y += 0.001; // Faster idle auto-rotation
      }

      // Smooth rotation to focused country
      if (focusTargetRef.current) {
        const target = focusTargetRef.current;
        // Normalize current rotation.y to [-PI, PI] range for proper comparison
        let currentY = globeGroup.rotation.y;
        // Wrap currentY to [-PI, PI]
        currentY = ((currentY % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        globeGroup.rotation.y = currentY;
        
        let dy = target.y - currentY;
        // Shortest path around the circle (must be else-if to avoid undoing)
        if (dy > Math.PI) dy -= 2 * Math.PI;
        else if (dy < -Math.PI) dy += 2 * Math.PI;
        
        const dx = target.x - globeGroup.rotation.x;
        const speed = 0.7; // Very fast, snappy rotation for long-distance focus
        globeGroup.rotation.y += dy * speed;
        globeGroup.rotation.x += dx * speed;
        // Stop when close enough
        if (Math.abs(dy) < 0.01 && Math.abs(dx) < 0.01) {
          globeGroup.rotation.y = target.y;
          globeGroup.rotation.x = target.x;
          focusTargetRef.current = null;
        }
        velocity.current = { x: 0, y: 0 }; // Kill momentum during focus
      }

      // Camera always looks at globe center - tilt alone handles centering
      if (camera) {
        camera.lookAt(0, 0, 0);
      }

      // Momentum
      if (!isDragging.current && !focusTargetRef.current) {
        if (Math.abs(velocity.current.x) > 0.0001 || Math.abs(velocity.current.y) > 0.0001) {
          globeGroup.rotation.y += velocity.current.x;
          globeGroup.rotation.x += velocity.current.y;
          velocity.current.x *= 0.92;
          velocity.current.y *= 0.92;
        }
      }

      // Clamp vertical
      globeGroup.rotation.x = Math.max(-0.55, Math.min(0.55, globeGroup.rotation.x));

      // Twinkle stars (skip on low quality for performance)
      if (lod.twinkle) {
        const time = Date.now() * 0.001;
        starLayers.forEach((layer, i) => {
          const phase = i * 1.7; // offset each layer
          const twinkle = 0.7 + 0.3 * Math.sin(time * layer.speed + phase);
          layer.mat.opacity = layer.baseOpacity * twinkle;
        });
      }

      // Parallax rotation for nebula/dust group (independent of globe)
      // Very slow multi-axis drift creates depth perception
      const nebulaTime = Date.now() * 0.0001; // very slow
      nebulaGroup.rotation.y = Math.sin(nebulaTime * 0.7) * 0.03 + nebulaTime * 0.02;
      nebulaGroup.rotation.x = Math.cos(nebulaTime * 0.5) * 0.015;
      nebulaGroup.rotation.z = Math.sin(nebulaTime * 0.3) * 0.008;

      // Animate shooting stars
      if (shootingStarMeshes.length > 0) {
        const dt = 0.016; // ~60fps
        shootingStarMeshes.forEach((streak) => {
          const ud = streak.userData;
          if (!ud.active) {
            ud.startDelay -= dt;
            if (ud.startDelay <= 0) {
              ud.active = true;
              ud.progress = 0;
              // Random start position in the sky
              ud.startPos.set(
                (Math.random() - 0.5) * 40,
                15 + Math.random() * 20,
                -20 - Math.random() * 30
              );
              // Random downward direction
              ud.direction.set(
                (Math.random() - 0.5) * 0.6,
                -0.7 - Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
              ).normalize();
              // Orient streak along direction
              streak.lookAt(
                streak.position.x + ud.direction.x,
                streak.position.y + ud.direction.y,
                streak.position.z + ud.direction.z
              );
            }
          } else {
            ud.progress += dt * ud.speed;
            const t = ud.progress;
            streak.position.copy(ud.startPos).addScaledVector(ud.direction, t * 30);
            // Fade in then out
            const fade = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
            (streak.material as THREE.MeshBasicMaterial).opacity = fade * 0.7;
            if (t >= 1) {
              ud.active = false;
              ud.startDelay = 5 + Math.random() * 10; // Wait before next one
              (streak.material as THREE.MeshBasicMaterial).opacity = 0;
            }
          }
        });
      }

      // ─── Label visibility: hide labels on the back of the globe (or all if toggled off) ──
      if (globeGroup) {
        const cameraWorldPos = new THREE.Vector3();
        camera.getWorldPosition(cameraWorldPos);
        const globeCenter = new THREE.Vector3();
        globeGroup.getWorldPosition(globeCenter);
        const camDir = cameraWorldPos.clone().sub(globeCenter).normalize();

        // Get the inverse of the globe's rotation to cancel it for billboard labels
        const globeQuaternion = globeGroup.quaternion.clone();
        const inverseGlobeQuat = globeQuaternion.clone().invert();

        globeGroup.children.forEach((child) => {
          if (child.userData && child.userData.isLabel) {
            // Handle different material types (Mesh, Line, Sprite)
            const mat = (child as any).material as THREE.Material & { opacity: number };
            if (!mat) return;
            // If labels are toggled off, hide all
            if (!showLabelsRef.current) {
              mat.opacity = 0;
              return;
            }
            // Get label's world position
            const labelWorldPos = new THREE.Vector3();
            child.getWorldPosition(labelWorldPos);
            // Vector from globe center to label
            const labelDir = labelWorldPos.clone().sub(globeCenter).normalize();
            // Dot product: 1 = facing camera, -1 = facing away
            const dot = labelDir.dot(camDir);
            // Leader lines and dots get slightly lower opacity
            const isLeader = child.userData.isLeaderLine || child.userData.isLeaderDot;
            const maxOpacity = isLeader ? 0.7 : 1;
            // Fade labels based on angle: fully visible > 0.3, fade between 0.0 and 0.3, hidden < 0.0
            if (dot < 0.0) {
              mat.opacity = 0;
            } else if (dot < 0.3) {
              mat.opacity = (dot / 0.3) * maxOpacity;
            } else {
              mat.opacity = maxOpacity;
            }

            // Billboard: make text labels always face the camera (not leader lines/dots)
            if (!isLeader && child instanceof THREE.Mesh) {
              // Cancel globe rotation, then face camera
              child.quaternion.copy(inverseGlobeQuat);
              // Apply camera's quaternion so text faces the viewer
              child.quaternion.premultiply(camera.quaternion);
              // Scale labels down when camera is far away to prevent giant squares at max zoom-out
              const camDist = cameraWorldPos.distanceTo(globeCenter);
              const baseZ = 7.2; // Default camera distance
              const scaleFactor = Math.min(1, baseZ / camDist);
              const origScale = child.userData.origScale;
              if (origScale) {
                child.scale.set(origScale.x * scaleFactor, origScale.y * scaleFactor, origScale.z * scaleFactor);
              } else {
                // Store original scale on first encounter
                child.userData.origScale = { x: child.scale.x, y: child.scale.y, z: child.scale.z };
              }
              // Also fade labels out at extreme zoom to prevent visual clutter
              if (camDist > 8) {
                mat.opacity = Math.max(0, mat.opacity * (1 - (camDist - 8) / 2));
              }
            }
          }
        });
      }

      // Pulse glowing borders for election countries
      const pulseTime = Date.now() * 0.001;
      countryBordersRef.current.forEach((border, code) => {
        const election = electionMapRef.current.get(code);
        if (!election) return;
        const mat = border.material as THREE.LineBasicMaterial;
        if (election.status === "Voting Today") {
          // Fast bright pulse for active voting
          mat.opacity = 0.6 + 0.4 * Math.sin(pulseTime * 4);
        } else if (election.status === "Upcoming") {
          // Gentle slow pulse for upcoming
          mat.opacity = 0.5 + 0.4 * Math.sin(pulseTime * 1.5);
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

  // Rotate globe to focus on a specific country
  useEffect(() => {
    if (!focusCountry || !globeGroupRef.current) {
      focusTargetRef.current = null;
      return;
    }
    const centroid = COUNTRY_CENTROIDS[focusCountry];
    if (!centroid) return;
    // Convert lon/lat to globe rotation angles
    // The globe's coordinate system: at rotation.y=0, lon=-90 faces camera.
    // Positive rotation.y rotates the globe CCW (from above), moving the facing longitude WEST.
    // To bring longitude L to face camera: targetY = -(L * PI/180 + PI/2)
    const targetY = -(centroid.lon * (Math.PI / 180) + Math.PI / 2);
    // Tilt toward the target latitude (negative because Y-axis is inverted)
    // Factor of 0.6 gives a moderate tilt that shows the target hemisphere well
    // Cap at ±1.0 rad (~57°) to allow European/polar countries to be centered
    const rawTilt = -centroid.lat * (Math.PI / 180) * 0.55;
    const targetX = Math.max(-0.55, Math.min(0.55, rawTilt));
    focusTargetRef.current = { y: targetY, x: targetX };
    userInteracted.current = true; // Stop auto-rotate during focus
  }, [focusCountry]);

  // Update colors when elections or selectedCountry changes
  useEffect(() => {
    countryMeshesRef.current.forEach((mesh, code) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const election = electionMapRef.current.get(code);
      if (code === selectedCountry) {
        // Selected country: brighter fill to highlight
        const color = election ? (STATUS_COLORS[election.status] ?? SELECTED_COLOR) : SELECTED_COLOR;
        mat.color.setHex(color);
      } else {
        const solidColor = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : 0x1a2744;
        mat.color.setHex(solidColor);
      }
    });
    // Also brighten the selected country's border
    countryBordersRef.current.forEach((border, code) => {
      const mat = border.material as THREE.LineBasicMaterial;
      if (code === selectedCountry) {
        mat.opacity = 1.0;
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
      globeGroupRef.current.rotation.y += dx * 0.015;
      globeGroupRef.current.rotation.x += dy * 0.015;
      velocity.current = { x: dx * 0.015, y: dy * 0.015 };
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
        const { countryCode, countryName, isLabel } = hit.object.userData;
        if (countryCode) {
          foundCountry = true;
          const prevHovered = hoveredCountryRef.current;
          // Reset previous hovered country if different from new one
          if (prevHovered && prevHovered.code !== countryCode && prevHovered.code !== selectedCountry) {
            const prevMesh = countryMeshesRef.current.get(prevHovered.code);
            if (prevMesh) {
              const prevMat = prevMesh.material as THREE.MeshBasicMaterial;
              const prevElection = electionMapRef.current.get(prevHovered.code);
              const prevColor = prevElection ? (STATUS_COLORS[prevElection.status] ?? DEFAULT_COLOR) : 0x1a2744;
              prevMat.color.setHex(prevColor);
            }
            const prevBorder = countryBordersRef.current.get(prevHovered.code);
            if (prevBorder) {
              const prevBMat = prevBorder.material as THREE.LineBasicMaterial;
              const prevElection = electionMapRef.current.get(prevHovered.code);
              prevBMat.color.setHex(prevElection ? (STATUS_COLORS[prevElection.status] ?? 0xf59e0b) : BORDER_COLOR);
              prevBMat.opacity = 0.7;
            }
          }
          hoveredCountryRef.current = { code: countryCode, name: countryName };
          onCountryHover(countryCode, countryName);
          const election = electionMapRef.current.get(countryCode);
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            name: election?.country || countryName || countryCode,
            status: election?.status || "No Election Tracked",
          });
          // Highlight the actual country mesh (not the label if we hit a label)
          const countryMesh = countryMeshesRef.current.get(countryCode);
          if (countryMesh && countryCode !== selectedCountry) {
            const cMat = countryMesh.material as THREE.MeshBasicMaterial;
            cMat.color.setHex(HOVER_COLOR);
          }
          // Also brighten the border glow on hover
          const hoveredBorder = countryBordersRef.current.get(countryCode);
          if (hoveredBorder && countryCode !== selectedCountry) {
            const bMat = hoveredBorder.material as THREE.LineBasicMaterial;
            bMat.color.setHex(0xffffff);
            bMat.opacity = 1.0;
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
            const solidColor = election ? (STATUS_COLORS[election.status] ?? DEFAULT_COLOR) : 0x1a2744;
            mat.color.setHex(solidColor);
          }
        });
        // Reset border glow colors
        countryBordersRef.current.forEach((border, code) => {
          if (code !== selectedCountry) {
            const mat = border.material as THREE.LineBasicMaterial;
            const election = electionMapRef.current.get(code);
            mat.color.setHex(election ? (STATUS_COLORS[election.status] ?? 0xf59e0b) : BORDER_COLOR);
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
    cameraRef.current.position.z = Math.max(3.5, Math.min(8.5, z));
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
