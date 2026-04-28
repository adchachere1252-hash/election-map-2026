import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// Full list of all 58 House members not seeking reelection in 2026
// Source: Newsweek/Ballotpedia as of April 28, 2026
// Format: [state_code, district_number, member_name, party, reason]
// district 0 = At-Large
const retirees = [
  // ── RETIRING FROM PUBLIC OFFICE (29) ──────────────────────────────────────
  ["MO", 6,  "Sam Graves",              "R", "Retiring"],
  ["CA", 48, "Darrell Issa",            "R", "Retiring"],
  ["TX", 23, "Tony Gonzalez",           "R", "Retiring"],
  ["UT", 4,  "Burgess Owens",           "R", "Retiring"],
  ["MT", 1,  "Ryan Zinke",              "R", "Retiring"],
  ["NV", 2,  "Mark Amodei",             "R", "Retiring"],
  ["GA", 11, "Barry Loudermilk",        "R", "Retiring"],
  ["FL", 16, "Vern Buchanan",           "R", "Retiring"],
  ["FL", 2,  "Neal Dunn",               "R", "Retiring"],
  ["CA", 26, "Julia Brownley",          "D", "Retiring"],
  ["MD", 5,  "Steny Hoyer",             "D", "Retiring"],
  ["NY", 21, "Elise Stefanik",          "R", "Retiring"],
  ["WA", 4,  "Dan Newhouse",            "R", "Retiring"],
  ["TX", 33, "Marc Veasey",             "D", "Retiring"],
  ["TX", 37, "Lloyd Doggett",           "D", "Retiring"],
  ["TX", 22, "Troy Nehls",              "R", "Retiring"],
  ["NY", 7,  "Nydia Velázquez",         "D", "Retiring"],
  ["TX", 19, "Jodey Arrington",         "R", "Retiring"],
  ["NJ", 12, "Bonnie Watson Coleman",   "D", "Retiring"],
  ["CA", 11, "Nancy Pelosi",            "D", "Retiring"],
  ["IL", 4,  "Jesús García",            "D", "Retiring"],
  ["ME", 2,  "Jared Golden",            "D", "Retiring"],
  ["TX", 10, "Michael McCaul",          "R", "Retiring"],
  ["TX", 8,  "Morgan Luttrell",         "R", "Retiring"],
  ["NY", 12, "Jerrold Nadler",          "D", "Retiring"],
  ["IL", 7,  "Danny K. Davis",          "D", "Retiring"],
  ["NE", 2,  "Don Bacon",               "R", "Retiring"],
  ["PA", 3,  "Dwight Evans",            "D", "Retiring"],
  ["IL", 9,  "Jan Schakowsky",          "D", "Retiring"],
  ["FL", 11, "Daniel Webster",          "R", "Retiring"],  // Added Apr 28, 2026

  // ── RUNNING FOR U.S. SENATE (16) ─────────────────────────────────────────
  ["OK", 1,  "Kevin Hern",              "R", "Running for Senate"],
  ["LA", 5,  "Julia Letlow",            "R", "Running for Senate"],
  ["WY", 0,  "Harriet Hageman",         "R", "Running for Senate"],
  ["TX", 30, "Jasmine Crockett",        "D", "Running for Senate"],
  ["MA", 6,  "Seth Moulton",            "D", "Running for Senate"],
  ["TX", 38, "Wesley Hunt",             "R", "Running for Senate"],
  ["IA", 2,  "Ashley Hinson",           "R", "Running for Senate"],
  ["AL", 1,  "Barry Moore",             "R", "Running for Senate"],
  ["GA", 10, "Mike Collins",            "R", "Running for Senate"],
  ["GA", 1,  "Earl Carter",             "R", "Running for Senate"],
  ["IL", 8,  "Raja Krishnamoorthi",     "D", "Running for Senate"],
  ["IL", 2,  "Robin Kelly",             "D", "Running for Senate"],
  ["MN", 2,  "Angie Craig",             "D", "Running for Senate"],
  ["KY", 6,  "Andy Barr",               "R", "Running for Senate"],
  ["MI", 11, "Haley Stevens",           "D", "Running for Senate"],
  ["NH", 1,  "Chris Pappas",            "D", "Running for Senate"],

  // ── RUNNING FOR GOVERNOR (11) ────────────────────────────────────────────
  ["CA", 14, "Eric Swalwell",           "D", "Running for Governor"],
  ["AZ", 1,  "David Schweikert",        "R", "Running for Governor"],
  ["WI", 7,  "Tom Tiffany",             "R", "Running for Governor"],
  ["SC", 1,  "Nancy Mace",              "R", "Running for Governor"],
  ["SC", 5,  "Ralph Norman",            "R", "Running for Governor"],
  ["SD", 0,  "Dusty Johnson",           "R", "Running for Governor"],
  ["IA", 4,  "Randy Feenstra",          "R", "Running for Governor"],
  ["MI", 10, "John James",              "R", "Running for Governor"],
  ["TN", 6,  "John Rose",               "R", "Running for Governor"],
  ["FL", 19, "Byron Donalds",           "R", "Running for Governor"],
  ["AZ", 5,  "Andy Biggs",              "R", "Running for Governor"],

  // ── RUNNING FOR ATTORNEY GENERAL (1) ─────────────────────────────────────
  ["TX", 21, "Chip Roy",                "R", "Running for Attorney General"],
];

console.log(`Processing ${retirees.length} retiring House members...\n`);

let updated = 0;
let notFound = [];

for (const [state, district, name, party, reason] of retirees) {
  const districtVal = district === 0 ? null : district;
  
  // Try to find by state_code and district
  let query, params;
  if (districtVal === null) {
    // At-large district
    query = `SELECT id, state_code, district, incumbent, incumbent_retiring FROM house_races WHERE state_code = ? AND (district IS NULL OR district = 0 OR district = 1)`;
    params = [state];
  } else {
    query = `SELECT id, state_code, district, incumbent, incumbent_retiring FROM house_races WHERE state_code = ? AND district = ?`;
    params = [state, districtVal];
  }
  
  const [rows] = await db.execute(query, params);
  
  if (rows.length > 0) {
    const row = rows[0];
    if (!row.incumbent_retiring) {
      await db.execute(
        `UPDATE house_races SET incumbent_retiring = 1, updated_at = NOW() WHERE id = ?`,
        [row.id]
      );
      console.log(`✅ ${state}-${district || 'AL'}: ${name} (${party}) — ${reason}`);
      updated++;
    } else {
      console.log(`⏭️  ${state}-${district || 'AL'}: ${name} already marked retiring`);
    }
  } else {
    console.log(`⚠️  NOT FOUND: ${state}-${district || 'AL'} ${name}`);
    notFound.push(`${state}-${district || 'AL'} ${name}`);
  }
}

// Summary
const [totalRetiring] = await db.execute(
  `SELECT COUNT(*) as cnt FROM house_races WHERE incumbent_retiring = 1`
);
const [openByParty] = await db.execute(
  `SELECT incumbent_party, COUNT(*) as cnt FROM house_races WHERE incumbent_retiring = 1 GROUP BY incumbent_party`
);

console.log(`\n═══════════════════════════════════════`);
console.log(`Updated: ${updated} new open seats flagged`);
console.log(`Total open seats in DB: ${totalRetiring[0].cnt}`);
console.log(`By party:`, openByParty.map(r => `${r.incumbent_party}: ${r.cnt}`).join(", "));
if (notFound.length > 0) {
  console.log(`\nNot found in DB (${notFound.length}):`);
  notFound.forEach(n => console.log(`  - ${n}`));
}

await db.end();
console.log("\n✅ Open seat update complete.");
