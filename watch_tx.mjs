import { createConnection } from '/home/ubuntu/election-map-2026/node_modules/mysql2/promise/index.js';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Get DATABASE_URL from the running server process environment
function getDbUrl() {
  try {
    const pid = execSync('pgrep -f "node.*server" | head -1').toString().trim();
    if (!pid) throw new Error('No server process');
    const env = readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0');
    const entry = env.find(e => e.startsWith('DATABASE_URL='));
    if (!entry) throw new Error('DATABASE_URL not in env');
    return entry.replace('DATABASE_URL=', '');
  } catch (e) {
    console.error('Could not get DATABASE_URL:', e.message);
    process.exit(1);
  }
}

const dbUrl = getDbUrl();
const url = new URL(dbUrl);

const conn = await createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false }
});

let lastTxSenPct = '0.00';
let lastTx18Pct = '0.00';
let lastTxSenCalled = null;
let lastTx18Called = null;

console.log('[TX Watcher] Monitoring TX Senate and TX-18 every 30s...');

async function check() {
  try {
    const [senRows] = await conn.execute(
      `SELECT status, candidate1_name, candidate2_name, called_winner, called_party, pct_reporting, candidate1_vote_pct, candidate2_vote_pct FROM senate_races WHERE state_code = 'TX'`
    );
    const [houseRows] = await conn.execute(
      `SELECT status, candidate1_name, candidate2_name, called_winner, pct_reporting, candidate1_vote_pct, candidate2_vote_pct FROM house_races WHERE state_code = 'TX' AND district = 18`
    );

    const sen = senRows[0];
    const h18 = houseRows[0];
    const now = new Date().toISOString();

    if (sen) {
      const pct = parseFloat(sen.pct_reporting || 0);
      if (pct > 0 && sen.pct_reporting !== lastTxSenPct) {
        console.log(`${now} [TX SENATE] ${pct}% reporting | C2: ${sen.candidate2_name || 'TBD'} ${sen.candidate2_vote_pct || '?'}% | C1: Talarico ${sen.candidate1_vote_pct || '?'}%`);
        lastTxSenPct = sen.pct_reporting;
      }
      if (sen.called_winner && sen.called_winner !== lastTxSenCalled) {
        console.log(`${now} [TX SENATE CALLED] *** WINNER: ${sen.called_winner} (${sen.called_party}) ***`);
        lastTxSenCalled = sen.called_winner;
      }
    }

    if (h18) {
      const pct = parseFloat(h18.pct_reporting || 0);
      if (pct > 0 && h18.pct_reporting !== lastTx18Pct) {
        console.log(`${now} [TX-18] ${pct}% reporting | ${h18.candidate1_name || 'TBD'} ${h18.candidate1_vote_pct || '?'}% | ${h18.candidate2_name || 'Whitfield'} ${h18.candidate2_vote_pct || '?'}%`);
        lastTx18Pct = h18.pct_reporting;
      }
      if (h18.called_winner && h18.called_winner !== lastTx18Called) {
        console.log(`${now} [TX-18 CALLED] *** WINNER: ${h18.called_winner} ***`);
        lastTx18Called = h18.called_winner;
      }
    }
  } catch (err) {
    console.error(`[TX Watcher] DB error: ${err.message}`);
  }
}

await check();
setInterval(check, 30000);
