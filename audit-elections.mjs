// Election Data Verification Audit Script
// Checks all Senate, House, and Governor races for data completeness and accuracy

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load env
const envPath = '/home/ubuntu/election-map-2026/.env';
try { dotenv.config({ path: envPath }); } catch(e) {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

console.log("=== ELECTION DATA VERIFICATION AUDIT ===");
console.log(`Date: ${new Date().toISOString()}\n`);

// ─── SENATE RACES ────────────────────────────────────────────────────────────
console.log("═══════════════════════════════════════════");
console.log("  SENATE RACES (35 expected)");
console.log("═══════════════════════════════════════════\n");

const [senateRows] = await conn.execute("SELECT * FROM senate_races ORDER BY state_code");
console.log(`Total Senate races: ${senateRows.length}`);

const senateIssues = [];
for (const r of senateRows) {
  const issues = [];
  if (!r.candidate1_name) issues.push("Missing candidate1_name");
  if (!r.candidate1_party) issues.push("Missing candidate1_party");
  if (!r.candidate2_name) issues.push("Missing candidate2_name");
  if (!r.candidate2_party) issues.push("Missing candidate2_party");
  if (!r.rating) issues.push("Missing rating");
  if (!r.general_date) issues.push("Missing general_date");
  if (!r.incumbent) issues.push("Missing incumbent");
  if (!r.incumbent_party) issues.push("Missing incumbent_party");
  if (r.candidate1_name && r.candidate1_name.includes("TBD")) issues.push(`Candidate1 is TBD: ${r.candidate1_name}`);
  if (r.candidate2_name && r.candidate2_name.includes("TBD")) issues.push(`Candidate2 is TBD: ${r.candidate2_name}`);
  if (!r.candidate1_photo) issues.push("Missing candidate1_photo");
  if (!r.candidate2_photo) issues.push("Missing candidate2_photo");
  if (!r.candidate1_bio) issues.push("Missing candidate1_bio");
  if (!r.candidate2_bio) issues.push("Missing candidate2_bio");
  if (!r.previous_party) issues.push("Missing previous_party");
  
  if (issues.length > 0) {
    senateIssues.push({ state: r.state_code, name: r.state_name, issues });
  }
}

if (senateIssues.length === 0) {
  console.log("✅ All Senate races have complete data\n");
} else {
  console.log(`\n⚠️  ${senateIssues.length} Senate races have issues:\n`);
  for (const s of senateIssues) {
    console.log(`  ${s.state} (${s.name}):`);
    for (const i of s.issues) {
      console.log(`    - ${i}`);
    }
  }
}

// Check for races without November 3 date
const [senateDates] = await conn.execute("SELECT state_code, general_date FROM senate_races WHERE general_date IS NULL OR general_date NOT LIKE '%November%'");
if (senateDates.length > 0) {
  console.log(`\n⚠️  Senate races with non-standard general dates:`);
  for (const r of senateDates) {
    console.log(`    ${r.state_code}: ${r.general_date || 'NULL'}`);
  }
}

// Rating distribution
const [senateRatings] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM senate_races GROUP BY rating ORDER BY rating");
console.log("\n  Rating distribution:");
for (const r of senateRatings) {
  console.log(`    ${r.rating || 'NULL'}: ${r.cnt}`);
}

// ─── HOUSE RACES ─────────────────────────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════");
console.log("  HOUSE RACES (435 expected)");
console.log("═══════════════════════════════════════════\n");

const [houseRows] = await conn.execute("SELECT * FROM house_races ORDER BY state_code, district");
console.log(`Total House races: ${houseRows.length}`);

const houseIssues = [];
let missingC1 = 0, missingC2 = 0, tbdC1 = 0, tbdC2 = 0, missingRating = 0, missingPhoto1 = 0, missingPhoto2 = 0;

for (const r of houseRows) {
  const issues = [];
  if (!r.candidate1_name) { issues.push("Missing candidate1_name"); missingC1++; }
  if (!r.candidate1_party) issues.push("Missing candidate1_party");
  if (!r.candidate2_name) { issues.push("Missing candidate2_name"); missingC2++; }
  if (!r.candidate2_party) issues.push("Missing candidate2_party");
  if (!r.rating) { issues.push("Missing rating"); missingRating++; }
  if (r.candidate1_name && r.candidate1_name.includes("TBD")) { issues.push(`Candidate1 TBD: ${r.candidate1_name}`); tbdC1++; }
  if (r.candidate2_name && r.candidate2_name.includes("TBD")) { issues.push(`Candidate2 TBD: ${r.candidate2_name}`); tbdC2++; }
  if (!r.candidate1_photo) missingPhoto1++;
  if (!r.candidate2_photo) missingPhoto2++;
  
  if (issues.length > 0) {
    houseIssues.push({ district: `${r.state_code}-${r.district_label}`, issues });
  }
}

console.log(`\n  Summary:`);
console.log(`    Missing candidate1_name: ${missingC1}`);
console.log(`    Missing candidate2_name: ${missingC2}`);
console.log(`    TBD candidate1: ${tbdC1}`);
console.log(`    TBD candidate2: ${tbdC2}`);
console.log(`    Missing rating: ${missingRating}`);
console.log(`    Missing candidate1_photo: ${missingPhoto1}`);
console.log(`    Missing candidate2_photo: ${missingPhoto2}`);

if (houseIssues.length > 0) {
  console.log(`\n  ⚠️  ${houseIssues.length} House races have critical issues (missing name/party/rating):`);
  // Only show first 30 to keep output manageable
  for (const h of houseIssues.slice(0, 30)) {
    console.log(`    ${h.district}: ${h.issues.join(', ')}`);
  }
  if (houseIssues.length > 30) console.log(`    ... and ${houseIssues.length - 30} more`);
}

// House rating distribution
const [houseRatings] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM house_races GROUP BY rating ORDER BY rating");
console.log("\n  Rating distribution:");
for (const r of houseRatings) {
  console.log(`    ${r.rating || 'NULL'}: ${r.cnt}`);
}

// House status distribution
const [houseStatuses] = await conn.execute("SELECT status, COUNT(*) as cnt FROM house_races GROUP BY status ORDER BY status");
console.log("\n  Status distribution:");
for (const r of houseStatuses) {
  console.log(`    ${r.status || 'NULL'}: ${r.cnt}`);
}

// ─── GOVERNOR RACES ──────────────────────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════");
console.log("  GOVERNOR RACES (36 expected)");
console.log("═══════════════════════════════════════════\n");

const [govRows] = await conn.execute("SELECT * FROM governor_races ORDER BY state_code");
console.log(`Total Governor races: ${govRows.length}`);

const govIssues = [];
for (const r of govRows) {
  const issues = [];
  if (!r.candidate1_name) issues.push("Missing candidate1_name");
  if (!r.candidate1_party) issues.push("Missing candidate1_party");
  if (!r.candidate2_name) issues.push("Missing candidate2_name");
  if (!r.candidate2_party) issues.push("Missing candidate2_party");
  if (!r.rating) issues.push("Missing rating");
  if (!r.general_date) issues.push("Missing general_date");
  if (r.candidate1_name && r.candidate1_name.includes("TBD")) issues.push(`Candidate1 TBD: ${r.candidate1_name}`);
  if (r.candidate2_name && r.candidate2_name.includes("TBD")) issues.push(`Candidate2 TBD: ${r.candidate2_name}`);
  if (!r.candidate1_photo) issues.push("Missing candidate1_photo");
  if (!r.candidate2_photo) issues.push("Missing candidate2_photo");
  
  if (issues.length > 0) {
    govIssues.push({ state: r.state_code, name: r.state_name, issues });
  }
}

if (govIssues.length === 0) {
  console.log("✅ All Governor races have complete data\n");
} else {
  console.log(`\n⚠️  ${govIssues.length} Governor races have issues:\n`);
  for (const g of govIssues) {
    console.log(`  ${g.state} (${g.name}):`);
    for (const i of g.issues) {
      console.log(`    - ${i}`);
    }
  }
}

// Governor rating distribution
const [govRatings] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM governor_races GROUP BY rating ORDER BY rating");
console.log("\n  Rating distribution:");
for (const r of govRatings) {
  console.log(`    ${r.rating || 'NULL'}: ${r.cnt}`);
}

// ─── CROSS-CHECK: SPECIAL ELECTIONS ──────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════");
console.log("  SPECIAL ELECTIONS & VACANCIES");
console.log("═══════════════════════════════════════════\n");

const [specialSenate] = await conn.execute("SELECT state_code, state_name, special_note, status FROM senate_races WHERE is_special = 1");
console.log(`Special Senate races: ${specialSenate.length}`);
for (const s of specialSenate) {
  console.log(`  ${s.state_code} (${s.state_name}): ${s.special_note} [${s.status}]`);
}

const [vacancyHouse] = await conn.execute("SELECT state_code, district_label, status FROM house_races WHERE is_vacancy = 1");
console.log(`\nHouse vacancies (special elections): ${vacancyHouse.length}`);
for (const h of vacancyHouse) {
  console.log(`  ${h.state_code}-${h.district_label}: [${h.status}]`);
}

// ─── MAINE CHECK (recent update) ────────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════");
console.log("  RECENT UPDATES VERIFICATION");
console.log("═══════════════════════════════════════════\n");

const [maineSenate] = await conn.execute("SELECT state_code, candidate1_name, candidate1_party, candidate2_name, candidate2_party, rating, notes FROM senate_races WHERE state_code = 'ME'");
console.log("Maine Senate:");
for (const r of maineSenate) {
  console.log(`  C1: ${r.candidate1_name} (${r.candidate1_party})`);
  console.log(`  C2: ${r.candidate2_name} (${r.candidate2_party})`);
  console.log(`  Rating: ${r.rating}`);
  console.log(`  Notes: ${r.notes?.substring(0, 100)}...`);
}

const [scSenate] = await conn.execute("SELECT state_code, candidate1_name, candidate1_party, candidate2_name, candidate2_party, rating, is_special, special_note, status, notes FROM senate_races WHERE state_code = 'SC'");
console.log("\nSouth Carolina Senate:");
for (const r of scSenate) {
  console.log(`  C1: ${r.candidate1_name} (${r.candidate1_party})`);
  console.log(`  C2: ${r.candidate2_name} (${r.candidate2_party})`);
  console.log(`  Rating: ${r.rating} | Status: ${r.status} | Special: ${r.is_special}`);
  console.log(`  Special Note: ${r.special_note}`);
  console.log(`  Notes: ${r.notes?.substring(0, 120)}...`);
}

await conn.end();
console.log("\n\n=== AUDIT COMPLETE ===");
