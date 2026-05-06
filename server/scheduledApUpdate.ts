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
 * Validate that the request comes from a Manus cron session.
 * The cron JWT has openId starting with "cron_".
 * We verify using the app's JWT_SECRET.
 */
async function isCronRequest(req: Request): Promise<boolean> {
  try {
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies["app_session_id"];
    if (!sessionCookie) return false;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // If no JWT_SECRET, fall back to checking JWT payload without verification
      const parts = sessionCookie.split(".");
      if (parts.length < 2) return false;
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return typeof payload.openId === "string" && payload.openId.startsWith("cron_");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(sessionCookie, secretKey, { algorithms: ["HS256"] });
    const openId = (payload as Record<string, unknown>).openId;
    return typeof openId === "string" && openId.startsWith("cron_");
  } catch (err) {
    console.warn("[ScheduledApUpdate] Cookie verification failed:", String(err));
    return false;
  }
}

/**
 * Scrape AP News election results using fetch (no Playwright needed server-side).
 * Returns structured race data for OH and IN.
 */
async function scrapeApResults(): Promise<ScrapedResults> {
  const results: ScrapedResults = {
    ohioSenate: null,
    ohioHouse: {},
    indianaHouse: {},
  };

  const AP_BASE = "https://apnews.com/projects/elections-2026";
  const urls = [
    { url: `${AP_BASE}/ohio-primary-results/`, state: "OH" },
    { url: `${AP_BASE}/indiana-primary-results-us-house/`, state: "IN" },
  ];

  for (const { url, state } of urls) {
    try {
      console.log(`[AP Scraper] Fetching ${url}`);
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        console.error(`[AP Scraper] HTTP ${resp.status} for ${url}`);
        continue;
      }

      const html = await resp.text();
      const parsed = parseApHtml(html, state);

      if (state === "OH") {
        results.ohioSenate = parsed.senate;
        results.ohioHouse = parsed.house;
      } else {
        results.indianaHouse = parsed.house;
      }

      console.log(`[AP Scraper] ${state}: senate=${!!parsed.senate}, house districts=[${Object.keys(parsed.house).join(",")}]`);
    } catch (err) {
      console.error(`[AP Scraper] Error fetching ${url}:`, err);
    }
  }

  return results;
}

interface ParsedPage {
  senate: RaceResult | null;
  house: Record<number, RaceResult>;
}

function parseApHtml(html: string, stateCode: string): ParsedPage {
  const result: ParsedPage = { senate: null, house: {} };

  // Strip HTML tags for text parsing
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");

  const lines = text.split(/[.\n]/).map(l => l.trim()).filter(l => l.length > 2);

  let currentRace: RaceResult | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Ohio Senate
    if (stateCode === "OH" && /U\.S\. Senate|Ohio Senate/i.test(line)) {
      currentRace = { called: false, winner: null, winnerParty: null, pctReporting: 0, candidates: [], isSenate: true };
      result.senate = currentRace;
    }

    // Detect House districts
    const houseMatch = line.match(/(?:U\.S\. House|Congressional District|District)[^0-9]*(\d+)/i);
    if (houseMatch) {
      const dist = parseInt(houseMatch[1]);
      const validDist = stateCode === "OH" ? (dist >= 1 && dist <= 15) : (dist >= 1 && dist <= 9);
      if (validDist) {
        currentRace = { called: false, winner: null, winnerParty: null, pctReporting: 0, candidates: [], district: dist };
        result.house[dist] = currentRace;
      }
    }

    if (!currentRace) continue;

    // Detect called/winner
    if (/AP Race Called|Race Called/i.test(line)) {
      currentRace.called = true;
    }

    // Detect % reporting
    const pctMatch = line.match(/(\d+\.?\d*)\s*%\s*(?:of\s+)?(?:votes?\s+)?reporting/i);
    if (pctMatch) {
      currentRace.pctReporting = parseFloat(pctMatch[1]);
    }

    // Detect candidate lines: "Name (Party) XX.X%"
    const candMatch = line.match(/^([A-Z][a-zA-Z\s\.\-']+?)\s+\(([DRI])\)\s+(\d+\.?\d*)\s*%(?:\s+([\d,]+))?/);
    if (candMatch) {
      const cand: CandidateResult = {
        name: candMatch[1].trim(),
        party: candMatch[2] as "D" | "R" | "I",
        pct: parseFloat(candMatch[3]),
        votes: candMatch[4] ? parseInt(candMatch[4].replace(/,/g, "")) : null,
        isWinner: false,
      };
      currentRace.candidates.push(cand);
    }
  }

  // Determine winners from candidates if called
  const allRaces = [result.senate, ...Object.values(result.house)];
  for (const race of allRaces) {
    if (!race) continue;
    if (race.called && !race.winner && race.candidates.length > 0) {
      const sorted = [...race.candidates].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
      if (sorted[0]) {
        race.winner = sorted[0].name;
        race.winnerParty = sorted[0].party;
        sorted[0].isWinner = true;
      }
    }
  }

  return result;
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
  const cronOk = await isCronRequest(req);
  if (!cronOk) {
    log("Rejected: not a cron request");
    res.status(403).json({ error: "Forbidden: cron cookie required" });
    return;
  }

  const updates: Array<{ race: string; id: number; status: "ok" | "error" | "skip"; detail?: string }> = [];

  try {
    // Scrape AP results
    log("Scraping AP News...");
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
