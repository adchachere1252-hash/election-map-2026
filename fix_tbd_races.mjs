import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

// Upcoming primaries (after June 10, 2026) - these races should have TBD for non-incumbent
const upcomingPrimaries = {
  'VA': '2026-06-16', 'OK': '2026-06-16', 'DC': '2026-06-16',
  'NY': '2026-06-23',
  'CO': '2026-06-24', 'UT': '2026-06-24',
  'LA': '2026-06-27',
  'MD': '2026-06-30',
  'KS': '2026-08-04', 'MI': '2026-08-04', 'MO': '2026-08-04', 'WA': '2026-08-04', 'TN': '2026-08-04',
  'HI': '2026-08-08',
  'CT': '2026-08-11', 'MN': '2026-08-11', 'VT': '2026-08-11',
  'AK': '2026-08-18', 'WY': '2026-08-18', 'FL': '2026-08-18',
  'AZ': '2026-08-25',
  'MA': '2026-09-01',
  'NH': '2026-09-08', 'RI': '2026-09-08', 'DE': '2026-09-08',
};

async function fix() {
  const db = await getDb();
  
  // === FIX SENATE RACES ===
  // These 8 Senate races have named candidates but primary hasn't happened
  const senateFixes = [
    { state: 'AK', incumbent: 'Mary Peltola', incumbentSide: 'candidate1', primaryDate: '2026-08-18' },
    { state: 'CO', incumbent: 'Cory Gardner', incumbentSide: 'candidate2', primaryDate: '2026-06-24' },
    { state: 'DE', incumbent: 'Chris Coons', incumbentSide: 'candidate1', primaryDate: '2026-09-08' },
    { state: 'LA', incumbent: 'Julia Letlow', incumbentSide: 'candidate2', primaryDate: '2026-06-27' },
    { state: 'MA', incumbent: 'Ed Markey', incumbentSide: 'candidate1', primaryDate: '2026-09-01' },
    { state: 'RI', incumbent: 'Jack Reed', incumbentSide: 'candidate1', primaryDate: '2026-09-08' },
    { state: 'VA', incumbent: 'Mark Warner', incumbentSide: 'candidate1', primaryDate: '2026-06-16' },
    { state: 'WY', incumbent: 'John Barrasso', incumbentSide: 'candidate2', primaryDate: '2026-08-18' },
  ];

  console.log('=== FIXING SENATE RACES ===');
  for (const fix of senateFixes) {
    const nonIncumbentSide = fix.incumbentSide === 'candidate1' ? 'candidate2' : 'candidate1';
    const noteText = `Primary: ${fix.primaryDate}. Challenger TBD pending primary.`;
    
    if (nonIncumbentSide === 'candidate1') {
      await db.execute(sql`UPDATE senate_races SET candidate1_name = NULL, candidate1_party = NULL, candidate1_photo = NULL, notes = ${noteText} WHERE state_code = ${fix.state}`);
    } else {
      await db.execute(sql`UPDATE senate_races SET candidate2_name = NULL, candidate2_party = NULL, candidate2_photo = NULL, notes = ${noteText} WHERE state_code = ${fix.state}`);
    }
    console.log(`  Fixed ${fix.state}: set ${nonIncumbentSide} to TBD, primary ${fix.primaryDate}`);
  }

  // === FIX HOUSE RACES ===
  // Get all house races in states with upcoming primaries that have non-null non-incumbent candidates
  const states = Object.keys(upcomingPrimaries);
  console.log('\n=== FIXING HOUSE RACES ===');
  
  let houseFixCount = 0;
  for (const state of states) {
    const primaryDate = upcomingPrimaries[state];
    const [races] = await db.execute(sql`SELECT * FROM house_races WHERE state_code = ${state}`);
    
    for (const race of races) {
      const incumbent = race.incumbent_name;
      if (!incumbent || incumbent.includes('Open Seat') || incumbent.includes('VACANT')) {
        // Open seat - both sides should be TBD if primary hasn't happened
        if (race.candidate1_name || race.candidate2_name) {
          await db.execute(sql`UPDATE house_races SET candidate1_name = NULL, candidate1_party = NULL, candidate1_photo = NULL, candidate2_name = NULL, candidate2_party = NULL, candidate2_photo = NULL, notes = ${`Primary: ${primaryDate}. Both nominees TBD pending primary.`} WHERE id = ${race.id}`);
          houseFixCount++;
        }
        continue;
      }
      
      // Has incumbent - determine which side is incumbent
      const isCandidate1Incumbent = race.candidate1_name === incumbent;
      
      if (isCandidate1Incumbent) {
        // candidate2 should be TBD
        if (race.candidate2_name) {
          const noteText = `Primary: ${primaryDate}. Challenger TBD pending primary.`;
          await db.execute(sql`UPDATE house_races SET candidate2_name = NULL, candidate2_party = NULL, candidate2_photo = NULL, notes = ${noteText} WHERE id = ${race.id}`);
          houseFixCount++;
        }
      } else {
        // candidate1 should be TBD (incumbent is candidate2)
        if (race.candidate1_name && race.candidate1_name !== incumbent) {
          const noteText = `Primary: ${primaryDate}. Challenger TBD pending primary.`;
          await db.execute(sql`UPDATE house_races SET candidate1_name = NULL, candidate1_party = NULL, candidate1_photo = NULL, notes = ${noteText} WHERE id = ${race.id}`);
          houseFixCount++;
        }
      }
    }
  }
  
  console.log(`  Fixed ${houseFixCount} House races (set non-incumbent to TBD)`);
  
  console.log('\nDone! All races with upcoming primaries now show TBD for non-confirmed candidates.');
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
