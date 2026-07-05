import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT id, country, country_code, election_type, status, election_date, 
         system_type, term_length, incumbent, incumbent_party,
         winner, winner_party, turnout_pct, total_votes,
         candidates, polling_data, key_issues, notes, sources
  FROM world_elections 
  ORDER BY election_date ASC
`);

// Output as structured JSON
console.log(JSON.stringify(rows, null, 2));
await conn.end();
process.exit(0);
