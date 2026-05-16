import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Rating enum ──────────────────────────────────────────────────────────────
export const ratingEnum = mysqlEnum("rating", [
  "Solid D",
  "Lean D",
  "Toss-up",
  "Lean R",
  "Solid R",
  "Safe D",
  "Safe R",
]);

// ─── Race status enum ─────────────────────────────────────────────────────────
export const raceStatusEnum = mysqlEnum("race_status", [
  "Scheduled",
  "Primary",
  "General",
  "Called",
  "Certified",
]);

// ─── Senate Races ─────────────────────────────────────────────────────────────
export const senateRaces = mysqlTable("senate_races", {
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
  calledAt: bigint("called_at", { mode: "number" }), // UTC ms timestamp when winner was called
  primaryWinner: varchar("primary_winner", { length: 128 }), // name of the called primary winner (NOT the general election winner)
  primaryParty: mysqlEnum("primary_party", ["D", "R", "I"]), // party of the primary winner
  otherCandidateName: text("other_candidate_name"), // third-party / independent candidate (text to handle many primary candidates)
  otherCandidateParty: mysqlEnum("other_candidate_party", ["D", "R", "I", "L", "G"]),
  otherVotes: bigint("other_votes", { mode: "number" }).default(0),
  otherVotePct: decimal("other_vote_pct", { precision: 5, scale: 2 }),
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]), // party that held seat before this election
  rating: mysqlEnum("rating", ["Solid D", "Lean D", "Toss-up", "Lean R", "Solid R", "Safe D", "Safe R"]),
  status: mysqlEnum("status", ["Scheduled", "Primary", "General", "Called", "Certified"]).default("Scheduled").notNull(),
  primaryDate: varchar("primary_date", { length: 32 }),
  primaryRunoffDate: varchar("primary_runoff_date", { length: 32 }),
  generalDate: varchar("general_date", { length: 32 }).default("November 3, 2026"),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  candidate1Bio: text("candidate1_bio"),
  candidate2Bio: text("candidate2_bio"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SenateRace = typeof senateRaces.$inferSelect;
export type InsertSenateRace = typeof senateRaces.$inferInsert;

// ─── House Races ──────────────────────────────────────────────────────────────
export const houseRaces = mysqlTable("house_races", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  district: int("district").notNull(), // 0 = at-large
  districtLabel: varchar("district_label", { length: 16 }).notNull(), // "AL", "1", "2", etc.
  incumbent: varchar("incumbent", { length: 128 }),
  incumbentParty: mysqlEnum("incumbent_party", ["D", "R", "I"]),
  incumbentRetiring: boolean("incumbent_retiring").default(false).notNull(),
  isVacancy: boolean("is_vacancy").default(false).notNull(), // true if seat was vacant at start of 119th Congress (CA-01, GA-14, NJ-11)
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
  calledAt: bigint("called_at", { mode: "number" }), // UTC ms timestamp when winner was called
  primaryWinner: varchar("primary_winner", { length: 128 }), // name of the called primary winner
  primaryParty: mysqlEnum("primary_party", ["D", "R", "I"]), // party of the primary winner
  otherCandidateName: text("other_candidate_name"), // third-party / independent candidate (text to handle many primary candidates)
  otherCandidateParty: mysqlEnum("other_candidate_party", ["D", "R", "I", "L", "G"]),
  otherVotes: bigint("other_votes", { mode: "number" }).default(0),
  otherVotePct: decimal("other_vote_pct", { precision: 5, scale: 2 }),
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]), // party that held seat before this election
  rating: mysqlEnum("rating", ["Solid D", "Lean D", "Toss-up", "Lean R", "Solid R", "Safe D", "Safe R"]),
  status: mysqlEnum("status", ["Scheduled", "Primary", "General", "Called", "Certified"]).default("Scheduled").notNull(),
  primaryDate: varchar("primary_date", { length: 32 }),
  generalDate: varchar("general_date", { length: 32 }).default("November 3, 2026"),
  pctReporting: decimal("pct_reporting", { precision: 5, scale: 2 }).default("0"),
  candidate1Bio: text("candidate1_bio"),
  candidate2Bio: text("candidate2_bio"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type HouseRace = typeof houseRaces.$inferSelect;
export type InsertHouseRace = typeof houseRaces.$inferInsert;

// ─── Redistricting States ─────────────────────────────────────────────────────
export const redistrictingStates = mysqlTable("redistricting_states", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull().unique(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  enacted: boolean("enacted").default(false).notNull(), // true = map already enacted
  reason: text("reason"),
  status: varchar("status", { length: 128 }),
  method: varchar("method", { length: 128 }),
  delegationBefore: varchar("delegation_before", { length: 64 }),
  projectedImpact: varchar("projected_impact", { length: 64 }),
  litigationNotes: text("litigation_notes"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RedistrictingState = typeof redistrictingStates.$inferSelect;
export type InsertRedistrictingState = typeof redistrictingStates.$inferInsert;

// ─── Referendums ──────────────────────────────────────────────────────────────
export const referendums = mysqlTable("referendums", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Referendum = typeof referendums.$inferSelect;
export type InsertReferendum = typeof referendums.$inferInsert;

// ─── Senators (all 100, all 3 classes) ──────────────────────────────────────
export const senators = mysqlTable("senators", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  party: mysqlEnum("party", ["D", "R", "I"]).notNull(),
  senateClass: int("senate_class").notNull(), // 1, 2, or 3
  nextElectionYear: int("next_election_year").notNull(), // 2026, 2028, or 2030
  isUpIn2026: boolean("is_up_in_2026").default(false).notNull(),
  bio: text("bio"),
  committees: text("committees"), // JSON array of committee names
  websiteUrl: varchar("website_url", { length: 256 }), // Official senate.gov page URL
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Senator = typeof senators.$inferSelect;
export type InsertSenator = typeof senators.$inferInsert;

// ─── Pinned Key Races ────────────────────────────────────────────────────────
export const pinnedKeyRaces = mysqlTable("pinned_key_races", {
  id: int("id").autoincrement().primaryKey(),
  chamber: mysqlEnum("chamber", ["senate", "house"]).notNull(),
  raceId: int("race_id").notNull(), // FK to senate_races.id or house_races.id
  sortOrder: int("sort_order").default(0).notNull(), // lower = higher in list
  pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
});

export type PinnedKeyRace = typeof pinnedKeyRaces.$inferSelect;
export type InsertPinnedKeyRace = typeof pinnedKeyRaces.$inferInsert;

// ─── Governor Races ─────────────────────────────────────────────────────────
export const governorRaces = mysqlTable("governor_races", {
  id: int("id").autoincrement().primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull().unique(),
  stateName: varchar("state_name", { length: 64 }).notNull(),
  // Incumbent info
  incumbentName: varchar("incumbent_name", { length: 128 }),       // null if open seat
  incumbentParty: mysqlEnum("incumbent_party", ["D", "R", "I"]),  // party of outgoing/current gov
  isOpen: boolean("is_open").default(false).notNull(),             // true = no incumbent running
  isTermLimited: boolean("is_term_limited").default(false).notNull(),
  // Previous party (for flip tracking)
  previousParty: mysqlEnum("previous_party", ["D", "R", "I"]).notNull(), // party that currently holds seat
  // Race rating
  rating: mysqlEnum("rating", [
    "Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"
  ]).notNull().default("Solid R"),
  // Election dates
  primaryDate: varchar("primary_date", { length: 64 }),            // e.g. "June 2, 2026"
  runoffDate: varchar("runoff_date", { length: 64 }),
  generalDate: varchar("general_date", { length: 64 }).notNull().default("November 3, 2026"),
  isSpecial: boolean("is_special").default(false).notNull(),
  // Election night results
  status: mysqlEnum("status", ["Scheduled", "Voting", "Called", "Certified"])
    .default("Scheduled").notNull(),
  calledParty: mysqlEnum("called_party", ["D", "R", "I"]),         // set when called
  calledWinner: varchar("called_winner", { length: 128 }),          // winner name when called
  calledAt: bigint("called_at", { mode: "number" }),                // UTC ms timestamp when winner was called
  primaryWinner: varchar("primary_winner", { length: 128 }),         // name of the called primary winner (NOT the general election winner)
  primaryParty: mysqlEnum("primary_party", ["D", "R", "I"]),        // party of the primary winner
  demVotes: bigint("dem_votes", { mode: "number" }).default(0),
  repVotes: bigint("rep_votes", { mode: "number" }).default(0),
  otherCandidateName: text("other_candidate_name"), // third-party / independent candidate (text to handle many primary candidates)
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type GovernorRace = typeof governorRaces.$inferSelect;
export type InsertGovernorRace = typeof governorRaces.$inferInsert;

// ─── Admin Sessions ───────────────────────────────────────────────────────────
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type AdminSession = typeof adminSessions.$inferSelect;
