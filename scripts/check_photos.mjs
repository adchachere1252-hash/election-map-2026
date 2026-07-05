import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Senate photo check
const [senate] = await conn.execute(`SELECT state_name, state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM senate_races ORDER BY state_name`);
console.log('=== SENATE PHOTO STATUS ===');
let senMissing = [];
for (const r of senate) {
  const c1Missing = r.candidate1_name && !r.candidate1_name.startsWith('TBD') && (!r.candidate1_photo || r.candidate1_photo === '');
  const c2Missing = r.candidate2_name && !r.candidate2_name.startsWith('TBD') && (!r.candidate2_photo || r.candidate2_photo === '');
  if (c1Missing || c2Missing) {
    const issues = [];
    if (c1Missing) issues.push(`C1: ${r.candidate1_name} - NO PHOTO`);
    if (c2Missing) issues.push(`C2: ${r.candidate2_name} - NO PHOTO`);
    console.log(`  ${r.state_name} (${r.state_code}): ${issues.join(' | ')}`);
    senMissing.push(r.state_name);
  }
}
console.log(`\nSenate races with missing photos: ${senMissing.length}`);

// Governor photo check
const [govs] = await conn.execute(`SELECT state_name, state_code, dem_candidate, dem_photo, rep_candidate, rep_photo FROM governor_races ORDER BY state_name`);
console.log('\n=== GOVERNOR PHOTO STATUS ===');
let govMissing = [];
for (const r of govs) {
  const dMissing = r.dem_candidate && !r.dem_candidate.startsWith('TBD') && (!r.dem_photo || r.dem_photo === '');
  const rMissing = r.rep_candidate && !r.rep_candidate.startsWith('TBD') && (!r.rep_photo || r.rep_photo === '');
  if (dMissing || rMissing) {
    const issues = [];
    if (dMissing) issues.push(`D: ${r.dem_candidate} - NO PHOTO`);
    if (rMissing) issues.push(`R: ${r.rep_candidate} - NO PHOTO`);
    console.log(`  ${r.state_name} (${r.state_code}): ${issues.join(' | ')}`);
    govMissing.push(r.state_name);
  }
}
console.log(`\nGovernor races with missing photos: ${govMissing.length}`);

await conn.end();
process.exit(0);
