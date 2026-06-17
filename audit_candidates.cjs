const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("=== HOUSE RACES AUDIT ===\n");
  
  // House General races missing photos
  const [genMissing] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo, status
    FROM house_races 
    WHERE status = 'General' 
    AND (
      (candidate1_name IS NOT NULL AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = ''))
      OR (candidate2_name IS NOT NULL AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = ''))
    )
  `);
  console.log('House General races with named candidates but MISSING photos:', genMissing.length);
  if (genMissing.length > 0) {
    genMissing.forEach(r => console.log('  ', r.state_code + '-' + r.district, '|', r.candidate1_name, r.candidate1_photo ? '✓' : '❌', '|', r.candidate2_name, r.candidate2_photo ? '✓' : '❌'));
  }
  
  // House General races with TBD/null candidates
  const [genTBD] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, notes
    FROM house_races 
    WHERE status = 'General' 
    AND (candidate1_name = 'TBD' OR candidate2_name = 'TBD' OR candidate1_name IS NULL OR candidate2_name IS NULL)
  `);
  console.log('House General races with TBD/null candidates:', genTBD.length);
  if (genTBD.length > 0) {
    genTBD.forEach(r => console.log('  ', r.state_code + '-' + r.district, '| C1:', r.candidate1_name, '| C2:', r.candidate2_name, '| Notes:', (r.notes||'').substring(0,80)));
  }
  
  // House Called races missing photos
  const [calledMissing] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo
    FROM house_races 
    WHERE status = 'Called' 
    AND (
      (candidate1_name IS NOT NULL AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = ''))
      OR (candidate2_name IS NOT NULL AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = ''))
    )
  `);
  console.log('House Called races with MISSING photos:', calledMissing.length);
  if (calledMissing.length > 0) {
    calledMissing.forEach(r => console.log('  ', r.state_code + '-' + r.district, '|', r.candidate1_name, r.candidate1_photo ? '✓' : '❌', '|', r.candidate2_name, r.candidate2_photo ? '✓' : '❌'));
  }
  
  // House Scheduled/Primary with both candidates named
  const [schedBothNamed] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, status
    FROM house_races 
    WHERE status IN ('Scheduled', 'Primary')
    AND candidate1_name IS NOT NULL AND candidate1_name != 'TBD'
    AND candidate2_name IS NOT NULL AND candidate2_name != 'TBD'
  `);
  console.log('House Scheduled/Primary with BOTH candidates named (verify correct):', schedBothNamed.length);
  if (schedBothNamed.length > 0) {
    schedBothNamed.slice(0,20).forEach(r => console.log('  ', r.state_code + '-' + r.district, r.status, '|', r.candidate1_name, 'vs', r.candidate2_name));
    if (schedBothNamed.length > 20) console.log('  ... and', schedBothNamed.length - 20, 'more');
  }
  
  // House Primary Runoff
  const [runoffs] = await conn.query(`
    SELECT state_code, district, candidate1_name, candidate2_name, status, notes
    FROM house_races 
    WHERE status = 'Primary Runoff'
  `);
  console.log('House Primary Runoff races:', runoffs.length);
  runoffs.forEach(r => console.log('  ', r.state_code + '-' + r.district, '|', r.candidate1_name || 'TBD', 'vs', r.candidate2_name || 'TBD', '|', (r.notes||'').substring(0,60)));
  
  console.log("\n=== SENATE RACES AUDIT ===\n");
  
  // Senate General/Voting missing photos
  const [senMissing] = await conn.query(`
    SELECT state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo, status
    FROM senate_races 
    WHERE status IN ('General', 'Voting')
    AND (
      (candidate1_name IS NOT NULL AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = ''))
      OR (candidate2_name IS NOT NULL AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = ''))
    )
  `);
  console.log('Senate General/Voting with MISSING photos:', senMissing.length);
  if (senMissing.length > 0) {
    senMissing.forEach(r => console.log('  ', r.state_code, '|', r.candidate1_name, r.candidate1_photo ? '✓' : '❌', '|', r.candidate2_name, r.candidate2_photo ? '✓' : '❌'));
  }
  
  // Senate General/Voting with TBD
  const [senTBD] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status
    FROM senate_races 
    WHERE status IN ('General', 'Voting')
    AND (candidate1_name = 'TBD' OR candidate2_name = 'TBD' OR candidate1_name IS NULL OR candidate2_name IS NULL)
  `);
  console.log('Senate General/Voting with TBD/null:', senTBD.length);
  if (senTBD.length > 0) {
    senTBD.forEach(r => console.log('  ', r.state_code, r.status, '| C1:', r.candidate1_name, '| C2:', r.candidate2_name));
  }
  
  // Senate Runoff
  const [senRunoff] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status, notes
    FROM senate_races 
    WHERE status IN ('Primary Runoff', 'Runoff')
  `);
  console.log('Senate Runoff races:', senRunoff.length);
  senRunoff.forEach(r => console.log('  ', r.state_code, r.status, '|', r.candidate1_name || 'TBD', 'vs', r.candidate2_name || 'TBD', '|', (r.notes||'').substring(0,60)));
  
  // Senate Scheduled/Primary
  const [senSched] = await conn.query(`
    SELECT state_code, candidate1_name, candidate2_name, status
    FROM senate_races 
    WHERE status IN ('Scheduled', 'Primary')
  `);
  console.log('Senate Scheduled/Primary:', senSched.length);
  senSched.forEach(r => console.log('  ', r.state_code, r.status, '| C1:', r.candidate1_name || 'null', '| C2:', r.candidate2_name || 'null'));
  
  console.log("\n=== GOVERNOR RACES AUDIT ===\n");
  
  // Governor General/Voting missing photos
  const [govMissing] = await conn.query(`
    SELECT state_code, dem_candidate, dem_photo, rep_candidate, rep_photo, status
    FROM governor_races 
    WHERE status IN ('General', 'Voting')
    AND (
      (dem_candidate IS NOT NULL AND dem_candidate != 'TBD' AND (dem_photo IS NULL OR dem_photo = ''))
      OR (rep_candidate IS NOT NULL AND rep_candidate != 'TBD' AND (rep_photo IS NULL OR rep_photo = ''))
    )
  `);
  console.log('Governor General/Voting with MISSING photos:', govMissing.length);
  if (govMissing.length > 0) {
    govMissing.forEach(r => console.log('  ', r.state_code, '|', r.dem_candidate, r.dem_photo ? '✓' : '❌', '|', r.rep_candidate, r.rep_photo ? '✓' : '❌'));
  }
  
  // Governor General/Voting with TBD
  const [govTBD] = await conn.query(`
    SELECT state_code, dem_candidate, rep_candidate, status
    FROM governor_races 
    WHERE status IN ('General', 'Voting')
    AND (dem_candidate = 'TBD' OR rep_candidate = 'TBD' OR dem_candidate IS NULL OR rep_candidate IS NULL)
  `);
  console.log('Governor General/Voting with TBD/null:', govTBD.length);
  if (govTBD.length > 0) {
    govTBD.forEach(r => console.log('  ', r.state_code, r.status, '| D:', r.dem_candidate, '| R:', r.rep_candidate));
  }
  
  // Governor Runoff/Scheduled
  const [govOther] = await conn.query(`
    SELECT state_code, dem_candidate, rep_candidate, status
    FROM governor_races 
    WHERE status IN ('Primary Runoff', 'Runoff', 'Scheduled', 'Primary')
  `);
  console.log('Governor Runoff/Scheduled/Primary:', govOther.length);
  govOther.forEach(r => console.log('  ', r.state_code, r.status, '| D:', r.dem_candidate || 'TBD', '| R:', r.rep_candidate || 'TBD'));
  
  // Overall stats
  console.log("\n=== OVERALL STATUS BREAKDOWN ===\n");
  const [houseStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM house_races GROUP BY status ORDER BY cnt DESC');
  console.log('House (435 total):', houseStats.map(r => `${r.status}=${r.cnt}`).join(', '));
  const [senStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM senate_races GROUP BY status ORDER BY cnt DESC');
  console.log('Senate (35 total):', senStats.map(r => `${r.status}=${r.cnt}`).join(', '));
  const [govStats] = await conn.query('SELECT status, COUNT(*) as cnt FROM governor_races GROUP BY status ORDER BY cnt DESC');
  console.log('Governor (36 total):', govStats.map(r => `${r.status}=${r.cnt}`).join(', '));
  
  // Photo coverage summary
  console.log("\n=== PHOTO COVERAGE SUMMARY ===\n");
  const [housePhotos] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN candidate1_photo IS NOT NULL AND candidate1_photo != '' THEN 1 ELSE 0 END) as c1_photos,
      SUM(CASE WHEN candidate2_photo IS NOT NULL AND candidate2_photo != '' THEN 1 ELSE 0 END) as c2_photos
    FROM house_races WHERE status IN ('General', 'Called')
  `);
  console.log(`House (General+Called): ${housePhotos[0].total} races | C1 photos: ${housePhotos[0].c1_photos}/${housePhotos[0].total} | C2 photos: ${housePhotos[0].c2_photos}/${housePhotos[0].total}`);
  
  const [houseAllPhotos] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN candidate1_photo IS NOT NULL AND candidate1_photo != '' THEN 1 ELSE 0 END) as c1_photos,
      SUM(CASE WHEN candidate2_photo IS NOT NULL AND candidate2_photo != '' THEN 1 ELSE 0 END) as c2_photos
    FROM house_races
  `);
  console.log(`House (ALL 435): C1 photos: ${houseAllPhotos[0].c1_photos}/435 | C2 photos: ${houseAllPhotos[0].c2_photos}/435`);
  
  const [senPhotos] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN candidate1_photo IS NOT NULL AND candidate1_photo != '' THEN 1 ELSE 0 END) as c1_photos,
      SUM(CASE WHEN candidate2_photo IS NOT NULL AND candidate2_photo != '' THEN 1 ELSE 0 END) as c2_photos
    FROM senate_races WHERE status IN ('General', 'Voting')
  `);
  console.log(`Senate (General+Voting): ${senPhotos[0].total} races | C1 photos: ${senPhotos[0].c1_photos}/${senPhotos[0].total} | C2 photos: ${senPhotos[0].c2_photos}/${senPhotos[0].total}`);
  
  const [govPhotos] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN dem_photo IS NOT NULL AND dem_photo != '' THEN 1 ELSE 0 END) as dem_photos,
      SUM(CASE WHEN rep_photo IS NOT NULL AND rep_photo != '' THEN 1 ELSE 0 END) as rep_photos
    FROM governor_races WHERE status IN ('General', 'Voting')
  `);
  console.log(`Governor (General+Voting): ${govPhotos[0].total} races | D photos: ${govPhotos[0].dem_photos}/${govPhotos[0].total} | R photos: ${govPhotos[0].rep_photos}/${govPhotos[0].total}`);
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
