/**
 * update-special-elections.mjs
 *
 * 1. Mark GA-14 as Called (Clay Fuller, R) — April 7 2026 special runoff result
 * 2. Wire NJ-11 as an upcoming special election (Analilia Mejia D vs Joe Hathaway R, April 16 2026)
 *
 * Sources:
 *   GA-14: Georgia Recorder, USA Today, CNN, NBC News (April 7-8 2026)
 *          Fuller ~56%, Harris ~44% (unofficial; AP called)
 *   NJ-11: ACLU-NJ, NJ Spotlight News, CBS News (special general election April 16 2026)
 *          Analilia Mejia (D) vs Joe Hathaway (R)
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

try {
  // ── 1. GA-14: Mark as Called (Clay Fuller, R) ─────────────────────────────
  // previousParty = R (MTG held this seat), calledParty = R (R hold, no flip)
  const [ga14] = await conn.execute(
    "SELECT id, stateCode, district, calledWinner, status, previousParty FROM house_races WHERE stateCode = 'GA' AND district = 14 LIMIT 1"
  );
  if (ga14.length === 0) {
    console.log("GA-14 not found in database");
  } else {
    const row = ga14[0];
    console.log("GA-14 current:", JSON.stringify(row));
    await conn.execute(
      `UPDATE house_races
       SET status = 'Called',
           calledWinner = 'Clay Fuller',
           calledParty = 'R',
           previousParty = 'R',
           repName = 'Clay Fuller',
           repParty = 'R',
           isSpecial = 1,
           specialNote = 'Special runoff election April 7 2026. Fuller (R) def. Harris (D) ~56%-44%. Fills seat vacated by MTG (resigned Jan 2026).'
       WHERE stateCode = 'GA' AND district = 14`
    );
    console.log("✅ GA-14 updated: Clay Fuller (R) Called — R hold");
  }

  // ── 2. NJ-11: Wire as upcoming special election ───────────────────────────
  // Mikie Sherrill resigned to become NJ Governor (Nov 2025).
  // Special primary: February 2026. Special general: April 16 2026.
  // Candidates: Analilia Mejia (D) vs Joe Hathaway (R)
  // previousParty = D (Sherrill held this seat)
  const [nj11] = await conn.execute(
    "SELECT id, stateCode, district, repName, status, isSpecial, specialNote FROM house_races WHERE stateCode = 'NJ' AND district = 11 LIMIT 1"
  );
  if (nj11.length === 0) {
    console.log("NJ-11 not found in database");
  } else {
    const row = nj11[0];
    console.log("NJ-11 current:", JSON.stringify(row));
    await conn.execute(
      `UPDATE house_races
       SET isSpecial = 1,
           specialNote = 'Special general election April 16 2026. Analilia Mejia (D) vs Joe Hathaway (R). Seat vacated by Mikie Sherrill (resigned Nov 2025 to become NJ Governor).',
           previousParty = 'D',
           demCandidate = 'Analilia Mejia',
           repCandidate = 'Joe Hathaway',
           status = 'General',
           electionDate = '2026-04-16',
           repName = NULL,
           repParty = NULL
       WHERE stateCode = 'NJ' AND district = 11`
    );
    console.log("✅ NJ-11 updated: Special general April 16 2026 — Mejia (D) vs Hathaway (R)");
  }

  // ── 3. Verify the scoreboard now reflects GA-14 as called ─────────────────
  const [scoreRows] = await conn.execute(
    "SELECT stateCode, district, status, calledParty, calledWinner, previousParty, isSpecial FROM house_races WHERE (stateCode = 'GA' AND district = 14) OR (stateCode = 'NJ' AND district = 11)"
  );
  console.log("\n── Verification ──");
  for (const r of scoreRows) {
    console.log(JSON.stringify(r));
  }

  // ── 4. Show updated House composition impact ──────────────────────────────
  const [calledRows] = await conn.execute(
    "SELECT calledParty, previousParty, isSpecial FROM house_races WHERE status IN ('Called', 'Certified') AND calledParty IS NOT NULL"
  );
  console.log(`\nTotal called house races: ${calledRows.length}`);
  let D = 214, R = 217, I = 1, vacancies = 3;
  for (const r of calledRows) {
    if (r.previousParty && r.previousParty !== r.calledParty) {
      if (r.previousParty === 'D') D--;
      else if (r.previousParty === 'R') R--;
      else if (r.previousParty === 'I') I--;
      if (r.calledParty === 'D') D++;
      else if (r.calledParty === 'R') R++;
      else if (r.calledParty === 'I') I++;
    }
    if (r.isSpecial && !r.previousParty && vacancies > 0) {
      vacancies--;
      if (r.calledParty === 'D') D++;
      else if (r.calledParty === 'R') R++;
    }
  }
  console.log(`\nProjected live House composition after called races:`);
  console.log(`  D: ${D}  R: ${R}  I: ${I}  Vacancies: ${vacancies}  Total: ${D+R+I+vacancies}`);
  console.log(`  (GA-14 R hold: no net change to composition — vacancy filled by R)`);

} finally {
  await conn.end();
}
