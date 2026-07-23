import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { senateRaces } from './drizzle/schema';
import { or, eq } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const rows = await db.select({
    state: senateRaces.stateCode,
    status: senateRaces.status,
    primaryDate: senateRaces.primaryDate,
    c1: senateRaces.candidate1Name,
    c1p: senateRaces.candidate1Party,
    c2: senateRaces.candidate2Name,
    c2p: senateRaces.candidate2Party,
    notes: senateRaces.notes,
  }).from(senateRaces).where(
    or(eq(senateRaces.stateCode, 'KS'), eq(senateRaces.stateCode, 'MI'), eq(senateRaces.stateCode, 'VA'))
  );
  rows.forEach(r => console.log(`${r.state}: status=${r.status}, primary=${r.primaryDate}, ${r.c1} (${r.c1p}) vs ${r.c2} (${r.c2p})`));
  console.log("\nNotes:");
  rows.forEach(r => console.log(`  ${r.state}: ${r.notes?.substring(0, 120)}`));
  await conn.end();
  process.exit(0);
}
main();
