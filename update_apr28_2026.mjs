import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

console.log("Applying April 28, 2026 election updates...\n");

// ─── 1. FL-11: Mark Daniel Webster as retiring ────────────────────────────────
// Webster announced retirement April 28, 2026 - FL-11 (Polk, Sumter, Lake, Orange counties)
// District is R+57% registration, solid Republican hold, open seat
await db.execute(
  `UPDATE house_races SET 
    incumbent_retiring = 1,
    notes = 'Rep. Daniel Webster (R) announced retirement April 28, 2026 — will not seek re-election. Webster is Florida''s longest-serving elected official (8 terms, since 2011). District remains R+57% registration — solid GOP hold as open seat. Candidates filed: Republicans Chanelle Barnes, Ivette Palomo, Mike Wilnau; Democrats Barbie Harden Hall, Walter Walker, Sylvester Webster II, Dan Williams; Libertarian Ralph Groves. Webster stated decision is personal (family time), not related to redistricting.',
    updated_at = NOW()
  WHERE state_code = 'FL' AND district = 11`
);
console.log("✅ FL-11: Marked Webster as retiring with notes");

// ─── 2. Mississippi: Update redistricting with special session info ────────────
// Gov. Tate Reeves called special session April 24, 2026
// Session will convene 21 days after SCOTUS rules on Louisiana v. Callais
// Purpose: redistrict Mississippi Supreme Court judicial districts (state judicial, not congressional)
const [ms] = await db.execute(
  `SELECT id, state_code, status FROM redistricting_states WHERE state_code = 'MS'`
);
console.log("Mississippi current:", ms);

if (ms.length > 0) {
  await db.execute(
    `UPDATE redistricting_states SET 
      status = 'Pending',
      litigation_notes = 'Gov. Tate Reeves called special legislative session on April 24, 2026 to redistrict Mississippi Supreme Court judicial districts. Session will convene 21 days after SCOTUS rules on Louisiana v. Callais (expected by end of June 2026 term). Background: Federal court ruled Mississippi''s 3 majority-white Supreme Court districts violate Section 2 of the Voting Rights Act (Dyamone White v. State Board of Election Commissioners). Mississippi is ~40% Black but has no majority-Black Supreme Court district. Two redistricting bills died on sine die April 15, 2026. NOTE: This is state judicial redistricting, not congressional maps.',
      updated_at = NOW()
    WHERE state_code = 'MS'`
  );
  console.log("✅ Mississippi: Updated with special session details");
} else {
  await db.execute(
    `INSERT INTO redistricting_states (state_code, state_name, status, litigation_notes, updated_at) VALUES (
      'MS', 'Mississippi', 'Pending',
      'Gov. Tate Reeves called special legislative session on April 24, 2026 to redistrict Mississippi Supreme Court judicial districts. Session will convene 21 days after SCOTUS rules on Louisiana v. Callais (expected by end of June 2026 term). Federal court ruled Mississippi''s 3 majority-white Supreme Court districts violate Section 2 of the Voting Rights Act.',
      NOW()
    )`
  );
  console.log("✅ Mississippi: Inserted new redistricting record");
}

// ─── 3. Louisiana: Update with Callais SCOTUS case details ───────────────────
const [la] = await db.execute(
  `SELECT id, state_code, status, litigation_notes FROM redistricting_states WHERE state_code = 'LA'`
);
console.log("Louisiana current:", la);

if (la.length > 0) {
  const existingNotes = la[0].litigation_notes || "";
  const callaisNote = "SCOTUS UPDATE (Apr 2026): Louisiana v. Callais is before the U.S. Supreme Court. Case will determine constitutionality of Louisiana's congressional districts under Section 2 of the Voting Rights Act. A 2022 district court ruled Louisiana's map violated VRA by not having enough Black-majority districts. SCOTUS expected to rule before end of June 2026 term. Decision will have nationwide implications for VRA Section 2 enforcement and redistricting in MS, GA, and other states.";
  const updatedNotes = existingNotes.includes("Callais") ? existingNotes : existingNotes + (existingNotes ? " | " : "") + callaisNote;
  await db.execute(
    `UPDATE redistricting_states SET 
      litigation_notes = ?,
      status = 'Litigation',
      updated_at = NOW()
    WHERE state_code = 'LA'`,
    [updatedNotes]
  );
  console.log("✅ Louisiana: Updated with Callais SCOTUS case details");
} else {
  await db.execute(
    `INSERT INTO redistricting_states (state_code, state_name, status, litigation_notes, updated_at) VALUES (
      'LA', 'Louisiana', 'Litigation',
      'Louisiana v. Callais is before the U.S. Supreme Court. Case will determine constitutionality of Louisiana''s congressional districts under Section 2 of the Voting Rights Act. SCOTUS expected to rule before end of June 2026 term. Decision will have nationwide implications for VRA Section 2 enforcement.',
      NOW()
    )`
  );
  console.log("✅ Louisiana: Inserted new redistricting record");
}

// ─── 4. Verify all changes ────────────────────────────────────────────────────
const [fl11check] = await db.execute(
  `SELECT state_code, district, incumbent, incumbent_retiring, rating, notes FROM house_races WHERE state_code = 'FL' AND district = 11`
);
console.log("\nFL-11 final state:", fl11check[0]);

const [mscheck] = await db.execute(
  `SELECT state_code, status, litigation_notes FROM redistricting_states WHERE state_code = 'MS'`
);
console.log("MS final state:", mscheck[0]?.state_code, mscheck[0]?.status);

const [lacheck] = await db.execute(
  `SELECT state_code, status FROM redistricting_states WHERE state_code = 'LA'`
);
console.log("LA final state:", lacheck[0]?.state_code, lacheck[0]?.status);

await db.end();
console.log("\n✅ All April 28, 2026 updates applied successfully.");
