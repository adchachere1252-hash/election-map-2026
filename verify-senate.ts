import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { senateRaces } from './drizzle/schema';
import { inArray } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const rows = await db.select({
    st: senateRaces.stateCode,
    rating: senateRaces.rating,
    status: senateRaces.status,
    c1: senateRaces.candidate1Name,
    c1p: senateRaces.candidate1Party,
    c2: senateRaces.candidate2Name,
    c2p: senateRaces.candidate2Party,
  }).from(senateRaces).where(
    inArray(senateRaces.stateCode, ['NC','ME','MI','TX','IA','AK','OH','GA','NH','MN','NE','MT','SC'])
  );
  console.table(rows);
  await conn.end();
  process.exit(0);
}
main();
