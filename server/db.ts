import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, senateRaces, houseRaces, redistrictingStates, referendums, adminSessions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Senate ───────────────────────────────────────────────────────────────────
export async function getAllSenateRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senateRaces).orderBy(senateRaces.stateName);
}

export async function getSenateRaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(senateRaces).where(eq(senateRaces.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateSenateRace(id: number, data: Partial<typeof senateRaces.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(senateRaces).set(data).where(eq(senateRaces.id, id));
}

// ─── House ────────────────────────────────────────────────────────────────────
export async function getAllHouseRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(houseRaces).orderBy(houseRaces.stateName, houseRaces.district);
}

export async function getHouseRaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(houseRaces).where(eq(houseRaces.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getHouseRacesByState(stateCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(houseRaces).where(eq(houseRaces.stateCode, stateCode)).orderBy(houseRaces.district);
}

export async function updateHouseRace(id: number, data: Partial<typeof houseRaces.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(houseRaces).set(data).where(eq(houseRaces.id, id));
}

// ─── Redistricting ────────────────────────────────────────────────────────────
export async function getAllRedistrictingStates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(redistrictingStates).orderBy(redistrictingStates.stateName);
}

export async function updateRedistrictingState(id: number, data: Partial<typeof redistrictingStates.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(redistrictingStates).set(data).where(eq(redistrictingStates.id, id));
}

// ─── Referendums ──────────────────────────────────────────────────────────────
export async function getAllReferendums() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referendums).orderBy(referendums.stateName);
}

export async function updateReferendum(id: number, data: Partial<typeof referendums.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(referendums).set(data).where(eq(referendums.id, id));
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
export async function getScoreboard() {
  const db = await getDb();
  if (!db) return { senate: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 }, house: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 } };

  const senateRows = await db.select().from(senateRaces);
  const houseRows = await db.select().from(houseRaces);

  type TallyRow = { status: string | null; calledParty: string | null };
  const tally = (rows: TallyRow[]) => {
    const counts = { D: 0, R: 0, I: 0, uncalled: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === 'Called' || r.status === 'Certified') {
        if (r.calledParty === 'D') counts.D++;
        else if (r.calledParty === 'R') counts.R++;
        else if (r.calledParty === 'I') counts.I++;
        else counts.uncalled++;
      } else {
        counts.uncalled++;
      }
    }
    return counts;
  };

  return { senate: tally(senateRows), house: tally(houseRows) };
}

// ─── Admin Sessions ───────────────────────────────────────────────────────────
export async function createAdminSession(token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(adminSessions).values({ token, expiresAt });
}

export async function validateAdminSession(token: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(adminSessions)
    .where(and(eq(adminSessions.token, token), sql`expires_at > NOW()`))
    .limit(1);
  return result.length > 0;
}

export async function deleteAdminSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.token, token));
}
