/**
 * Comprehensive Site-Wide Audit Script
 * Checks all data dimensions: House, Senate, Governor, World Elections
 * Reports strengths and weaknesses across photos, candidates, ratings, bios, etc.
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  const results = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HOUSE RACES (435 districts)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ HOUSE RACES AUDIT ═══");
  
  const [houseTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races");
  results.houseTotal = houseTotal[0].cnt;
  console.log(`Total House races: ${results.houseTotal}`);

  // Candidates populated
  const [houseC1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD'");
  const [houseC2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD'");
  results.houseCandidate1Filled = houseC1[0].cnt;
  results.houseCandidate2Filled = houseC2[0].cnt;
  console.log(`  Candidate 1 filled: ${results.houseCandidate1Filled}/${results.houseTotal}`);
  console.log(`  Candidate 2 filled: ${results.houseCandidate2Filled}/${results.houseTotal}`);

  // TBD candidates
  const [houseTBD1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_name = 'TBD'");
  const [houseTBD2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_name = 'TBD'");
  results.houseTBD1 = houseTBD1[0].cnt;
  results.houseTBD2 = houseTBD2[0].cnt;
  console.log(`  TBD Candidate 1: ${results.houseTBD1}`);
  console.log(`  TBD Candidate 2: ${results.houseTBD2}`);

  // Photos
  const [houseP1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_photo IS NOT NULL AND candidate1_photo != ''");
  const [houseP2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_photo IS NOT NULL AND candidate2_photo != ''");
  results.housePhoto1 = houseP1[0].cnt;
  results.housePhoto2 = houseP2[0].cnt;
  console.log(`  Candidate 1 photos: ${results.housePhoto1}/${results.houseTotal}`);
  console.log(`  Candidate 2 photos: ${results.housePhoto2}/${results.houseTotal}`);

  // Missing photos for named candidates (not TBD)
  const [houseMissingP1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = '')");
  const [houseMissingP2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = '')");
  results.houseMissingPhoto1 = houseMissingP1[0].cnt;
  results.houseMissingPhoto2 = houseMissingP2[0].cnt;
  console.log(`  Named candidates missing photo (slot 1): ${results.houseMissingPhoto1}`);
  console.log(`  Named candidates missing photo (slot 2): ${results.houseMissingPhoto2}`);

  // Bios
  const [houseB1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_bio IS NOT NULL AND candidate1_bio != ''");
  const [houseB2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_bio IS NOT NULL AND candidate2_bio != ''");
  results.houseBio1 = houseB1[0].cnt;
  results.houseBio2 = houseB2[0].cnt;
  console.log(`  Candidate 1 bios: ${results.houseBio1}/${results.houseTotal}`);
  console.log(`  Candidate 2 bios: ${results.houseBio2}/${results.houseTotal}`);

  // Ratings
  const [houseRated] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE rating IS NOT NULL AND rating != ''");
  results.houseRated = houseRated[0].cnt;
  console.log(`  Races with ratings: ${results.houseRated}/${results.houseTotal}`);

  // Incumbents
  const [houseIncumbent] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE incumbent IS NOT NULL AND incumbent != ''");
  results.houseIncumbent = houseIncumbent[0].cnt;
  console.log(`  Races with incumbent info: ${results.houseIncumbent}/${results.houseTotal}`);

  // Rating breakdown
  const [houseRatingBreakdown] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM house_races WHERE rating IS NOT NULL GROUP BY rating ORDER BY cnt DESC");
  console.log("  Rating breakdown:");
  for (const row of houseRatingBreakdown) {
    console.log(`    ${row.rating}: ${row.cnt}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SENATE RACES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ SENATE RACES AUDIT ═══");
  
  const [senateTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races");
  results.senateTotal = senateTotal[0].cnt;
  console.log(`Total Senate races: ${results.senateTotal}`);

  const [senateC1] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD'");
  const [senateC2] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD'");
  results.senateCandidate1 = senateC1[0].cnt;
  results.senateCandidate2 = senateC2[0].cnt;
  console.log(`  Candidate 1 filled: ${results.senateCandidate1}/${results.senateTotal}`);
  console.log(`  Candidate 2 filled: ${results.senateCandidate2}/${results.senateTotal}`);

  const [senateTBD1] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate1_name = 'TBD'");
  const [senateTBD2] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate2_name = 'TBD'");
  console.log(`  TBD Candidate 1: ${senateTBD1[0].cnt}`);
  console.log(`  TBD Candidate 2: ${senateTBD2[0].cnt}`);

  const [senateP1] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate1_photo IS NOT NULL AND candidate1_photo != ''");
  const [senateP2] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate2_photo IS NOT NULL AND candidate2_photo != ''");
  results.senatePhoto1 = senateP1[0].cnt;
  results.senatePhoto2 = senateP2[0].cnt;
  console.log(`  Candidate 1 photos: ${results.senatePhoto1}/${results.senateTotal}`);
  console.log(`  Candidate 2 photos: ${results.senatePhoto2}/${results.senateTotal}`);

  const [senateMissingP1] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = '')");
  const [senateMissingP2] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = '')");
  console.log(`  Named candidates missing photo (slot 1): ${senateMissingP1[0].cnt}`);
  console.log(`  Named candidates missing photo (slot 2): ${senateMissingP2[0].cnt}`);

  const [senateB1] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate1_bio IS NOT NULL AND candidate1_bio != ''");
  const [senateB2] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE candidate2_bio IS NOT NULL AND candidate2_bio != ''");
  console.log(`  Candidate 1 bios: ${senateB1[0].cnt}/${results.senateTotal}`);
  console.log(`  Candidate 2 bios: ${senateB2[0].cnt}/${results.senateTotal}`);

  const [senateRated] = await conn.execute("SELECT COUNT(*) as cnt FROM senate_races WHERE rating IS NOT NULL AND rating != ''");
  console.log(`  Races with ratings: ${senateRated[0].cnt}/${results.senateTotal}`);

  const [senateRatingBreakdown] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM senate_races WHERE rating IS NOT NULL GROUP BY rating ORDER BY cnt DESC");
  console.log("  Rating breakdown:");
  for (const row of senateRatingBreakdown) {
    console.log(`    ${row.rating}: ${row.cnt}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GOVERNOR RACES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ GOVERNOR RACES AUDIT ═══");
  
  const [govTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races");
  results.govTotal = govTotal[0].cnt;
  console.log(`Total Governor races: ${results.govTotal}`);

  const [govDem] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE dem_candidate IS NOT NULL AND dem_candidate != '' AND dem_candidate != 'TBD'");
  const [govRep] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE rep_candidate IS NOT NULL AND rep_candidate != '' AND rep_candidate != 'TBD'");
  console.log(`  Dem candidates filled: ${govDem[0].cnt}/${results.govTotal}`);
  console.log(`  Rep candidates filled: ${govRep[0].cnt}/${results.govTotal}`);

  const [govTBDDem] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE dem_candidate = 'TBD'");
  const [govTBDRep] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE rep_candidate = 'TBD'");
  console.log(`  TBD Dem: ${govTBDDem[0].cnt}`);
  console.log(`  TBD Rep: ${govTBDRep[0].cnt}`);

  const [govDP] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE dem_photo IS NOT NULL AND dem_photo != ''");
  const [govRP] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE rep_photo IS NOT NULL AND rep_photo != ''");
  console.log(`  Dem photos: ${govDP[0].cnt}/${results.govTotal}`);
  console.log(`  Rep photos: ${govRP[0].cnt}/${results.govTotal}`);

  const [govMissingDP] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE dem_candidate IS NOT NULL AND dem_candidate != '' AND dem_candidate != 'TBD' AND (dem_photo IS NULL OR dem_photo = '')");
  const [govMissingRP] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE rep_candidate IS NOT NULL AND rep_candidate != '' AND rep_candidate != 'TBD' AND (rep_photo IS NULL OR rep_photo = '')");
  console.log(`  Named Dem missing photo: ${govMissingDP[0].cnt}`);
  console.log(`  Named Rep missing photo: ${govMissingRP[0].cnt}`);

  const [govRated] = await conn.execute("SELECT COUNT(*) as cnt FROM governor_races WHERE rating IS NOT NULL AND rating != ''");
  console.log(`  Races with ratings: ${govRated[0].cnt}/${results.govTotal}`);

  const [govRatingBreakdown] = await conn.execute("SELECT rating, COUNT(*) as cnt FROM governor_races WHERE rating IS NOT NULL GROUP BY rating ORDER BY cnt DESC");
  console.log("  Rating breakdown:");
  for (const row of govRatingBreakdown) {
    console.log(`    ${row.rating}: ${row.cnt}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WORLD ELECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ WORLD ELECTIONS AUDIT ═══");
  
  const [worldTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections");
  const [worldUpcoming] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE status = 'Upcoming'");
  const [worldCompleted] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE status = 'Completed'");
  console.log(`Total World elections: ${worldTotal[0].cnt}`);
  console.log(`  Upcoming: ${worldUpcoming[0].cnt}`);
  console.log(`  Completed: ${worldCompleted[0].cnt}`);

  const [worldPolling] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE polling_data IS NOT NULL AND polling_data != ''");
  const [worldKeyIssues] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE key_issues IS NOT NULL AND key_issues != ''");
  const [worldCandidates] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE candidates IS NOT NULL AND candidates != ''");
  console.log(`  With polling data: ${worldPolling[0].cnt}/${worldTotal[0].cnt}`);
  console.log(`  With key issues: ${worldKeyIssues[0].cnt}/${worldTotal[0].cnt}`);
  console.log(`  With candidates: ${worldCandidates[0].cnt}/${worldTotal[0].cnt}`);

  // Upcoming elections detail
  const [worldUpcomingMissingPolling] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE status = 'Upcoming' AND (polling_data IS NULL OR polling_data = '')");
  const [worldUpcomingMissingIssues] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE status = 'Upcoming' AND (key_issues IS NULL OR key_issues = '')");
  const [worldUpcomingMissingCandidates] = await conn.execute("SELECT COUNT(*) as cnt FROM world_elections WHERE status = 'Upcoming' AND (candidates IS NULL OR candidates = '')");
  console.log(`  Upcoming missing polling: ${worldUpcomingMissingPolling[0].cnt}`);
  console.log(`  Upcoming missing key issues: ${worldUpcomingMissingIssues[0].cnt}`);
  console.log(`  Upcoming missing candidates: ${worldUpcomingMissingCandidates[0].cnt}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. REDISTRICTING STATES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ REDISTRICTING AUDIT ═══");
  const [redistTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM redistricting_states");
  const [redistWithMap] = await conn.execute("SELECT COUNT(*) as cnt FROM redistricting_states WHERE map_url IS NOT NULL AND map_url != ''");
  const [redistWithStatus] = await conn.execute("SELECT COUNT(*) as cnt FROM redistricting_states WHERE status IS NOT NULL AND status != ''");
  console.log(`Total redistricting states: ${redistTotal[0].cnt}`);
  console.log(`  With map URL: ${redistWithMap[0].cnt}`);
  console.log(`  With status: ${redistWithStatus[0].cnt}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. REFERENDUMS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ REFERENDUMS AUDIT ═══");
  const [refTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM referendums");
  console.log(`Total referendums: ${refTotal[0].cnt}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SENATORS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ SENATORS TABLE AUDIT ═══");
  const [senTotal] = await conn.execute("SELECT COUNT(*) as cnt FROM senators");
  const [senWithPhoto] = await conn.execute("SELECT COUNT(*) as cnt FROM senators WHERE photo_url IS NOT NULL AND photo_url != ''");
  const [senMissingPhoto] = await conn.execute("SELECT COUNT(*) as cnt FROM senators WHERE photo_url IS NULL OR photo_url = ''");
  console.log(`Total senators: ${senTotal[0].cnt}`);
  console.log(`  With photo: ${senWithPhoto[0].cnt}`);
  console.log(`  Missing photo: ${senMissingPhoto[0].cnt}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PHOTO QUALITY CHECK - Detect non-S3 photos (old/broken URLs)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ PHOTO URL QUALITY ═══");
  const [houseS3_1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_photo LIKE '%cloudfront%' OR candidate1_photo LIKE '%manus-storage%'");
  const [houseS3_2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_photo LIKE '%cloudfront%' OR candidate2_photo LIKE '%manus-storage%'");
  const [houseOther1] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate1_photo IS NOT NULL AND candidate1_photo != '' AND candidate1_photo NOT LIKE '%cloudfront%' AND candidate1_photo NOT LIKE '%manus-storage%'");
  const [houseOther2] = await conn.execute("SELECT COUNT(*) as cnt FROM house_races WHERE candidate2_photo IS NOT NULL AND candidate2_photo != '' AND candidate2_photo NOT LIKE '%cloudfront%' AND candidate2_photo NOT LIKE '%manus-storage%'");
  console.log(`House photos on S3/CDN (slot 1): ${houseS3_1[0].cnt}`);
  console.log(`House photos on S3/CDN (slot 2): ${houseS3_2[0].cnt}`);
  console.log(`House photos from external URLs (slot 1): ${houseOther1[0].cnt}`);
  console.log(`House photos from external URLs (slot 2): ${houseOther2[0].cnt}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. OVERALL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("═══ OVERALL SITE HEALTH SUMMARY ═══");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const totalCandidateSlots = results.houseTotal * 2;
  const totalHousePhotos = results.housePhoto1 + results.housePhoto2;
  const totalHouseMissingPhotos = results.houseMissingPhoto1 + results.houseMissingPhoto2;
  
  console.log(`\nHOUSE: ${results.houseTotal} races`);
  console.log(`  Candidate coverage: ${results.houseCandidate1Filled + results.houseCandidate2Filled}/${totalCandidateSlots} slots filled (${Math.round((results.houseCandidate1Filled + results.houseCandidate2Filled)/totalCandidateSlots*100)}%)`);
  console.log(`  Photo coverage: ${totalHousePhotos}/${totalCandidateSlots} (${Math.round(totalHousePhotos/totalCandidateSlots*100)}%)`);
  console.log(`  Named candidates without photos: ${totalHouseMissingPhotos}`);
  console.log(`  TBD candidates remaining: ${results.houseTBD1 + results.houseTBD2}`);
  console.log(`  Bio coverage: ${results.houseBio1 + results.houseBio2}/${totalCandidateSlots} (${Math.round((results.houseBio1 + results.houseBio2)/totalCandidateSlots*100)}%)`);
  console.log(`  Rating coverage: ${results.houseRated}/${results.houseTotal} (${Math.round(results.houseRated/results.houseTotal*100)}%)`);

  // List districts with TBD candidates
  const [tbdDistricts] = await conn.execute("SELECT state_code, district, candidate1_name, candidate2_name FROM house_races WHERE candidate1_name = 'TBD' OR candidate2_name = 'TBD' ORDER BY state_code, district");
  if (tbdDistricts.length > 0) {
    console.log(`\n  TBD Districts (${tbdDistricts.length}):`);
    for (const d of tbdDistricts) {
      const tbd1 = d.candidate1_name === 'TBD' ? 'C1=TBD' : '';
      const tbd2 = d.candidate2_name === 'TBD' ? 'C2=TBD' : '';
      console.log(`    ${d.state_code}-${d.district}: ${[tbd1, tbd2].filter(Boolean).join(', ')}`);
    }
  }

  // List named candidates missing photos
  const [missingPhotoList] = await conn.execute(`
    SELECT state_code, district, 
      CASE WHEN candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = '') THEN candidate1_name ELSE NULL END as missing1,
      CASE WHEN candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = '') THEN candidate2_name ELSE NULL END as missing2
    FROM house_races 
    WHERE (candidate1_name IS NOT NULL AND candidate1_name != '' AND candidate1_name != 'TBD' AND (candidate1_photo IS NULL OR candidate1_photo = ''))
       OR (candidate2_name IS NOT NULL AND candidate2_name != '' AND candidate2_name != 'TBD' AND (candidate2_photo IS NULL OR candidate2_photo = ''))
    ORDER BY state_code, district
  `);
  if (missingPhotoList.length > 0) {
    console.log(`\n  House candidates missing photos (${missingPhotoList.length} races):`);
    for (const d of missingPhotoList.slice(0, 30)) {
      const names = [d.missing1, d.missing2].filter(Boolean).join(', ');
      console.log(`    ${d.state_code}-${d.district}: ${names}`);
    }
    if (missingPhotoList.length > 30) console.log(`    ... and ${missingPhotoList.length - 30} more`);
  }

  await conn.end();
  console.log("\n\nAudit complete.");
}

main().catch(console.error);
