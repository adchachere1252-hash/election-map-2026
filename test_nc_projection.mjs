import * as d3 from 'd3';

// Simulate the same projection as the app
function buildProjection(W, H) {
  const mapScale = Math.min(W, H * 1.6) * 0.95;
  return d3.geoAlbersUsa().scale(mapScale).translate([W / 2, H / 2 - H * 0.04]);
}

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

const W = 960, H = 600;
const projection = buildProjection(W, H);
const pathGen = d3.geoPath().projection(projection);

const resp = await fetch('http://localhost:3000/api/geojson/North%20Carolina_088_to_089.geojson');
const data = await resp.json();

for (const f of data.features) {
  const dist = f.properties.district;
  const rawPath = pathGen(f);
  const cleanPath = removeClipRects(rawPath);
  const rawLen = rawPath ? rawPath.length : 0;
  const cleanLen = cleanPath ? cleanPath.length : 0;
  const subPathsBefore = rawPath ? (rawPath.match(/M/g) || []).length : 0;
  const subPathsAfter = cleanPath ? (cleanPath.match(/M/g) || []).length : 0;
  const stripped = subPathsBefore - subPathsAfter;
  console.log(`NC-${dist}: rawPath=${rawLen}chars (${subPathsBefore} subpaths) → clean=${cleanLen}chars (${subPathsAfter} subpaths) stripped=${stripped} ${cleanLen === 0 ? '⚠️ EMPTY!' : '✓'}`);
}
