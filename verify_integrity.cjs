const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== VERIFICATION: Checking for unwanted AP changes ===\n');
  
  // 1. Check that no General races lost their candidates
  const [genLost] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, status
    FROM house_races WHERE status = 'General'
    AND candidate1_name IS NOT NULL AND candidate2_name IS NOT NULL
    AND (candidate1_name LIKE '%TBD%' OR candidate2_name LIKE '%TBD%')
  `);
  console.log('General House races reverted to TBD:', genLost.length);
  if (genLost.length > 0) genLost.forEach(r => console.log('  WARNING', r.state_code+'-'+r.district, r.candidate1_name, 'vs', r.candidate2_name));
  
  // 2. Check Senate General races still intact
  const [senGen] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status
    FROM senate_races WHERE status = 'General'
  `);
  console.log('Senate General races (should be 18):', senGen.length);
  const senBroken = senGen.filter(r => !r.candidate1_name || r.candidate1_name === 'TBD');
  if (senBroken.length > 0) {
    console.log('  WARNING Senate General races with missing C1:');
    senBroken.forEach(r => console.log('    ', r.state_code, r.candidate1_name, 'vs', r.candidate2_name));
  } else {
    console.log('  OK All Senate General races have candidates intact');
  }
  
  // 3. Check Governor Voting races still intact
  const [govVoting] = await conn.query(`
    SELECT state_code, dem_candidate, rep_candidate, status
    FROM governor_races WHERE status = 'Voting'
  `);
  console.log('Governor Voting races (should be 13):', govVoting.length);
  const govBroken = govVoting.filter(r => !r.dem_candidate || !r.rep_candidate);
  if (govBroken.length > 0) {
    console.log('  WARNING Governor Voting races with missing candidates:');
    govBroken.forEach(r => console.log('    ', r.state_code, r.dem_candidate, 'vs', r.rep_candidate));
  } else {
    console.log('  OK All Governor Voting races have candidates intact');
  }
  
  // 4. Check AP_LOCK races weren't touched
  const [locked] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, status, notes
    FROM house_races WHERE notes LIKE '%AP_LOCK%'
  `);
  console.log('AP_LOCK House races:', locked.length);
  locked.forEach(r => console.log('  ', r.state_code+'-'+r.district, r.status, '|', r.candidate1_name||'TBD', 'vs', r.candidate2_name||'TBD'));
  
  const [senLocked] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status, notes
    FROM senate_races WHERE notes LIKE '%AP_LOCK%'
  `);
  console.log('AP_LOCK Senate races:', senLocked.length);
  senLocked.forEach(r => console.log('  ', r.state_code, r.status, '|', r.candidate1_name||'TBD', 'vs', r.candidate2_name||'TBD'));
  
  // 5. Check Primary Runoff races weren't overwritten
  const [runoffs] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, status
    FROM house_races WHERE status = 'Primary Runoff'
  `);
  console.log('House Primary Runoff (should be 6):', runoffs.length);
  runoffs.forEach(r => console.log('  ', r.state_code+'-'+r.district, '|', r.candidate1_name||'TBD', 'vs', r.candidate2_name||'TBD'));
  
  const [senRunoff] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status
    FROM senate_races WHERE status = 'Primary Runoff'
  `);
  console.log('Senate Primary Runoff (should be 3):', senRunoff.length);
  senRunoff.forEach(r => console.log('  ', r.state_code, '|', r.candidate1_name||'TBD', 'vs', r.candidate2_name||'TBD'));
  
  const [govRunoff] = await conn.query(`
    SELECT state_code, dem_candidate, rep_candidate, status
    FROM governor_races WHERE status = 'Primary Runoff'
  `);
  console.log('Governor Primary Runoff (should be 3):', govRunoff.length);
  govRunoff.forEach(r => console.log('  ', r.state_code, '|', r.dem_candidate||'TBD', 'vs', r.rep_candidate||'TBD'));
  
  // 6. Check status breakdown hasn't shifted unexpectedly
  console.log('\n=== STATUS COUNTS (compare to pre-AP baseline) ===');
  console.log('Expected: House General=196, Scheduled=190, Primary=38, Runoff=6, Called=5');
  console.log('Expected: Senate General=18, Scheduled=14, Primary Runoff=3');
  console.log('Expected: Governor Scheduled=20, Voting=13, Primary Runoff=3');
  console.log('');
  const [hStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM house_races GROUP BY status ORDER BY cnt DESC');
  console.log('Actual House:', hStats.map(r => r.status+'='+r.cnt).join(', '));
  const [sStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM senate_races GROUP BY status ORDER BY cnt DESC');
  console.log('Actual Senate:', sStats.map(r => r.status+'='+r.cnt).join(', '));
  const [gStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM governor_races GROUP BY status ORDER BY cnt DESC');
  console.log('Actual Governor:', gStats.map(r => r.status+'='+r.cnt).join(', '));
  
  // 7. Spot checks on manually curated races
  console.log('\n=== SPOT CHECKS (manually curated races) ===');
  const [ca27] = await conn.query(`SELECT candidate1_name, candidate1_party, candidate2_name, candidate2_party FROM house_races WHERE state_code='CA' AND district=27`);
  const ca = ca27[0];
  console.log('CA-27:', ca ? `${ca.candidate1_name} (${ca.candidate1_party}) vs ${ca.candidate2_name} (${ca.candidate2_party})` : 'NOT FOUND');
  console.log('  Expected: George Whitesides (D) vs Mike Garcia (R) or similar');
  
  const [nvGov] = await conn.query(`SELECT dem_candidate, rep_candidate, status FROM governor_races WHERE state_code='NV'`);
  const nv = nvGov[0];
  console.log('NV Gov:', nv ? `${nv.dem_candidate} vs ${nv.rep_candidate} [${nv.status}]` : 'NOT FOUND');
  
  const [gasen] = await conn.query(`SELECT candidate1_name, candidate2_name, status FROM senate_races WHERE state_code='GA'`);
  const ga = gasen[0];
  console.log('GA Senate:', ga ? `${ga.candidate1_name} vs ${ga.candidate2_name} [${ga.status}]` : 'NOT FOUND');
  
  const [alsen] = await conn.query(`SELECT candidate1_name, candidate2_name, status FROM senate_races WHERE state_code='AL'`);
  const al = alsen[0];
  console.log('AL Senate:', al ? `${al.candidate1_name} vs ${al.candidate2_name} [${al.status}]` : 'NOT FOUND');
  
  const [oksen] = await conn.query(`SELECT candidate1_name, candidate2_name, status FROM senate_races WHERE state_code='OK'`);
  const ok = oksen[0];
  console.log('OK Senate:', ok ? `${ok.candidate1_name} vs ${ok.candidate2_name} [${ok.status}]` : 'NOT FOUND');
  
  // 8. Photo coverage still intact
  console.log('\n=== PHOTO COVERAGE (should match pre-AP baseline) ===');
  const [hPhotos] = await conn.query(`
    SELECT 
      SUM(CASE WHEN status IN ('General','Called') AND candidate1_name IS NOT NULL AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = '') THEN 1 ELSE 0 END) as c1_missing,
      SUM(CASE WHEN status IN ('General','Called') AND candidate2_name IS NOT NULL AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = '') THEN 1 ELSE 0 END) as c2_missing
    FROM house_races
  `);
  console.log('House General/Called missing photos: C1=' + hPhotos[0].c1_missing + ', C2=' + hPhotos[0].c2_missing + ' (should both be 0)');
  
  const [sPhotos] = await conn.query(`
    SELECT 
      SUM(CASE WHEN status IN ('General','Voting') AND candidate1_name IS NOT NULL AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = '') THEN 1 ELSE 0 END) as c1_missing,
      SUM(CASE WHEN status IN ('General','Voting') AND candidate2_name IS NOT NULL AND candidate2_name != 'TBD' AND candidate2_name NOT LIKE 'No R%' AND (candidate2_photo IS NULL OR candidate2_photo = '') THEN 1 ELSE 0 END) as c2_missing
    FROM senate_races
  `);
  console.log('Senate General/Voting missing photos: C1=' + sPhotos[0].c1_missing + ', C2=' + sPhotos[0].c2_missing + ' (should both be 0)');
  
  const [gPhotos] = await conn.query(`
    SELECT 
      SUM(CASE WHEN status = 'Voting' AND dem_candidate IS NOT NULL AND dem_candidate != 'TBD' AND (dem_photo IS NULL OR dem_photo = '') THEN 1 ELSE 0 END) as d_missing,
      SUM(CASE WHEN status = 'Voting' AND rep_candidate IS NOT NULL AND rep_candidate != 'TBD' AND (rep_photo IS NULL OR rep_photo = '') THEN 1 ELSE 0 END) as r_missing
    FROM governor_races
  `);
  console.log('Governor Voting missing photos: D=' + gPhotos[0].d_missing + ', R=' + gPhotos[0].r_missing + ' (should both be 0)');
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
