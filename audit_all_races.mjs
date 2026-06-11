import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// 2026 Primary dates by state (completed as of June 10, 2026)
const completedPrimaries = {
  // March 2026
  'TX': '2026-03-03', 'NC': '2026-03-03', 'AR': '2026-03-03',
  'MS': '2026-03-10',
  'IL': '2026-03-17',
  // April 2026
  'WI': '2026-04-07',
  // May 2026
  'OH': '2026-05-05', 'IN': '2026-05-05',
  'NE': '2026-05-12', 'WV': '2026-05-12', 'ID': '2026-05-19',
  'KY': '2026-05-19', 'OR': '2026-05-19', 'PA': '2026-05-19',
  'GA': '2026-05-19', // GA primary May 19, runoff Jun 16
  'AL': '2026-05-26', // AL primary May 26, runoff Jun 16
  'MT': '2026-06-02', 'NM': '2026-06-02', 'CA': '2026-06-02',
  'IA': '2026-06-02', 'SD': '2026-06-02', 'NJ': '2026-06-02',
  // June 9, 2026
  'SC': '2026-06-09', 'NV': '2026-06-09', 'ME': '2026-06-09', 'ND': '2026-06-09',
};

// Upcoming primaries (after June 10, 2026)
const upcomingPrimaries = {
  'VA': '2026-06-16', 'OK': '2026-06-16', 'DC': '2026-06-16',
  'GA_RUNOFF': '2026-06-16', 'AL_RUNOFF': '2026-06-16',
  'NY': '2026-06-23',
  'CO': '2026-06-24', 'UT': '2026-06-24',
  'LA': '2026-06-27', // Jungle primary runoff
  'MD': '2026-06-30',
  'KS': '2026-08-04', 'MI': '2026-08-04', 'MO': '2026-08-04', 'WA': '2026-08-04', 'TN': '2026-08-04',
  'HI': '2026-08-08',
  'CT': '2026-08-11', 'MN': '2026-08-11', 'WI_SPECIAL': '2026-08-11', 'VT': '2026-08-11',
  'AK': '2026-08-18', 'WY': '2026-08-18', 'FL': '2026-08-18',
  'AZ': '2026-08-25',
  'MA': '2026-09-01',
  'NH': '2026-09-08', 'RI': '2026-09-08', 'DE': '2026-09-08',
};

async function audit() {
  const db = await getDb();
  // Get all Senate races
  const [senateRows] = await db.execute(sql`SELECT * FROM senate_races ORDER BY state_code`);
  
  // Get all House races  
  const [houseRows] = await db.execute(sql`SELECT * FROM house_races ORDER BY state_code, district`);
  
  // Get all Governor races
  const [govRows] = await db.execute(sql`SELECT * FROM governor_races ORDER BY state_code`);

  const results = {
    senate: { primaryDone_bothConfirmed: [], primaryDone_needsPhoto: [], primaryPending_incumbentNeeds: [], primaryPending_hasWrongData: [] },
    house: { primaryDone_bothConfirmed: [], primaryDone_needsPhoto: [], primaryPending_incumbentNeeds: [], primaryPending_hasWrongData: [] },
    governor: { primaryDone_bothConfirmed: [], primaryDone_needsPhoto: [], primaryPending_incumbentNeeds: [], primaryPending_hasWrongData: [] }
  };

  // Audit Senate
  for (const race of senateRows) {
    const state = race.state_code;
    const primaryDone = completedPrimaries[state] !== undefined;
    const hasBothCandidates = race.candidate1_name && race.candidate2_name && 
      !race.candidate1_name.includes('TBD') && !race.candidate2_name.includes('TBD');
    const hasPhoto1 = !!race.candidate1_photo;
    const hasPhoto2 = !!race.candidate2_photo;
    
    if (primaryDone && hasBothCandidates) {
      if (!hasPhoto1 || !hasPhoto2) {
        results.senate.primaryDone_needsPhoto.push({
          state, candidate1: race.candidate1_name, candidate2: race.candidate2_name,
          hasPhoto1, hasPhoto2, incumbent: race.incumbent_name, status: race.status
        });
      } else {
        results.senate.primaryDone_bothConfirmed.push({ state, candidate1: race.candidate1_name, candidate2: race.candidate2_name });
      }
    } else if (!primaryDone) {
      // Check if non-incumbent side incorrectly has a named candidate
      const incumbent = race.incumbent_name;
      const isCandidate1Incumbent = race.candidate1_name === incumbent;
      const nonIncumbentSide = isCandidate1Incumbent ? 'candidate2' : 'candidate1';
      const nonIncumbentName = isCandidate1Incumbent ? race.candidate2_name : race.candidate1_name;
      
      if (nonIncumbentName && !nonIncumbentName.includes('TBD')) {
        results.senate.primaryPending_hasWrongData.push({
          state, incumbent, nonIncumbentSide, nonIncumbentName,
          primaryDate: upcomingPrimaries[state] || 'UNKNOWN',
          status: race.status
        });
      }
      
      // Check if incumbent needs photo
      const incumbentPhotoField = isCandidate1Incumbent ? 'candidate1_photo' : 'candidate2_photo';
      const incumbentHasPhoto = isCandidate1Incumbent ? hasPhoto1 : hasPhoto2;
      if (!incumbentHasPhoto && incumbent) {
        results.senate.primaryPending_incumbentNeeds.push({
          state, incumbent, primaryDate: upcomingPrimaries[state] || 'UNKNOWN'
        });
      }
    }
  }

  // Audit House
  for (const race of houseRows) {
    const state = race.state_code;
    const primaryDone = completedPrimaries[state] !== undefined;
    const hasBothCandidates = race.candidate1_name && race.candidate2_name && 
      !race.candidate1_name.includes('TBD') && !race.candidate2_name.includes('TBD');
    const hasPhoto1 = !!race.candidate1_photo;
    const hasPhoto2 = !!race.candidate2_photo;
    const district = race.district || 'AL';
    
    if (primaryDone && hasBothCandidates) {
      if (!hasPhoto1 || !hasPhoto2) {
        results.house.primaryDone_needsPhoto.push({
          state, district, candidate1: race.candidate1_name, candidate2: race.candidate2_name,
          hasPhoto1, hasPhoto2, incumbent: race.incumbent_name, status: race.status, rating: race.rating
        });
      } else {
        results.house.primaryDone_bothConfirmed.push({ state, district });
      }
    } else if (!primaryDone) {
      const incumbent = race.incumbent_name;
      const isCandidate1Incumbent = race.candidate1_name === incumbent;
      const nonIncumbentSide = isCandidate1Incumbent ? 'candidate2' : 'candidate1';
      const nonIncumbentName = isCandidate1Incumbent ? race.candidate2_name : race.candidate1_name;
      
      if (nonIncumbentName && !nonIncumbentName.includes('TBD')) {
        results.house.primaryPending_hasWrongData.push({
          state, district, incumbent, nonIncumbentSide, nonIncumbentName,
          primaryDate: upcomingPrimaries[state] || 'UNKNOWN'
        });
      }
      
      const incumbentHasPhoto = isCandidate1Incumbent ? hasPhoto1 : hasPhoto2;
      if (!incumbentHasPhoto && incumbent && !incumbent.includes('Open Seat') && !incumbent.includes('VACANT')) {
        results.house.primaryPending_incumbentNeeds.push({
          state, district, incumbent, primaryDate: upcomingPrimaries[state] || 'UNKNOWN'
        });
      }
    }
  }

  // Audit Governor
  for (const race of govRows) {
    const state = race.state_code;
    const primaryDone = completedPrimaries[state] !== undefined;
    const hasBothCandidates = race.candidate1_name && race.candidate2_name && 
      !race.candidate1_name.includes('TBD') && !race.candidate2_name.includes('TBD');
    const hasPhoto1 = !!race.candidate1_photo;
    const hasPhoto2 = !!race.candidate2_photo;
    
    if (primaryDone && hasBothCandidates) {
      if (!hasPhoto1 || !hasPhoto2) {
        results.governor.primaryDone_needsPhoto.push({
          state, candidate1: race.candidate1_name, candidate2: race.candidate2_name,
          hasPhoto1, hasPhoto2, incumbent: race.incumbent_name, status: race.status
        });
      } else {
        results.governor.primaryDone_bothConfirmed.push({ state, candidate1: race.candidate1_name, candidate2: race.candidate2_name });
      }
    } else if (!primaryDone) {
      const incumbent = race.incumbent_name;
      const isCandidate1Incumbent = race.candidate1_name === incumbent;
      const nonIncumbentName = isCandidate1Incumbent ? race.candidate2_name : race.candidate1_name;
      
      if (nonIncumbentName && !nonIncumbentName.includes('TBD')) {
        results.governor.primaryPending_hasWrongData.push({
          state, incumbent, nonIncumbentName,
          primaryDate: upcomingPrimaries[state] || 'UNKNOWN'
        });
      }
      
      const incumbentHasPhoto = isCandidate1Incumbent ? hasPhoto1 : hasPhoto2;
      if (!incumbentHasPhoto && incumbent && !incumbent.includes('Open') && !incumbent.includes('Term')) {
        results.governor.primaryPending_incumbentNeeds.push({
          state, incumbent, primaryDate: upcomingPrimaries[state] || 'UNKNOWN'
        });
      }
    }
  }

  // Output results
  const output = JSON.stringify(results, null, 2);
  fs.writeFileSync('/tmp/audit_results.json', output);
  
  console.log('\n=== AUDIT SUMMARY ===');
  console.log('\nSENATE:');
  console.log(`  Primary done, both confirmed, HAVE photos: ${results.senate.primaryDone_bothConfirmed.length}`);
  console.log(`  Primary done, both confirmed, NEED photos: ${results.senate.primaryDone_needsPhoto.length}`);
  console.log(`  Primary pending, incumbent needs photo: ${results.senate.primaryPending_incumbentNeeds.length}`);
  console.log(`  Primary pending, has WRONG data (non-TBD): ${results.senate.primaryPending_hasWrongData.length}`);
  
  console.log('\nHOUSE:');
  console.log(`  Primary done, both confirmed, HAVE photos: ${results.house.primaryDone_bothConfirmed.length}`);
  console.log(`  Primary done, both confirmed, NEED photos: ${results.house.primaryDone_needsPhoto.length}`);
  console.log(`  Primary pending, incumbent needs photo: ${results.house.primaryPending_incumbentNeeds.length}`);
  console.log(`  Primary pending, has WRONG data (non-TBD): ${results.house.primaryPending_hasWrongData.length}`);
  
  console.log('\nGOVERNOR:');
  console.log(`  Primary done, both confirmed, HAVE photos: ${results.governor.primaryDone_bothConfirmed.length}`);
  console.log(`  Primary done, both confirmed, NEED photos: ${results.governor.primaryDone_needsPhoto.length}`);
  console.log(`  Primary pending, incumbent needs photo: ${results.governor.primaryPending_incumbentNeeds.length}`);
  console.log(`  Primary pending, has WRONG data (non-TBD): ${results.governor.primaryPending_hasWrongData.length}`);
  
  console.log('\nFull results written to /tmp/audit_results.json');
  process.exit(0);
}

audit().catch(e => { console.error(e); process.exit(1); });
