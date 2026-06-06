import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== SENATE RACES (June 2 primary states + runoff states) ===");
const [senate] = await conn.execute(
  `SELECT id, state_code, state_name, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM senate_races 
   WHERE state_code IN ('CA','IA','NJ','MT','NM','SD','GA','AL','LA')
   ORDER BY state_code`
);
for (const r of senate) {
  console.log(`${r.state_code} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 300)}`);
}

console.log("\n=== GOVERNOR RACES (all with Voting or Primary Runoff status) ===");
const [govs] = await conn.execute(
  `SELECT id, state_code, state_name, dem_candidate, rep_candidate, status, rating, notes 
   FROM governor_races 
   WHERE status IN ('Voting', 'Primary Runoff')
   ORDER BY state_code`
);
for (const r of govs) {
  console.log(`${r.state_code} | D: ${r.dem_candidate} | R: ${r.rep_candidate} | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 300)}`);
}

console.log("\n=== HOUSE RACES (NJ - all 12 districts) ===");
const [njHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'NJ'
   ORDER BY district`
);
for (const r of njHouse) {
  console.log(`NJ-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 200)}`);
}

console.log("\n=== HOUSE RACES (IA - all 4 districts) ===");
const [iaHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'IA'
   ORDER BY district`
);
for (const r of iaHouse) {
  console.log(`IA-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 200)}`);
}

console.log("\n=== HOUSE RACES (MT - 2 districts) ===");
const [mtHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'MT'
   ORDER BY district`
);
for (const r of mtHouse) {
  console.log(`MT-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 200)}`);
}

console.log("\n=== HOUSE RACES (NM - 3 districts) ===");
const [nmHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'NM'
   ORDER BY district`
);
for (const r of nmHouse) {
  console.log(`NM-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 200)}`);
}

console.log("\n=== HOUSE RACES (SD - 1 at-large district) ===");
const [sdHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'SD'
   ORDER BY district`
);
for (const r of sdHouse) {
  console.log(`SD-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}`);
  if (r.notes) console.log(`  Notes: ${r.notes.substring(0, 200)}`);
}

console.log("\n=== CA HOUSE RACES (all 52 districts) ===");
const [caHouse] = await conn.execute(
  `SELECT district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, status, rating, notes 
   FROM house_races 
   WHERE state_code = 'CA'
   ORDER BY district`
);
for (const r of caHouse) {
  const note = r.notes ? ` | Notes: ${r.notes.substring(0, 150)}` : '';
  console.log(`CA-${r.district} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party}) | ${r.status} | ${r.rating}${note}`);
}

await conn.end();
