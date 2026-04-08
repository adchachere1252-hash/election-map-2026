/**
 * Seed previousParty for all Senate and House races.
 * Senate: based on which party held the Class 2 seat going into 2026.
 * House: based on incumbentParty (the party currently holding the seat).
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Senate: Class 2 seats + specials ────────────────────────────────────────
// previousParty = the party that currently holds the seat (before 2026 election)
const senatePreviousParty = {
  // Toss-up / Competitive
  GA: "D", // Jon Ossoff (D)
  MI: "D", // Gary Peters (D) retiring
  NC: "R", // Thom Tillis (R) retiring
  NH: "D", // Jeanne Shaheen (D) retiring
  MN: "D", // Tina Smith (D)
  NM: "D", // Martin Heinrich (D)
  // Lean D
  CO: "D", // John Hickenlooper (D)
  OR: "D", // Jeff Merkley (D)
  VA: "D", // Mark Warner (D)
  // Lean R
  ME: "R", // Susan Collins (R)
  // Solid D
  CT: "D", // Chris Murphy (D)
  DE: "D", // Chris Coons (D)
  HI: "D", // Brian Schatz (D)
  IL: "D", // Dick Durbin (D) retiring
  MA: "D", // Ed Markey (D)
  MD: "D", // Chris Van Hollen (D)
  NJ: "D", // Cory Booker (D)
  NY: "D", // Kirsten Gillibrand (D)
  RI: "D", // Jack Reed (D)
  VT: "I", // Bernie Sanders (I) retiring
  WA: "D", // Patty Murray (D) retiring
  // Solid R
  AL: "R", // Tommy Tuberville (R)
  AK: "R", // Dan Sullivan (R)
  AR: "R", // Tom Cotton (R)
  ID: "R", // Mike Crapo (R)
  IA: "R", // Joni Ernst (R)
  KS: "R", // Roger Marshall (R)
  KY: "R", // Mitch McConnell (R) — seat held by R
  LA: "R", // Bill Cassidy (R)
  MS: "R", // Roger Wicker (R)
  MT: "R", // Steve Daines (R)
  NE: "R", // Deb Fischer (R)
  OK: "R", // James Lankford (R)
  SC: "R", // Tim Scott (R)
  SD: "R", // Mike Rounds (R)
  WY: "R", // John Barrasso (R)
  // Specials
  OH: "R", // Sherrod Brown lost to Bernie Moreno (R) in 2024
  FL: "R", // Marco Rubio (R) vacated for Secretary of State
};

// Update senate_races
for (const [stateCode, party] of Object.entries(senatePreviousParty)) {
  await conn.execute(
    "UPDATE senate_races SET previous_party = ? WHERE state_code = ?",
    [party, stateCode]
  );
}
console.log(`✓ Updated previousParty for ${Object.keys(senatePreviousParty).length} Senate races`);

// ─── House: set previousParty = incumbentParty for all seats ─────────────────
// For seats with no incumbent (open seats), we use the party that last held it.
// The simplest accurate approach: previousParty = incumbentParty where set,
// otherwise default to the party of the last winner.
// Since our seed data already has incumbentParty for all 435 seats, we can
// simply copy incumbentParty → previousParty for all rows.
const [result] = await conn.execute(
  "UPDATE house_races SET previous_party = incumbent_party WHERE incumbent_party IS NOT NULL"
);
console.log(`✓ Updated previousParty for House races from incumbentParty`);

// For any remaining NULL (open seats with no incumbent), set based on 2024 results.
// These are seats where the incumbent retired or the seat was newly created.
// We'll set a reasonable default: if rating is Solid D → D, Solid R → R, else NULL (unknown).
await conn.execute(`
  UPDATE house_races 
  SET previous_party = CASE 
    WHEN rating IN ('Solid D', 'Lean D') THEN 'D'
    WHEN rating IN ('Solid R', 'Lean R') THEN 'R'
    ELSE NULL
  END
  WHERE previous_party IS NULL
`);
console.log(`✓ Filled remaining NULL previousParty values from rating`);

await conn.end();
console.log("✅ previousParty seed complete");
