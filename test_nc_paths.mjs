import * as d3 from "d3";

// Fetch NC GeoJSON
const response = await fetch("http://localhost:3000/api/geojson/North%20Carolina_088_to_089.geojson");
const geojson = await response.json();

console.log(`NC features: ${geojson.features.length}`);

// Build same projection as the component
const W = 960, H = 600;
const mapScale = Math.min(W, H * 1.6) * 0.95;
const projection = d3.geoAlbersUsa().scale(mapScale).translate([W / 2, H / 2 - H * 0.04]);
const pathGen = d3.geoPath().projection(projection);

function removeClipRects(pathD) {
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

let emptyCount = 0;
let nullProjectionCount = 0;
for (const f of geojson.features) {
  const rawPath = pathGen(f);
  if (rawPath === null) {
    nullProjectionCount++;
    const dist = f.properties?.district ?? f.properties?.DISTRICT;
    const state = f.properties?.statename ?? f.properties?.STATENAME;
    console.log(`  NULL PROJECTION: ${state} district ${dist}`);
    continue;
  }
  const cleaned = removeClipRects(rawPath);
  if (!cleaned || cleaned.trim() === "") {
    emptyCount++;
    const dist = f.properties?.district ?? f.properties?.DISTRICT;
    const state = f.properties?.statename ?? f.properties?.STATENAME;
    console.log(`  EMPTY AFTER STRIP: ${state} district ${dist} | raw length: ${rawPath.length}`);
  }
}
console.log(`\nSummary: ${nullProjectionCount} null projections, ${emptyCount} empty after strip, ${geojson.features.length - nullProjectionCount - emptyCount} OK`);
