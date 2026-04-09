import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createRequire } from "module";
import { InsertUser, users, senateRaces, houseRaces, redistrictingStates, referendums, adminSessions, senators } from "../drizzle/schema";
import { ENV } from './_core/env';

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mysql: any = _require("mysql2/promise");

let _db: ReturnType<typeof drizzle> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pool: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Use a connection pool with keep-alive to prevent idle connection drops
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
      _db = drizzle(_pool);
      console.log("[Database] Connection pool initialized");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
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
// ─── 119th Congress base composition (start of Congress, Jan 2025) ───────────
// Source: senate.gov (Party Division) + pressgallery.house.gov (Apr 2026)
// These are the pre-election baselines. Called races in 2026 will adjust them.
const BASE_COMPOSITION = {
  senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0 },
  // House: 217R / 214D / 1I / 2 vacancies as of Apr 8, 2026 (CNN, Apr 8 2026)
  // GA-14 filled Apr 7 by Clay Fuller (R) - special election won
  // NJ-11 still vacant (special election Apr 16, 2026)
  house: { D: 214, R: 217, I: 1, total: 435, vacancies: 2 },
} as const;

export async function getScoreboard() {
  const db = await getDb();
  if (!db) return {
    senate: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 },
    house: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 },
    composition: {
      senate: { ...BASE_COMPOSITION.senate, lastUpdated: new Date('2026-04-08').toISOString(), source: 'senate.gov / pressgallery.house.gov' },
      house: { ...BASE_COMPOSITION.house, lastUpdated: new Date('2026-04-08').toISOString(), source: 'senate.gov / pressgallery.house.gov' },
    },
  };

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

  // ── Live composition: base + adjustments from called 2026 races ──────────────
  // Strategy: for each called race, if the winner's party differs from previousParty,
  // the seat moves from one party to another in the live composition.
  // For special elections (isSpecial=true) that are already Called/Certified,
  // they represent seats that were vacant or held by a different party.
  type CompRow = {
    status: string | null;
    calledParty: string | null;
    previousParty: string | null;
    isSpecial?: boolean | null;
    updatedAt: Date;
  };

  const computeLiveComposition = (
    base: typeof BASE_COMPOSITION.senate | typeof BASE_COMPOSITION.house,
    rows: CompRow[]
  ) => {
    let D: number = base.D;
    let R: number = base.R;
    let I: number = base.I;
    let vacancies: number = base.vacancies;
    let latestUpdate: Date | null = null;

    for (const r of rows) {
      if (r.status !== 'Called' && r.status !== 'Certified') continue;
      if (!r.calledParty) continue;

      // Track the most recent update timestamp
      if (!latestUpdate || r.updatedAt > latestUpdate) latestUpdate = r.updatedAt;

      // Determine if this race fills a vacancy.
      // A vacancy is a seat that was in the base composition as "vacant" —
      // i.e., the incumbent was VACANT and the seat was already counted in
      // the base party totals as a vacancy (not assigned to D/R/I).
      // We detect this by checking if previousParty matches the base party
      // but the seat was listed as vacant in the base (GA-14, NJ-11, CA-01).
      // Simplest heuristic: if the seat was previously vacant (no previous party
      // in DB OR previousParty matches the party that held it before the vacancy),
      // and vacancies > 0, decrement vacancies and add to winning party.
      //
      // For a vacancy fill (seat was vacant in base):
      //   - Remove from vacancies count
      //   - Add to calledParty count
      // For a regular seat flip (seat was held by a party in base):
      //   - Remove from previousParty count
      //   - Add to calledParty count
      //
      // The 3 vacancies in our base are: CA-01 (R), GA-14 (R), NJ-11 (D)
      // These seats are NOT counted in D/R/I in the base — they are in vacancies.
      // So when called, we decrement vacancies and add to calledParty.
      // We identify vacancy fills by checking if the race was previously VACANT
      // (incumbent = VACANT in the DB). Since we don't have that field here,
      // we use a simpler approach: track which seats are vacancy fills via
      // the isVacancyFill flag passed in from the caller.

      if (r.isSpecial) {
        // This is a special election filling a vacancy
        if (vacancies > 0) {
          vacancies--;
          if (r.calledParty === 'D') D++;
          else if (r.calledParty === 'R') R++;
          else if (r.calledParty === 'I') I++;
        }
      } else if (r.previousParty && r.previousParty !== r.calledParty) {
        // Regular seat flip
        if (r.previousParty === 'D') D--;
        else if (r.previousParty === 'R') R--;
        else if (r.previousParty === 'I') I--;

        if (r.calledParty === 'D') D++;
        else if (r.calledParty === 'R') R++;
        else if (r.calledParty === 'I') I++;
      }
    }

    // Clamp to valid range
    D = Math.max(0, D);
    R = Math.max(0, R);
    I = Math.max(0, I);
    vacancies = Math.max(0, vacancies);

    const lastUpdated = latestUpdate
      ? latestUpdate.toISOString()
      : new Date('2026-04-08').toISOString();

    return { D, R, I, total: base.total, vacancies, lastUpdated, source: 'senate.gov / pressgallery.house.gov (119th Congress base)' };
  };

  const senateComp = computeLiveComposition(
    BASE_COMPOSITION.senate,
    senateRows.map(r => ({ ...r, isSpecial: r.isSpecial ?? false }))
  );
  // For House races, detect vacancy fills using the data-driven isVacancy flag.
  // The 3 base vacancies (CA-01, GA-14, NJ-11) have is_vacancy=true in the DB.
  // When a vacancy seat is called, we decrement vacancies and add to calledParty.
  const houseComp = computeLiveComposition(
    BASE_COMPOSITION.house,
    houseRows.map(r => ({
      ...r,
      // isSpecial = true if this seat was vacant at start of 119th Congress
      isSpecial: r.isVacancy === true,
      previousParty: r.previousParty ?? null,
    }))
  );

  // ── Flip counts (seats that changed party) ─────────────────────────────────
  type FlipRow = { status: string | null; calledParty: string | null; previousParty: string | null };
  const countFlips = (rows: FlipRow[]) => {
    let dToR = 0, rToD = 0;
    for (const r of rows) {
      if ((r.status === 'Called' || r.status === 'Certified') && r.calledParty && r.previousParty) {
        if (r.previousParty === 'D' && r.calledParty === 'R') dToR++;
        else if (r.previousParty === 'R' && r.calledParty === 'D') rToD++;
      }
    }
    return { dToR, rToD, total: dToR + rToD };
  };

  return {
    senate: tally(senateRows),
    house: tally(houseRows),
    composition: {
      senate: senateComp,
      house: houseComp,
    },
    flips: {
      senate: countFlips(senateRows),
      house: countFlips(houseRows),
    },
  };
}

// ─── Flip Tracker ────────────────────────────────────────────────────────────
export async function getFlipTracker() {
  const db = await getDb();
  if (!db) return {
    senate: { dToR: [], rToD: [], netD: 0, netR: 0 },
    house: { dToR: [], rToD: [], netD: 0, netR: 0 },
  };

  const senateRows = await db.select().from(senateRaces);
  const houseRows = await db.select().from(houseRaces);

  type FlipRow = {
    id: number;
    stateName: string;
    stateCode: string;
    calledParty: string | null;
    previousParty: string | null;
    calledWinner: string | null;
    status: string | null;
    districtLabel?: string;
  };

  const detectFlips = (rows: FlipRow[]) => {
    const dToR: FlipRow[] = [];
    const rToD: FlipRow[] = [];
    for (const r of rows) {
      if ((r.status === 'Called' || r.status === 'Certified') && r.calledParty && r.previousParty) {
        if (r.previousParty === 'D' && r.calledParty === 'R') dToR.push(r);
        else if (r.previousParty === 'R' && r.calledParty === 'D') rToD.push(r);
      }
    }
    return {
      dToR,
      rToD,
      netD: rToD.length - dToR.length,
      netR: dToR.length - rToD.length,
    };
  };

  return {
    senate: detectFlips(senateRows as FlipRow[]),
    house: detectFlips(houseRows.map(r => ({ ...r, districtLabel: r.districtLabel })) as FlipRow[]),
  };
}

// ─── Senators ───────────────────────────────────────────────────────────
export async function getAllSenators() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senators).orderBy(senators.stateCode, senators.senateClass);
}
export async function getSenatorsByState(stateCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senators).where(eq(senators.stateCode, stateCode)).orderBy(senators.senateClass);
}
export async function searchSenators(query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db.select().from(senators).where(
    sql`LOWER(name) LIKE LOWER(${q}) OR LOWER(state_name) LIKE LOWER(${q}) OR LOWER(state_code) LIKE LOWER(${q})`
  ).orderBy(senators.stateCode).limit(20);
}
export async function getSenatorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(senators).where(eq(senators.id, id)).limit(1);
  return result[0] ?? null;
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
