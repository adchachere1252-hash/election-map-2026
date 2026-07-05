import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);
// Check a few key elections for their existing data
const ids = [18, 22, 14, 25, 10, 6, 27]; // Brazil, Israel, Sweden, NZ, Zambia, Algeria, Bulgaria
const [rows] = await conn.execute(
  `SELECT id, country, candidates, polling_data, sources FROM world_elections WHERE id IN (${ids.join(',')})`
);
for (const r of rows) {
  console.log(`\n=== ${r.country} (ID:${r.id}) ===`);
  if (r.candidates) {
    const cands = JSON.parse(r.candidates);
    console.log(`Candidates (${cands.length}):`);
    cands.forEach(c => console.log(`  - ${c.name} (${c.party}) photo:${c.photo ? 'YES' : 'NO'}`));
  }
  if (r.polling_data) {
    const pd = JSON.parse(r.polling_data);
    console.log(`Polling: leader=${pd.leader}, margin=${pd.margin}`);
    if (pd.polls?.[0]) console.log(`  Latest poll:`, JSON.stringify(pd.polls[0]).slice(0, 200));
  }
  if (r.sources) {
    console.log(`Sources: ${r.sources.slice(0, 200)}`);
  }
}
await conn.end();
