/**
 * Downloads 118th Congress district GeoJSON from Census Bureau,
 * filters to 435 voting districts only (excludes territories),
 * adds a FIPS-based stateCode + district number to each feature,
 * and writes a compact TopoJSON to client/public/districts-10m.json
 */
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import https from "https";
import http from "http";

const FIPS_TO_STATE = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN",
  "19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA",
  "26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV",
  "33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
  "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN",
  "48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
};

// Non-voting territory FIPS codes to exclude
const TERRITORY_FIPS = new Set(["60","66","69","72","78"]);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

console.log("Downloading 118th Congress district GeoJSON...");
const geojson = await fetchJson(
  "https://raw.githubusercontent.com/uscensusbureau/citysdk/master/v2/GeoJSON/500k/2022/congressional-district.json"
);

console.log(`Total features: ${geojson.features.length}`);

// Filter to 50 states only and enrich with stateCode + district number
const filtered = geojson.features.filter(f => {
  const fips = f.properties.STATEFP;
  return !TERRITORY_FIPS.has(fips) && FIPS_TO_STATE[fips];
}).map(f => {
  const fips = f.properties.STATEFP;
  const stateCode = FIPS_TO_STATE[fips];
  const districtNum = f.properties.CD118FP;
  // "00" means at-large
  const district = districtNum === "00" ? 0 : parseInt(districtNum, 10);
  return {
    ...f,
    properties: {
      stateCode,
      stateFips: fips,
      district,
      districtLabel: districtNum === "00" ? "AL" : districtNum,
      geoid: f.properties.GEOID,
    }
  };
});

console.log(`Filtered features (50 states): ${filtered.length}`);

// Write filtered GeoJSON to temp file
const tempGeoJson = { type: "FeatureCollection", features: filtered };
writeFileSync("/tmp/districts-filtered.json", JSON.stringify(tempGeoJson));

// Convert to TopoJSON using geo2topo
console.log("Converting to TopoJSON...");
execSync(
  "geo2topo districts=/tmp/districts-filtered.json | toposimplify -p 0.05 -f > /home/ubuntu/election-map-2026/client/public/districts-10m.json",
  { stdio: "inherit" }
);

// Verify output
const topo = JSON.parse(readFileSync("/home/ubuntu/election-map-2026/client/public/districts-10m.json", "utf8"));
const count = topo.objects?.districts?.geometries?.length ?? 0;
const size = readFileSync("/home/ubuntu/election-map-2026/client/public/districts-10m.json").length;
console.log(`TopoJSON written: ${count} districts, ${(size/1024).toFixed(1)} KB`);

// Verify sample
const sample = topo.objects.districts.geometries[0]?.properties;
console.log("Sample:", sample);
