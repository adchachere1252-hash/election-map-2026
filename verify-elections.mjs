import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, country, election_type, election_date, status, winner, winner_party, election_name, notes 
   FROM world_elections WHERE status = 'Completed' ORDER BY election_date`
);
for (const r of rows) {
  console.log(JSON.stringify(r));
}
console.log(`\n--- TOTAL COMPLETED: ${rows.length} ---`);

// Also check upcoming
const [upcoming] = await conn.execute(
  `SELECT id, country, election_type, election_date, status, candidates, key_issues 
   FROM world_elections WHERE status != 'Completed' ORDER BY election_date LIMIT 20`
);
console.log(`\n=== UPCOMING ELECTIONS (first 20) ===`);
for (const r of upcoming) {
  console.log(JSON.stringify({id: r.id, country: r.country, type: r.election_type, date: r.election_date, hasCandidates: !!r.candidates, hasIssues: !!r.key_issues}));
}
console.log(`\n--- TOTAL UPCOMING: ${upcoming.length} ---`);

await conn.end();
process.exit(0);
