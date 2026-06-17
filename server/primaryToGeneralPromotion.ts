/**
 * Primary-to-General Promotion Job
 *
 * Runs on a schedule (every 30 minutes). For each Senate, House, and Governor
 * race that is still in "Primary" / "Scheduled" status, checks whether:
 *   1. The primary date has passed (today >= primaryDate)
 *   2. At least one party's primary winner is known (primaryWinner is set)
 *
 * When both conditions are met, the race is promoted to "General" status and
 * the matchup card candidates are populated from primaryWinner / existing
 * candidate fields so the GeneralMatchupSection renders correctly.
 *
 * Promotion rules:
 *   Senate / House:
 *     - status → "General"
 *     - If primaryParty = "D": candidate1Name = primaryWinner, candidate1Party = "D"
 *     - If primaryParty = "R": candidate2Name = primaryWinner, candidate2Party = "R"
 *     - Existing candidate on the other side is preserved if already set
 *     - pctReporting reset to 0, votes reset to 0 (primary tallies cleared)
 *
 *   Governor:
 *     - status stays as "Scheduled" (governor table has no "General" enum value)
 *       but demCandidate / repCandidate are populated from primaryWinner
 *     - When BOTH parties have primaryWinner set, a "General" note is added
 *
 * Safety guards:
 *   - Never overwrites a race already in "General", "Called", or "Certified"
 *   - Never clears an existing candidate name that was manually set by admin
 *   - Logs every promotion for audit trail
 */

import { getDb } from "./db";
import { senateRaces, houseRaces, governorRaces } from "../drizzle/schema";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";

// ─── Date Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a human-readable date string like "May 12, 2026" or "March 3, 2026"
 * into a Date object (midnight UTC). Returns null if unparseable.
 */
function parsePrimaryDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Strip leading/trailing whitespace and try direct parse
  const cleaned = dateStr.trim();
  // Handle "Sep 8, 2026" style abbreviations
  const expanded = cleaned
    .replace(/\bJan\b/i, "January")
    .replace(/\bFeb\b/i, "February")
    .replace(/\bMar\b/i, "March")
    .replace(/\bApr\b/i, "April")
    .replace(/\bMay\b/i, "May")
    .replace(/\bJun\b/i, "June")
    .replace(/\bJul\b/i, "July")
    .replace(/\bAug\b/i, "August")
    .replace(/\bSep\b/i, "September")
    .replace(/\bOct\b/i, "October")
    .replace(/\bNov\b/i, "November")
    .replace(/\bDec\b/i, "December");

  const parsed = new Date(expanded);
  if (isNaN(parsed.getTime())) return null;
  // Normalize to midnight UTC
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function primaryDateHasPassed(dateStr: string | null | undefined): boolean {
  const d = parsePrimaryDate(dateStr);
  if (!d) return false;
  const todayUtc = new Date();
  const todayMidnight = new Date(Date.UTC(
    todayUtc.getUTCFullYear(),
    todayUtc.getUTCMonth(),
    todayUtc.getUTCDate()
  ));
  // Primary date must be strictly in the past (not today — results may still be coming in)
  return d < todayMidnight;
}

// ─── Helper: treat TBD-prefixed names as empty ─────────────────────────────────

/**
 * Returns true if a candidate name is effectively empty (null, undefined, or
 * starts with "TBD"). TBD-prefixed names are placeholders for pending runoffs
 * and should be overwritten when the actual winner is known.
 */
function isEffectivelyEmpty(name: string | null | undefined): boolean {
  if (!name) return true;
  return name.trim().startsWith("TBD");
}

// ─── Promotion Logic ──────────────────────────────────────────────────────────

export interface PromotionResult {
  promoted: number;
  skipped: number;
  errors: number;
  log: string[];
}

export async function runPrimaryToGeneralPromotion(): Promise<PromotionResult> {
  const db = await getDb();
  if (!db) return { promoted: 0, skipped: 0, errors: 0, log: ["DB not available"] };

  const result: PromotionResult = { promoted: 0, skipped: 0, errors: 0, log: [] };

  // ── Senate Races ────────────────────────────────────────────────────────────
  try {
    const senateEligible = await db
      .select()
      .from(senateRaces)
      .where(
        and(
          inArray(senateRaces.status, ["Scheduled", "Primary", "Primary Runoff"]),
          isNotNull(senateRaces.primaryWinner)
        )
      );

    for (const race of senateEligible) {
      // [AP_LOCK] — skip manually locked races
      if (race.notes && race.notes.includes('[AP_LOCK]')) {
        result.skipped++;
        continue;
      }
      if (!primaryDateHasPassed(race.primaryDate)) {
        result.skipped++;
        continue;
      }

      // Build the update payload — preserve existing candidate on the other side
      const update: Partial<typeof senateRaces.$inferInsert> = {
        status: "General",
        pctReporting: "0",
        candidate1Votes: 0,
        candidate2Votes: 0,
      };

      const party = race.primaryParty;
      const winner = race.primaryWinner!;

      if (party === "D") {
        update.candidate1Name = winner;
        update.candidate1Party = "D";
        // Preserve candidate2 if already set by admin (not TBD)
        if (isEffectivelyEmpty(race.candidate2Name)) {
          update.candidate2Name = null;
          update.candidate2Party = null;
        }
      } else if (party === "R") {
        update.candidate2Name = winner;
        update.candidate2Party = "R";
        // Preserve candidate1 if already set by admin (not TBD)
        if (isEffectivelyEmpty(race.candidate1Name)) {
          update.candidate1Name = null;
          update.candidate1Party = null;
        }
      } else if (party === "I") {
        // Independent winner — put in candidate1 slot if empty, else candidate2
        if (isEffectivelyEmpty(race.candidate1Name)) {
          update.candidate1Name = winner;
          update.candidate1Party = "I";
        } else if (isEffectivelyEmpty(race.candidate2Name)) {
          update.candidate2Name = winner;
          update.candidate2Party = "I";
        }
      }

      try {
        await db.update(senateRaces).set(update).where(eq(senateRaces.id, race.id));
        const label = `Senate ${race.stateName}${race.isSpecial ? " (Special)" : ""}`;
        result.log.push(`[PROMOTED] ${label} → General | Winner: ${winner} (${party})`);
        result.promoted++;
      } catch (err) {
        result.log.push(`[ERROR] Senate ${race.stateName}: ${err instanceof Error ? err.message : String(err)}`);
        result.errors++;
      }
    }
  } catch (err) {
    result.log.push(`[ERROR] Senate query failed: ${err instanceof Error ? err.message : String(err)}`);
    result.errors++;
  }

  // ── House Races ─────────────────────────────────────────────────────────────
  try {
    const houseEligible = await db
      .select()
      .from(houseRaces)
      .where(
        and(
          inArray(houseRaces.status, ["Scheduled", "Primary", "Primary Runoff"]),
          isNotNull(houseRaces.primaryWinner)
        )
      );

    for (const race of houseEligible) {
      // [AP_LOCK] — skip manually locked races
      if (race.notes && race.notes.includes('[AP_LOCK]')) {
        result.skipped++;
        continue;
      }
      if (!primaryDateHasPassed(race.primaryDate)) {
        result.skipped++;
        continue;
      }

      const update: Partial<typeof houseRaces.$inferInsert> = {
        status: "General",
        pctReporting: "0",
        candidate1Votes: 0,
        candidate2Votes: 0,
      };

      const party = race.primaryParty;
      const winner = race.primaryWinner!;

      if (party === "D") {
        update.candidate1Name = winner;
        update.candidate1Party = "D";
        // Clear candidate2 if it's the same person (uncontested primary) or TBD
        if (isEffectivelyEmpty(race.candidate2Name) || race.candidate2Name === winner) {
          update.candidate2Name = null;
          update.candidate2Party = null;
        }
      } else if (party === "R") {
        // Only set candidate2 to R winner if candidate1 is a different real person (D nominee)
        if (race.candidate1Name && !isEffectivelyEmpty(race.candidate1Name) && race.candidate1Name !== winner) {
          update.candidate2Name = winner;
          update.candidate2Party = "R";
        } else if (isEffectivelyEmpty(race.candidate1Name)) {
          // No D nominee yet — put R winner in candidate2 slot, leave candidate1 for D
          update.candidate2Name = winner;
          update.candidate2Party = "R";
          update.candidate1Name = null;
          update.candidate1Party = null;
        } else {
          // candidate1 is the same person — uncontested, put in candidate2, clear candidate1
          update.candidate2Name = winner;
          update.candidate2Party = "R";
          update.candidate1Name = null;
          update.candidate1Party = null;
        }
      } else if (party === "I") {
        if (isEffectivelyEmpty(race.candidate1Name)) {
          update.candidate1Name = winner;
          update.candidate1Party = "I";
        } else if (isEffectivelyEmpty(race.candidate2Name) || race.candidate2Name === winner) {
          update.candidate2Name = winner;
          update.candidate2Party = "I";
        }
      }

      try {
        await db.update(houseRaces).set(update).where(eq(houseRaces.id, race.id));
        const label = `House ${race.stateCode}-${race.districtLabel}`;
        result.log.push(`[PROMOTED] ${label} → General | Winner: ${winner} (${party})`);
        result.promoted++;
      } catch (err) {
        result.log.push(`[ERROR] House ${race.stateCode}-${race.districtLabel}: ${err instanceof Error ? err.message : String(err)}`);
        result.errors++;
      }
    }
  } catch (err) {
    result.log.push(`[ERROR] House query failed: ${err instanceof Error ? err.message : String(err)}`);
    result.errors++;
  }

  // ── Governor Races ──────────────────────────────────────────────────────────
  // Governor table has no "General" status enum, so we populate demCandidate /
  // repCandidate from primaryWinner and leave status as "Scheduled" until
  // both parties have winners. When both are known, status → "Voting" to signal
  // the general election is underway (closest available enum value).
  try {
    const govEligible = await db
      .select()
      .from(governorRaces)
      .where(
        and(
          inArray(governorRaces.status, ["Scheduled", "Primary Runoff"]),
          isNotNull(governorRaces.primaryWinner)
        )
      );

    for (const race of govEligible) {
      // [AP_LOCK] — skip manually locked races
      if (race.notes && race.notes.includes('[AP_LOCK]')) {
        result.skipped++;
        continue;
      }
      if (!primaryDateHasPassed(race.primaryDate)) {
        result.skipped++;
        continue;
      }

      const party = race.primaryParty;
      const winner = race.primaryWinner!;

      const update: Partial<typeof governorRaces.$inferInsert> = {};

      if (party === "D" && isEffectivelyEmpty(race.demCandidate)) {
        update.demCandidate = winner;
      } else if (party === "R" && isEffectivelyEmpty(race.repCandidate)) {
        update.repCandidate = winner;
      }
      // If no field changed, skip
      if (Object.keys(update).length === 0) {
        result.skipped++;
        continue;
      }

      try {
        await db.update(governorRaces).set(update).where(eq(governorRaces.id, race.id));
        const label = `Governor ${race.stateName}`;
        result.log.push(`[PROMOTED] ${label} | Set ${party === "D" ? "demCandidate" : "repCandidate"} = ${winner}`);
        result.promoted++;
      } catch (err) {
        result.log.push(`[ERROR] Governor ${race.stateName}: ${err instanceof Error ? err.message : String(err)}`);
        result.errors++;
      }
    }
  } catch (err) {
    result.log.push(`[ERROR] Governor query failed: ${err instanceof Error ? err.message : String(err)}`);
    result.errors++;
  }

  // ── Cross-Link Pass: fill opposing candidate slot for General races ─────────
  // For Senate and House races already in "General" status where one candidate
  // slot is empty, attempt to fill it from the incumbent field (if the incumbent
  // is running and belongs to the opposing party) or from incumbentParty.
  // This handles the case where only one party's primary winner was set.
  //
  // Rules:
  //   - candidate1 = Democratic candidate (slot 1)
  //   - candidate2 = Republican candidate (slot 2)
  //   - If candidate1 is empty and incumbent is D and not retiring → fill candidate1
  //   - If candidate2 is empty and incumbent is R and not retiring → fill candidate2
  //   - Never overwrite an existing candidate name
  //   - Only run on races in "General" status

  // Senate cross-link
  try {
    const senateGeneral = await db
      .select()
      .from(senateRaces)
      .where(eq(senateRaces.status, "General"));

    const lastNameOf = (name: string) => name.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
    for (const race of senateGeneral) {
      // [AP_LOCK] — skip manually locked races
      if (race.notes && race.notes.includes('[AP_LOCK]')) continue;
      const update: Partial<typeof senateRaces.$inferInsert> = {};

      // Fill empty D slot from incumbent if incumbent is D and not retiring
      const c2Last = race.candidate2Name ? lastNameOf(race.candidate2Name) : "";
      const incLastS = race.incumbent ? lastNameOf(race.incumbent) : "";
      const sameAsC2 = c2Last.length >= 3 && incLastS.length >= 3 && c2Last === incLastS;
      if (isEffectivelyEmpty(race.candidate1Name) && race.incumbent && race.incumbentParty === "D" && !race.incumbentRetiring && !sameAsC2) {
        update.candidate1Name = race.incumbent;
        update.candidate1Party = "D";
      }
      // Fill empty R slot from incumbent if incumbent is R and not retiring
      const c1Last = race.candidate1Name ? lastNameOf(race.candidate1Name) : "";
      const sameAsC1 = c1Last.length >= 3 && incLastS.length >= 3 && c1Last === incLastS;
      if (isEffectivelyEmpty(race.candidate2Name) && race.incumbent && race.incumbentParty === "R" && !race.incumbentRetiring && !sameAsC1) {
        update.candidate2Name = race.incumbent;
        update.candidate2Party = "R";
      }

      if (Object.keys(update).length === 0) continue;

      try {
        await db.update(senateRaces).set(update).where(eq(senateRaces.id, race.id));
        const label = `Senate ${race.stateName}${race.isSpecial ? " (Special)" : ""}`;
        result.log.push(`[CROSSLINK] ${label} | Filled: ${JSON.stringify(update)}`);
        result.promoted++;
      } catch (err) {
        result.log.push(`[ERROR] CrossLink Senate ${race.stateName}: ${err instanceof Error ? err.message : String(err)}`);
        result.errors++;
      }
    }
  } catch (err) {
    result.log.push(`[ERROR] Senate cross-link query failed: ${err instanceof Error ? err.message : String(err)}`);
    result.errors++;
  }

  // House cross-link
  const lastNameOf = (name: string) => name.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  try {
    const houseGeneral = await db
      .select()
      .from(houseRaces)
      .where(eq(houseRaces.status, "General"));

    for (const race of houseGeneral) {
      // [AP_LOCK] — skip manually locked races
      if (race.notes && race.notes.includes('[AP_LOCK]')) continue;
      const update: Partial<typeof houseRaces.$inferInsert> = {};

      if (isEffectivelyEmpty(race.candidate1Name) && race.incumbent && race.incumbentParty === "D" && !race.incumbentRetiring) {
        update.candidate1Name = race.incumbent;
        update.candidate1Party = "D";
      }
      // Only fill candidate2 from incumbent if candidate1 is NOT the same person (same last name check)
      const c1Last = race.candidate1Name ? lastNameOf(race.candidate1Name) : "";
      const incLast = race.incumbent ? lastNameOf(race.incumbent) : "";
      const samePersonAsC1 = c1Last.length >= 3 && incLast.length >= 3 && c1Last === incLast;
      if (isEffectivelyEmpty(race.candidate2Name) && race.incumbent && race.incumbentParty === "R" && !race.incumbentRetiring && !samePersonAsC1) {
        update.candidate2Name = race.incumbent;
        update.candidate2Party = "R";
      }

      if (Object.keys(update).length === 0) continue;

      try {
        await db.update(houseRaces).set(update).where(eq(houseRaces.id, race.id));
        const label = `House ${race.stateCode}-${race.districtLabel}`;
        result.log.push(`[CROSSLINK] ${label} | Filled: ${JSON.stringify(update)}`);
        result.promoted++;
      } catch (err) {
        result.log.push(`[ERROR] CrossLink House ${race.stateCode}-${race.districtLabel}: ${err instanceof Error ? err.message : String(err)}`);
        result.errors++;
      }
    }
  } catch (err) {
    result.log.push(`[ERROR] House cross-link query failed: ${err instanceof Error ? err.message : String(err)}`);
    result.errors++;
  }

  return result;
}
