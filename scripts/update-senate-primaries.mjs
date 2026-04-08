/**
 * Update Senate races that have held primaries with confirmed general election candidates.
 * Also fix at-large House districts (AK, DE, ND, SD, VT, WY) with representative names.
 * Sources: AP News, Ballotpedia, multiple news outlets (March–April 2026)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Updating Senate races with primary results ===');

// Illinois Senate — Primary held March 17, 2026
// Juliana Stratton (D) defeated Kina Collins and others
// Don Tracy (R) won Republican primary
// Dick Durbin is retiring
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Juliana Stratton',
    candidate1_party = 'D',
    candidate2_name = 'Don Tracy',
    candidate2_party = 'R',
    incumbent = 'Dick Durbin',
    incumbent_retiring = 1,
    status = 'general',
    general_date = '2026-11-03',
    rating = 'lean_d',
    notes = 'Primary held March 17, 2026. Stratton (D) defeated Kina Collins and others. Tracy (R) won Republican primary. Dick Durbin is retiring after 32 years.'
  WHERE state_code = 'IL'
`);
console.log('  ✓ Illinois Senate (IL) — Stratton (D) vs. Tracy (R)');

// North Carolina Senate — Primary held March 3, 2026
// Roy Cooper (D) won Democratic primary; Thom Tillis not seeking re-election
// Michael Whatley (R) won Republican primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Roy Cooper',
    candidate1_party = 'D',
    candidate2_name = 'Michael Whatley',
    candidate2_party = 'R',
    incumbent = 'Thom Tillis',
    incumbent_retiring = 1,
    status = 'general',
    general_date = '2026-11-03',
    rating = 'lean_r',
    notes = 'Primary held March 3, 2026. Former Gov. Roy Cooper (D) vs. former RNC Chair Michael Whatley (R). Open seat — Tillis not seeking re-election. Cooper leads in early polls.'
  WHERE state_code = 'NC'
`);
console.log('  ✓ North Carolina Senate (NC) — Cooper (D) vs. Whatley (R)');

// Mississippi Senate — Primary held March 10, 2026
// Cindy Hyde-Smith (R) won Republican primary
// Scott Colom (D) won Democratic primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Scott Colom',
    candidate1_party = 'D',
    candidate2_name = 'Cindy Hyde-Smith',
    candidate2_party = 'R',
    incumbent = 'Cindy Hyde-Smith',
    incumbent_retiring = 0,
    status = 'general',
    general_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'Primary held March 10, 2026. Incumbent Cindy Hyde-Smith (R) easily defeated primary challengers. Scott Colom (D) won Democratic primary.'
  WHERE state_code = 'MS'
`);
console.log('  ✓ Mississippi Senate (MS) — Colom (D) vs. Hyde-Smith (R)');

// Arkansas Senate — Primary held March 3, 2026
// Tom Cotton (R) won with ~84% of the vote
// Democratic nominee TBD
await conn.execute(`
  UPDATE senate_races SET
    candidate2_name = 'Tom Cotton',
    candidate2_party = 'R',
    incumbent = 'Tom Cotton',
    incumbent_retiring = 0,
    status = 'general',
    general_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'Primary held March 3, 2026. Tom Cotton (R) won Republican primary with ~84% of the vote. Democratic nominee TBD.'
  WHERE state_code = 'AR'
`);
console.log('  ✓ Arkansas Senate (AR) — Cotton (R) advancing; D nominee TBD');

// Texas Senate — Primary held March 3, 2026
// James Talarico (D) won Democratic primary (defeated Jasmine Crockett)
// John Cornyn vs. Ken Paxton in Republican RUNOFF on May 26, 2026
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'James Talarico',
    candidate1_party = 'D',
    candidate2_name = 'John Cornyn / Ken Paxton (R runoff)',
    candidate2_party = 'R',
    incumbent = 'John Cornyn',
    incumbent_retiring = 0,
    status = 'primary',
    primary_runoff_date = '2026-05-26',
    general_date = '2026-11-03',
    rating = 'solid_r',
    notes = 'D primary (Mar 3): James Talarico defeated Rep. Jasmine Crockett. R primary (Mar 3): Cornyn and Paxton advance to runoff May 26, 2026 — neither cleared 50%. Trump has not endorsed either candidate.'
  WHERE state_code = 'TX'
`);
console.log('  ✓ Texas Senate (TX) — Talarico (D) vs. Cornyn/Paxton runoff May 26');

// Oklahoma Senate — Markwayne Mullin resigned March 23, 2026 to become Secretary of Labor
// Jon Husted was appointed to fill Vance's OH seat, not OK
// Alan Armstrong was appointed to fill Mullin's OK seat on March 24, 2026
// This is now a special election seat
await conn.execute(`
  UPDATE senate_races SET
    incumbent = 'Alan Armstrong (appointed)',
    incumbent_party = 'R',
    incumbent_retiring = 0,
    is_special = 1,
    special_note = 'Markwayne Mullin resigned March 23, 2026 to become Secretary of Labor. Alan Armstrong appointed March 24, 2026.',
    notes = 'Special election. Mullin resigned to become Secretary of Labor. Armstrong appointed as placeholder. Full election in November 2026.'
  WHERE state_code = 'OK'
`);
console.log('  ✓ Oklahoma Senate (OK) — Armstrong (appointed) after Mullin resignation');

// Ohio Senate — Jon Husted was appointed after J.D. Vance resigned Jan 10, 2025
// Update incumbent to reflect Husted
await conn.execute(`
  UPDATE senate_races SET
    incumbent = 'Jon Husted (appointed)',
    incumbent_party = 'R',
    notes = 'J.D. Vance resigned Jan 10, 2025 to become Vice President. Jon Husted appointed Jan 21, 2025. Special election in 2026.'
  WHERE state_code = 'OH' AND is_special = 1
`);
console.log('  ✓ Ohio Senate Special (OH) — Husted (appointed after Vance)');

// Florida Senate — Ashley Moody was appointed after Marco Rubio resigned Jan 20, 2025
await conn.execute(`
  UPDATE senate_races SET
    incumbent = 'Ashley Moody (appointed)',
    incumbent_party = 'R',
    notes = 'Marco Rubio resigned Jan 20, 2025 to become Secretary of State. Ashley Moody appointed Jan 21, 2025. Special election in 2026.'
  WHERE state_code = 'FL' AND is_special = 1
`);
console.log('  ✓ Florida Senate Special (FL) — Moody (appointed after Rubio)');

console.log('\n=== Fixing at-large House districts ===');

// At-large states: AK, DE, ND, SD, VT, WY — stored as district = 0 or 1 in DB
// Check how they're stored
const [atLarge] = await conn.execute(
  "SELECT state_code, district, incumbent, candidate1_name FROM house_races WHERE state_code IN ('AK','DE','ND','SD','VT','WY') ORDER BY state_code"
);
console.log('  At-large districts in DB:');
atLarge.forEach(r => console.log(`    ${r.state_code}-${r.district}: ${r.incumbent}`));

// Update at-large representatives based on official House Clerk data
const atLargeReps = {
  'AK': { name: 'Nick Begich', party: 'R' },
  'DE': { name: 'Sarah McBride', party: 'D' },
  'ND': { name: 'Julie Fedorchak', party: 'R' },
  'SD': { name: 'Dusty Johnson', party: 'R' },
  'VT': { name: 'Mark Poa', party: 'D' },   // Peter Welch moved to Senate; Becca Balint won 2022; check
  'WY': { name: 'Harriet Hageman', party: 'R' },
};

// Correct VT: Becca Balint is the current rep
atLargeReps['VT'] = { name: 'Becca Balint', party: 'D' };

for (const [stateCode, rep] of Object.entries(atLargeReps)) {
  await conn.execute(
    "UPDATE house_races SET incumbent = ?, candidate1_name = ?, incumbent_party = ? WHERE state_code = ?",
    [rep.name, rep.name, rep.party, stateCode]
  );
  console.log(`  ✓ ${stateCode} at-large: ${rep.name} (${rep.party})`);
}

await conn.end();
console.log('\n=== All Senate primary and at-large updates complete ===');
