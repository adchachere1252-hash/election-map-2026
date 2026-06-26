import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // ===== WORLD ELECTIONS AUDIT =====
  console.log('=== WORLD ELECTIONS FULL AUDIT ===');
  const [worldRows] = await conn.query('SELECT id, country, country_code, election_type, election_date, status, is_date_confirmed, incumbent, incumbent_party, system_type, candidates, polling_data, key_issues, winner FROM world_elections ORDER BY election_date');
  
  console.log('Total elections:', worldRows.length);
  
  let worldIssues = [];
  let worldStats = { total: 0, hasCandidates: 0, hasPolling: 0, hasIssues: 0, hasIncumbent: 0, hasCountryCode: 0, hasSystemType: 0, upcoming: 0, completed: 0 };
  
  for (const r of worldRows) {
    worldStats.total++;
    if (r.candidates) worldStats.hasCandidates++;
    if (r.polling_data) worldStats.hasPolling++;
    if (r.key_issues) worldStats.hasIssues++;
    if (r.incumbent) worldStats.hasIncumbent++;
    if (r.country_code) worldStats.hasCountryCode++;
    if (r.system_type) worldStats.hasSystemType++;
    if (r.status === 'upcoming') worldStats.upcoming++;
    if (r.status === 'completed') worldStats.completed++;
    
    if (!r.country_code) worldIssues.push(r.country + ': missing country_code');
    if (!r.candidates) worldIssues.push(r.country + ': missing candidates');
    if (!r.polling_data && r.status === 'upcoming') worldIssues.push(r.country + ': missing polling_data (upcoming)');
    if (!r.key_issues && r.status === 'upcoming') worldIssues.push(r.country + ': missing key_issues (upcoming)');
    if (!r.incumbent) worldIssues.push(r.country + ': missing incumbent');
    if (!r.system_type) worldIssues.push(r.country + ': missing system_type');
    if (!r.election_type) worldIssues.push(r.country + ': missing election_type');
    
    // Validate candidates JSON
    if (r.candidates) {
      try {
        const cands = JSON.parse(r.candidates);
        if (!Array.isArray(cands) || cands.length === 0) worldIssues.push(r.country + ': candidates is empty array');
        else {
          for (const c of cands) {
            if (!c.name) worldIssues.push(r.country + ': candidate missing name');
            if (!c.party) worldIssues.push(r.country + ': candidate ' + (c.name || '?') + ' missing party');
          }
        }
      } catch(e) { worldIssues.push(r.country + ': invalid candidates JSON - ' + e.message); }
    }
    
    // Validate polling JSON
    if (r.polling_data) {
      try {
        const polls = JSON.parse(r.polling_data);
        if (!Array.isArray(polls) || polls.length === 0) worldIssues.push(r.country + ': polling_data is empty array');
      } catch(e) { worldIssues.push(r.country + ': invalid polling_data JSON - ' + e.message); }
    }
    
    // Validate key_issues JSON
    if (r.key_issues) {
      try {
        const ki = JSON.parse(r.key_issues);
        if (!Array.isArray(ki) || ki.length === 0) worldIssues.push(r.country + ': key_issues is empty array');
      } catch(e) { worldIssues.push(r.country + ': invalid key_issues JSON - ' + e.message); }
    }
  }
  
  console.log('\nWORLD STATS:', JSON.stringify(worldStats, null, 2));
  console.log('\nWORLD ISSUES FOUND:', worldIssues.length);
  worldIssues.forEach(i => console.log('  -', i));

  // ===== SENATE AUDIT =====
  console.log('\n\n=== SENATE RACES FULL AUDIT ===');
  const [senateRows] = await conn.query('SELECT state_code, candidate1_name, candidate1_party, candidate1_photo, candidate1_bio, candidate2_name, candidate2_party, candidate2_photo, candidate2_bio, rating, incumbent, incumbent_party FROM senate_races ORDER BY state_code');
  
  let senateIssues = [];
  let senateStats = { total: 0, hasC1Photo: 0, hasC2Photo: 0, hasC1Bio: 0, hasC2Bio: 0, hasRating: 0, hasIncumbent: 0, tbd: 0 };
  
  for (const r of senateRows) {
    senateStats.total++;
    if (r.candidate1_photo) senateStats.hasC1Photo++;
    if (r.candidate2_photo) senateStats.hasC2Photo++;
    if (r.candidate1_bio) senateStats.hasC1Bio++;
    if (r.candidate2_bio) senateStats.hasC2Bio++;
    if (r.rating) senateStats.hasRating++;
    if (r.incumbent) senateStats.hasIncumbent++;
    
    const c1IsTBD = !r.candidate1_name || r.candidate1_name.startsWith('TBD');
    const c2IsTBD = !r.candidate2_name || r.candidate2_name.startsWith('TBD');
    if (c1IsTBD) senateStats.tbd++;
    if (c2IsTBD) senateStats.tbd++;
    
    // Check confirmed candidates for missing data
    if (!c1IsTBD && !r.candidate1_photo) senateIssues.push(r.state_code + ': ' + r.candidate1_name + ' missing photo');
    if (!c1IsTBD && !r.candidate1_bio) senateIssues.push(r.state_code + ': ' + r.candidate1_name + ' missing bio');
    if (!c2IsTBD && !r.candidate2_photo) senateIssues.push(r.state_code + ': ' + r.candidate2_name + ' missing photo');
    if (!c2IsTBD && !r.candidate2_bio) senateIssues.push(r.state_code + ': ' + r.candidate2_name + ' missing bio');
    if (!r.rating) senateIssues.push(r.state_code + ': missing rating');
    if (!r.incumbent) senateIssues.push(r.state_code + ': missing incumbent');
  }
  
  console.log('Total races:', senateStats.total);
  console.log('SENATE STATS:', JSON.stringify(senateStats, null, 2));
  console.log('\nSENATE ISSUES FOUND:', senateIssues.length);
  senateIssues.forEach(i => console.log('  -', i));

  // ===== GOVERNOR AUDIT =====
  console.log('\n\n=== GOVERNOR RACES FULL AUDIT ===');
  const [govRows] = await conn.query('SELECT state_code, dem_candidate, dem_photo, dem_bio, rep_candidate, rep_photo, rep_bio, rating, incumbent, incumbent_party FROM governor_races ORDER BY state_code');
  
  let govIssues = [];
  let govStats = { total: 0, hasDemPhoto: 0, hasRepPhoto: 0, hasDemBio: 0, hasRepBio: 0, hasRating: 0, tbd: 0 };
  
  for (const r of govRows) {
    govStats.total++;
    if (r.dem_photo) govStats.hasDemPhoto++;
    if (r.rep_photo) govStats.hasRepPhoto++;
    if (r.dem_bio) govStats.hasDemBio++;
    if (r.rep_bio) govStats.hasRepBio++;
    if (r.rating) govStats.hasRating++;
    
    const demIsTBD = !r.dem_candidate || r.dem_candidate.startsWith('TBD');
    const repIsTBD = !r.rep_candidate || r.rep_candidate.startsWith('TBD');
    if (demIsTBD) govStats.tbd++;
    if (repIsTBD) govStats.tbd++;
    
    if (!demIsTBD && !r.dem_photo) govIssues.push(r.state_code + ': ' + r.dem_candidate + ' (D) missing photo');
    if (!demIsTBD && !r.dem_bio) govIssues.push(r.state_code + ': ' + r.dem_candidate + ' (D) missing bio');
    if (!repIsTBD && !r.rep_photo) govIssues.push(r.state_code + ': ' + r.rep_candidate + ' (R) missing photo');
    if (!repIsTBD && !r.rep_bio) govIssues.push(r.state_code + ': ' + r.rep_candidate + ' (R) missing bio');
    if (!r.rating) govIssues.push(r.state_code + ': missing rating');
  }
  
  console.log('Total races:', govStats.total);
  console.log('GOVERNOR STATS:', JSON.stringify(govStats, null, 2));
  console.log('\nGOVERNOR ISSUES FOUND:', govIssues.length);
  govIssues.forEach(i => console.log('  -', i));

  // ===== HOUSE AUDIT =====
  console.log('\n\n=== HOUSE RACES FULL AUDIT ===');
  const [houseRows] = await conn.query('SELECT state_code, district_label, candidate1_name, candidate1_party, candidate1_photo, candidate1_bio, candidate2_name, candidate2_party, candidate2_photo, candidate2_bio, rating, incumbent, incumbent_party FROM house_races ORDER BY state_code, district_label');
  
  let houseIssues = [];
  let houseStats = { total: 0, hasC1Photo: 0, hasC2Photo: 0, hasC1Bio: 0, hasC2Bio: 0, hasRating: 0, hasIncumbent: 0, tbd: 0, noOpponent: 0 };
  
  for (const r of houseRows) {
    houseStats.total++;
    if (r.candidate1_photo) houseStats.hasC1Photo++;
    if (r.candidate2_photo) houseStats.hasC2Photo++;
    if (r.candidate1_bio) houseStats.hasC1Bio++;
    if (r.candidate2_bio) houseStats.hasC2Bio++;
    if (r.rating) houseStats.hasRating++;
    if (r.incumbent) houseStats.hasIncumbent++;
    
    const c1IsTBD = !r.candidate1_name || r.candidate1_name.startsWith('TBD') || r.candidate1_name === '';
    const c2IsTBD = !r.candidate2_name || r.candidate2_name.startsWith('TBD') || r.candidate2_name === '';
    if (c1IsTBD) houseStats.tbd++;
    if (c2IsTBD) houseStats.tbd++;
    if (!r.candidate2_name || r.candidate2_name === '') houseStats.noOpponent++;
    
    // Only flag confirmed candidates missing data
    if (!c1IsTBD && !r.candidate1_photo) houseIssues.push(r.state_code + '-' + r.district_label + ': ' + r.candidate1_name + ' missing photo');
    if (!c1IsTBD && !r.candidate1_bio) houseIssues.push(r.state_code + '-' + r.district_label + ': ' + r.candidate1_name + ' missing bio');
    if (!c2IsTBD && !r.candidate2_photo) houseIssues.push(r.state_code + '-' + r.district_label + ': ' + r.candidate2_name + ' missing photo');
    if (!c2IsTBD && !r.candidate2_bio) houseIssues.push(r.state_code + '-' + r.district_label + ': ' + r.candidate2_name + ' missing bio');
    if (!r.rating) houseIssues.push(r.state_code + '-' + r.district_label + ': missing rating');
  }
  
  console.log('Total races:', houseStats.total);
  console.log('HOUSE STATS:', JSON.stringify(houseStats, null, 2));
  console.log('\nHOUSE ISSUES (confirmed candidates only):', houseIssues.length);
  if (houseIssues.length > 0) {
    houseIssues.slice(0, 30).forEach(i => console.log('  -', i));
    if (houseIssues.length > 30) console.log('  ... and', houseIssues.length - 30, 'more');
  }

  // ===== REDISTRICTING AUDIT =====
  console.log('\n\n=== REDISTRICTING AUDIT ===');
  const [redistRows] = await conn.query('SELECT COUNT(*) as total FROM redistricting_updates');
  console.log('Total redistricting entries:', redistRows[0].total);

  // ===== REFERENDUMS AUDIT =====
  console.log('\n\n=== REFERENDUMS AUDIT ===');
  const [refRows] = await conn.query('SELECT COUNT(*) as total FROM referendums');
  console.log('Total referendums:', refRows[0].total);

  // ===== CALENDAR EVENTS AUDIT =====
  console.log('\n\n=== CALENDAR EVENTS AUDIT ===');
  const [calRows] = await conn.query('SELECT COUNT(*) as total FROM election_calendar');
  console.log('Total calendar events:', calRows[0].total);
  const [upcomingCal] = await conn.query("SELECT COUNT(*) as total FROM election_calendar WHERE event_date >= CURDATE()");
  console.log('Upcoming events:', upcomingCal[0].total);

  // ===== SENATORS (CURRENT) AUDIT =====
  console.log('\n\n=== CURRENT SENATORS AUDIT ===');
  const [senatorRows] = await conn.query('SELECT COUNT(*) as total FROM senators');
  console.log('Total senators:', senatorRows[0].total);

  // ===== HISTORICAL ATLAS AUDIT =====
  console.log('\n\n=== HISTORICAL ATLAS AUDIT ===');
  const [histRows] = await conn.query('SELECT COUNT(*) as total FROM historical_congress');
  console.log('Total historical congress entries:', histRows[0].total);

  // ===== SUMMARY =====
  console.log('\n\n========================================');
  console.log('=== FULL SITE VERIFICATION SUMMARY ===');
  console.log('========================================');
  console.log('World Elections:', worldStats.total, '| Issues:', worldIssues.length);
  console.log('Senate Races:', senateStats.total, '| Issues:', senateIssues.length);
  console.log('Governor Races:', govStats.total, '| Issues:', govIssues.length);
  console.log('House Races:', houseStats.total, '| Issues:', houseIssues.length);
  console.log('Redistricting:', redistRows[0].total, 'entries');
  console.log('Referendums:', refRows[0].total, 'entries');
  console.log('Calendar Events:', calRows[0].total, '(' + upcomingCal[0].total + ' upcoming)');
  console.log('Senators:', senatorRows[0].total);
  console.log('Historical Congress:', histRows[0].total);
  
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
