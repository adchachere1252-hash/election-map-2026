// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createRequire } from "module";

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var ratingEnum = mysqlEnum("rating", [
  "Solid D",
  "Lean D",
  "Toss-up",
  "Lean R",
  "Solid R",
  "Safe D",
  "Safe R"
]);
var raceStatusEnum = mysqlEnum("race_status", [
  "Scheduled",
  "Primary",
  "General",
  "Called",
  "Certified"
]);
var senateRaces = mysqlTable("senate_races", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  isSpecial: boolean("is_special").default(false).notNull(),
  specialNote: text("special_note"),
  incumbent: varchar("incumbent", { length: 128 }),
  incumbentParty: mysqlEnum("incumbent_party", ["D", "R", "I"]),
  incumbentRetiring: boolean("incumbent_retiring").default(false).notNull(),
  candidate1Name: varchar("candidate1_name", { length: 128 }),
  candidate1Party: mysqlEnum("candidate1_party", ["D", "R", "I", "L", "G"]),
  candidate1Votes: bigint("candidate1_votes", { mode: "number" }).default(0),
  candidate1VotePct: decimal("candidate1_vote_pct", { precision: 5, scale: 2 }),
  candidate2Name: varchar("candidate2_name", { length: 128 }),
  candidate2Party: mysqlEnum("candidate2_party", ["D", "R", "I", "L", "G"]),
  candidate2Votes: bigint("candidate2_votes", { mode: "number" }).default(0),
  candidate2VotePct: decimal("candidate2_vote_pct", { precision: 5, scale: 2 }),
  calledWinner: varchar("called_winner", { length: 128 }),
  calledParty: mysqlEnum("called_party", ["D", "R", "I"]),
  calledAt: bigint("called_at", { mode: "number" }),
  // UTC ms timestamp when winner was called
  primaryWinner: varchar("primary_winner", { length: 128 }),
  // name of the called primary winner (NOT the general election winner)
  primaryParty: mysqlEnum("primary_party", ["D", "R", "I"]),
  // party of the primary winner
  otherCandidateName: varchar("other_candidate_name", { length: 128 }),
  // third-party / independent candidate
  otherCandidateParty: mysqlEnum("other_candidate_party", ["D", "R", "I", "L", "G"]),
  otherVotes: bigint("other_votes", { mode: "number" }).default(0),
  otherVotePct: decimal("other_vote_pct", { precision: 5, scale: 2 }),
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]),
  // party that held seat before this election
  rating: mysqlEnum("rating", ["Solid D", "Lean D", "Toss-up", "Lean R", "Solid R", "Safe D", "Safe R"]),
  status: mysqlEnum("status", ["Scheduled", "Primary", "General", "Called", "Certified"]).default("Scheduled").notNull(),
  primaryDate: varchar("primary_date", { length: 32 }),
  primaryRunoffDate: varchar("primary_runoff_date", { length: 32 }),
  generalDate: varchar("general_date", { length: 32 }).default("November 3, 2026"),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var houseRaces = mysqlTable("house_races", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  district: int("district").notNull(),
  // 0 = at-large
  districtLabel: varchar("district_label", { length: 16 }).notNull(),
  // "AL", "1", "2", etc.
  incumbent: varchar("incumbent", { length: 128 }),
  incumbentParty: mysqlEnum("incumbent_party", ["D", "R", "I"]),
  incumbentRetiring: boolean("incumbent_retiring").default(false).notNull(),
  isVacancy: boolean("is_vacancy").default(false).notNull(),
  // true if seat was vacant at start of 119th Congress (CA-01, GA-14, NJ-11)
  candidate1Name: varchar("candidate1_name", { length: 128 }),
  candidate1Party: mysqlEnum("candidate1_party", ["D", "R", "I", "L", "G"]),
  candidate1Votes: bigint("candidate1_votes", { mode: "number" }).default(0),
  candidate1VotePct: decimal("candidate1_vote_pct", { precision: 5, scale: 2 }),
  candidate2Name: varchar("candidate2_name", { length: 128 }),
  candidate2Party: mysqlEnum("candidate2_party", ["D", "R", "I", "L", "G"]),
  candidate2Votes: bigint("candidate2_votes", { mode: "number" }).default(0),
  candidate2VotePct: decimal("candidate2_vote_pct", { precision: 5, scale: 2 }),
  calledWinner: varchar("called_winner", { length: 128 }),
  calledParty: mysqlEnum("called_party", ["D", "R", "I"]),
  calledAt: bigint("called_at", { mode: "number" }),
  // UTC ms timestamp when winner was called
  primaryWinner: varchar("primary_winner", { length: 128 }),
  // name of the called primary winner
  primaryParty: mysqlEnum("primary_party", ["D", "R", "I"]),
  // party of the primary winner
  otherCandidateName: varchar("other_candidate_name", { length: 128 }),
  // third-party / independent candidate
  otherCandidateParty: mysqlEnum("other_candidate_party", ["D", "R", "I", "L", "G"]),
  otherVotes: bigint("other_votes", { mode: "number" }).default(0),
  otherVotePct: decimal("other_vote_pct", { precision: 5, scale: 2 }),
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]),
  // party that held seat before this election
  rating: mysqlEnum("rating", ["Solid D", "Lean D", "Toss-up", "Lean R", "Solid R", "Safe D", "Safe R"]),
  status: mysqlEnum("status", ["Scheduled", "Primary", "General", "Called", "Certified"]).default("Scheduled").notNull(),
  primaryDate: varchar("primary_date", { length: 32 }),
  generalDate: varchar("general_date", { length: 32 }).default("November 3, 2026"),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var redistrictingStates = mysqlTable("redistricting_states", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull().unique(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  enacted: boolean("enacted").default(false).notNull(),
  // true = map already enacted
  reason: text("reason"),
  status: varchar("status", { length: 128 }),
  method: varchar("method", { length: 128 }),
  delegationBefore: varchar("delegation_before", { length: 64 }),
  projectedImpact: varchar("projected_impact", { length: 64 }),
  litigationNotes: text("litigation_notes"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var referendums = mysqlTable("referendums", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  yesLabel: varchar("yes_label", { length: 128 }).default("Yes"),
  noLabel: varchar("no_label", { length: 128 }).default("No"),
  yesVotes: bigint("yes_votes", { mode: "number" }).default(0),
  noVotes: bigint("no_votes", { mode: "number" }).default(0),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  electionDate: varchar("election_date", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["Scheduled", "Voting", "Called", "Certified"]).default("Scheduled").notNull(),
  calledResult: mysqlEnum("called_result", ["Yes", "No"]),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var senators = mysqlTable("senators", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  party: mysqlEnum("party", ["D", "R", "I"]).notNull(),
  senateClass: int("senate_class").notNull(),
  // 1, 2, or 3
  nextElectionYear: int("next_election_year").notNull(),
  // 2026, 2028, or 2030
  isUpIn2026: boolean("is_up_in_2026").default(false).notNull(),
  bio: text("bio"),
  committees: text("committees"),
  // JSON array of committee names
  websiteUrl: varchar("website_url", { length: 256 }),
  // Official senate.gov page URL
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var pinnedKeyRaces = mysqlTable("pinned_key_races", {
  id: int("id").autoincrement().primaryKey(),
  chamber: mysqlEnum("chamber", ["senate", "house"]).notNull(),
  raceId: int("race_id").notNull(),
  // FK to senate_races.id or house_races.id
  sortOrder: int("sort_order").default(0).notNull(),
  // lower = higher in list
  pinnedAt: timestamp("pinned_at").defaultNow().notNull()
});
var governorRaces = mysqlTable("governor_races", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull().unique(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  // Incumbent info
  incumbentName: varchar("incumbent_name", { length: 128 }),
  // null if open seat
  incumbentParty: mysqlEnum("incumbent_party", ["D", "R", "I"]),
  // party of outgoing/current gov
  isOpen: boolean("is_open").default(false).notNull(),
  // true = no incumbent running
  isTermLimited: boolean("is_term_limited").default(false).notNull(),
  // Previous party (for flip tracking)
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]).notNull(),
  // party that currently holds seat
  // Race rating
  rating: mysqlEnum("rating", [
    "Solid D",
    "Likely D",
    "Lean D",
    "Toss-up",
    "Lean R",
    "Likely R",
    "Solid R"
  ]).notNull().default("Solid R"),
  // Election dates
  primaryDate: varchar("primary_date", { length: 64 }),
  // e.g. "June 2, 2026"
  runoffDate: varchar("runoff_date", { length: 64 }),
  generalDate: varchar("general_date", { length: 64 }).notNull().default("November 3, 2026"),
  isSpecial: boolean("is_special").default(false).notNull(),
  // Election night results
  status: mysqlEnum("status", ["Scheduled", "Voting", "Called", "Certified"]).default("Scheduled").notNull(),
  calledParty: mysqlEnum("called_party", ["D", "R", "I"]),
  // set when called
  calledWinner: varchar("called_winner", { length: 128 }),
  // winner name when called
  calledAt: bigint("called_at", { mode: "number" }),
  // UTC ms timestamp when winner was called
  demVotes: bigint("dem_votes", { mode: "number" }).default(0),
  repVotes: bigint("rep_votes", { mode: "number" }).default(0),
  otherCandidateName: varchar("other_candidate_name", { length: 128 }),
  // third-party / independent candidate
  otherCandidateParty: mysqlEnum("other_candidate_party", ["D", "R", "I", "L", "G"]),
  otherVotes: bigint("other_votes", { mode: "number" }).default(0),
  otherVotePct: decimal("other_vote_pct", { precision: 5, scale: 2 }),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  // Candidates (leading candidates pre-election)
  demCandidate: varchar("dem_candidate", { length: 128 }),
  repCandidate: varchar("rep_candidate", { length: 128 }),
  // Candidate bios & background
  demPreviousOffice: varchar("dem_previous_office", { length: 256 }),
  repPreviousOffice: varchar("rep_previous_office", { length: 256 }),
  demBio: text("dem_bio"),
  repBio: text("rep_bio"),
  // Notes / context
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _require = createRequire(import.meta.url);
var mysql = _require("mysql2/promise");
var _db = null;
var _pool = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 1e4
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllSenateRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senateRaces).orderBy(senateRaces.stateName);
}
async function getSenateRaceById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(senateRaces).where(eq(senateRaces.id, id)).limit(1);
  return result[0] ?? null;
}
async function updateSenateRace(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(senateRaces).set(data).where(eq(senateRaces.id, id));
}
async function getAllHouseRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(houseRaces).orderBy(houseRaces.stateName, houseRaces.district);
}
async function getHouseRaceById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(houseRaces).where(eq(houseRaces.id, id)).limit(1);
  return result[0] ?? null;
}
async function getHouseRacesByState(stateCode) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(houseRaces).where(eq(houseRaces.stateCode, stateCode)).orderBy(houseRaces.district);
}
async function updateHouseRace(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(houseRaces).set(data).where(eq(houseRaces.id, id));
}
async function getAllRedistrictingStates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(redistrictingStates).orderBy(redistrictingStates.stateName);
}
async function updateRedistrictingState(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(redistrictingStates).set(data).where(eq(redistrictingStates.id, id));
}
async function getAllReferendums() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referendums).orderBy(referendums.stateName);
}
async function updateReferendum(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(referendums).set(data).where(eq(referendums.id, id));
}
var BASE_COMPOSITION = {
  senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0 },
  // House: 217R / 214D / 1I / 2 vacancies as of Apr 8, 2026 (CNN, Apr 8 2026)
  // GA-14 filled Apr 7 by Clay Fuller (R) - special election won
  // NJ-11 called D on Apr 16, 2026 → D 214→215, R 217→218, vacancies 2→1 (only CA-01)
  // FL-20 vacant Apr 21, 2026 (Cherfilus-McCormick resigned) → D 215→214, vacancies 1→2 (CA-01 + FL-20)
  house: { D: 214, R: 218, I: 1, total: 435, vacancies: 2 }
};
async function getScoreboard() {
  const db = await getDb();
  if (!db) return {
    senate: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 },
    house: { D: 0, R: 0, I: 0, uncalled: 0, total: 0 },
    composition: {
      senate: { ...BASE_COMPOSITION.senate, lastUpdated: (/* @__PURE__ */ new Date("2026-04-08")).toISOString(), source: "senate.gov / pressgallery.house.gov" },
      house: { ...BASE_COMPOSITION.house, lastUpdated: (/* @__PURE__ */ new Date("2026-04-08")).toISOString(), source: "senate.gov / pressgallery.house.gov" }
    }
  };
  const senateRows = await db.select().from(senateRaces);
  const houseRows = await db.select().from(houseRaces);
  const tally = (rows) => {
    const counts = { D: 0, R: 0, I: 0, uncalled: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "Called" || r.status === "Certified") {
        if (r.calledParty === "D") counts.D++;
        else if (r.calledParty === "R") counts.R++;
        else if (r.calledParty === "I") counts.I++;
        else counts.uncalled++;
      } else {
        counts.uncalled++;
      }
    }
    return counts;
  };
  const computeLiveComposition = (base, rows) => {
    let D = base.D;
    let R = base.R;
    let I = base.I;
    let vacancies = base.vacancies;
    let latestUpdate = null;
    for (const r of rows) {
      if (r.status !== "Called" && r.status !== "Certified") continue;
      if (!r.calledParty) continue;
      if (!latestUpdate || r.updatedAt > latestUpdate) latestUpdate = r.updatedAt;
      if (r.isSpecial) {
        if (vacancies > 0) {
          vacancies--;
          if (r.calledParty === "D") D++;
          else if (r.calledParty === "R") R++;
          else if (r.calledParty === "I") I++;
        }
      } else if (r.previousParty && r.previousParty !== r.calledParty) {
        if (r.previousParty === "D") D--;
        else if (r.previousParty === "R") R--;
        else if (r.previousParty === "I") I--;
        if (r.calledParty === "D") D++;
        else if (r.calledParty === "R") R++;
        else if (r.calledParty === "I") I++;
      }
    }
    D = Math.max(0, D);
    R = Math.max(0, R);
    I = Math.max(0, I);
    vacancies = Math.max(0, vacancies);
    const lastUpdated = latestUpdate ? latestUpdate.toISOString() : (/* @__PURE__ */ new Date("2026-04-08")).toISOString();
    return { D, R, I, total: base.total, vacancies, lastUpdated, source: "senate.gov / pressgallery.house.gov (119th Congress base)" };
  };
  const senateComp = computeLiveComposition(
    BASE_COMPOSITION.senate,
    senateRows.map((r) => ({ ...r, isSpecial: r.isSpecial ?? false }))
  );
  const houseComp = computeLiveComposition(
    BASE_COMPOSITION.house,
    houseRows.map((r) => ({
      ...r,
      // isSpecial = true if this seat was vacant at start of 119th Congress
      isSpecial: r.isVacancy === true,
      previousParty: r.previousParty ?? null
    }))
  );
  const countFlips = (rows) => {
    let dToR = 0, rToD = 0;
    for (const r of rows) {
      if ((r.status === "Called" || r.status === "Certified") && r.calledParty && r.previousParty) {
        if (r.previousParty === "D" && r.calledParty === "R") dToR++;
        else if (r.previousParty === "R" && r.calledParty === "D") rToD++;
      }
    }
    return { dToR, rToD, total: dToR + rToD };
  };
  const govRows = await db.select().from(governorRaces);
  const govTally = (() => {
    let D = 0, R = 0, tossup = 0;
    for (const r of govRows) {
      if (r.status === "Called" || r.status === "Certified") {
        if (r.calledParty === "D") D++;
        else if (r.calledParty === "R") R++;
        else tossup++;
      } else {
        const rating = r.rating ?? "";
        if (rating === "Solid D" || rating === "Likely D") D++;
        else if (rating === "Solid R" || rating === "Likely R") R++;
        else tossup++;
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
      house: houseComp
    },
    flips: {
      senate: countFlips(senateRows),
      house: countFlips(houseRows)
    }
  };
}
async function getFlipTracker() {
  const db = await getDb();
  if (!db) return {
    senate: { dToR: [], rToD: [], netD: 0, netR: 0 },
    house: { dToR: [], rToD: [], netD: 0, netR: 0 },
    governors: { dToR: [], rToD: [], netD: 0, netR: 0 }
  };
  const [senateRows, houseRows, govRows] = await Promise.all([
    db.select().from(senateRaces),
    db.select().from(houseRaces),
    db.select().from(governorRaces)
  ]);
  const detectFlips = (rows) => {
    const dToR = [];
    const rToD = [];
    for (const r of rows) {
      if ((r.status === "Called" || r.status === "Certified") && r.calledParty && r.previousParty) {
        if (r.previousParty === "D" && r.calledParty === "R") dToR.push(r);
        else if (r.previousParty === "R" && r.calledParty === "D") rToD.push(r);
      }
    }
    return {
      dToR,
      rToD,
      netD: rToD.length - dToR.length,
      netR: dToR.length - rToD.length
    };
  };
  return {
    senate: detectFlips(senateRows),
    house: detectFlips(houseRows.map((r) => ({ ...r, districtLabel: r.districtLabel }))),
    governors: detectFlips(govRows.map((r) => ({ ...r, calledWinner: r.calledWinner ?? null })))
  };
}
async function getAllSenators() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senators).orderBy(senators.stateCode, senators.senateClass);
}
async function getSenatorsByState(stateCode) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(senators).where(eq(senators.stateCode, stateCode)).orderBy(senators.senateClass);
}
async function searchSenators(query) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db.select().from(senators).where(
    sql`LOWER(name) LIKE LOWER(${q}) OR LOWER(state_name) LIKE LOWER(${q}) OR LOWER(state_code) LIKE LOWER(${q})`
  ).orderBy(senators.stateCode).limit(20);
}
async function getSenatorById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(senators).where(eq(senators.id, id)).limit(1);
  return result[0] ?? null;
}
async function createAdminSession(token, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(adminSessions).values({ token, expiresAt });
}
async function validateAdminSession(token) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(adminSessions).where(and(eq(adminSessions.token, token), sql`expires_at > NOW()`)).limit(1);
  return result.length > 0;
}
async function deleteAdminSession(token) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.token, token));
}
async function getPinnedKeyRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pinnedKeyRaces).orderBy(pinnedKeyRaces.sortOrder, pinnedKeyRaces.pinnedAt);
}
async function pinKeyRace(chamber, raceId) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(pinnedKeyRaces).where(and(eq(pinnedKeyRaces.chamber, chamber), eq(pinnedKeyRaces.raceId, raceId))).limit(1);
  if (existing.length > 0) return existing[0];
  const [result] = await db.insert(pinnedKeyRaces).values({ chamber, raceId, sortOrder: 0 });
  return result;
}
async function unpinKeyRaceByRace(chamber, raceId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pinnedKeyRaces).where(and(eq(pinnedKeyRaces.chamber, chamber), eq(pinnedKeyRaces.raceId, raceId)));
}
async function getAllGovernorRaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(governorRaces).orderBy(governorRaces.stateName);
}
async function getGovernorRaceById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(governorRaces).where(eq(governorRaces.id, id)).limit(1);
  return result[0] ?? null;
}
async function getGovernorRaceByState(stateCode) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(governorRaces).where(eq(governorRaces.stateCode, stateCode)).limit(1);
  return result[0] ?? null;
}
async function updateGovernorRace(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(governorRaces).set(data).where(eq(governorRaces.id, id));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { nanoid } from "nanoid";

// server/ws.ts
import { WebSocketServer, WebSocket } from "ws";
var wss = null;
function attachWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/election-ws" });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
    ws.on("error", (err) => {
      console.error("[WS] Client error:", err.message);
    });
  });
  console.log("[WS] WebSocket server attached at /election-ws");
  return wss;
}
function broadcastElectionEvent(event) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  console.log(`[WS] Broadcast ${event.type} to ${sent} client(s):`, event.stateCode + (event.chamber === "house" ? `-${event.district}` : ""));
}
function getConnectedClientCount() {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) count++;
  });
  return count;
}

// server/candidatePhotos.ts
var BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";
var CANDIDATE_PHOTOS = {
  // Senate incumbents
  "jon ossoff": `${BASE}/jon-ossoff_2eafec1f.jpg`,
  "gary peters": `${BASE}/gary-peters_50e7899d.jpg`,
  "john hickenlooper": `${BASE}/john-hickenlooper_890f9235.jpg`,
  "dick durbin": `${BASE}/dick-durbin_05b3c956.jpg`,
  "tina smith": `${BASE}/tina-smith_853cdf1a.jpg`,
  "jeanne shaheen": `${BASE}/jeanne-shaheen_9a7397d7.jpg`,
  "cory booker": `${BASE}/cory-booker_2545ffe9.jpg`,
  "ben ray luj\xE1n": `${BASE}/ben-ray-lujan_430c3fec.jpg`,
  "ben ray lujan": `${BASE}/ben-ray-lujan_430c3fec.jpg`,
  // IL Senate candidates
  "juliana stratton": `${BASE}/juliana-stratton_a6b800ae.jpg`,
  // House incumbents
  "david schweikert": `${BASE}/david-schweikert_c1fa812e.jpg`,
  "adam gray": `${BASE}/adam-gray_79bd8b30.jpg`,
  "gabe evans": `${BASE}/gabe-evans_ba2df679.jpg`,
  "zach nunn": `${BASE}/zach-nunn_eac8970b.jpg`,
  "tom suozzi": `${BASE}/tom-suozzi_0c4eae93.jpg`,
  "john w. mannion": `${BASE}/john-mannion_bdcaf070.jpg`,
  "john mannion": `${BASE}/john-mannion_bdcaf070.jpg`,
  "don davis": `${BASE}/don-davis_e33de8a9.jpg`,
  "janelle s. bynum": `${BASE}/janelle-bynum_6eacebec.jpg`,
  "janelle bynum": `${BASE}/janelle-bynum_6eacebec.jpg`,
  "henry cuellar": `${BASE}/henry-cuellar_758f6022.jpg`,
  "eugene vindman": `${BASE}/eugene-vindman_6868eaf7.jpg`,
  "nicholas j. begich": `${BASE}/nicholas-begich_eb851933.jpg`,
  "nicholas begich": `${BASE}/nicholas-begich_eb851933.jpg`,
  "elijah crane": `${BASE}/elijah-crane_0100ed41.jpg`,
  // NC-1 challenger
  "laurie buckhout": `${BASE}/laurie-buckhout_18f4c9b7.jpg`
};
var PARTY_LOGOS = {
  D: `${BASE}/party-dem_659a330d.svg`,
  R: `${BASE}/party-rep_e24344e9.svg`
};
function getCandidatePhoto(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return CANDIDATE_PHOTOS[key] ?? null;
}

// server/routers.ts
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
async function requireAdminToken(token) {
  if (!token) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Admin token required" });
  const valid = await validateAdminSession(token);
  if (!valid) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Invalid or expired admin token" });
}
var ratingEnum2 = z2.enum(["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"]);
var raceStatusEnum2 = z2.enum(["Scheduled", "Primary", "General", "Called", "Certified"]);
var partyEnum = z2.enum(["D", "R", "I", "L", "G"]);
var partyMainEnum = z2.enum(["D", "R", "I"]);
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── Admin Auth ─────────────────────────────────────────────────────────────
  admin: router({
    login: publicProcedure.input(z2.object({ password: z2.string() })).mutation(async ({ input }) => {
      if (!ADMIN_PASSWORD) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Admin password not configured" });
      }
      if (input.password !== ADMIN_PASSWORD) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "Incorrect password" });
      }
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await createAdminSession(token, expiresAt);
      return { token, expiresAt };
    }),
    logout: publicProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input }) => {
      await deleteAdminSession(input.token);
      return { success: true };
    }),
    verify: publicProcedure.input(z2.object({ token: z2.string() })).query(async ({ input }) => {
      const valid = await validateAdminSession(input.token);
      return { valid };
    })
  }),
  // ─── Senate ─────────────────────────────────────────────────────────────────
  senate: router({
    list: publicProcedure.query(async () => {
      return getAllSenateRaces();
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getSenateRaceById(input.id);
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      incumbent: z2.string().nullable().optional(),
      incumbentParty: partyMainEnum.nullable().optional(),
      incumbentRetiring: z2.boolean().optional(),
      candidate1Name: z2.string().nullable().optional(),
      candidate1Party: partyEnum.nullable().optional(),
      candidate1Votes: z2.number().int().min(0).nullable().optional(),
      candidate1VotePct: z2.number().min(0).max(100).nullable().optional(),
      candidate2Name: z2.string().nullable().optional(),
      candidate2Party: partyEnum.nullable().optional(),
      candidate2Votes: z2.number().int().min(0).nullable().optional(),
      candidate2VotePct: z2.number().min(0).max(100).nullable().optional(),
      calledWinner: z2.string().nullable().optional(),
      calledParty: partyMainEnum.nullable().optional(),
      primaryWinner: z2.string().nullable().optional(),
      primaryParty: partyMainEnum.nullable().optional(),
      otherCandidateName: z2.string().nullable().optional(),
      otherCandidateParty: partyEnum.nullable().optional(),
      otherVotes: z2.number().int().min(0).nullable().optional(),
      otherVotePct: z2.number().min(0).max(100).nullable().optional(),
      rating: ratingEnum2.nullable().optional(),
      status: raceStatusEnum2.optional(),
      primaryDate: z2.string().nullable().optional(),
      primaryRunoffDate: z2.string().nullable().optional(),
      pctReporting: z2.number().min(0).max(100).nullable().optional(),
      notes: z2.string().nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      if (input.calledWinner !== void 0) {
        updateData.calledAt = input.calledWinner ? Date.now() : null;
      }
      await updateSenateRace(id, updateData);
      return { success: true };
    })
  }),
  // ─── House ──────────────────────────────────────────────────────────────────
  house: router({
    list: publicProcedure.query(async () => {
      return getAllHouseRaces();
    }),
    byState: publicProcedure.input(z2.object({ stateCode: z2.string().length(2) })).query(async ({ input }) => {
      return getHouseRacesByState(input.stateCode);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getHouseRaceById(input.id);
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      incumbent: z2.string().nullable().optional(),
      incumbentParty: partyMainEnum.nullable().optional(),
      incumbentRetiring: z2.boolean().optional(),
      candidate1Name: z2.string().nullable().optional(),
      candidate1Party: partyEnum.nullable().optional(),
      candidate1Votes: z2.number().int().min(0).nullable().optional(),
      candidate1VotePct: z2.number().min(0).max(100).nullable().optional(),
      candidate2Name: z2.string().nullable().optional(),
      candidate2Party: partyEnum.nullable().optional(),
      candidate2Votes: z2.number().int().min(0).nullable().optional(),
      candidate2VotePct: z2.number().min(0).max(100).nullable().optional(),
      calledWinner: z2.string().nullable().optional(),
      calledParty: partyMainEnum.nullable().optional(),
      primaryWinner: z2.string().nullable().optional(),
      primaryParty: partyMainEnum.nullable().optional(),
      otherCandidateName: z2.string().nullable().optional(),
      otherCandidateParty: partyEnum.nullable().optional(),
      otherVotes: z2.number().int().min(0).nullable().optional(),
      otherVotePct: z2.number().min(0).max(100).nullable().optional(),
      rating: ratingEnum2.nullable().optional(),
      status: raceStatusEnum2.optional(),
      primaryDate: z2.string().nullable().optional(),
      pctReporting: z2.number().min(0).max(100).nullable().optional(),
      notes: z2.string().nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      if (input.calledWinner !== void 0) {
        updateData.calledAt = input.calledWinner ? Date.now() : null;
      }
      await updateHouseRace(id, updateData);
      return { success: true };
    })
  }),
  // ─── Redistricting ──────────────────────────────────────────────────────────
  redistricting: router({
    list: publicProcedure.query(async () => {
      return getAllRedistrictingStates();
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      enacted: z2.boolean().optional(),
      reason: z2.string().nullable().optional(),
      status: z2.string().nullable().optional(),
      method: z2.string().nullable().optional(),
      delegationBefore: z2.string().nullable().optional(),
      projectedImpact: z2.string().nullable().optional(),
      litigationNotes: z2.string().nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      await updateRedistrictingState(id, updateData);
      return { success: true };
    })
  }),
  // ─── Referendums ────────────────────────────────────────────────────────────
  referendum: router({
    list: publicProcedure.query(async () => {
      return getAllReferendums();
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      yesVotes: z2.number().min(0).optional(),
      noVotes: z2.number().min(0).optional(),
      pctReporting: z2.number().min(0).max(100).optional(),
      status: z2.enum(["Scheduled", "Voting", "Called", "Certified"]).optional(),
      calledResult: z2.enum(["Yes", "No"]).nullable().optional(),
      notes: z2.string().nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      await updateReferendum(id, updateData);
      return { success: true };
    })
  }),
  // ─── Primary Results Workflow ─────────────────────────────────────────────────
  primary: router({
    // Promote a primary winner to the general election candidate slot
    promoteSenate: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      winnerName: z2.string().min(1),
      winnerParty: partyEnum,
      primaryVotePct: z2.number().min(0).max(100).nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      await updateSenateRace(input.id, {
        candidate1Name: input.winnerName,
        candidate1Party: input.winnerParty,
        status: "General",
        notes: `Primary winner: ${input.winnerName} (${input.winnerParty})`
      });
      return { success: true };
    }),
    promoteHouse: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      winnerName: z2.string().min(1),
      winnerParty: partyEnum,
      primaryVotePct: z2.number().min(0).max(100).nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      await updateHouseRace(input.id, {
        candidate1Name: input.winnerName,
        candidate1Party: input.winnerParty,
        status: "General",
        notes: `Primary winner: ${input.winnerName} (${input.winnerParty})`
      });
      return { success: true };
    }),
    // List all races currently in Primary status
    listPending: publicProcedure.input(z2.object({ adminToken: z2.string() })).query(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const [senateRaces2, houseRaces2] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces()
      ]);
      return {
        senate: senateRaces2.filter((r) => r.status === "Primary"),
        house: houseRaces2.filter((r) => r.status === "Primary")
      };
    })
  }),
  // ─── Election Night Rapid Entry ─────────────────────────────────────────────
  electionNight: router({
    // Returns all General + Called races sorted by competitiveness for rapid entry
    queue: publicProcedure.input(z2.object({ adminToken: z2.string() })).query(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const [senateRaces2, houseRaces2, govRaces] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces(),
        getAllGovernorRaces()
      ]);
      const ratingOrder = {
        "Toss-up": 0,
        "Lean D": 1,
        "Lean R": 2,
        "Likely D": 3,
        "Likely R": 4,
        "Solid D": 5,
        "Solid R": 6
      };
      const senateQueue = senateRaces2.filter((r) => r.status === "General" || r.status === "Called" || r.status === "Certified").sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
      const houseQueue = houseRaces2.filter((r) => r.status === "General" || r.status === "Called" || r.status === "Certified").sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
      const governorQueue = govRaces.filter((r) => r.status === "Voting" || r.status === "Called" || r.status === "Certified").sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
      return { senate: senateQueue, house: houseQueue, governors: governorQueue };
    }),
    // Rapid single-race update: vote pcts + called winner + pct reporting
    updateRace: publicProcedure.input(z2.object({
      adminToken: z2.string(),
      chamber: z2.enum(["senate", "house", "governor"]),
      id: z2.number(),
      candidate1VotePct: z2.number().min(0).max(100).nullable().optional(),
      candidate2VotePct: z2.number().min(0).max(100).nullable().optional(),
      // Governor-specific vote fields (dem/rep votes as raw numbers)
      demVotes: z2.number().min(0).optional(),
      repVotes: z2.number().min(0).optional(),
      pctReporting: z2.number().min(0).max(100).nullable().optional(),
      calledWinner: z2.string().nullable().optional(),
      calledParty: partyMainEnum.nullable().optional(),
      status: raceStatusEnum2.optional(),
      // Governor status uses different enum values
      govStatus: z2.enum(["Scheduled", "Voting", "Called", "Certified"]).optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, chamber, govStatus, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      const calledAtMs = input.calledWinner ? Date.now() : input.calledWinner === null ? null : void 0;
      if (calledAtMs !== void 0) updateData.calledAt = calledAtMs;
      if (chamber === "senate") {
        await updateSenateRace(id, updateData);
      } else if (chamber === "house") {
        await updateHouseRace(id, updateData);
      } else {
        const govData = {};
        if (input.pctReporting !== void 0) govData.pctReporting = input.pctReporting;
        if (input.calledWinner !== void 0) govData.calledWinner = input.calledWinner;
        if (input.calledParty !== void 0) govData.calledParty = input.calledParty;
        if (input.demVotes !== void 0) govData.demVotes = input.demVotes;
        if (input.repVotes !== void 0) govData.repVotes = input.repVotes;
        if (govStatus !== void 0) govData.status = govStatus;
        if (calledAtMs !== void 0) govData.calledAt = calledAtMs;
        await updateGovernorRace(id, govData);
      }
      if (input.calledWinner && input.calledParty) {
        const raceInfo = chamber === "senate" ? await getSenateRaceById(id) : chamber === "house" ? await getHouseRaceById(id) : await getGovernorRaceById(id);
        broadcastElectionEvent({
          type: "race_called",
          chamber: input.chamber,
          stateCode: raceInfo?.stateCode ?? String(id),
          stateName: raceInfo?.stateName ?? void 0,
          district: chamber === "house" && raceInfo && "district" in raceInfo ? raceInfo.district : void 0,
          districtLabel: chamber === "house" && raceInfo && "districtLabel" in raceInfo ? raceInfo.districtLabel : void 0,
          calledParty: input.calledParty,
          calledWinner: input.calledWinner,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else if ((input.status === "General" || govStatus === "Voting") && !input.calledWinner) {
        const raceInfo = chamber === "senate" ? await getSenateRaceById(id) : chamber === "house" ? await getHouseRaceById(id) : await getGovernorRaceById(id);
        broadcastElectionEvent({
          type: "race_uncalled",
          chamber: input.chamber,
          stateCode: raceInfo?.stateCode ?? String(id),
          stateName: raceInfo?.stateName ?? void 0,
          district: chamber === "house" && raceInfo && "district" in raceInfo ? raceInfo.district : void 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return { success: true, calledAt: calledAtMs ?? null };
    }),
    // Batch update: submit multiple race results at once
    batchUpdate: publicProcedure.input(z2.object({
      adminToken: z2.string(),
      updates: z2.array(z2.object({
        chamber: z2.enum(["senate", "house"]),
        id: z2.number(),
        candidate1VotePct: z2.number().min(0).max(100).nullable().optional(),
        candidate2VotePct: z2.number().min(0).max(100).nullable().optional(),
        pctReporting: z2.number().min(0).max(100).nullable().optional(),
        calledWinner: z2.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        status: raceStatusEnum2.optional()
      }))
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const results = await Promise.allSettled(
        input.updates.map(async (u) => {
          const { id, chamber, ...data } = u;
          const updateData = {};
          for (const [k, v] of Object.entries(data)) {
            if (v !== void 0) updateData[k] = v;
          }
          if (chamber === "senate") {
            await updateSenateRace(id, updateData);
          } else {
            await updateHouseRace(id, updateData);
          }
          if (u.calledWinner && u.calledParty) {
            broadcastElectionEvent({
              type: "race_called",
              chamber,
              stateCode: String(id),
              district: chamber === "house" ? id : void 0,
              calledParty: u.calledParty,
              calledWinner: u.calledWinner,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          return { id, chamber };
        })
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed };
    })
  }),
  // ─── Key Races ───────────────────────────────────────────────────────────
  keyRaces: router({
    // Returns pinned key races (admin-curated) if any exist, otherwise falls back to auto-computed
    get: publicProcedure.query(async () => {
      const [senateRaces2, houseRaces2, pinned] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces(),
        getPinnedKeyRaces()
      ]);
      const RATING_ORDER = {
        "Toss-up": 0,
        "Lean D": 1,
        "Lean R": 2,
        "Likely D": 3,
        "Likely R": 4,
        "Solid D": 5,
        "Solid R": 6
      };
      const mapSenate = (r, pinnedId) => ({
        id: r.id,
        pinnedId: pinnedId ?? null,
        chamber: "senate",
        stateCode: r.stateCode,
        stateName: r.stateName,
        rating: r.rating,
        incumbent: r.incumbent,
        incumbentParty: r.incumbentParty,
        candidate1Name: r.candidate1Name,
        candidate1Party: r.candidate1Party,
        candidate1Photo: getCandidatePhoto(r.candidate1Name),
        candidate2Name: r.candidate2Name,
        candidate2Party: r.candidate2Party,
        candidate2Photo: getCandidatePhoto(r.candidate2Name),
        partyLogos: PARTY_LOGOS,
        status: r.status,
        calledParty: r.calledParty,
        calledWinner: r.calledWinner,
        incumbentRetiring: r.incumbentRetiring,
        notes: r.notes,
        generalDate: r.generalDate,
        primaryDate: r.primaryDate ?? null,
        isSpecial: r.isSpecial ?? false
      });
      const mapHouse = (r, pinnedId) => ({
        id: r.id,
        pinnedId: pinnedId ?? null,
        chamber: "house",
        stateCode: r.stateCode,
        stateName: r.stateName,
        district: r.district,
        districtLabel: r.districtLabel,
        rating: r.rating,
        incumbent: r.incumbent,
        incumbentParty: r.incumbentParty,
        candidate1Name: r.candidate1Name,
        candidate1Party: r.candidate1Party,
        candidate1Photo: getCandidatePhoto(r.candidate1Name),
        candidate2Name: r.candidate2Name,
        candidate2Party: r.candidate2Party,
        candidate2Photo: getCandidatePhoto(r.candidate2Name),
        partyLogos: PARTY_LOGOS,
        status: r.status,
        calledParty: r.calledParty,
        calledWinner: r.calledWinner,
        incumbentRetiring: r.incumbentRetiring,
        notes: r.notes,
        generalDate: r.generalDate,
        primaryDate: r.primaryDate ?? null,
        isSpecial: false
      });
      if (pinned.length > 0) {
        const pinnedSenate = pinned.filter((p) => p.chamber === "senate").map((p) => {
          const race = senateRaces2.find((r) => r.id === p.raceId);
          return race ? mapSenate(race, p.id) : null;
        }).filter(Boolean);
        const pinnedHouse = pinned.filter((p) => p.chamber === "house").map((p) => {
          const race = houseRaces2.find((r) => r.id === p.raceId);
          return race ? mapHouse(race, p.id) : null;
        }).filter(Boolean);
        return { senate: pinnedSenate, house: pinnedHouse, isPinned: true };
      }
      const senateKey = senateRaces2.filter((r) => r.rating && ["Toss-up", "Lean D", "Lean R", "Likely D", "Likely R"].includes(r.rating) && r.status !== "Called" && r.status !== "Certified").sort((a, b) => (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9)).slice(0, 20).map((r) => mapSenate(r));
      const houseKey = houseRaces2.filter((r) => r.rating && ["Toss-up", "Lean D", "Lean R", "Likely D", "Likely R"].includes(r.rating) && r.status !== "Called" && r.status !== "Certified").sort((a, b) => (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9)).slice(0, 60).map((r) => mapHouse(r));
      return { senate: senateKey, house: houseKey, isPinned: false };
    }),
    // Admin: list all pinned races with their pin IDs
    listPinned: publicProcedure.query(async () => {
      return getPinnedKeyRaces();
    }),
    // Admin: pin a race to the Key Races sidebar
    pin: publicProcedure.input((input) => {
      const i = input;
      if (!i.adminToken || !i.chamber || !i.raceId) throw new TRPCError3({ code: "BAD_REQUEST", message: "adminToken, chamber, raceId required" });
      return i;
    }).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      await pinKeyRace(input.chamber, input.raceId);
      return { success: true };
    }),
    // Admin: unpin a race from the Key Races sidebar
    unpin: publicProcedure.input((input) => {
      const i = input;
      if (!i.adminToken || !i.chamber || !i.raceId) throw new TRPCError3({ code: "BAD_REQUEST", message: "adminToken, chamber, raceId required" });
      return i;
    }).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      await unpinKeyRaceByRace(input.chamber, input.raceId);
      return { success: true };
    }),
    // Admin: clear all pinned races (revert to auto-computed)
    clearAll: publicProcedure.input((input) => {
      const i = input;
      if (!i.adminToken) throw new TRPCError3({ code: "BAD_REQUEST", message: "adminToken required" });
      return i;
    }).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const pinned = await getPinnedKeyRaces();
      await Promise.all(pinned.map((p) => unpinKeyRaceByRace(p.chamber, p.raceId)));
      return { success: true, cleared: pinned.length };
    })
  }),
  // ─── Scoreboard ────────────────────────────────────────────────────────────
  scoreboard: router({
    get: publicProcedure.query(async () => {
      return getScoreboard();
    })
  }),
  // ─── Flip Tracker ────────────────────────────────────────────────────────────
  flips: router({
    get: publicProcedure.query(async () => {
      return getFlipTracker();
    })
  }),
  // ─── Live Status (viewer count + recent results for ticker) ──────────────────
  live: router({
    // Returns the number of WebSocket clients currently connected
    viewerCount: publicProcedure.query(() => {
      return { count: getConnectedClientCount() };
    }),
    // Returns the most recent called races for the results ticker (up to 20)
    recentResults: publicProcedure.query(async () => {
      const [senateRaces2, houseRaces2, govRaces, allReferendums] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces(),
        getAllGovernorRaces(),
        getAllReferendums()
      ]);
      const called = [
        ...senateRaces2.filter((r) => r.calledWinner && r.calledParty).map((r) => ({
          id: `senate-${r.id}`,
          chamber: "senate",
          stateCode: r.stateCode,
          stateName: r.stateName,
          district: null,
          calledWinner: r.calledWinner,
          calledParty: r.calledParty,
          previousParty: r.previousParty ?? null,
          updatedAt: r.updatedAt,
          generalDate: r.generalDate ?? null,
          isSpecial: r.isSpecial ?? false
        })),
        ...houseRaces2.filter((r) => r.calledWinner && r.calledParty).map((r) => ({
          id: `house-${r.id}`,
          chamber: "house",
          stateCode: r.stateCode,
          stateName: r.stateName,
          district: r.district,
          calledWinner: r.calledWinner,
          calledParty: r.calledParty,
          previousParty: r.previousParty ?? null,
          updatedAt: r.updatedAt,
          generalDate: r.generalDate ?? null,
          isSpecial: false
        })),
        ...govRaces.filter((r) => r.calledWinner && r.calledParty).map((r) => ({
          id: `governor-${r.id}`,
          chamber: "governor",
          stateCode: r.stateCode,
          stateName: r.stateName,
          district: null,
          calledWinner: r.calledWinner,
          calledParty: r.calledParty,
          previousParty: r.previousParty ?? null,
          updatedAt: r.updatedAt,
          generalDate: r.generalDate ?? null,
          isSpecial: r.isSpecial ?? false
        })),
        ...allReferendums.filter((r) => r.status === "Called" && r.calledResult).map((r) => ({
          id: `referendum-${r.id}`,
          chamber: "referendum",
          stateCode: r.stateCode,
          stateName: r.stateName,
          district: null,
          calledWinner: r.calledResult === "Yes" ? r.yesLabel ?? "YES PASSES" : r.noLabel ?? "NO WINS",
          calledParty: r.calledResult === "Yes" ? "YES" : "NO",
          previousParty: null,
          updatedAt: r.updatedAt,
          generalDate: null,
          isSpecial: false
        }))
      ].sort((a, b) => {
        const parseDate = (r) => {
          if (r.generalDate) {
            const d = new Date(r.generalDate);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          }
          return r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
        };
        return parseDate(b) - parseDate(a);
      }).slice(0, 20);
      return called;
    })
  }),
  // ─── Senators (all 100 members of the 119th Congress) ──────────────────────────────────────────
  senators: router({
    // Get all 100 senators
    list: publicProcedure.query(async () => {
      return getAllSenators();
    }),
    // Get senators for a specific state (2 per state)
    byState: publicProcedure.input(z2.object({ stateCode: z2.string().length(2) })).query(async ({ input }) => {
      return getSenatorsByState(input.stateCode);
    }),
    // Search senators by name, state name, or state code
    search: publicProcedure.input(z2.object({ query: z2.string().min(1).max(100) })).query(async ({ input }) => {
      return searchSenators(input.query);
    }),
    // Get a single senator by ID (full detail including bio, committees, website)
    getById: publicProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ input }) => {
      return getSenatorById(input.id);
    })
  }),
  // ─── Governor Races ─────────────────────────────────────────────────────────
  governor: router({
    // List all 36 governor races
    list: publicProcedure.query(async () => {
      return getAllGovernorRaces();
    }),
    // Get a single governor race by state code
    byState: publicProcedure.input(z2.object({ stateCode: z2.string().length(2) })).query(async ({ input }) => {
      return getGovernorRaceByState(input.stateCode);
    }),
    // Admin: update a governor race (rating, candidates, results, status)
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      adminToken: z2.string(),
      incumbentName: z2.string().nullable().optional(),
      incumbentParty: z2.enum(["D", "R", "I"]).nullable().optional(),
      isOpen: z2.boolean().optional(),
      isTermLimited: z2.boolean().optional(),
      previousParty: z2.enum(["D", "R", "I"]).optional(),
      rating: z2.enum(["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"]).optional(),
      primaryDate: z2.string().nullable().optional(),
      runoffDate: z2.string().nullable().optional(),
      generalDate: z2.string().optional(),
      demCandidate: z2.string().nullable().optional(),
      repCandidate: z2.string().nullable().optional(),
      status: z2.enum(["Scheduled", "Voting", "Called", "Certified"]).optional(),
      calledParty: z2.enum(["D", "R", "I"]).nullable().optional(),
      calledWinner: z2.string().nullable().optional(),
      demVotes: z2.number().min(0).optional(),
      repVotes: z2.number().min(0).optional(),
      otherCandidateName: z2.string().nullable().optional(),
      otherCandidateParty: partyEnum.nullable().optional(),
      otherVotes: z2.number().int().min(0).nullable().optional(),
      otherVotePct: z2.number().min(0).max(100).nullable().optional(),
      pctReporting: z2.number().min(0).max(100).optional(),
      notes: z2.string().nullable().optional()
    })).mutation(async ({ input }) => {
      await requireAdminToken(input.adminToken);
      const { id, adminToken: _t, ...data } = input;
      const updateData = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) updateData[k] = v;
      }
      if (input.calledWinner !== void 0) {
        updateData.calledAt = input.calledWinner ? Date.now() : null;
      }
      await updateGovernorRace(id, updateData);
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    // HMR is disabled because the Manus reverse proxy only forwards WebSocket
    // connections on the /election-ws path (used by the app's own live push).
    // Vite HMR requires the 'vite-hmr' WebSocket subprotocol which the proxy
    // rejects, causing console errors. Disabling HMR here prevents the
    // '@vite/client' from attempting WebSocket connections through the proxy.
    // When developing locally (localhost:3000), restart the server to see changes.
    hmr: false,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
var OG_META = `
    <!-- Open Graph / Facebook / LinkedIn -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://electionmap-duqshn4d.manus.space" />
    <meta property="og:title" content="2026 U.S. Election Center \u2014 Live Congressional Tracker" />
    <meta property="og:description" content="Real-time 2026 U.S. congressional election tracker \u2014 Senate, House, Governor, and ballot referendums with live results and interactive maps." />
    <meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/og-image-1200x630_b394dbdf.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="2026 U.S. Election Center \u2014 Real-Time Congressional Tracker with interactive map" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="2026 U.S. Election Center \u2014 Live Congressional Tracker" />
    <meta name="twitter:description" content="Real-time 2026 U.S. congressional election tracker \u2014 Senate, House, Governor, and ballot referendums with live results and interactive maps." />
    <meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/og-image-1200x630_b394dbdf.png" />`;
function injectOgMeta(html) {
  const cleaned = html.replace(/\s*<!-- Open Graph[\s\S]*?-->\s*/g, "").replace(/\s*<!-- Twitter Card[\s\S]*?-->\s*/g, "");
  return cleaned.replace("</head>", `${OG_META}
  </head>`);
}
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    // The Manus proxy only forwards WebSocket connections on the /election-ws path
    // (used by the app's own election push). Vite HMR requires the 'vite-hmr'
    // subprotocol which the proxy rejects. Disabling HMR here prevents the
    // 'failed to connect to websocket' error in the browser console.
    // HMR still works when accessing the server directly on localhost:3000.
    hmr: false,
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use("/@vite/client", async (req, res, next) => {
    try {
      const clientScript = await vite.transformRequest("/@vite/client");
      if (clientScript?.code) {
        const mockWs = `({
          readyState: 1,
          send: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          set onopen(fn) {},
          set onclose(fn) {},
          set onerror(fn) {},
          set onmessage(fn) {}
        })`;
        const patched = clientScript.code.replace(
          /createConnection:\s*\(\)\s*=>\s*new WebSocket\([^)]+\),/g,
          `createConnection: () => ${mockWs},`
        ).replace(
          /const socket = new WebSocket\(socketUrl, "vite-ping"\);/g,
          `const socket = ${mockWs}; if (false) /* vite-ping disabled */`
        );
        res.set("Content-Type", "application/javascript");
        res.set("Cache-Control", "no-cache");
        return res.send(patched);
      }
    } catch {
    }
    next();
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) return next();
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(injectOgMeta(page));
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ error: "API route not found" });
    }
    const indexPath = path2.resolve(distPath, "index.html");
    fs2.readFile(indexPath, "utf-8", (err, html) => {
      if (err) return res.status(500).send("Server error");
      res.set("Content-Type", "text/html").send(injectOgMeta(html));
    });
  });
}

// server/scheduledApUpdate.ts
import { parse as parseCookieHeader2 } from "cookie";
var OHIO_SENATE_ID = 35;
var OHIO_HOUSE_IDS = {};
for (let i = 1; i <= 15; i++) OHIO_HOUSE_IDS[i] = 298 + i;
var INDIANA_HOUSE_IDS = {};
for (let i = 1; i <= 9; i++) INDIANA_HOUSE_IDS[i] = 150 + i;
async function isCronRequest(req) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookieHeader2(cookieHeader);
    const sessionCookie = cookies["app_session_id"];
    if (!sessionCookie) return false;
    const parts = sessionCookie.split(".");
    if (parts.length < 2) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const openId = payload.openId;
    if (typeof openId !== "string" || !openId.startsWith("cron_")) return false;
    const exp = payload.exp;
    if (typeof exp === "number" && Date.now() / 1e3 > exp) {
      console.warn("[ScheduledApUpdate] Cron cookie expired");
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[ScheduledApUpdate] Cookie verification failed:", String(err));
    return false;
  }
}
var AP_DATA_BASE = "https://interactives.apelections.org/election-results/data-live/2026-05-05/results/national";
function mapParty(apParty) {
  if (!apParty) return null;
  const p = apParty.toUpperCase();
  if (p === "DEM" || p === "D") return "D";
  if (p === "GOP" || p === "REP" || p === "R") return "R";
  if (p === "IND" || p === "I") return "I";
  return null;
}
async function scrapeApResults() {
  const results = {
    ohioSenate: null,
    ohioHouse: {},
    indianaHouse: {}
  };
  const fetchJson = async (url) => {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Referer": "https://apnews.com/",
        "Origin": "https://apnews.com"
      },
      signal: AbortSignal.timeout(3e4)
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} for ${url}`);
    }
    const text2 = await resp.text();
    return JSON.parse(text2);
  };
  for (const state of ["IN", "OH"]) {
    try {
      console.log(`[AP Scraper] Fetching ${state} metadata and progress...`);
      const [metaData, progressData] = await Promise.all([
        fetchJson(`${AP_DATA_BASE}/${state}/metadata.json`),
        fetchJson(`${AP_DATA_BASE}/${state}/progress.json`)
      ]);
      console.log(`[AP Scraper] ${state}: ${Object.keys(metaData).length} races in metadata, ${Object.keys(progressData).length} in progress`);
      for (const [raceId, meta] of Object.entries(metaData)) {
        const progress = progressData[raceId];
        if (!progress) continue;
        const office = meta.officeName || "";
        const seatNum = meta.seatNum ? parseInt(meta.seatNum) : null;
        const candidates = [];
        for (const cp of progress.candidates || []) {
          const cm = meta.candidates?.[cp.candidateID];
          if (!cm) continue;
          const name = `${cm.first} ${cm.last}`.trim();
          candidates.push({
            name,
            party: mapParty(cm.party),
            pct: cp.votePct ?? null,
            votes: cp.voteCount ?? null,
            isWinner: !!cp.winner
          });
        }
        const called = !!(progress.raceCallStatus === "Called" || meta.raceCallStatus === "Called" || progress.partyRaceCall || meta.partyRaceCall || candidates.some((c) => c.isWinner));
        const winnerCand = candidates.find((c) => c.isWinner);
        const winner = winnerCand?.name ?? null;
        const winnerParty = winnerCand?.party ?? null;
        const pctReporting = progress.eevp ?? progress.precinctsReportingPct ?? 0;
        const raceResult = {
          called,
          winner,
          winnerParty,
          pctReporting,
          candidates
        };
        if (state === "OH") {
          if (office.toLowerCase().includes("senate") && !office.toLowerCase().includes("state")) {
            if (!results.ohioSenate) {
              results.ohioSenate = { ...raceResult, isSenate: true };
            } else {
              results.ohioSenate.candidates.push(...raceResult.candidates);
              if (raceResult.called && raceResult.winner) {
                results.ohioSenate.called = true;
                results.ohioSenate.winner = raceResult.winner;
                results.ohioSenate.winnerParty = raceResult.winnerParty;
              }
              results.ohioSenate.pctReporting = Math.max(results.ohioSenate.pctReporting, raceResult.pctReporting);
            }
          } else if (office.toLowerCase().includes("house") && seatNum !== null && seatNum >= 1 && seatNum <= 15) {
            if (!results.ohioHouse[seatNum]) {
              results.ohioHouse[seatNum] = { ...raceResult, district: seatNum };
            } else {
              results.ohioHouse[seatNum].candidates.push(...raceResult.candidates);
              if (raceResult.called && raceResult.winner) {
                results.ohioHouse[seatNum].called = true;
                results.ohioHouse[seatNum].winner = raceResult.winner;
                results.ohioHouse[seatNum].winnerParty = raceResult.winnerParty;
              }
              results.ohioHouse[seatNum].pctReporting = Math.max(results.ohioHouse[seatNum].pctReporting, raceResult.pctReporting);
            }
          }
        } else if (state === "IN") {
          if (office.toLowerCase().includes("house") && seatNum !== null && seatNum >= 1 && seatNum <= 9) {
            if (!results.indianaHouse[seatNum]) {
              results.indianaHouse[seatNum] = { ...raceResult, district: seatNum };
            } else {
              results.indianaHouse[seatNum].candidates.push(...raceResult.candidates);
              if (raceResult.called && raceResult.winner) {
                results.indianaHouse[seatNum].called = true;
                results.indianaHouse[seatNum].winner = raceResult.winner;
                results.indianaHouse[seatNum].winnerParty = raceResult.winnerParty;
              }
              results.indianaHouse[seatNum].pctReporting = Math.max(results.indianaHouse[seatNum].pctReporting, raceResult.pctReporting);
            }
          }
        }
      }
      console.log(`[AP Scraper] ${state}: processed senate=${state === "OH" ? !!results.ohioSenate : "N/A"}, house=[${state === "OH" ? Object.keys(results.ohioHouse).join(",") : Object.keys(results.indianaHouse).join(",")}]`);
    } catch (err) {
      console.error(`[AP Scraper] Error fetching ${state} data:`, err);
    }
  }
  return results;
}
function buildRaceUpdate(race) {
  if (!race) return {};
  const update = {};
  const sorted = [...race.candidates || []].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  if (sorted[0]) {
    update.candidate1Name = sorted[0].name;
    update.candidate1Party = sorted[0].party;
    if (sorted[0].pct !== null) update.candidate1VotePct = Math.round(sorted[0].pct * 10) / 10;
    if (sorted[0].votes !== null) update.candidate1Votes = sorted[0].votes;
  }
  if (sorted[1]) {
    update.candidate2Name = sorted[1].name;
    update.candidate2Party = sorted[1].party;
    if (sorted[1].pct !== null) update.candidate2VotePct = Math.round(sorted[1].pct * 10) / 10;
    if (sorted[1].votes !== null) update.candidate2Votes = sorted[1].votes;
  }
  if (sorted.length > 2) {
    const others = sorted.slice(2);
    update.otherCandidateName = others.map((c) => c.name).join(", ");
    update.otherVotes = others.reduce((sum, c) => sum + (c.votes ?? 0), 0);
    update.otherVotePct = Math.round(others.reduce((sum, c) => sum + (c.pct ?? 0), 0) * 10) / 10;
  }
  if (race.pctReporting > 0) {
    update.pctReporting = Math.round(race.pctReporting * 10) / 10;
  }
  if (race.called && race.winner) {
    update.primaryWinner = race.winner;
    if (race.winnerParty) update.primaryParty = race.winnerParty;
  }
  return update;
}
async function handleScheduledApUpdate(req, res) {
  const startTime = Date.now();
  const log = (msg) => console.log(`[ScheduledApUpdate] ${msg}`);
  log("Starting AP results update...");
  const cronOk = await isCronRequest(req);
  if (!cronOk) {
    log("Rejected: not a cron request");
    res.status(403).json({ error: "cron cookie cannot access non-scheduled-path" });
    return;
  }
  const updates = [];
  try {
    log("Fetching AP Elections data API...");
    const scraped = await scrapeApResults();
    const doUpdate = async (label, id, data, fn) => {
      if (Object.keys(data).length === 0) {
        updates.push({ race: label, id, status: "skip", detail: "no data" });
        return;
      }
      try {
        await fn(id, data);
        updates.push({ race: label, id, status: "ok", detail: JSON.stringify(data) });
        log(`\u2713 ${label} (id=${id}): ${JSON.stringify(data)}`);
      } catch (err2) {
        const msg = err2 instanceof Error ? err2.message : String(err2);
        updates.push({ race: label, id, status: "error", detail: msg });
        log(`\u2717 ${label} (id=${id}): ${msg}`);
      }
    };
    await doUpdate("OH Senate", OHIO_SENATE_ID, buildRaceUpdate(scraped.ohioSenate), updateSenateRace);
    for (let d = 1; d <= 15; d++) {
      const id = OHIO_HOUSE_IDS[d];
      const race = scraped.ohioHouse[d] ?? null;
      await doUpdate(`OH-${d}`, id, buildRaceUpdate(race), updateHouseRace);
    }
    for (let d = 1; d <= 9; d++) {
      const id = INDIANA_HOUSE_IDS[d];
      const race = scraped.indianaHouse[d] ?? null;
      await doUpdate(`IN-${d}`, id, buildRaceUpdate(race), updateHouseRace);
    }
    const elapsed = Date.now() - startTime;
    const ok = updates.filter((u) => u.status === "ok").length;
    const skip = updates.filter((u) => u.status === "skip").length;
    const err = updates.filter((u) => u.status === "error").length;
    log(`Done in ${elapsed}ms: ${ok} updated, ${skip} skipped, ${err} errors`);
    res.json({
      success: true,
      elapsed_ms: elapsed,
      summary: { ok, skip, error: err },
      updates
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal error: ${msg}`);
    res.status(500).json({ success: false, error: msg, updates });
  }
}

// server/scheduledRoutes.ts
var ADMIN_PASSWORD2 = process.env.ADMIN_PASSWORD ?? "";
function registerScheduledRoutes(app) {
  app.post("/api/scheduled/ap-update", async (req, res) => {
    try {
      const body = req.body;
      if (!ADMIN_PASSWORD2) {
        return res.status(500).json({ error: "Admin password not configured" });
      }
      if (body.password !== ADMIN_PASSWORD2) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      const races = body.races ?? [];
      if (!Array.isArray(races)) {
        return res.status(400).json({ error: "races must be an array" });
      }
      const results = [];
      for (const race of races) {
        try {
          const { id, chamber, candidates, reportingPct, primaryWinner, primaryParty } = race;
          const sorted = [...candidates ?? []].sort((a, b) => b.votes - a.votes);
          const c1 = sorted[0];
          const c2 = sorted[1];
          const others = sorted.slice(2);
          const otherVotes = others.reduce((sum, c) => sum + (c.votes ?? 0), 0);
          const otherPct = others.reduce((sum, c) => sum + (c.pct ?? 0), 0);
          const updateData = {
            pctReporting: reportingPct ?? 0
          };
          if (c1) {
            updateData.candidate1Name = c1.name;
            updateData.candidate1Party = c1.party || null;
            updateData.candidate1Votes = c1.votes ?? 0;
            updateData.candidate1VotePct = c1.pct ?? 0;
          }
          if (c2) {
            updateData.candidate2Name = c2.name;
            updateData.candidate2Party = c2.party || null;
            updateData.candidate2Votes = c2.votes ?? 0;
            updateData.candidate2VotePct = c2.pct ?? 0;
          }
          if (others.length > 0) {
            updateData.otherCandidateName = others.map((c) => c.name).join(", ");
            updateData.otherVotes = otherVotes;
            updateData.otherVotePct = otherPct;
          }
          if (primaryWinner !== void 0) {
            updateData.primaryWinner = primaryWinner;
          }
          if (primaryParty !== void 0) {
            updateData.primaryParty = primaryParty;
          }
          if (chamber === "senate") {
            await updateSenateRace(id, updateData);
          } else {
            await updateHouseRace(id, updateData);
          }
          results.push({ id, chamber, ok: true });
        } catch (err) {
          results.push({
            id: race.id,
            chamber: race.chamber,
            ok: false,
            error: String(err)
          });
        }
      }
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).length;
      return res.json({
        success: true,
        succeeded,
        failed,
        results,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("[scheduled/ap-update] Error:", err);
      return res.status(500).json({ error: String(err) });
    }
  });
  app.get("/api/scheduled/health", (_req, res) => {
    res.json({ ok: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/scheduled-task/ap-update", handleScheduledApUpdate);
  app.post("/ap-update", handleScheduledApUpdate);
  app.post("/scheduled/ap-update", handleScheduledApUpdate);
  registerScheduledRoutes(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  attachWebSocketServer(server);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
