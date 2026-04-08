/**
 * apply-special-elections.mjs
 * Applies GA-14 result and wires NJ-11 special election.
 * Run: node scripts/apply-special-elections.mjs
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);

try {
  // ── 1. GA-14: Clay Fuller (R) wins special runoff April 7 2026 ─────────────
  // R hold — seat was vacant (MTG resigned Jan 2026, previousParty = R)
  // Source: Georgia Recorder, AP, USA Today (~56% Fuller, ~44% Harris, 92% reporting)
  await conn.execute(`
    UPDATE house_races
    SET status = 'Called',
        called_winner = 'Clay Fuller',
        called_party = 'R',
        previous_party = 'R',
        incumbent = 'Clay Fuller',
        incumbent_party = 'R',
        candidate1_name = 'Clay Fuller',
        candidate1_party = 'R',
        candidate1_vote_pct = 56.0,
        candidate2_name = 'Shawn Harris',
        candidate2_party = 'D',
        candidate2_vote_pct = 44.0,
        pct_reporting = 92,
        notes = 'Special runoff April 7 2026. Fuller (R) def. Harris (D) approx 56-44. R hold. Fills seat vacated by MTG (resigned Jan 2026). Source: Georgia Recorder, AP.'
    WHERE state_code = 'GA' AND district = 14
  `);
  console.log("GA-14: Clay Fuller (R) Called — R hold");

  // ── 2. NJ-11: Wire upcoming special general April 16 2026 ──────────────────
  // Mikie Sherrill resigned Nov 2025 to become NJ Governor. D-held seat.
  // Candidates: Analilia Mejia (D) vs Joe Hathaway (R)
  // Source: ACLU-NJ, NJ Spotlight News, CBS News
  await conn.execute(`
    UPDATE house_races
    SET status = 'General',
        incumbent = 'VACANT',
        incumbent_party = 'D',
        previous_party = 'D',
        candidate1_name = 'Analilia Mejia',
        candidate1_party = 'D',
        candidate2_name = 'Joe Hathaway',
        candidate2_party = 'R',
        general_date = '2026-04-16',
        notes = 'Special general election April 16 2026. Mejia (D) vs Hathaway (R). Seat vacated by Mikie Sherrill (resigned Nov 2025 to become NJ Governor). D-held seat. Source: ACLU-NJ, NJ Spotlight News.'
    WHERE state_code = 'NJ' AND district = 11
  `);
  console.log("NJ-11: Special general April 16 2026 — Mejia (D) vs Hathaway (R)");

  // ── 3. Verify both records ──────────────────────────────────────────────────
  const [rows] = await conn.execute(
    `SELECT state_code, district, status, called_winner, called_party, previous_party,
            candidate1_name, candidate1_party, candidate1_vote_pct,
            candidate2_name, candidate2_party, candidate2_vote_pct,
            general_date, notes
     FROM house_races
     WHERE (state_code = 'GA' AND district = 14)
        OR (state_code = 'NJ' AND district = 11)`
  );
  console.log("\n── Verification ──────────────────────────────────────────────");
  for (const r of rows) {
    console.log(`${r.state_code}-${r.district}: status=${r.status} called_winner=${r.called_winner} called_party=${r.called_party} previous_party=${r.previous_party}`);
    console.log(`  Candidates: ${r.candidate1_name} (${r.candidate1_party}) ${r.candidate1_vote_pct ?? '?'}% vs ${r.candidate2_name} (${r.candidate2_party}) ${r.candidate2_vote_pct ?? '?'}%`);
    if (r.general_date) console.log(`  Election date: ${r.general_date}`);
    console.log(`  Notes: ${r.notes}`);
  }

  // ── 4. Compute live House composition ──────────────────────────────────────
  const [called] = await conn.execute(
    `SELECT called_party, previous_party FROM house_races
     WHERE status IN ('Called', 'Certified') AND called_party IS NOT NULL`
  );
  let D = 214, R = 217, I = 1, vacancies = 3;
  for (const r of called) {
    const prev = r.previous_party;
    const curr = r.called_party;
    if (prev && prev !== curr) {
      if (prev === 'D') D--;
      else if (prev === 'R') R--;
      else if (prev === 'I') I--;
      if (curr === 'D') D++;
      else if (curr === 'R') R++;
      else if (curr === 'I') I++;
    }
    // Vacancy fill: no previous_party means seat was vacant
    const isVacancyFill = !prev;
    if (isVacancyFill && vacancies > 0) {
      vacancies--;
      if (curr === 'D') D++;
      else if (curr === 'R') R++;
      else if (curr === 'I') I++;
    }
  }
  console.log(`\nLive House composition after ${called.length} called race(s):`);
  console.log(`  D: ${D}  R: ${R}  I: ${I}  Vacancies: ${vacancies}  Total: ${D + R + I + vacancies}`);
  console.log("  Note: GA-14 is an R hold (previous_party=R, called_party=R) → no net party change");
  console.log("  But it fills a vacancy: vacancies 3→2, R 217→218");

} finally {
  await conn.end();
}
