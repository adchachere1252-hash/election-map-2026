import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

async function main() {
  const db = await getDb();
  
  // Read uploaded photos data
  const data = JSON.parse(readFileSync('/tmp/uploaded_house_photos.json', 'utf8'));
  const uploaded = data.uploaded;
  
  // Also read the original candidate list to map names to candidate1/candidate2
  const candidateList = JSON.parse(readFileSync('/tmp/house_photo_candidates.json', 'utf8'));
  
  // Build a lookup: "name|race" -> "candidate1" or "candidate2"
  const sideMap = {};
  for (const entry of candidateList) {
    const [name, race, side] = entry.split('|');
    sideMap[`${name}|${race}`] = side;
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const item of uploaded) {
    const name = item.name;
    const race = item.race;
    const storagePath = item.storage_path;
    
    if (!storagePath) {
      skipped++;
      continue;
    }
    
    // Determine which side (candidate1 or candidate2)
    const side = sideMap[`${name}|${race}`];
    if (!side) {
      // Try to match by just the name
      console.log(`  Warning: No side mapping for ${name}|${race}, trying both`);
      skipped++;
      continue;
    }
    
    // Parse state and district from race (e.g., "AL-1" -> state=AL, district=1)
    const parts = race.split('-');
    const state = parts[0];
    const district = parts.slice(1).join('-'); // Handle "SD-AL" etc.
    
    const photoCol = side === 'candidate1' ? 'candidate1_photo' : 'candidate2_photo';
    
    try {
      await db.execute(sql.raw(
        `UPDATE house_races SET ${photoCol} = '${storagePath}' WHERE state_code = '${state}' AND district = '${district}' AND ${side === 'candidate1' ? 'candidate1_name' : 'candidate2_name'} = '${name.replace(/'/g, "''")}'`
      ));
      updated++;
    } catch (e) {
      console.log(`  Error updating ${name} (${race}): ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
