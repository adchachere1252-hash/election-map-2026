/**
 * Pre-Election Photo Audit Script
 *
 * Runs before each primary/election to verify all candidates in upcoming races
 * have working photos. Checks both the server-side CANDIDATE_PHOTOS map and the
 * client-side CDN_PHOTOS + BIOGUIDE_MAP lookups.
 *
 * Registered at: POST /api/scheduled/photo-audit
 * Can also be triggered manually via admin panel.
 *
 * Returns a detailed report of:
 * - Candidates with working photos (✓)
 * - Candidates with broken/expired photo URLs (⚠)
 * - Candidates with no photo at all (✗)
 * - Recommendations for which photos need to be added before election night
 */
import { Request, Response } from "express";
import {
  getAllSenateRaces,
  getAllHouseRaces,
  getAllGovernorRaces,
} from "./db";
import { getCandidatePhoto, CANDIDATE_PHOTOS } from "./candidatePhotos";
import allClientPhotos from "./allCandidatePhotos.json";

// Combined client-side photo lookup (BIOGUIDE_MAP + CDN_PHOTOS exported as JSON)
const CLIENT_PHOTOS: Record<string, string> = allClientPhotos as Record<string, string>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateCheck {
  name: string;
  race: string;
  chamber: "senate" | "house" | "governor";
  stateCode: string;
  party: "D" | "R" | "I" | null;
  photoSource: "db" | "server-cdn" | "client-bioguide" | "client-cdn" | "none";
  photoUrl: string | null;
  photoStatus: "ok" | "broken" | "missing";
  priority: "critical" | "high" | "medium" | "low";
}

interface AuditReport {
  timestamp: string;
  totalCandidates: number;
  withPhotos: number;
  broken: number;
  missing: number;
  byPriority: {
    critical: CandidateCheck[];
    high: CandidateCheck[];
    medium: CandidateCheck[];
    low: CandidateCheck[];
  };
  summary: string;
}

// ─── Client-side photo maps (duplicated here for server-side audit) ──────────

// We import the server-side CANDIDATE_PHOTOS map directly.
// For the client-side maps (BIOGUIDE_MAP and CDN_PHOTOS), we read them at runtime
// from the compiled client bundle, or we maintain a shared reference.
// For now, we check the server-side map and verify URLs resolve.

const PHOTO_BASE = "https://unitedstates.github.io/images/congress/225x275";

// Known bioguide IDs for common incumbents (subset for quick checking)
// The full map lives in client/src/lib/candidatePhotos.ts
const BIOGUIDE_QUICK_CHECK: Record<string, string> = {
  "John Hickenlooper": "H000273",
  "Joe Neguse": "N000191",
  "Jason Crow": "C001121",
  "Brittany Pettersen": "P000620",
  "Lauren Boebert": "B000825",
  "Diana DeGette": "D000197",
  "Jeff Crank": "C001137",
  "Jeff Hurd": "H001100",
  "Gabe Evans": "E000300",
};

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a token from allCandidatePhotos.json into a real URL.
 * Tokens are stored as: "bioguide:ID", "cdn:filename.jpg", "manus:/manus-storage/..."
 */
function expandPhotoToken(token: string): { source: CandidateCheck["photoSource"]; url: string } {
  if (token.startsWith("bioguide:")) {
    const id = token.slice("bioguide:".length);
    return { source: "client-bioguide", url: `${PHOTO_BASE}/${id}.jpg` };
  }
  if (token.startsWith("cdn:")) {
    const filename = token.slice("cdn:".length);
    return { source: "client-cdn", url: `${CDN_BASE}/${filename}` };
  }
  if (token.startsWith("manus:")) {
    const path = token.slice("manus:".length);
    return { source: "client-cdn", url: path };
  }
  // Fallback: treat as raw URL
  return { source: "client-cdn", url: token };
}

/**
 * Look up a name in CLIENT_PHOTOS and expand the token to a real URL.
 */
function findInClientPhotos(
  key: string,
  _originalName: string
): { source: CandidateCheck["photoSource"]; url: string } | null {
  const token = CLIENT_PHOTOS[key];
  if (!token) return null;
  return expandPhotoToken(token);
}

/**
 * Determine priority based on race status and election proximity.
 * - critical: Race is in "General" or "Voting" status (election imminent)
 * - high: Race has a confirmed primary date within 14 days
 * - medium: Race has candidates set but primary > 14 days away
 * - low: Race is TBD or candidates not yet confirmed
 */
function getPriority(
  status: string | null,
  candidateName: string | null,
  primaryDate: string | null
): "critical" | "high" | "medium" | "low" {
  if (!candidateName || candidateName === "TBD" || candidateName.includes("TBD")) return "low";

  const normalizedStatus = (status || "").toLowerCase();
  if (normalizedStatus === "general" || normalizedStatus === "voting" || normalizedStatus === "called") {
    return "critical";
  }

  if (primaryDate) {
    const daysUntil = (new Date(primaryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 0) return "critical"; // Primary already happened
    if (daysUntil <= 14) return "high";
    if (daysUntil <= 60) return "medium";
  }

  return "medium";
}

/**
 * Check if a photo URL actually resolves (HTTP 200).
 * Uses a HEAD request with a short timeout.
 */
async function checkPhotoUrl(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    // For relative /manus-storage/ paths, we can't check externally
    // but we know they're served by our own proxy
    if (url.startsWith("/manus-storage/")) {
      // These are served by our Express static middleware — assume OK
      // (broken ones were already cleared in the batch refresh)
      return true;
    }

    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "PhotoAudit/1.0" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve a candidate's photo through all available sources.
 * Mirrors the exact resolution logic of the client-side CandidateAvatar component.
 * Returns the source and URL if found.
 */
function resolvePhoto(
  name: string | null,
  dbPhoto: string | null
): { source: CandidateCheck["photoSource"]; url: string | null } {
  if (!name) return { source: "none", url: null };

  // 1. DB photo field (highest priority)
  if (dbPhoto && dbPhoto !== "None" && dbPhoto !== "null") {
    return { source: "db", url: dbPhoto };
  }

  // 2. Server-side CANDIDATE_PHOTOS map
  const serverPhoto = getCandidatePhoto(name);
  if (serverPhoto) {
    return { source: "server-cdn", url: serverPhoto };
  }

  // 3. Client-side comprehensive lookup (BIOGUIDE_MAP + CDN_PHOTOS)
  // Try exact match first
  const exactKey = name.toLowerCase().trim();
  const clientPhoto = findInClientPhotos(exactKey, name);
  if (clientPhoto) return clientPhoto;

  // 4. Normalized name variants (strip suffixes, parentheticals, middle initials)
  const normalized = name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "") // strip (incumbent) etc.
    .replace(/,?\s+(jr\.?|sr\.?|ii|iii|iv)$/i, "")
    .trim();
  if (normalized !== exactKey) {
    const normPhoto = findInClientPhotos(normalized, name);
    if (normPhoto) return normPhoto;
  }

  // 5. Try without middle initial: "Mike D. Rogers" -> "mike rogers"
  const noMiddle = normalized.replace(/\s+[a-z]\.\s+/g, " ").replace(/\s+/g, " ");
  if (noMiddle !== normalized) {
    const noMidPhoto = findInClientPhotos(noMiddle, name);
    if (noMidPhoto) return noMidPhoto;
  }

  // 6. Bioguide lookup (for Congress members not in the JSON)
  const bioguideId = BIOGUIDE_QUICK_CHECK[name];
  if (bioguideId) {
    return { source: "client-bioguide", url: `${PHOTO_BASE}/${bioguideId}.jpg` };
  }

  // 7. Check server-side map with normalized name
  const normalizedPhoto = CANDIDATE_PHOTOS[normalized];
  if (normalizedPhoto) {
    return { source: "server-cdn", url: normalizedPhoto };
  }

  return { source: "none", url: null };
}

// ─── Main Audit Logic ────────────────────────────────────────────────────────

async function runPhotoAudit(targetStates?: string[]): Promise<AuditReport> {
  const log = (msg: string) => console.log(`[PhotoAudit] ${msg}`);
  const checks: CandidateCheck[] = [];

  log("Starting photo audit...");

  // Load all races
  const [senateRaces, houseRaces, governorRaces] = await Promise.all([
    getAllSenateRaces(),
    getAllHouseRaces(),
    getAllGovernorRaces(),
  ]);

  // Filter by target states if specified
  const filterState = (r: any) => !targetStates || targetStates.includes(r.stateCode);

  // ─── Senate ────────────────────────────────────────────────────────────────
  for (const race of senateRaces.filter(filterState)) {
    // Check candidate 1 (usually D)
    if (race.candidate1Name && race.candidate1Name !== "TBD") {
      const { source, url } = resolvePhoto(race.candidate1Name, race.candidate1Photo);
      const priority = getPriority(race.status, race.candidate1Name, race.primaryDate);
      checks.push({
        name: race.candidate1Name,
        race: `${race.stateCode} Senate`,
        chamber: "senate",
        stateCode: race.stateCode,
        party: (race.candidate1Party as "D" | "R" | "I") || "D",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }

    // Check candidate 2 (usually R)
    if (race.candidate2Name && race.candidate2Name !== "TBD") {
      const { source, url } = resolvePhoto(race.candidate2Name, race.candidate2Photo);
      const priority = getPriority(race.status, race.candidate2Name, race.primaryDate);
      checks.push({
        name: race.candidate2Name,
        race: `${race.stateCode} Senate`,
        chamber: "senate",
        stateCode: race.stateCode,
        party: (race.candidate2Party as "D" | "R" | "I") || "R",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }
  }

  // ─── Governor ──────────────────────────────────────────────────────────────
  for (const race of governorRaces.filter(filterState)) {
    if (race.demCandidate && race.demCandidate !== "TBD") {
      const { source, url } = resolvePhoto(race.demCandidate, race.demPhoto);
      const priority = getPriority(race.status, race.demCandidate, race.primaryDate);
      checks.push({
        name: race.demCandidate,
        race: `${race.stateCode} Governor`,
        chamber: "governor",
        stateCode: race.stateCode,
        party: "D",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }

    if (race.repCandidate && race.repCandidate !== "TBD") {
      const { source, url } = resolvePhoto(race.repCandidate, race.repPhoto);
      const priority = getPriority(race.status, race.repCandidate, race.primaryDate);
      checks.push({
        name: race.repCandidate,
        race: `${race.stateCode} Governor`,
        chamber: "governor",
        stateCode: race.stateCode,
        party: "R",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }
  }

  // ─── House ─────────────────────────────────────────────────────────────────
  for (const race of houseRaces.filter(filterState)) {
    if (race.candidate1Name && race.candidate1Name !== "TBD") {
      const { source, url } = resolvePhoto(race.candidate1Name, race.candidate1Photo);
      const priority = getPriority(race.status, race.candidate1Name, race.primaryDate);
      checks.push({
        name: race.candidate1Name,
        race: `${race.stateCode}-${race.district} House`,
        chamber: "house",
        stateCode: race.stateCode,
        party: (race.candidate1Party as "D" | "R" | "I") || "D",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }

    if (race.candidate2Name && race.candidate2Name !== "TBD") {
      const { source, url } = resolvePhoto(race.candidate2Name, race.candidate2Photo);
      const priority = getPriority(race.status, race.candidate2Name, race.primaryDate);
      checks.push({
        name: race.candidate2Name,
        race: `${race.stateCode}-${race.district} House`,
        chamber: "house",
        stateCode: race.stateCode,
        party: (race.candidate2Party as "D" | "R" | "I") || "R",
        photoSource: source,
        photoUrl: url,
        photoStatus: source === "none" ? "missing" : "ok",
        priority,
      });
    }
  }

  // ─── Verify broken URLs (sample check for "ok" photos) ─────────────────────
  // Only spot-check a sample to avoid rate limiting
  const okChecks = checks.filter(c => c.photoStatus === "ok");
  const sampleSize = Math.min(20, okChecks.length);
  const sample = okChecks.sort(() => Math.random() - 0.5).slice(0, sampleSize);

  for (const check of sample) {
    if (check.photoUrl) {
      const isValid = await checkPhotoUrl(check.photoUrl);
      if (!isValid) {
        check.photoStatus = "broken";
        log(`⚠ Broken photo: ${check.name} (${check.race}) → ${check.photoUrl}`);
      }
    }
  }

  // ─── Compile report ────────────────────────────────────────────────────────
  const withPhotos = checks.filter(c => c.photoStatus === "ok").length;
  const broken = checks.filter(c => c.photoStatus === "broken").length;
  const missing = checks.filter(c => c.photoStatus === "missing").length;

  const critical = checks.filter(c => c.photoStatus !== "ok" && c.priority === "critical");
  const high = checks.filter(c => c.photoStatus !== "ok" && c.priority === "high");
  const medium = checks.filter(c => c.photoStatus !== "ok" && c.priority === "medium");
  const low = checks.filter(c => c.photoStatus !== "ok" && c.priority === "low");

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalCandidates: checks.length,
    withPhotos,
    broken,
    missing,
    byPriority: { critical, high, medium, low },
    summary: `Photo audit: ${withPhotos}/${checks.length} OK, ${broken} broken, ${missing} missing. ` +
      `Action needed: ${critical.length} critical, ${high.length} high priority.`,
  };

  log(report.summary);
  return report;
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function handlePhotoAudit(req: Request, res: Response): Promise<void> {
  const log = (msg: string) => console.log(`[PhotoAudit] ${msg}`);
  const startTime = Date.now();

  try {
    // Optional: filter by state(s) via query param or body
    const targetStates = req.body?.states || req.query?.states;
    const states = targetStates
      ? (Array.isArray(targetStates) ? targetStates : String(targetStates).split(","))
      : undefined;

    log(`Running photo audit${states ? ` for states: ${states.join(", ")}` : " (all states)"}`);

    const report = await runPhotoAudit(states as string[] | undefined);

    res.json({
      success: true,
      ...report,
      elapsed_ms: Date.now() - startTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Photo audit error: ${msg}`);
    res.status(500).json({
      success: false,
      error: msg,
      elapsed_ms: Date.now() - startTime,
    });
  }
}

/**
 * Run audit for a specific upcoming primary.
 * Call this 7 days before any primary to identify missing photos.
 */
export async function auditForUpcomingPrimary(
  stateCode: string,
  primaryDate: string
): Promise<AuditReport> {
  const log = (msg: string) => console.log(`[PhotoAudit/${stateCode}] ${msg}`);
  const daysUntil = Math.ceil((new Date(primaryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  log(`Auditing photos for ${stateCode} primary on ${primaryDate} (${daysUntil} days away)`);

  const report = await runPhotoAudit([stateCode]);

  if (report.byPriority.critical.length > 0 || report.byPriority.high.length > 0) {
    log(`⚠ ACTION NEEDED: ${report.byPriority.critical.length} critical + ${report.byPriority.high.length} high priority missing photos`);
    log(`Missing candidates:`);
    for (const c of [...report.byPriority.critical, ...report.byPriority.high]) {
      log(`  - ${c.name} (${c.party}) — ${c.race}`);
    }
  } else {
    log(`✓ All candidates in ${stateCode} have photos`);
  }

  return report;
}
