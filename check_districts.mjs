// Check NC district count for congress 89 vs 90
for (const [congress, filename] of [[89, "North Carolina_088_to_089.geojson"], [90, "North Carolina_090_to_090.geojson"]]) {
  const resp = await fetch(`http://localhost:3000/api/geojson/${encodeURIComponent(filename)}`);
  const data = await resp.json();
  console.log(`Congress ${congress}: NC has ${data.features.length} districts`);
}
