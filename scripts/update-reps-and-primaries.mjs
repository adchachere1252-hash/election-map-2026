/**
 * Update all 435 House districts with actual representative names
 * and update Senate/House races that have held primaries with confirmed candidates.
 * Sources: Official House Clerk OLM-119 (April 1, 2026), AP News, Ballotpedia, multiple news outlets.
 */

import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const reps = JSON.parse(readFileSync('/tmp/reps-parsed.json', 'utf8'));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Updating House district representative names ===');
let houseUpdated = 0;
let houseNotFound = 0;

for (const [key, repName] of Object.entries(reps)) {
  const [stateCode, districtStr] = key.split('-');
  const districtNum = parseInt(districtStr);

  // Determine incumbent name and party from the rep name
  // VACANT seats get special treatment
  const isVacant = repName === 'VACANT';

  // Get current record to check party
  const [rows] = await conn.execute(
    'SELECT id, state_code, district, incumbent, incumbent_party FROM house_races WHERE state_code = ? AND district = ?',
    [stateCode, districtNum]
  );

  if (rows.length === 0) {
    houseNotFound++;
    console.log(`  NOT FOUND: ${key}`);
    continue;
  }

  const race = rows[0];

  if (isVacant) {
    await conn.execute(
      'UPDATE house_races SET incumbent = ?, candidate1_name = ?, status = ? WHERE id = ?',
      ['VACANT', 'TBD', 'general', race.id]
    );
  } else {
    // Update incumbent name; keep existing party
    await conn.execute(
      'UPDATE house_races SET incumbent = ?, candidate1_name = ? WHERE id = ?',
      [repName, repName, race.id]
    );
  }
  houseUpdated++;
}

console.log(`  Updated: ${houseUpdated}, Not found: ${houseNotFound}`);

console.log('\n=== Updating Senate races with primary results ===');

// Illinois Senate — Primary held March 17, 2026
// Juliana Stratton (D) defeated multiple challengers
// Don Tracy (R) won Republican primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Juliana Stratton',
    candidate1_party = 'D',
    candidate2_name = 'Don Tracy',
    candidate2_party = 'R',
    incumbent = 'Dick Durbin (retiring)',
    status = 'general',
    general_election_date = '2026-11-03',
    rating = 'lean_d',
    notes = 'Primary held March 17, 2026. Stratton (D) defeated Kina Collins and others. Tracy (R) won Republican primary. Dick Durbin is retiring.'
  WHERE state_code = 'IL'
`, []);
console.log('  Updated: Illinois Senate (IL)');

// North Carolina Senate — Primary held March 3, 2026
// Roy Cooper (D) won; Thom Tillis not seeking re-election
// Michael Whatley (R) won Republican primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Roy Cooper',
    candidate1_party = 'D',
    candidate2_name = 'Michael Whatley',
    candidate2_party = 'R',
    incumbent = 'Thom Tillis (not seeking re-election)',
    status = 'general',
    general_election_date = '2026-11-03',
    rating = 'lean_r',
    notes = 'Primary held March 3, 2026. Former Gov. Roy Cooper (D) vs. former RNC Chair Michael Whatley (R). Open seat — Tillis not seeking re-election.'
  WHERE state_code = 'NC'
`, []);
console.log('  Updated: North Carolina Senate (NC)');

// Mississippi Senate — Primary held March 10, 2026
// Cindy Hyde-Smith (R) won; Scott Colom (D) won Democratic primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Scott Colom',
    candidate1_party = 'D',
    candidate2_name = 'Cindy Hyde-Smith',
    candidate2_party = 'R',
    incumbent = 'Cindy Hyde-Smith',
    status = 'general',
    general_election_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'Primary held March 10, 2026. Incumbent Cindy Hyde-Smith (R) defeated primary challengers. Scott Colom (D) won Democratic primary.'
  WHERE state_code = 'MS'
`, []);
console.log('  Updated: Mississippi Senate (MS)');

// Arkansas Senate — Primary held March 3, 2026
// Tom Cotton (R) won easily; Democrat TBD
await conn.execute(`
  UPDATE senate_races SET
    candidate2_name = 'Tom Cotton',
    candidate2_party = 'R',
    incumbent = 'Tom Cotton',
    status = 'general',
    general_election_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'Primary held March 3, 2026. Tom Cotton (R) won Republican primary with ~84% of the vote. Democratic nominee TBD.'
  WHERE state_code = 'AR'
`, []);
console.log('  Updated: Arkansas Senate (AR)');

// Texas Senate — Primary held March 3, 2026
// James Talarico (D) won Democratic primary
// John Cornyn vs. Ken Paxton in Republican RUNOFF on May 26, 2026
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'James Talarico',
    candidate1_party = 'D',
    candidate2_name = 'John Cornyn / Ken Paxton (runoff)',
    candidate2_party = 'R',
    incumbent = 'John Cornyn',
    status = 'primary',
    primary_date = '2026-05-26',
    general_election_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'D primary (Mar 3): James Talarico defeated Jasmine Crockett. R primary (Mar 3): Cornyn and Paxton in runoff on May 26, 2026. No candidate cleared 50%.'
  WHERE state_code = 'TX'
`, []);
console.log('  Updated: Texas Senate (TX) — runoff May 26');

// Update Illinois House races where primaries were held March 17
// IL-9: Jan Schakowsky retiring — Daniel Biss (D) won primary per Politico
await conn.execute(`
  UPDATE house_races SET
    candidate1_name = 'Daniel Biss',
    candidate1_party = 'D',
    incumbent = 'Janice D. Schakowsky (retiring)',
    status = 'general',
    notes = 'Primary held March 17, 2026. Daniel Biss (D) won Democratic primary to succeed retiring Rep. Jan Schakowsky.'
  WHERE state_code = 'IL' AND district = 9
`, []);
console.log('  Updated: Illinois-9 House (Schakowsky retiring, Biss wins D primary)');

// IL-10: Brad Schneider running again; Carl Lambrecht (R) unopposed
await conn.execute(`
  UPDATE house_races SET
    candidate1_name = 'Brad Schneider',
    candidate1_party = 'D',
    candidate2_name = 'Carl Lambrecht',
    candidate2_party = 'R',
    incumbent = 'Bradley Scott Schneider',
    status = 'general',
    notes = 'Primary held March 17, 2026. Schneider (D) defeated Morgan Coghill. Lambrecht (R) ran unopposed.'
  WHERE state_code = 'IL' AND district = 10
`, []);
console.log('  Updated: Illinois-10 House');

// Update vacancy seats
await conn.execute(`
  UPDATE house_races SET
    incumbent = 'VACANT',
    candidate1_name = 'TBD',
    status = 'general',
    notes = 'Seat vacant following death of Doug LaMalfa (January 6, 2026). Special election pending.'
  WHERE state_code = 'CA' AND district = 1
`, []);
console.log('  Updated: California-1 (LaMalfa vacancy)');

await conn.execute(`
  UPDATE house_races SET
    incumbent = 'VACANT',
    candidate1_name = 'TBD',
    status = 'general',
    notes = 'Seat vacant following resignation of Marjorie Taylor Greene (January 5, 2026).'
  WHERE state_code = 'GA' AND district = 14
`, []);
console.log('  Updated: Georgia-14 (MTG vacancy)');

await conn.execute(`
  UPDATE house_races SET
    incumbent = 'VACANT',
    candidate1_name = 'TBD',
    status = 'general',
    notes = 'Seat vacant following resignation of Mikie Sherrill (November 20, 2025). Special election pending.'
  WHERE state_code = 'NJ' AND district = 11
`, []);
console.log('  Updated: New Jersey-11 (Sherrill vacancy)');

await conn.close();
console.log('\n=== All updates complete ===');
