import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Senate audit
console.log('=== SENATE RACES (35) ===');
const [s1] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE rating IS NOT NULL AND rating != ''`);
console.log('With ratings: ' + s1[0].c);
const [s2] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%'`);
console.log('Confirmed C1: ' + s2[0].c);
const [s3] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%' AND (candidate1_photo IS NULL OR candidate1_photo = '')`);
console.log('Confirmed C1 missing photo: ' + s3[0].c);
const [s4] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%'`);
console.log('Confirmed C2: ' + s4[0].c);
const [s5] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%' AND (candidate2_photo IS NULL OR candidate2_photo = '')`);
console.log('Confirmed C2 missing photo: ' + s5[0].c);
const [s6] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate1_bio IS NOT NULL AND candidate1_bio != ''`);
console.log('With C1 bio: ' + s6[0].c);
const [s7] = await conn.query(`SELECT COUNT(*) as c FROM senate_races WHERE candidate2_bio IS NOT NULL AND candidate2_bio != ''`);
console.log('With C2 bio: ' + s7[0].c);
const [s8] = await conn.query(`SELECT state_code, candidate1_name, candidate2_name FROM senate_races WHERE candidate1_name LIKE 'TBD%' OR candidate2_name LIKE 'TBD%'`);
console.log('TBD slots: ' + s8.length);
s8.forEach(r => console.log('  ' + r.state_code + ': C1=' + (r.candidate1_name||'').substring(0,30) + ' | C2=' + (r.candidate2_name||'').substring(0,30)));

// Governor audit
console.log('\n=== GOVERNOR RACES (36) ===');
const [g1] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE rating IS NOT NULL AND rating != ''`);
console.log('With ratings: ' + g1[0].c);
const [g2] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE dem_candidate IS NOT NULL AND dem_candidate != '' AND dem_candidate NOT LIKE 'TBD%'`);
console.log('Confirmed Dem: ' + g2[0].c);
const [g3] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE dem_candidate IS NOT NULL AND dem_candidate != '' AND dem_candidate NOT LIKE 'TBD%' AND (dem_photo IS NULL OR dem_photo = '')`);
console.log('Confirmed Dem missing photo: ' + g3[0].c);
const [g4] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE rep_candidate IS NOT NULL AND rep_candidate != '' AND rep_candidate NOT LIKE 'TBD%'`);
console.log('Confirmed Rep: ' + g4[0].c);
const [g5] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE rep_candidate IS NOT NULL AND rep_candidate != '' AND rep_candidate NOT LIKE 'TBD%' AND (rep_photo IS NULL OR rep_photo = '')`);
console.log('Confirmed Rep missing photo: ' + g5[0].c);
const [g6] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE dem_bio IS NOT NULL AND dem_bio != ''`);
console.log('With Dem bio: ' + g6[0].c);
const [g7] = await conn.query(`SELECT COUNT(*) as c FROM governor_races WHERE rep_bio IS NOT NULL AND rep_bio != ''`);
console.log('With Rep bio: ' + g7[0].c);
const [g8] = await conn.query(`SELECT state_code, dem_candidate, rep_candidate FROM governor_races WHERE dem_candidate LIKE 'TBD%' OR rep_candidate LIKE 'TBD%'`);
console.log('TBD slots: ' + g8.length);
g8.forEach(r => console.log('  ' + r.state_code + ': D=' + (r.dem_candidate||'').substring(0,30) + ' | R=' + (r.rep_candidate||'').substring(0,30)));

// World Elections audit
console.log('\n=== WORLD ELECTIONS (39) ===');
const [w1] = await conn.query(`SELECT COUNT(*) as c FROM world_elections WHERE status = 'upcoming'`);
console.log('Upcoming: ' + w1[0].c);
const [w2] = await conn.query(`SELECT COUNT(*) as c FROM world_elections WHERE status = 'completed'`);
console.log('Completed: ' + w2[0].c);
const [w3] = await conn.query(`SELECT COUNT(*) as c FROM world_elections WHERE candidates IS NOT NULL AND candidates != '' AND candidates != '[]'`);
console.log('With candidates: ' + w3[0].c);
const [w4] = await conn.query(`SELECT COUNT(*) as c FROM world_elections WHERE polling_data IS NOT NULL AND polling_data != '' AND polling_data != '[]' AND polling_data != '{}'`);
console.log('With polling data: ' + w4[0].c);
const [w5] = await conn.query(`SELECT COUNT(*) as c FROM world_elections WHERE key_issues IS NOT NULL AND key_issues != '' AND key_issues != '[]'`);
console.log('With key issues: ' + w5[0].c);
const [w6] = await conn.query(`SELECT country, status, CASE WHEN candidates IS NULL OR candidates = '' OR candidates = '[]' THEN 'NO' ELSE 'YES' END as has_candidates, CASE WHEN polling_data IS NULL OR polling_data = '' OR polling_data = '[]' OR polling_data = '{}' THEN 'NO' ELSE 'YES' END as has_polls, CASE WHEN key_issues IS NULL OR key_issues = '' OR key_issues = '[]' THEN 'NO' ELSE 'YES' END as has_issues FROM world_elections WHERE status = 'upcoming' ORDER BY election_date`);
console.log('\nUpcoming elections detail:');
w6.forEach(r => console.log('  ' + r.country.padEnd(20) + ' cand:' + r.has_candidates + ' polls:' + r.has_polls + ' issues:' + r.has_issues));

// House bios check (using LIKE 'TBD%' to exclude TBD)
console.log('\n=== HOUSE BIOS ===');
const [hb1] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%'`);
const [hb2] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%' AND (candidate1_bio IS NULL OR candidate1_bio = '')`);
console.log('Confirmed C1 total: ' + hb1[0].c + ', missing bio: ' + hb2[0].c);
const [hb3] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%'`);
const [hb4] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%' AND (candidate2_bio IS NULL OR candidate2_bio = '')`);
console.log('Confirmed C2 total: ' + hb3[0].c + ', missing bio: ' + hb4[0].c);

// House photos check (using LIKE 'TBD%' to exclude TBD)
console.log('\n=== HOUSE PHOTOS (CORRECTED) ===');
const [hp1] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%'`);
const [hp2] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name NOT LIKE 'TBD%' AND (candidate1_photo IS NULL OR candidate1_photo = '')`);
console.log('Confirmed C1 total: ' + hp1[0].c + ', missing photo: ' + hp2[0].c);
const [hp3] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%'`);
const [hp4] = await conn.query(`SELECT COUNT(*) as c FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name NOT LIKE 'TBD%' AND (candidate2_photo IS NULL OR candidate2_photo = '')`);
console.log('Confirmed C2 total: ' + hp3[0].c + ', missing photo: ' + hp4[0].c);

await conn.end();
