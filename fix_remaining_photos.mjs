import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

async function main() {
  const db = await getDb();
  
  const data = JSON.parse(readFileSync('/tmp/uploaded_house_photos.json', 'utf8'));
  const uploaded = data.uploaded;
  
  // Manual fixes for the ones that failed due to name mismatches or district format
  const manualFixes = [
    // SD-AL uses district=0
    { state: 'SD', district: '0', side: 'candidate1', name: 'Nicole Gronli', photo: uploaded.find(u => u.name === 'Nicole Gronli')?.storage_path },
    { state: 'SD', district: '0', side: 'candidate2', name: 'Marty Jackley', photo: uploaded.find(u => u.name === 'Marty Jackley')?.storage_path },
    // Name mismatches - find by state/district and update
    { state: 'GA', district: '5', side: 'candidate2', photo: uploaded.find(u => u.name === 'John Salvesen' || u.name === 'J. Salvesen')?.storage_path },
    { state: 'GA', district: '9', side: 'candidate1', photo: uploaded.find(u => u.name === 'Caitlyn Gegen' || u.name === 'C. Gegen')?.storage_path },
    { state: 'GA', district: '10', side: 'candidate1', photo: uploaded.find(u => u.name === 'Pamela DeLancy' || u.name === 'P. Delancy')?.storage_path },
    { state: 'KY', district: '2', side: 'candidate1', photo: uploaded.find(u => u.name === 'Megan Wingfield' || u.name === 'M. Wingfield')?.storage_path },
    { state: 'KY', district: '3', side: 'candidate2', photo: uploaded.find(u => u.name === 'Maria Teresa Rodriguez' || u.name === 'M. Rodriguez')?.storage_path },
    { state: 'NC', district: '3', side: 'candidate1', photo: uploaded.find(u => u.name === 'Raymond Smith Jr.' || u.name === 'R. Smith')?.storage_path },
    { state: 'NJ', district: '12', side: 'candidate2', photo: uploaded.find(u => u.name === 'Gregg Mele' || u.name === 'Greg Mele')?.storage_path },
    { state: 'OH', district: '3', side: 'candidate2', photo: uploaded.find(u => u.name === 'Cleophus Dulaney' || u.name === 'C. Dulaney')?.storage_path },
    { state: 'OR', district: '2', side: 'candidate1', photo: uploaded.find(u => u.name === 'Chris Beck' || u.name === 'C. Beck')?.storage_path },
  ];
  
  let fixed = 0;
  for (const fix of manualFixes) {
    if (!fix.photo) {
      console.log(`  No photo found for ${fix.state}-${fix.district} ${fix.side}`);
      continue;
    }
    const photoCol = fix.side === 'candidate1' ? 'candidate1_photo' : 'candidate2_photo';
    try {
      await db.execute(sql.raw(
        `UPDATE house_races SET ${photoCol} = '${fix.photo}' WHERE state_code = '${fix.state}' AND district = '${fix.district}'`
      ));
      console.log(`  Fixed ${fix.state}-${fix.district} ${fix.side}: ${fix.photo}`);
      fixed++;
    } catch (e) {
      console.log(`  Error: ${fix.state}-${fix.district}: ${e.message}`);
    }
  }
  
  console.log(`\nFixed ${fixed} remaining photos`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
