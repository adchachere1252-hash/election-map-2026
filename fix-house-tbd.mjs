import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find all House races in General/Called status where candidate2 is NULL (missing opponent)
const [missing] = await conn.execute(`
  SELECT id, state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, primary_date, status, notes
  FROM house_races 
  WHERE status IN ('General', 'Called') 
  AND (candidate2_name IS NULL OR candidate2_name = '')
  ORDER BY state_code, district
`);

console.log(`Found ${missing.length} House races in General/Called with no candidate2:`);
for (const r of missing) {
  console.log(`  ${r.state_code}-${r.district} | C1: ${r.candidate1_name} (${r.candidate1_party}) | Primary: ${r.primary_date} | Status: ${r.status}`);
}

// Also check for races where candidate1 is NULL
const [missing1] = await conn.execute(`
  SELECT id, state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, primary_date, status
  FROM house_races 
  WHERE status IN ('General', 'Called') 
  AND (candidate1_name IS NULL OR candidate1_name = '')
  ORDER BY state_code, district
`);

console.log(`\nFound ${missing1.length} House races in General/Called with no candidate1:`);
for (const r of missing1) {
  console.log(`  ${r.state_code}-${r.district} | C2: ${r.candidate2_name} (${r.candidate2_party}) | Primary: ${r.primary_date} | Status: ${r.status}`);
}

await conn.end();
