import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  const [rows] = await db.execute(sql`SELECT state_code, incumbent, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes FROM senate_races WHERE state_code IN ('AK','DE','MA','RI','VA')`);
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
