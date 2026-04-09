import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const corrections = [
  // ─── CRITICAL: FL Special Election - candidates were SWAPPED ───────────────
  // Ashley Moody (R) is the incumbent/appointed senator, NOT the D candidate
  // Sherrod Brown is the D candidate in OH, NOT FL
  // FL D candidate is unknown/TBD (no major D candidate has filed yet)
  {
    sql: `UPDATE senate_races SET 
      candidate1_name = NULL, candidate1_party = 'D',
      candidate2_name = 'Ashley Moody', candidate2_party = 'R',
      incumbent = 'Ashley Moody (appointed)', incumbent_party = 'R'
    WHERE state_code = 'FL'`,
    desc: 'FL: Fix swapped candidates - Moody is R incumbent, D candidate TBD'
  },

  // ─── CRITICAL: OH Special Election - candidates were SWAPPED ───────────────
  // Sherrod Brown is the D challenger, Jon Husted is the R incumbent/appointed
  {
    sql: `UPDATE senate_races SET 
      candidate1_name = 'Sherrod Brown', candidate1_party = 'D',
      candidate2_name = 'Jon Husted', candidate2_party = 'R',
      incumbent = 'Jon Husted (appointed)', incumbent_party = 'R'
    WHERE state_code = 'OH'`,
    desc: 'OH: Fix swapped candidates - Brown is D challenger, Husted is R incumbent'
  },

  // ─── MT: Steve Daines announced retirement March 4, 2026 ───────────────────
  {
    sql: `UPDATE senate_races SET 
      incumbent = 'Steve Daines (retiring)', incumbent_party = 'R'
    WHERE state_code = 'MT'`,
    desc: 'MT: Mark Daines as retiring (announced March 4, 2026)'
  },

  // ─── TX: Cornyn in runoff with Paxton (May 26, 2026) ──────────────────────
  // Talarico won D primary on March 3. Cornyn/Paxton runoff May 26.
  {
    sql: `UPDATE senate_races SET 
      candidate1_name = 'James Talarico', candidate1_party = 'D',
      candidate2_name = 'John Cornyn / Ken Paxton (runoff)', candidate2_party = 'R'
    WHERE state_code = 'TX'`,
    desc: 'TX: Talarico won D primary; Cornyn vs Paxton runoff May 26'
  },

  // ─── GA: Republican primary is May 19, 2026 - not yet decided ─────────────
  {
    sql: `UPDATE senate_races SET 
      candidate1_name = 'Jon Ossoff', candidate1_party = 'D',
      candidate2_name = NULL, candidate2_party = 'R'
    WHERE state_code = 'GA'`,
    desc: 'GA: Ossoff is D incumbent; R primary May 19 - TBD'
  },

  // ─── House composition: GA-14 filled April 7, 2026 ────────────────────────
  // Current as of April 8, 2026: R=217, D=214, I=1, vacancies=2
  // (NJ-11 vacancy still pending - special election April 16)
  // This is stored in server/db.ts, not the database

  // ─── NH: Confirm candidates (Pappas D, Sununu R) ──────────────────────────
  // Already correct from previous correction

  // ─── MN: Confirm candidates (Flanagan D, Tafoya R) ───────────────────────
  // Already correct from previous correction

  // ─── IL: Confirm candidates (Stratton D, Tracy R) ────────────────────────
  // Already correct from previous correction

  // ─── NC: Confirm candidates (Cooper D, Whatley R) ────────────────────────
  // Already correct from previous correction

  // ─── MS: Confirm candidates (Colom D, Hyde-Smith R) ─────────────────────
  // Already correct from previous correction

  // ─── AR: Confirm candidates (Shoffner D, Cotton R) ───────────────────────
  // Already correct from previous correction
];

let passed = 0;
let failed = 0;

for (const c of corrections) {
  try {
    const [result] = await conn.execute(c.sql);
    console.log(`✅ ${c.desc} (${result.affectedRows} rows)`);
    passed++;
  } catch (err) {
    console.error(`❌ ${c.desc}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${passed} passed, ${failed} failed`);
await conn.end();
