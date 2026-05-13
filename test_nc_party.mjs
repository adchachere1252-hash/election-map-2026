const response = await fetch("http://localhost:3000/api/voteview/89");
const data = await response.json();
const ncKeys = Object.entries(data).filter(([k]) => k.startsWith("NC-"));
console.log("NC party data for 89th Congress:");
ncKeys.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`\nTotal NC entries: ${ncKeys.length}`);
