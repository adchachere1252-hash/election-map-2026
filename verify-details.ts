import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { houseRaces, senateRaces, governorRaces } from './drizzle/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);

  // NJ-8, PA-3, WA-10
  console.log("=== HOUSE ERRORS ===");
  const houseErrors = await db.select({
    state: houseRaces.stateCode,
    dist: houseRaces.districtLabel,
    status: houseRaces.status,
    c1: houseRaces.candidate1Name,
    c1p: houseRaces.candidate1Party,
    c2: houseRaces.candidate2Name,
    c2p: houseRaces.candidate2Party,
    notes: houseRaces.notes,
    primaryDate: houseRaces.primaryDate,
  }).from(houseRaces).where(
    or(
      and(eq(houseRaces.stateCode, 'NJ'), eq(houseRaces.district, 8)),
      and(eq(houseRaces.stateCode, 'PA'), eq(houseRaces.district, 3)),
      and(eq(houseRaces.stateCode, 'WA'), eq(houseRaces.district, 10)),
    )
  );
  houseErrors.forEach(r => console.log(JSON.stringify(r, null, 2)));

  // AK Senate
  console.log("\n=== AK SENATE ===");
  const akSenate = await db.select({
    state: senateRaces.stateCode,
    status: senateRaces.status,
    c1: senateRaces.candidate1Name,
    c1p: senateRaces.candidate1Party,
    c2: senateRaces.candidate2Name,
    c2p: senateRaces.candidate2Party,
    notes: senateRaces.notes,
  }).from(senateRaces).where(eq(senateRaces.stateCode, 'AK'));
  akSenate.forEach(r => console.log(JSON.stringify(r, null, 2)));

  // KS, MI, VA Senate (Primary status but Aug 4 primary)
  console.log("\n=== KS/MI/VA SENATE (Primary status) ===");
  const primarySenate = await db.select({
    state: senateRaces.stateCode,
    status: senateRaces.status,
    c1: senateRaces.candidate1Name,
    c1p: senateRaces.candidate1Party,
    c2: senateRaces.candidate2Name,
    c2p: senateRaces.candidate2Party,
    primaryDate: senateRaces.primaryDate,
  }).from(senateRaces).where(
    or(
      eq(senateRaces.stateCode, 'KS'),
      eq(senateRaces.stateCode, 'MI'),
      eq(senateRaces.stateCode, 'VA'),
    )
  );
  primarySenate.forEach(r => console.log(JSON.stringify(r, null, 2)));

  // Governor races stuck in Voting
  console.log("\n=== GOVERNORS STUCK IN VOTING ===");
  const govVoting = await db.select({
    state: governorRaces.stateCode,
    status: governorRaces.status,
    primaryDate: governorRaces.primaryDate,
    dem: governorRaces.demCandidate,
    rep: governorRaces.repCandidate,
    primaryWinner: governorRaces.primaryWinner,
    notes: governorRaces.notes,
  }).from(governorRaces).where(eq(governorRaces.status, 'Voting'));
  govVoting.forEach(r => console.log(JSON.stringify(r, null, 2)));

  // TX-23 still in Primary
  console.log("\n=== TX-23 (Primary with votes) ===");
  const tx23 = await db.select({
    state: houseRaces.stateCode,
    dist: houseRaces.districtLabel,
    status: houseRaces.status,
    c1: houseRaces.candidate1Name,
    c1p: houseRaces.candidate1Party,
    c2: houseRaces.candidate2Name,
    c2p: houseRaces.candidate2Party,
    c1v: houseRaces.candidate1Votes,
    c2v: houseRaces.candidate2Votes,
    primaryDate: houseRaces.primaryDate,
    notes: houseRaces.notes,
  }).from(houseRaces).where(and(eq(houseRaces.stateCode, 'TX'), eq(houseRaces.district, 23)));
  tx23.forEach(r => console.log(JSON.stringify(r, null, 2)));

  await conn.end();
  process.exit(0);
}
main();
