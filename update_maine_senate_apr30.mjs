import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Check current Maine Senate record
const [rows] = await conn.execute(
  `SELECT id, state_name, candidate1_name, candidate2_name, rating, notes FROM senate_races WHERE state_name = 'Maine' LIMIT 3`
);
console.log('Current Maine Senate records:', JSON.stringify(rows, null, 2));

if (rows.length > 0) {
  const maineRace = rows[0];
  console.log('Found Maine Senate race id:', maineRace.id);

  // Update:
  // - candidate1_name: Graham Platner (was Janet Mills)
  // - rating: Lean R (was Toss-up — Mills dropout weakens Dem position)
  // - notes: full context of Mills dropout
  await conn.execute(
    `UPDATE senate_races SET
      candidate1_name = ?,
      rating = ?,
      notes = ?
    WHERE id = ?`,
    [
      'Graham Platner',
      'Lean R',
      'BREAKING (Apr 30, 2026): Gov. Janet Mills suspended her Senate campaign Thursday morning, citing lack of financial resources. Mills had been trailing progressive challenger Graham Platner — a military veteran and oyster farmer — in both polls and fundraising. Mills was the preferred candidate of Senate Minority Leader Chuck Schumer and national Democrats. Platner is now the presumptive Democratic nominee heading into the June 9 Democratic primary. General election: Platner vs. Sen. Susan Collins (R), a 5-term incumbent. Collins is now in a stronger position with Mills out of the race. Rating moved from Toss-up to Lean R. Source: Politico, NBC News, CBS News, Axios (Apr 30, 2026).',
      maineRace.id
    ]
  );

  console.log('✅ Maine Senate race updated:');
  console.log('   candidate1_name: Graham Platner (D - presumptive nominee)');
  console.log('   rating: Lean R (moved from Toss-up)');
  console.log('   notes: Mills dropout context added');
} else {
  // Check all senate races to find Maine
  const [allRows] = await conn.execute(`SELECT id, state_name, candidate1_name, candidate2_name, rating FROM senate_races ORDER BY state_name`);
  console.log('All Senate races:', JSON.stringify(allRows, null, 2));
}

await conn.end();
console.log('Done!');
