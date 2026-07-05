import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, country, country_code, election_name, election_type, election_date, 
   candidates IS NOT NULL as has_candidates, polling_data IS NOT NULL as has_polling,
   key_issues IS NOT NULL as has_issues
   FROM world_elections WHERE status = 'Upcoming' ORDER BY election_date ASC`
);
console.log("=== UPCOMING WORLD ELECTIONS ===");
console.log(`Total: ${rows.length}`);
console.log("");
for (const r of rows) {
  console.log(`ID:${r.id} | ${r.country} (${r.country_code}) | ${r.election_name} | ${r.election_type} | ${r.election_date} | cand:${r.has_candidates} poll:${r.has_polling} issues:${r.has_issues}`);
}
await conn.end();
