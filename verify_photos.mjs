import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const c = await mysql.createConnection(process.env.DATABASE_URL);

// Check all photos across Senate, House, Governor
const tables = [
  { name: 'senate_races', label: 'Senate' },
  { name: 'house_races', label: 'House' },
  { name: 'governor_races', label: 'Governor' },
];

let totalPhotos = 0;
let missingPhotos = [];
let invalidPhotos = [];

for (const table of tables) {
  let stateCol = 'state_code';
  let districtCol = table.name === 'house_races' ? 'district' : null;
  
  const [rows] = await c.execute(`SELECT * FROM ${table.name}`);
  
  for (const row of rows) {
    const id = districtCol ? `${row.state_code}-${row.district}` : row.state_code;
    
    // Check candidate1_photo
    if (row.candidate1_name && row.candidate1_name !== 'TBD') {
      if (!row.candidate1_photo) {
        missingPhotos.push({ table: table.label, race: id, candidate: row.candidate1_name, party: row.candidate1_party, position: 'candidate1' });
      } else {
        totalPhotos++;
        if (!row.candidate1_photo.startsWith('/manus-storage/')) {
          invalidPhotos.push({ table: table.label, race: id, candidate: row.candidate1_name, photo: row.candidate1_photo });
        }
      }
    }
    
    // Check candidate2_photo
    if (row.candidate2_name && row.candidate2_name !== 'TBD') {
      if (!row.candidate2_photo) {
        missingPhotos.push({ table: table.label, race: id, candidate: row.candidate2_name, party: row.candidate2_party, position: 'candidate2' });
      } else {
        totalPhotos++;
        if (!row.candidate2_photo.startsWith('/manus-storage/')) {
          invalidPhotos.push({ table: table.label, race: id, candidate: row.candidate2_name, photo: row.candidate2_photo });
        }
      }
    }
  }
}

console.log(`\n=== PHOTO VERIFICATION REPORT ===`);
console.log(`Total photos in database: ${totalPhotos}`);
console.log(`Invalid photo paths: ${invalidPhotos.length}`);
console.log(`Candidates with names but missing photos: ${missingPhotos.length}`);

if (invalidPhotos.length > 0) {
  console.log(`\n--- INVALID PHOTOS ---`);
  invalidPhotos.forEach(p => console.log(`  ${p.table} ${p.race}: ${p.candidate} → ${p.photo}`));
}

console.log(`\n--- MISSING PHOTOS BY TYPE ---`);
const senMissing = missingPhotos.filter(p => p.table === 'Senate');
const houseMissing = missingPhotos.filter(p => p.table === 'House');
const govMissing = missingPhotos.filter(p => p.table === 'Governor');

console.log(`Senate: ${senMissing.length} missing`);
senMissing.forEach(p => console.log(`  ${p.race}: ${p.candidate} (${p.party}) [${p.position}]`));

console.log(`\nGovernor: ${govMissing.length} missing`);
govMissing.forEach(p => console.log(`  ${p.race}: ${p.candidate} (${p.party}) [${p.position}]`));

console.log(`\nHouse: ${houseMissing.length} missing (showing only races with status General/Called/Primary Runoff)`);

// Re-query house to get status
const [houseRows] = await c.execute(`SELECT state_code, district, candidate1_name, candidate1_party, candidate1_photo, candidate2_name, candidate2_party, candidate2_photo, status, rating FROM house_races WHERE status IN ('General', 'Called', 'Primary Runoff') ORDER BY FIELD(rating, 'Toss-up', 'Lean D', 'Lean R', 'Likely D', 'Likely R', 'Solid D', 'Solid R')`);

let houseGeneralMissing = [];
for (const row of houseRows) {
  const id = `${row.state_code}-${row.district}`;
  if (row.candidate1_name && row.candidate1_name !== 'TBD' && !row.candidate1_photo) {
    houseGeneralMissing.push({ race: id, candidate: row.candidate1_name, party: row.candidate1_party, rating: row.rating, status: row.status });
  }
  if (row.candidate2_name && row.candidate2_name !== 'TBD' && !row.candidate2_photo) {
    houseGeneralMissing.push({ race: id, candidate: row.candidate2_name, party: row.candidate2_party, rating: row.rating, status: row.status });
  }
}

console.log(`  General/Called/Runoff races missing photos: ${houseGeneralMissing.length}`);
houseGeneralMissing.slice(0, 50).forEach(p => console.log(`  ${p.race} [${p.rating}] ${p.status}: ${p.candidate} (${p.party})`));
if (houseGeneralMissing.length > 50) console.log(`  ... and ${houseGeneralMissing.length - 50} more`);

await c.end();
process.exit(0);
