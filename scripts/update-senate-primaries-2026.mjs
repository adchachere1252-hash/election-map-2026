/**
 * Update Senate races with confirmed 2026 primary results.
 * Sources: AP News, Ballotpedia, official state election results (April 2026)
 * 
 * Races updated:
 * - Illinois (IL): Dick Durbin retiring; Juliana Stratton (D) vs. Don Tracy (R)
 * - Texas (TX): James Talarico (D) won primary; Cornyn vs. Paxton runoff May 26
 * - North Carolina (NC): Roy Cooper (D) vs. Michael Whatley (R)
 * - Mississippi (MS): Cindy Hyde-Smith (R) vs. Scott Colom (D)
 * - Arkansas (AR): Tom Cotton (R) won primary; Democrat TBD
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);
console.log('Connected to database');
console.log('=== Updating Senate races with 2026 primary results ===\n');

// ─── Illinois Senate ──────────────────────────────────────────────────────────
// Primary: March 17, 2026
// D: Juliana Stratton (Lt. Gov.) defeated Kina Collins and others
// R: Don Tracy (state party chair) won Republican primary
// Dick Durbin is retiring after 48 years in Senate
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Juliana Stratton',
    candidate1_party = 'D',
    candidate2_name = 'Don Tracy',
    candidate2_party = 'R',
    incumbent = 'Dick Durbin',
    incumbent_retiring = TRUE,
    status = 'General',
    primary_date = 'March 17, 2026',
    general_date = 'November 3, 2026',
    rating = 'Lean D',
    notes = 'Primary held March 17, 2026. Lt. Gov. Juliana Stratton (D) defeated Kina Collins. Don Tracy (R) won Republican primary. Dick Durbin retiring after 48 years.'
  WHERE state_code = 'IL'
`);
console.log('✓ Updated: Illinois Senate (IL) — Stratton (D) vs. Tracy (R)');

// ─── North Carolina Senate ────────────────────────────────────────────────────
// Primary: March 3, 2026
// D: Former Gov. Roy Cooper won Democratic primary
// R: Michael Whatley (former RNC Chair) won Republican primary
// Thom Tillis is not seeking re-election (open seat)
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Roy Cooper',
    candidate1_party = 'D',
    candidate2_name = 'Michael Whatley',
    candidate2_party = 'R',
    incumbent = 'Thom Tillis',
    incumbent_retiring = TRUE,
    status = 'General',
    primary_date = 'March 3, 2026',
    general_date = 'November 3, 2026',
    rating = 'Lean R',
    notes = 'Primary held March 3, 2026. Former Gov. Roy Cooper (D) vs. former RNC Chair Michael Whatley (R). Open seat — Thom Tillis not seeking re-election.'
  WHERE state_code = 'NC'
`);
console.log('✓ Updated: North Carolina Senate (NC) — Cooper (D) vs. Whatley (R)');

// ─── Mississippi Senate ───────────────────────────────────────────────────────
// Primary: March 10, 2026
// R: Cindy Hyde-Smith (incumbent) won Republican primary
// D: Scott Colom (state senator) won Democratic primary
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'Scott Colom',
    candidate1_party = 'D',
    candidate2_name = 'Cindy Hyde-Smith',
    candidate2_party = 'R',
    incumbent = 'Cindy Hyde-Smith',
    incumbent_retiring = FALSE,
    status = 'General',
    primary_date = 'March 10, 2026',
    general_date = 'November 3, 2026',
    rating = 'Solid R',
    notes = 'Primary held March 10, 2026. Incumbent Cindy Hyde-Smith (R) defeated primary challengers. Scott Colom (D) won Democratic primary.'
  WHERE state_code = 'MS'
`);
console.log('✓ Updated: Mississippi Senate (MS) — Colom (D) vs. Hyde-Smith (R)');

// ─── Arkansas Senate ──────────────────────────────────────────────────────────
// Primary: March 3, 2026
// R: Tom Cotton won Republican primary with ~84% of the vote (unopposed effectively)
// D: Nominee TBD (no major candidate has emerged)
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'TBD',
    candidate1_party = 'D',
    candidate2_name = 'Tom Cotton',
    candidate2_party = 'R',
    incumbent = 'Tom Cotton',
    incumbent_retiring = FALSE,
    status = 'General',
    primary_date = 'March 3, 2026',
    general_date = 'November 3, 2026',
    rating = 'Solid R',
    notes = 'Primary held March 3, 2026. Tom Cotton (R) won Republican primary with ~84% of the vote. Democratic nominee TBD.'
  WHERE state_code = 'AR'
`);
console.log('✓ Updated: Arkansas Senate (AR) — TBD (D) vs. Cotton (R)');

// ─── Texas Senate ─────────────────────────────────────────────────────────────
// Primary: March 3, 2026
// D: James Talarico won Democratic primary
// R: John Cornyn vs. Ken Paxton in RUNOFF on May 26, 2026 (neither cleared 50%)
await conn.execute(`
  UPDATE senate_races SET
    candidate1_name = 'James Talarico',
    candidate1_party = 'D',
    candidate2_name = 'John Cornyn / Ken Paxton (runoff)',
    candidate2_party = 'R',
    incumbent = 'John Cornyn',
    incumbent_retiring = FALSE,
    status = 'Primary',
    primary_date = 'March 3, 2026',
    primary_runoff_date = 'May 26, 2026',
    general_date = 'November 3, 2026',
    rating = 'Solid R',
    notes = 'D primary (Mar 3): James Talarico defeated Jasmine Crockett. R primary (Mar 3): Cornyn and Paxton in runoff on May 26, 2026 — no candidate cleared 50%.'
  WHERE state_code = 'TX'
`);
console.log('✓ Updated: Texas Senate (TX) — Talarico (D) vs. Cornyn/Paxton runoff (R, May 26)');

// ─── Illinois House IL-09 ─────────────────────────────────────────────────────
// Jan Schakowsky retiring; Daniel Biss (D) won primary March 17, 2026
await conn.execute(`
  UPDATE house_races SET
    candidate1_name = 'Daniel Biss',
    candidate1_party = 'D',
    incumbent = 'Janice D. Schakowsky',
    incumbent_retiring = TRUE,
    status = 'General',
    notes = 'Primary held March 17, 2026. Daniel Biss (D) won Democratic primary to succeed retiring Rep. Jan Schakowsky.'
  WHERE state_code = 'IL' AND district = 9
`);
console.log('✓ Updated: Illinois-9 House (Schakowsky retiring, Biss wins D primary)');

// ─── Verify updates ───────────────────────────────────────────────────────────
console.log('\n=== Verification ===');
const [senateRows] = await conn.execute(
  `SELECT state_code, candidate1_name, candidate2_name, status, rating 
   FROM senate_races 
   WHERE state_code IN ('IL', 'NC', 'MS', 'AR', 'TX')
   ORDER BY state_code`
);
for (const row of senateRows) {
  console.log(`  ${row.state_code}: ${row.candidate1_name || 'TBD'} (D) vs. ${row.candidate2_name || 'TBD'} (R) — ${row.status} — ${row.rating}`);
}

await conn.end();
console.log('\n=== Senate primary updates complete ===');
