// Count total features for 89th Congress across all states
const states = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

// Fetch manifest to get the correct filename for each state at congress 89
const manifestResp = await fetch("http://localhost:3000/api/manifest");
const manifest = await manifestResp.json();

let totalFeatures = 0;
let ncFeatures = 0;
const missing = [];

for (const state of states) {
  const entry = manifest.find(e => e.name.startsWith(state + "_") && e.start <= 89 && e.end >= 89);
  if (!entry) { missing.push(state); continue; }
  
  const resp = await fetch(`http://localhost:3000/api/geojson/${encodeURIComponent(entry.name)}`);
  const data = await resp.json();
  const count = data.features?.length ?? 0;
  totalFeatures += count;
  if (state === "North Carolina") ncFeatures = count;
}

console.log(`Total features for 89th Congress: ${totalFeatures}`);
console.log(`NC features: ${ncFeatures}`);
console.log(`Without NC: ${totalFeatures - ncFeatures}`);
console.log(`Missing states: ${missing.join(", ") || "none"}`);
