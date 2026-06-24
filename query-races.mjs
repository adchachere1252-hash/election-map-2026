import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

// Get DATABASE_URL from the running dev server's environment
let dbUrl;
try {
  const result = execSync("ps aux | grep 'tsx watch' | grep -v grep | awk '{print $2}'", { encoding: 'utf8' }).trim();
  const pids = result.split('\n');
  for (const p of pids) {
    try {
      const envStr = execSync(`cat /proc/${p}/environ`, { encoding: 'utf8' });
      const envVars = envStr.split('\0');
      const dbEntry = envVars.find(e => e.startsWith('DATABASE_URL='));
      if (dbEntry) {
        dbUrl = dbEntry.split('=').slice(1).join('=');
        break;
      }
    } catch(e2) {}
  }
} catch(e) {}

if (!dbUrl) {
  console.error('Could not find DATABASE_URL from process env, trying dotenv...');
  // fallback: try reading from dotenv-vault or similar
  try {
    const result2 = execSync("grep DATABASE_URL /proc/$(pgrep -f 'tsx watch' | head -1)/environ 2>/dev/null || echo ''", { encoding: 'utf8' }).trim();
    if (result2) dbUrl = result2.replace('DATABASE_URL=', '');
  } catch(e3) {}
}

if (!dbUrl) {
  console.error('Could not find DATABASE_URL');
  process.exit(1);
}

console.log('Connected to database...');
const conn = await mysql.createConnection(dbUrl);

// House races called
const [houseRows] = await conn.execute(
  "SELECT state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, called_winner, called_party, called_at, pct_reporting, candidate1_vote_pct, candidate2_vote_pct, status FROM house_races WHERE status = 'Called' ORDER BY called_at DESC"
);
console.log(`\n=== HOUSE RACES CALLED (${houseRows.length} total) ===`);
for (const r of houseRows) {
  const calledTime = r.called_at ? new Date(Number(r.called_at)).toLocaleString('en-US', {timeZone: 'America/New_York'}) : 'N/A';
  console.log(`${r.state_code}-${r.district}: ${r.called_winner} (${r.called_party}) | ${r.candidate1_vote_pct}% vs ${r.candidate2_vote_pct}% | ${r.pct_reporting}% rpt | Called: ${calledTime}`);
}

// Senate races called
const [senateRows] = await conn.execute(
  "SELECT state_code, state_name, candidate1_name, candidate1_party, candidate2_name, candidate2_party, called_winner, called_party, called_at, pct_reporting, status FROM senate_races WHERE status = 'Called' ORDER BY called_at DESC"
);
console.log(`\n=== SENATE RACES CALLED (${senateRows.length} total) ===`);
for (const r of senateRows) {
  const calledTime = r.called_at ? new Date(Number(r.called_at)).toLocaleString('en-US', {timeZone: 'America/New_York'}) : 'N/A';
  console.log(`${r.state_code}: ${r.called_winner} (${r.called_party}) | ${r.candidate1_name} vs ${r.candidate2_name} | Called: ${calledTime}`);
}

// Governor races called
const [govRows] = await conn.execute(
  "SELECT state_code, state_name, dem_candidate, rep_candidate, called_winner, called_party, called_at, status FROM governor_races WHERE status = 'Called' ORDER BY called_at DESC"
);
console.log(`\n=== GOVERNOR RACES CALLED (${govRows.length} total) ===`);
for (const r of govRows) {
  const calledTime = r.called_at ? new Date(Number(r.called_at)).toLocaleString('en-US', {timeZone: 'America/New_York'}) : 'N/A';
  console.log(`${r.state_code}: ${r.called_winner} (${r.called_party}) | D: ${r.dem_candidate} vs R: ${r.rep_candidate} | Called: ${calledTime}`);
}

// Summary of all statuses
const [houseSummary] = await conn.execute("SELECT status, COUNT(*) as cnt FROM house_races GROUP BY status ORDER BY cnt DESC");
console.log('\n=== HOUSE STATUS SUMMARY ===');
for (const r of houseSummary) console.log(`  ${r.status}: ${r.cnt}`);

const [senateSummary] = await conn.execute("SELECT status, COUNT(*) as cnt FROM senate_races GROUP BY status ORDER BY cnt DESC");
console.log('\n=== SENATE STATUS SUMMARY ===');
for (const r of senateSummary) console.log(`  ${r.status}: ${r.cnt}`);

const [govSummary] = await conn.execute("SELECT status, COUNT(*) as cnt FROM governor_races GROUP BY status ORDER BY cnt DESC");
console.log('\n=== GOVERNOR STATUS SUMMARY ===');
for (const r of govSummary) console.log(`  ${r.status}: ${r.cnt}`);

await conn.end();
