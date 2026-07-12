import { eq, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createRequire } from "module";
import { InsertUser, users, senateRaces, houseRaces, redistrictingStates, referendums, adminSessions, senators, pinnedKeyRaces, governorRaces, worldElections, fecFundraising, candidatePhotos } from "../drizzle/schema";
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
// Source: senate.gov (Party Division) + pressgallery.house.gov (Jun 9, 2026)
// These are the pre-election baselines. Called races in 2026 will adjust them.
// The base represents CURRENT seated members. Called vacancy-fill races (isVacancy=true)
// will decrement vacancies and add to the winning party's count.
const BASE_COMPOSITION = {
  // Updated Jul 12, 2026: Sen. Lindsey Graham (R-SC) died; seat vacant until McMaster appoints interim
  senate: { D: 45, R: 52, I: 2, total: 100, vacancies: 1 },
  // House Press Gallery Party Breakdown (pressgallery.house.gov, Jun 9, 2026):
  //   217 Republicans, 212 Democrats, 1 Independent, 5 Vacancies = 435
  // Vacancies: CA-01 (LaMalfa R, died 1/6/26), CA-14 (Swalwell D, resigned 4/14/26),
  //   TX-23 (Gonzales R, resigned 4/14/26), FL-20 (Cherfilus-McCormick D, resigned 4/21/26),
  //   GA-13 (David Scott D, died 4/22/26)
  // All completed special elections (AZ-7, FL-1, FL-6, NJ-11, TN-7, VA-11, GA-14)
  // are already seated and included in the 217R/212D counts.
  house: { D: 212, R: 217, I: 1, total: 435, vacancies: 5 },
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
      // The 2 current vacancies in our base are: CA-01 (R), FL-20 (D)
      // (GA-14 and NJ-11 were filled by special elections and are already in D/R counts)
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

  // ── Governor scoreboard ──────────────────────────────────────────────────────
  const govRows = await db.select().from(governorRaces);
  const govTally = (() => {
    let D = 0, R = 0, tossup = 0;
    for (const r of govRows) {
      if (r.status === 'Called' || r.status === 'Certified') {
        if (r.calledParty === 'D') D++;
        else if (r.calledParty === 'R') R++;
        else tossup++;
      } else {
        // Not yet called — categorize by rating
        const rating = r.rating ?? '';
        if (rating === 'Solid D' || rating === 'Likely D') D++;
        else if (rating === 'Solid R' || rating === 'Likely R') R++;
        else tossup++; // Lean D, Lean R, Toss-up
      }
    }
    return { D, R, tossup, total: govRows.length };
  })();

  return {
    senate: tally(senateRows),
    house: tally(houseRows),
    governors: govTally,
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
    governors: { dToR: [], rToD: [], netD: 0, netR: 0 },
  };

  const [senateRows, houseRows, govRows] = await Promise.all([
    db.select().from(senateRaces),
    db.select().from(houseRaces),
    db.select().from(governorRaces),
  ]);

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
    governors: detectFlips(govRows.map(r => ({ ...r, calledWinner: r.calledWinner ?? null })) as FlipRow[]),
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

// ─── Pinned Key Races ─────────────────────────────────────────────────────────
export async function getPinnedKeyRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pinnedKeyRaces).orderBy(pinnedKeyRaces.sortOrder, pinnedKeyRaces.pinnedAt);
}

export async function pinKeyRace(chamber: "senate" | "house", raceId: number) {
  const db = await getDb();
  if (!db) return null;
  // Prevent duplicate pins
  const existing = await db.select().from(pinnedKeyRaces)
    .where(and(eq(pinnedKeyRaces.chamber, chamber), eq(pinnedKeyRaces.raceId, raceId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [result] = await db.insert(pinnedKeyRaces).values({ chamber, raceId, sortOrder: 0 });
  return result;
}

export async function unpinKeyRace(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pinnedKeyRaces).where(eq(pinnedKeyRaces.id, id));
}

export async function unpinKeyRaceByRace(chamber: "senate" | "house", raceId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pinnedKeyRaces)
    .where(and(eq(pinnedKeyRaces.chamber, chamber), eq(pinnedKeyRaces.raceId, raceId)));
}

// ─── Governor Races ───────────────────────────────────────────────────────────
export async function getAllGovernorRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(governorRaces).orderBy(governorRaces.stateName);
}

export async function getGovernorRaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(governorRaces).where(eq(governorRaces.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getGovernorRaceByState(stateCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(governorRaces).where(eq(governorRaces.stateCode, stateCode)).limit(1);
  return result[0] ?? null;
}

export async function updateGovernorRace(id: number, data: Partial<typeof governorRaces.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(governorRaces).set(data).where(eq(governorRaces.id, id));
}

// ─── World Elections ──────────────────────────────────────────────────────────
export async function getAllWorldElections() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(worldElections).orderBy(worldElections.electionDate);
}
export async function getWorldElectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(worldElections).where(eq(worldElections.id, id)).limit(1);
  return result[0] ?? null;
}
export async function getWorldElectionsByCountry(countryCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(worldElections)
    .where(eq(worldElections.countryCode, countryCode))
    .orderBy(worldElections.electionDate);
}
export async function createWorldElection(data: typeof worldElections.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(worldElections).values(data);
  return result[0].insertId;
}
export async function updateWorldElection(id: number, data: Partial<typeof worldElections.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(worldElections).set(data).where(eq(worldElections.id, id));
}
export async function deleteWorldElection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(worldElections).where(eq(worldElections.id, id));
}


// ─── FEC Fundraising ─────────────────────────────────────────────────────────
export async function getAllFecFundraising() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fecFundraising).orderBy(fecFundraising.chamber, fecFundraising.candidateName);
}

export async function getFecByRace(chamber: string, raceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fecFundraising)
    .where(and(eq(fecFundraising.chamber, chamber as any), eq(fecFundraising.raceId, raceId)));
}

export async function upsertFecFundraising(data: typeof fecFundraising.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if entry exists for this candidate + race
  const existing = await db.select().from(fecFundraising)
    .where(and(
      eq(fecFundraising.chamber, data.chamber),
      eq(fecFundraising.raceId, data.raceId),
      eq(fecFundraising.candidateName, data.candidateName)
    )).limit(1);
  
  if (existing.length > 0) {
    await db.update(fecFundraising).set(data).where(eq(fecFundraising.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(fecFundraising).values(data);
    return result[0].insertId;
  }
}

export async function deleteFecFundraising(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(fecFundraising).where(eq(fecFundraising.id, id));
}

// ─── Candidate Photos (Name-Keyed Lookup) ────────────────────────────────────

/**
 * Batch-lookup candidate photos by normalized names.
 * Returns a Map of normalized_name → photo_url for all matches found.
 */
export async function batchGetCandidatePhotos(names: string[]): Promise<Map<string, string>> {
  const db = await getDb();
  const result = new Map<string, string>();
  if (!db || names.length === 0) return result;

  // Normalize all input names
  const normalizedNames = names
    .filter(Boolean)
    .map(n => n.toLowerCase().trim());

  if (normalizedNames.length === 0) return result;

  // Query in batches of 100 to avoid MySQL IN clause limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < normalizedNames.length; i += BATCH_SIZE) {
    const batch = normalizedNames.slice(i, i + BATCH_SIZE);
    const rows = await db
      .select({ normalizedName: candidatePhotos.normalizedName, photoUrl: candidatePhotos.photoUrl })
      .from(candidatePhotos)
      .where(inArray(candidatePhotos.normalizedName, batch));
    for (const row of rows) {
      result.set(row.normalizedName, row.photoUrl);
    }
  }

  return result;
}

/**
 * Get a single candidate photo by name.
 */
export async function getCandidatePhotoByName(name: string | null | undefined): Promise<string | null> {
  if (!name) return null;
  const db = await getDb();
  if (!db) return null;
  const normalized = name.toLowerCase().trim();
  const rows = await db
    .select({ photoUrl: candidatePhotos.photoUrl })
    .from(candidatePhotos)
    .where(eq(candidatePhotos.normalizedName, normalized))
    .limit(1);
  return rows[0]?.photoUrl ?? null;
}

/**
 * Upsert a candidate photo (insert or update on conflict).
 */
export async function upsertCandidatePhoto(data: {
  normalizedName: string;
  displayName: string;
  photoUrl: string;
  source?: "manus-storage" | "bioguide" | "cdn" | "manual";
  chamber?: "senate" | "house" | "governor" | "world" | null;
  party?: "D" | "R" | "I" | "L" | "G" | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(candidatePhotos)
    .values({
      normalizedName: data.normalizedName,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
      source: data.source || "manual",
      chamber: data.chamber || null,
      party: data.party || null,
    })
    .onDuplicateKeyUpdate({
      set: {
        photoUrl: sql`VALUES(photo_url)`,
        displayName: sql`VALUES(display_name)`,
        source: sql`VALUES(source)`,
      },
    });
}
