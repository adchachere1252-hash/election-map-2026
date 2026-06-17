const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== ACCURACY AUDIT: What has the AP Engine actually changed tonight? ===');
  console.log('Current time:', new Date().toISOString());
  console.log('');
  
  // 1. Find all races updated TONIGHT (after 10 PM UTC / when scheduler went active)
  const tonight = '2026-06-16T22:30:00';
  
  console.log('--- HOUSE RACES updated tonight ---');
  const [houseUpdated] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct,
           pct_reporting, status, primary_winner, primary_party, 
           other_candidate_name, other_votes, other_vote_pct, updated_at, notes
    FROM house_races 
    WHERE updated_at >= ?
    ORDER BY state_code, district
  `, [tonight]);
  console.log('Total house races updated tonight:', houseUpdated.length);
  console.log('');
  
  // Group by state
  const houseByState = {};
  houseUpdated.forEach(r => {
    if (!houseByState[r.state_code]) houseByState[r.state_code] = [];
    houseByState[r.state_code].push(r);
  });
  
  for (const [state, races] of Object.entries(houseByState)) {
    console.log(`  ${state}: ${races.length} races updated`);
    races.forEach(r => {
      const winner = r.primary_winner ? ` | WINNER: ${r.primary_winner} (${r.primary_party})` : '';
      const votes = (r.candidate1_votes > 0 || r.candidate2_votes > 0) ? ` | Votes: ${r.candidate1_votes}/${r.candidate2_votes}` : '';
      console.log(`    ${state}-${r.district} [${r.status}] ${r.pct_reporting}% rpt${votes}${winner}`);
    });
  }
  
  console.log('');
  console.log('--- SENATE RACES updated tonight ---');
  const [senUpdated] = await conn.query(`
    SELECT state_code, candidate1_name, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_votes, candidate2_vote_pct,
           pct_reporting, status, primary_winner, primary_party,
           other_candidate_name, other_votes, updated_at, notes
    FROM senate_races 
    WHERE updated_at >= ?
    ORDER BY state_code
  `, [tonight]);
  console.log('Total senate races updated tonight:', senUpdated.length);
  senUpdated.forEach(r => {
    const winner = r.primary_winner ? ` | WINNER: ${r.primary_winner} (${r.primary_party})` : '';
    console.log(`  ${r.state_code} [${r.status}] ${r.pct_reporting}% rpt | C1: ${r.candidate1_name} (${r.candidate1_votes}) | C2: ${r.candidate2_name} (${r.candidate2_votes})${winner}`);
    if (r.notes) console.log(`    Notes: ${r.notes.substring(0, 120)}`);
  });
  
  console.log('');
  console.log('--- GOVERNOR RACES updated tonight ---');
  const [govUpdated] = await conn.query(`
    SELECT state_code, dem_candidate, dem_votes, rep_candidate, rep_votes,
           pct_reporting, status, primary_winner, primary_party,
           other_candidate_name, other_votes, updated_at, notes
    FROM governor_races 
    WHERE updated_at >= ?
    ORDER BY state_code
  `, [tonight]);
  console.log('Total governor races updated tonight:', govUpdated.length);
  govUpdated.forEach(r => {
    const winner = r.primary_winner ? ` | WINNER: ${r.primary_winner} (${r.primary_party})` : '';
    console.log(`  ${r.state_code} [${r.status}] ${r.pct_reporting}% rpt | D: ${r.dem_candidate} (${r.dem_votes}) | R: ${r.rep_candidate} (${r.rep_votes})${winner}`);
    if (r.other_candidate_name) console.log(`    Other: ${r.other_candidate_name} (${r.other_votes} votes)`);
  });
  
  console.log('');
  console.log('--- CRITICAL CHECK: Did any race STATUS change tonight? ---');
  // Check if any race that was General/Called before got downgraded
  const [statusIssues] = await conn.query(`
    SELECT 'house' as chamber, state_code, district as dist, status, updated_at 
    FROM house_races WHERE updated_at >= ? AND status NOT IN ('General', 'Primary Runoff', 'Called', 'Scheduled', 'Primary')
    UNION ALL
    SELECT 'senate', state_code, 0, status, updated_at 
    FROM senate_races WHERE updated_at >= ? AND status NOT IN ('General', 'Primary Runoff', 'Scheduled', 'Primary')
    UNION ALL
    SELECT 'governor', state_code, 0, status, updated_at 
    FROM governor_races WHERE updated_at >= ? AND status NOT IN ('Voting', 'Primary Runoff', 'Scheduled')
  `, [tonight, tonight, tonight]);
  if (statusIssues.length === 0) {
    console.log('  OK - No unexpected status values found');
  } else {
    console.log('  WARNING - Unexpected statuses:');
    statusIssues.forEach(r => console.log(`    ${r.chamber} ${r.state_code}-${r.dist} => ${r.status}`));
  }
  
  console.log('');
  console.log('--- BROADCAST LOG: Race calls fired tonight ---');
  const [broadcasts] = await conn.query(`
    SELECT * FROM broadcast_log WHERE election_date = '2026-06-16' ORDER BY id
  `);
  console.log('Race call broadcasts for June 16:', broadcasts.length);
  broadcasts.forEach(r => console.log(`  ${r.broadcast_key} | ${r.state_code} ${r.chamber} ${r.district}`));
  
  console.log('');
  console.log('--- KEY QUESTION: Are GA results from tonight or May 19? ---');
  // GA primary was May 19. GA runoff is June 16. The AP feed date matters.
  // If the AP Engine found date "2026-05-19" for GA, it's reading old data
  // If it found "2026-06-16", it's reading tonight's runoff
  // We can infer from the data: if GA-1 shows Joyce Griggs as winner with 99% reporting,
  // that's likely the runoff result since she was IN the runoff
  const [ga1] = await conn.query("SELECT * FROM house_races WHERE state_code='GA' AND district=1");
  console.log('GA-1 updated_at:', ga1[0].updated_at);
  console.log('GA-1 primary_winner:', ga1[0].primary_winner, '| primary_party:', ga1[0].primary_party);
  console.log('GA-1 pct_reporting:', ga1[0].pct_reporting);
  console.log('GA-1 notes:', (ga1[0].notes || '').substring(0, 150));
  
  const [ga7] = await conn.query("SELECT primary_winner, primary_party, pct_reporting, updated_at FROM house_races WHERE state_code='GA' AND district=7");
  console.log('GA-7 updated_at:', ga7[0].updated_at, '| winner:', ga7[0].primary_winner);
  
  const [gaSen] = await conn.query("SELECT primary_winner, primary_party, pct_reporting, updated_at FROM senate_races WHERE state_code='GA'");
  console.log('GA Senate updated_at:', gaSen[0].updated_at, '| winner:', gaSen[0].primary_winner);
  
  console.log('');
  console.log('=== SUMMARY ===');
  console.log('States with updates tonight: ', Object.keys(houseByState).join(', '));
  console.log('Senate updates:', senUpdated.map(r => r.state_code).join(', '));
  console.log('Governor updates:', govUpdated.map(r => r.state_code).join(', '));
  
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
