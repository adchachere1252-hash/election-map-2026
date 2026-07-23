import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { houseRaces, senateRaces, governorRaces } from './drizzle/schema';
import { eq, isNull, and, or, ne, sql } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log("=== COMPREHENSIVE DATA VERIFICATION ===\n");

  // 1. House Races - check for NULL parties on candidates
  console.log("--- HOUSE RACES ---");
  const houseAll = await db.select().from(houseRaces);
  console.log(`Total house races: ${houseAll.length}`);
  
  for (const r of houseAll) {
    // Check candidate1 has party if name exists
    if (r.candidate1Name && !r.candidate1Party) {
      errors.push(`HOUSE ${r.stateCode}-${r.districtLabel}: candidate1 "${r.candidate1Name}" has NULL party`);
    }
    // Check candidate2 has party if name exists
    if (r.candidate2Name && !r.candidate2Party) {
      errors.push(`HOUSE ${r.stateCode}-${r.districtLabel}: candidate2 "${r.candidate2Name}" has NULL party`);
    }
    // Check status consistency - if General, should have at least one candidate
    if (r.status === 'General' && !r.candidate1Name && !r.candidate2Name) {
      errors.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=General but no candidates`);
    }
    // Check for stale pct_reporting on non-voting races
    if (r.status === 'General' && r.pctReporting && parseFloat(r.pctReporting) > 0 && parseFloat(r.pctReporting) < 100) {
      warnings.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=General but pct_reporting=${r.pctReporting}% (stale?)`);
    }
    // Check for vote data on races that haven't happened yet
    if (r.status !== 'Called' && r.status !== 'Certified' && (r.candidate1Votes! > 0 || r.candidate2Votes! > 0)) {
      warnings.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=${r.status} but has vote counts (c1=${r.candidate1Votes}, c2=${r.candidate2Votes})`);
    }
    // Check primaryWinner set for General races that had competitive primaries
    if (r.status === 'General' && r.primaryDate && !r.primaryWinner) {
      // Only flag if the primary date has passed
      const primaryDate = new Date(r.primaryDate);
      if (primaryDate < new Date('2026-07-23')) {
        warnings.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=General, primaryDate=${r.primaryDate} passed, but no primaryWinner set`);
      }
    }
    // Check for "TBD" candidates still in General status
    if (r.status === 'General' && (r.candidate1Name === 'TBD' || r.candidate2Name === 'TBD')) {
      errors.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=General but has TBD candidate`);
    }
    // Check for Primary status on races whose primary has passed
    if (r.status === 'Primary' && r.primaryDate) {
      const primaryDate = new Date(r.primaryDate);
      if (primaryDate < new Date('2026-07-23')) {
        errors.push(`HOUSE ${r.stateCode}-${r.districtLabel}: status=Primary but primaryDate=${r.primaryDate} has passed!`);
      }
    }
  }

  // 2. Senate Races
  console.log("\n--- SENATE RACES ---");
  const senateAll = await db.select().from(senateRaces);
  console.log(`Total senate races: ${senateAll.length}`);
  
  for (const r of senateAll) {
    if (r.candidate1Name && !r.candidate1Party) {
      errors.push(`SENATE ${r.stateCode}: candidate1 "${r.candidate1Name}" has NULL party`);
    }
    if (r.candidate2Name && !r.candidate2Party) {
      errors.push(`SENATE ${r.stateCode}: candidate2 "${r.candidate2Name}" has NULL party`);
    }
    if (r.status === 'General' && !r.candidate1Name && !r.candidate2Name) {
      errors.push(`SENATE ${r.stateCode}: status=General but no candidates`);
    }
    if (r.status === 'General' && (r.candidate1Name === 'TBD' || r.candidate2Name === 'TBD')) {
      warnings.push(`SENATE ${r.stateCode}: status=General but has TBD candidate`);
    }
    if (r.status === 'Primary' && r.primaryDate) {
      const primaryDate = new Date(r.primaryDate);
      if (primaryDate < new Date('2026-07-23')) {
        errors.push(`SENATE ${r.stateCode}: status=Primary but primaryDate=${r.primaryDate} has passed!`);
      }
    }
    // Check for stale pct_reporting
    if (r.status === 'General' && r.pctReporting && parseFloat(r.pctReporting) > 0) {
      warnings.push(`SENATE ${r.stateCode}: status=General but pct_reporting=${r.pctReporting}%`);
    }
  }

  // 3. Governor Races
  console.log("\n--- GOVERNOR RACES ---");
  const govAll = await db.select().from(governorRaces);
  console.log(`Total governor races: ${govAll.length}`);
  
  for (const r of govAll) {
    // Check status - if primary has passed, should not be "Scheduled" unless governor schema uses it differently
    // Governor status enum: Scheduled, Voting, Primary Runoff, Called, Certified
    // "Scheduled" means pre-general (primary done, waiting for Nov 3)
    if (r.primaryDate) {
      const pDate = new Date(r.primaryDate.replace(/(\w+)\s(\d+),\s(\d+)/, '$1 $2, $3'));
      if (pDate < new Date('2026-07-23') && r.status === 'Voting') {
        errors.push(`GOVERNOR ${r.stateCode}: status=Voting but primaryDate="${r.primaryDate}" has passed`);
      }
    }
    // Check candidates exist
    if (!r.demCandidate && !r.repCandidate) {
      warnings.push(`GOVERNOR ${r.stateCode}: no candidates set`);
    }
    // Check for TBD
    if (r.demCandidate === 'TBD' || r.repCandidate === 'TBD') {
      warnings.push(`GOVERNOR ${r.stateCode}: has TBD candidate (dem="${r.demCandidate}", rep="${r.repCandidate}")`);
    }
  }

  // Print results
  console.log("\n\n========== VERIFICATION RESULTS ==========\n");
  console.log(`ERRORS (must fix): ${errors.length}`);
  errors.forEach(e => console.log(`  ❌ ${e}`));
  console.log(`\nWARNINGS (review): ${warnings.length}`);
  warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  console.log(`\n==========================================`);

  await conn.end();
  process.exit(0);
}
main();
