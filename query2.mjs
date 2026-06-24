import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

let dbUrl;
const result = execSync("ps aux | grep 'tsx watch' | grep -v grep | awk '{print $2}'", { encoding: 'utf8' }).trim();
const pids = result.split('\n');
for (const p of pids) {
  try {
    const envStr = execSync(`cat /proc/${p}/environ`, { encoding: 'utf8' });
    const envVars = envStr.split('\0');
    const dbEntry = envVars.find(e => e.startsWith('DATABASE_URL='));
    if (dbEntry) { dbUrl = dbEntry.split('=').slice(1).join('='); break; }
  } catch(e) {}
}
const conn = await mysql.createConnection(dbUrl);

// Get all house races that were promoted (have primary_winner set) - these are the ones called last night
const [promoted] = await conn.execute(
  "SELECT state_code, district, primary_winner, primary_party, status, candidate1_name, candidate1_party, candidate2_name, candidate2_party FROM house_races WHERE primary_winner IS NOT NULL ORDER BY state_code, district"
);
console.log(`\n=== HOUSE RACES WITH PRIMARY WINNERS (${promoted.length} total) ===`);
for (const r of promoted) {
  console.log(`${r.state_code}-${r.district}: ${r.primary_winner} (${r.primary_party}) -> Status: ${r.status} | C1: ${r.candidate1_name} (${r.candidate1_party}) vs C2: ${r.candidate2_name} (${r.candidate2_party})`);
}

// Governor races - check MD specifically
const [mdGov] = await conn.execute("SELECT * FROM governor_races WHERE state_code = 'MD'");
console.log('\n=== MD GOVERNOR ===');
console.log(JSON.stringify(mdGov[0], null, 2));

// Check SC governor
const [scGov] = await conn.execute("SELECT * FROM governor_races WHERE state_code = 'SC'");
console.log('\n=== SC GOVERNOR ===');
console.log(JSON.stringify(scGov[0], null, 2));

// House races still in Primary/Primary Runoff
const [primaries] = await conn.execute(
  "SELECT state_code, district, status, candidate1_name, candidate1_party, candidate2_name, candidate2_party FROM house_races WHERE status IN ('Primary', 'Primary Runoff') ORDER BY state_code, district"
);
console.log(`\n=== HOUSE RACES STILL IN PRIMARY/RUNOFF (${primaries.length}) ===`);
for (const r of primaries) {
  console.log(`${r.state_code}-${r.district}: ${r.status} | ${r.candidate1_name} (${r.candidate1_party}) vs ${r.candidate2_name} (${r.candidate2_party})`);
}

// Governor races still in Voting
const [votingGov] = await conn.execute("SELECT state_code, state_name, status, dem_candidate, rep_candidate FROM governor_races WHERE status = 'Voting'");
console.log(`\n=== GOVERNOR RACES STILL VOTING (${votingGov.length}) ===`);
for (const r of votingGov) {
  console.log(`${r.state_code}: ${r.state_name} | D: ${r.dem_candidate} vs R: ${r.rep_candidate}`);
}

await conn.end();
process.exit(0);
