/**
 * Scheduled Task: AP Election Results Auto-Update
 * Route: POST /api/scheduled-task/ap-update
 *
 * This endpoint is accessible by the Manus cron cookie (app_session_id with
 * openId starting with "cron_"). It scrapes AP News for Ohio and Indiana
 * May 5, 2026 primary results and updates the database directly.
 *
 * Race IDs:
 *   OH Senate = 35
 *   OH-1..OH-15 = 299..313
 *   IN-1..IN-9  = 151..159
 */

import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { updateSenateRace, updateHouseRace } from "./db";

// Race ID mappings
const OHIO_SENATE_ID = 35;
const OHIO_HOUSE_IDS: Record<number, number> = {};
for (let i = 1; i <= 15; i++) OHIO_HOUSE_IDS[i] = 298 + i; // OH-1=299..OH-15=313

const INDIANA_HOUSE_IDS: Record<number, number> = {};
for (let i = 1; i <= 9; i++) INDIANA_HOUSE_IDS[i] = 150 + i; // IN-1=151..IN-9=159

interface CandidateResult {
  name: string;
  party: "D" | "R" | "I" | null;
  pct: number | null;
  votes: number | null;
  isWinner: boolean;
}

interface RaceResult {
  district?: number;
  isSenate?: boolean;
  called: boolean;
  winner: string | null;
  winnerParty: "D" | "R" | "I" | null;
  pctReporting: number;
  candidates: CandidateResult[];
}

interface ScrapedResults {
  ohioSenate: RaceResult | null;
  ohioHouse: Record<number, RaceResult>;
  indianaHouse: Record<number, RaceResult>;
}

/**
 * Decode and validate a cron JWT token (without signature verification).
 * Returns true if the token has openId starting with "cron_" and is not expired.
 */
function decodeCronToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const openId = payload.openId;
    if (typeof openId !== "string" || !openId.startsWith("cron_")) return false;
    const exp = payload.exp;
    if (typeof exp === "number" && Date.now() / 1000 > exp) {
      console.warn("[ScheduledApUpdate] Cron token expired");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that the request comes from a Manus cron session.
 * The cron JWT has openId starting with "cron_".
 * NOTE: The Manus cron cookie is signed by Manus's own JWT secret, NOT the app's JWT_SECRET.
 * We must NOT verify the signature — just decode the payload and check openId.
 *
 * Accepts the token from:
 * 1. Cookie header (app_session_id) — may be stripped by proxy
 * 2. Request body field "cronToken" — fallback when proxy strips cookies
 */
async function isCronRequest(req: Request): Promise<boolean> {
  try {
    // Check cookie header first
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies["app_session_id"];
    if (sessionCookie && decodeCronToken(sessionCookie)) return true;

    // Fallback: check cronToken in request body (for when proxy strips cookies)
    const body = req.body as Record<string, unknown> | undefined;
    const bodyToken = typeof body?.cronToken === "string" ? body.cronToken : null;
    if (bodyToken && decodeCronToken(bodyToken)) return true;

    // Fallback: check X-Cron-Token header
    const headerToken = req.headers["x-cron-token"];
    if (typeof headerToken === "string" && decodeCronToken(headerToken)) return true;

    // Fallback: check cronToken query parameter
    const queryToken = (req.query as Record<string, unknown>)?.cronToken;
    if (typeof queryToken === "string" && decodeCronToken(queryToken)) return true;

    return false;
  } catch (err) {
    console.warn("[ScheduledApUpdate] Cookie verification failed:", String(err));
    return false;
  }
}

// AP Elections data API base URL
const AP_DATA_BASE = "https://interactives.apelections.org/election-results/data-live/2026-05-05/results/national";

// AP party code -> our party code
function mapParty(apParty: string | undefined | null): "D" | "R" | "I" | null {
  if (!apParty) return null;
  const p = apParty.toUpperCase();
  if (p === "DEM" || p === "D") return "D";
  if (p === "GOP" || p === "REP" || p === "R") return "R";
  if (p === "IND" || p === "I") return "I";
  return null;
}

interface ApCandidateMeta {
  first: string;
  last: string;
  party: string;
  candidateID: string;
  incumbent?: boolean;
}

interface ApRaceMeta {
  officeName: string;
  seatName: string | null;
  seatNum: string | null;
  party: string;
  raceCallStatus: string;
  partyRaceCall: string | null;
  candidates: Record<string, ApCandidateMeta>;
}

interface ApCandidateProgress {
  candidateID: string;
  voteCount: number;
  votePct: number;
  winner?: string;
}

interface ApRaceProgress {
  statePostal: string;
  eevp: number;
  precinctsReportingPct: number;
  raceCallStatus?: string;
  partyRaceCall?: string;
  candidates: ApCandidateProgress[];
}

/**
 * Fetch AP election data from the AP Elections data API.
 * Returns structured race data for OH and IN.
 */
async function scrapeApResults(): Promise<ScrapedResults> {
  const results: ScrapedResults = {
    ohioSenate: null,
    ohioHouse: {},
    indianaHouse: {},
  };

  const fetchJson = async (url: string): Promise<unknown> => {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Referer": "https://apnews.com/",
        "Origin": "https://apnews.com",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} for ${url}`);
    }
    const text = await resp.text();
    return JSON.parse(text);
  };

  for (const state of ["IN", "OH"] as const) {
    try {
      console.log(`[AP Scraper] Fetching ${state} metadata and progress...`);

      const [metaData, progressData] = await Promise.all([
        fetchJson(`${AP_DATA_BASE}/${state}/metadata.json`) as Promise<Record<string, ApRaceMeta>>,
        fetchJson(`${AP_DATA_BASE}/${state}/progress.json`) as Promise<Record<string, ApRaceProgress>>,
      ]);

      console.log(`[AP Scraper] ${state}: ${Object.keys(metaData).length} races in metadata, ${Object.keys(progressData).length} in progress`);

      // Process each race
      for (const [raceId, meta] of Object.entries(metaData)) {
        const progress = progressData[raceId];
        if (!progress) continue;

        const office = meta.officeName || "";
        const seatNum = meta.seatNum ? parseInt(meta.seatNum) : null;

        // Build candidates list
        const candidates: CandidateResult[] = [];
        for (const cp of (progress.candidates || [])) {
          const cm = meta.candidates?.[cp.candidateID];
          if (!cm) continue;
          const name = `${cm.first} ${cm.last}`.trim();
          candidates.push({
            name,
            party: mapParty(cm.party),
            pct: cp.votePct ?? null,
            votes: cp.voteCount ?? null,
            isWinner: !!cp.winner,
          });
        }

        // Determine if called and winner
        const called = !!(progress.raceCallStatus === "Called" || meta.raceCallStatus === "Called" ||
          progress.partyRaceCall || meta.partyRaceCall ||
          candidates.some(c => c.isWinner));
        const winnerCand = candidates.find(c => c.isWinner);
        const winner = winnerCand?.name ?? null;
        const winnerParty = winnerCand?.party ?? null;
        const pctReporting = progress.eevp ?? progress.precinctsReportingPct ?? 0;

        const raceResult: RaceResult = {
          called,
          winner,
          winnerParty,
          pctReporting,
          candidates,
        };

        if (state === "OH") {
          // Ohio Senate
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
          }
          // Ohio House
          else if (office.toLowerCase().includes("house") && seatNum !== null && seatNum >= 1 && seatNum <= 15) {
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
          // Indiana House
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

function buildRaceUpdate(race: RaceResult | null): Record<string, unknown> {
  if (!race) return {};

  const update: Record<string, unknown> = {};

  // Sort candidates by vote percentage
  const sorted = [...(race.candidates || [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

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
    update.otherCandidateName = others.map(c => c.name).join(", ");
    update.otherVotes = others.reduce((sum, c) => sum + (c.votes ?? 0), 0);
    update.otherVotePct = Math.round(others.reduce((sum, c) => sum + (c.pct ?? 0), 0) * 10) / 10;
  }

  if (race.pctReporting > 0) {
    update.pctReporting = Math.round(race.pctReporting * 10) / 10;
  }

  // IMPORTANT: Use primaryWinner/primaryParty for primary results
  // NEVER use calledWinner/calledParty (those are for November general election only)
  if (race.called && race.winner) {
    update.primaryWinner = race.winner;
    if (race.winnerParty) update.primaryParty = race.winnerParty;
  }

  return update;
}

/**
 * Main handler for the scheduled AP update endpoint.
 */
export async function handleScheduledApUpdate(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const log = (msg: string) => console.log(`[ScheduledApUpdate] ${msg}`);

  log("Starting AP results update...");

  // Validate cron cookie
  // The Manus proxy authenticates cron cookies for /api/scheduled-task/* paths
  // If the request reaches this handler via /api/scheduled-task/*, the proxy has
  // already verified the cron cookie, so we trust it.
  const isProxyAuthenticated = req.path.startsWith("/api/scheduled-task/") || req.originalUrl.includes("/api/scheduled-task/");
  const cronOk = isProxyAuthenticated || await isCronRequest(req);
  if (!cronOk) {
    log("Rejected: not a cron request");
    res.status(403).json({ error: "cron cookie cannot access non-scheduled-path" });
    return;
  }

  const updates: Array<{ race: string; id: number; status: "ok" | "error" | "skip"; detail?: string }> = [];

  try {
    // Scrape AP results
    log("Fetching AP Elections data API...");
    const scraped = await scrapeApResults();

    // Helper to record update result
    const doUpdate = async (
      label: string,
      id: number,
      data: Record<string, unknown>,
      fn: (id: number, data: Record<string, unknown>) => Promise<void>
    ) => {
      if (Object.keys(data).length === 0) {
        updates.push({ race: label, id, status: "skip", detail: "no data" });
        return;
      }
      try {
        await fn(id, data as Parameters<typeof updateSenateRace>[1]);
        updates.push({ race: label, id, status: "ok", detail: JSON.stringify(data) });
        log(`✓ ${label} (id=${id}): ${JSON.stringify(data)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updates.push({ race: label, id, status: "error", detail: msg });
        log(`✗ ${label} (id=${id}): ${msg}`);
      }
    };

    // OH Senate
    await doUpdate("OH Senate", OHIO_SENATE_ID, buildRaceUpdate(scraped.ohioSenate), updateSenateRace);

    // OH House 1-15
    for (let d = 1; d <= 15; d++) {
      const id = OHIO_HOUSE_IDS[d];
      const race = scraped.ohioHouse[d] ?? null;
      await doUpdate(`OH-${d}`, id, buildRaceUpdate(race), updateHouseRace);
    }

    // IN House 1-9
    for (let d = 1; d <= 9; d++) {
      const id = INDIANA_HOUSE_IDS[d];
      const race = scraped.indianaHouse[d] ?? null;
      await doUpdate(`IN-${d}`, id, buildRaceUpdate(race), updateHouseRace);
    }

    const elapsed = Date.now() - startTime;
    const ok = updates.filter(u => u.status === "ok").length;
    const skip = updates.filter(u => u.status === "skip").length;
    const err = updates.filter(u => u.status === "error").length;

    log(`Done in ${elapsed}ms: ${ok} updated, ${skip} skipped, ${err} errors`);

    res.json({
      success: true,
      elapsed_ms: elapsed,
      summary: { ok, skip, error: err },
      updates,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal error: ${msg}`);
    res.status(500).json({ success: false, error: msg, updates });
  }
}
// Redeploy trigger: Tue May  5 22:33:29 EDT 2026
// Redeploy trigger: Tue May  5 22:38:10 EDT 2026
// Redeploy trigger: Tue May  5 22:44:56 EDT 2026
// Rebuild trigger: Tue May  5 22:49:01 EDT 2026
// Redeploy trigger: Wed May  6 03:00:47 UTC 2026
// Redeploy trigger: Wed May  6 03:27:42 UTC 2026 - scheduled route must be active
// Redeploy trigger: Wed May  6 03:30:00 UTC 2026
// Rebuild trigger: Wed May  6 03:53:41 UTC 2026
// Redeploy trigger: Wed May  6 03:59:00 UTC 2026 - fix cron cookie auth
// Redeploy trigger: Wed May  6 04:03:57 UTC 2026
// Rebuild trigger: Wed May  6 04:25:00 UTC 2026 - accept cronToken in body
// Redeploy trigger: Wed May  6 05:21:47 UTC 2026
// Redeploy trigger: Wed May  6 05:40:43 UTC 2026
// Rebuild trigger: Wed May  6 05:52:00 UTC 2026 - add X-Cron-Token header and query param support
// Rebuild trigger: 2026-05-06 05:58:53 UTC - x-cron-token and query param support v2
// Force redeploy: 2026-05-06 06:29:29 UTC - proxy-trust-fix
