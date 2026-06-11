import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  
  // Governor uses dem_photo and rep_photo columns, and dem_candidate / rep_candidate
  const [gov] = await db.execute(sql`SELECT state_code, dem_candidate, rep_candidate, dem_photo, rep_photo, incumbent_name, status, primary_date FROM governor_races WHERE (dem_photo IS NULL AND dem_candidate IS NOT NULL) OR (rep_photo IS NULL AND rep_candidate IS NOT NULL)`);
  console.log('Governor needing photos:');
  for (const r of gov) console.log(JSON.stringify(r));
  
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
