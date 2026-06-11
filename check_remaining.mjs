import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  
  // Senate: find races needing photos (both confirmed, no photos)
  const [senate] = await db.execute(sql`SELECT state_code, candidate1_name, candidate1_party, candidate1_photo, candidate2_name, candidate2_party, candidate2_photo FROM senate_races WHERE candidate1_name IS NOT NULL AND candidate2_name IS NOT NULL AND (candidate1_photo IS NULL OR candidate2_photo IS NULL)`);
  console.log('Senate with both candidates but missing photos:');
  for (const r of senate) console.log(JSON.stringify(r));
  
  // Senate: find races where only one side has a name (incumbent) but no photo
  const [senateInc] = await db.execute(sql`SELECT state_code, candidate1_name, candidate1_party, candidate1_photo, candidate2_name, candidate2_party, candidate2_photo, incumbent FROM senate_races WHERE ((candidate1_name IS NOT NULL AND candidate1_photo IS NULL AND candidate2_name IS NULL) OR (candidate2_name IS NOT NULL AND candidate2_photo IS NULL AND candidate1_name IS NULL))`);
  console.log('\nSenate incumbents needing photos (other side TBD):');
  for (const r of senateInc) console.log(JSON.stringify(r));
  
  // Governor: find races needing photos
  const [gov] = await db.execute(sql`SELECT state_code, candidate1_name, candidate1_party, candidate1_photo, candidate2_name, candidate2_party, candidate2_photo, incumbent FROM governor_races WHERE (candidate1_photo IS NULL AND candidate1_name IS NOT NULL) OR (candidate2_photo IS NULL AND candidate2_name IS NOT NULL)`);
  console.log('\nGovernor needing photos:');
  for (const r of gov) console.log(JSON.stringify(r));
  
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
