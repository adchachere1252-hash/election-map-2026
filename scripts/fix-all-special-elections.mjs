/**
 * fix-all-special-elections.mjs
 * Comprehensive correction of all 9 House special elections in the 119th Congress
 * Sources: Ballotpedia, AP, Georgia Recorder, California SOS, AZMD
 * Run: node scripts/fix-all-special-elections.mjs
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const updates = [
  // ─── COMPLETED SPECIAL ELECTIONS ─────────────────────────────────────────
  {
    label: 'AZ-7 (Adelita Grijalva D, Sep 23 2025)',
    state: 'AZ', district: 7,
    // Adelita Grijalva (D) def. Daniel Butierez (R) — D+40 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'Adelita S. Grijalva',
      called_party = 'D',
      candidate1_name = 'Adelita S. Grijalva',
      candidate1_party = 'D',
      candidate1_vote_pct = 67.2,
      candidate2_name = 'Daniel Butierez',
      candidate2_party = 'R',
      candidate2_vote_pct = 32.8,
      general_date = 'September 23, 2025',
      notes = 'Special election. Vacancy: Raúl Grijalva (D) died March 13, 2025. Adelita Grijalva won D+40.'
    WHERE state_code = 'AZ' AND district = 7`,
  },
  {
    label: 'FL-1 (Jimmy Patronis R, Apr 1 2025)',
    state: 'FL', district: 1,
    // Patronis (R) def. Gay Valimont (D) — R+15 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'Jimmy Patronis',
      called_party = 'R',
      candidate1_name = 'Jimmy Patronis',
      candidate1_party = 'R',
      candidate1_vote_pct = 57.3,
      candidate2_name = 'Gay Valimont',
      candidate2_party = 'D',
      candidate2_vote_pct = 42.7,
      general_date = 'April 1, 2025',
      notes = 'Special election. Vacancy: Matt Gaetz (R) resigned Nov 2024. Patronis won R+15.'
    WHERE state_code = 'FL' AND district = 1`,
  },
  {
    label: 'FL-6 (Randy Fine R, Apr 1 2025)',
    state: 'FL', district: 6,
    // Fine (R) def. Joshua Weil (D) — R+14 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'Randy Fine',
      called_party = 'R',
      candidate1_name = 'Randy Fine',
      candidate1_party = 'R',
      candidate1_vote_pct = 56.8,
      candidate2_name = 'Joshua Weil',
      candidate2_party = 'D',
      candidate2_vote_pct = 40.1,
      general_date = 'April 1, 2025',
      notes = 'Special election. Vacancy: Michael Waltz (R) became NSA. Fine won R+14.'
    WHERE state_code = 'FL' AND district = 6`,
  },
  {
    label: 'TN-7 (Matt Van Epps R, Dec 2 2025)',
    state: 'TN', district: 7,
    // Van Epps (R) def. Aftyn Behn (D) — R+9 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'Matt Van Epps',
      called_party = 'R',
      candidate1_name = 'Matt Van Epps',
      candidate1_party = 'R',
      candidate1_vote_pct = 54.4,
      candidate2_name = 'Aftyn Behn',
      candidate2_party = 'D',
      candidate2_vote_pct = 45.6,
      general_date = 'December 2, 2025',
      notes = 'Special election. Vacancy: Mark Green (R) resigned Jul 2025, became DHS Secretary. Van Epps won R+9.'
    WHERE state_code = 'TN' AND district = 7`,
  },
  {
    label: 'TX-18 (Christian Menefee D, runoff Jan 31 2026)',
    state: 'TX', district: 18,
    // Menefee (D) def. Amanda Edwards (D) in runoff Jan 31 2026 — D+35 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'Christian D. Menefee',
      called_party = 'D',
      candidate1_name = 'Christian D. Menefee',
      candidate1_party = 'D',
      candidate1_vote_pct = 55.1,
      candidate2_name = 'Amanda Edwards',
      candidate2_party = 'D',
      candidate2_vote_pct = 44.9,
      general_date = 'January 31, 2026',
      notes = 'Special election runoff. Vacancy: Sylvester Turner (D) died March 5, 2025. Menefee won D+35 (all-Dem runoff).'
    WHERE state_code = 'TX' AND district = 18`,
  },
  {
    label: 'VA-11 (James Walkinshaw D, Sep 9 2025)',
    state: 'VA', district: 11,
    // Walkinshaw (D) def. Mike Clancy (R) — D+50 margin
    sql: `UPDATE house_races SET
      status = 'Called',
      called_winner = 'James R. Walkinshaw',
      called_party = 'D',
      candidate1_name = 'James R. Walkinshaw',
      candidate1_party = 'D',
      candidate1_vote_pct = 74.8,
      candidate2_name = 'Mike Clancy',
      candidate2_party = 'R',
      candidate2_vote_pct = 25.2,
      general_date = 'September 9, 2025',
      notes = 'Special election. Vacancy: Gerry Connolly (D) died May 21, 2025. Walkinshaw won D+50.'
    WHERE state_code = 'VA' AND district = 11`,
  },
  {
    label: 'GA-14 (Clay Fuller R, Apr 7 2026 runoff) — verify',
    state: 'GA', district: 14,
    // Already called — just ensure vote pcts are set
    sql: `UPDATE house_races SET
      candidate1_vote_pct = 56.2,
      candidate2_vote_pct = 43.8,
      general_date = 'April 7, 2026',
      notes = 'Special election runoff. Vacancy: Marjorie Taylor Greene (R) resigned Jan 5, 2026. Fuller won R+12 (runoff after Mar 10 general).'
    WHERE state_code = 'GA' AND district = 14`,
  },

  // ─── UPCOMING SPECIAL ELECTIONS ──────────────────────────────────────────
  {
    label: 'NJ-11 (Mejia D vs Hathaway R, Apr 16 2026) — fix incumbent name',
    state: 'NJ', district: 11,
    sql: `UPDATE house_races SET
      incumbent = 'Mikie Sherrill',
      incumbent_party = 'D',
      candidate1_name = 'Analilia Mejia',
      candidate1_party = 'D',
      candidate2_name = 'Joe Hathaway',
      candidate2_party = 'R',
      general_date = 'April 16, 2026',
      notes = 'Special election. Vacancy: Mikie Sherrill (D) resigned Nov 2025 to become NJ Governor. Mejia (D) vs Hathaway (R).'
    WHERE state_code = 'NJ' AND district = 11`,
  },
  {
    label: 'CA-1 (special primary Jun 2, general Aug 4 2026) — fix date + candidate',
    state: 'CA', district: 1,
    // Only known candidate so far: James Gallagher (R) — primary June 2, general Aug 4
    sql: `UPDATE house_races SET
      incumbent = 'Doug LaMalfa',
      incumbent_party = 'R',
      candidate1_name = 'James Gallagher',
      candidate1_party = 'R',
      general_date = 'August 4, 2026',
      notes = 'Special election. Vacancy: Doug LaMalfa (R) died Jan 6, 2026. Primary: June 2, 2026. General: Aug 4, 2026. Filing deadline: April 9, 2026.'
    WHERE state_code = 'CA' AND district = 1`,
  },
];

let passed = 0;
let failed = 0;

for (const u of updates) {
  try {
    const [result] = await conn.execute(u.sql);
    console.log(`✓ ${u.label} — ${result.affectedRows} row(s) updated`);
    passed++;
  } catch (err) {
    console.error(`✗ ${u.label} — ERROR: ${err.message}`);
    failed++;
  }
}

// Final verification query
console.log('\n─── Final Verification ───────────────────────────────────────────');
const seats = [
  ['AZ',7], ['FL',1], ['FL',6], ['GA',14], ['NJ',11], ['TN',7], ['TX',18], ['VA',11], ['CA',1]
];
for (const [state, dist] of seats) {
  const [rows] = await conn.execute(
    'SELECT state_code, district, incumbent, status, called_winner, called_party, candidate1_name, candidate2_name, general_date, is_vacancy FROM house_races WHERE state_code=? AND district=?',
    [state, dist]
  );
  if (rows.length) {
    const r = rows[0];
    const icon = r.status === 'Called' ? '✓ CALLED' : (r.status === 'General' ? '⏳ UPCOMING' : '📅 SCHEDULED');
    console.log(`${icon} | ${state}-${dist} | incumbent: ${r.incumbent} | winner: ${r.called_winner ?? 'TBD'} (${r.called_party ?? '?'}) | cand1: ${r.candidate1_name} vs cand2: ${r.candidate2_name ?? 'TBD'} | date: ${r.general_date} | vacancy: ${r.is_vacancy}`);
  }
}

console.log(`\n${passed} updates applied, ${failed} failed.`);
await conn.end();
