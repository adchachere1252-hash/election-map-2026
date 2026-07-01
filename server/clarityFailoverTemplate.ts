/**
 * Generalized Clarity Elections ENR Failover Template
 *
 * Reusable template for any state's primary/general election that uses
 * Clarity Elections as the official results reporting system.
 *
 * USAGE:
 * 1. Copy this template for each new state primary
 * 2. Configure the STATE_CONFIG object with the state's specific URLs and race info
 * 3. Register the handler in server/scheduledRoutes.ts
 * 4. Create a Heartbeat cron job for election night
 *
 * FEATURES:
 * - Primary source: Clarity Elections ENR (state SOS)
 * - Automatic failover to AP/NBC after configurable empty-data threshold
 * - NBC __NEXT_DATA__ scraping as secondary fallback
 * - Configurable per-state: URL, race patterns, district count, county count
 * - Built-in logging with state prefix
 * - Idempotent updates (safe to re-run)
 * - WebSocket broadcast on race calls
 *
 * LESSONS LEARNED (from CO Primary 2026-06-30):
 * - Clarity can return HTTP 200 with valid JSON but 0 counties reporting all night
 * - This is NOT an error — it's a WAF/CDN issue blocking server-side requests
 * - The failover must trigger on "valid response but empty data" not just HTTP errors
 * - AP JSON API is the most reliable fallback (used by NPR, NBC, etc.)
 * - NBC's __NEXT_DATA__ is a good secondary fallback but format changes frequently
 */
import { Request, Response } from "express";
import {
  getAllSenateRaces,
  getAllHouseRaces,
  getAllGovernorRaces,
  updateSenateRace,
  updateHouseRace,
  updateGovernorRace,
} from "./db";
import { broadcastElectionEvent } from "./ws";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — Edit this section for each new state
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateElectionConfig {
  /** Two-letter state code (e.g., "CO", "TX", "GA") */
  stateCode: string;
  /** Full state name for logging */
  stateName: string;
  /** Election date in YYYY-MM-DD format */
  electionDate: string;
  /** Type of election */
  electionType: "primary" | "general" | "runoff" | "special";

  /** Clarity Elections ENR base URL (from state SOS website) */
  clarityBaseUrl: string;
  /** Clarity version string (found in the ENR URL path) */
  clarityVersion: string;
  /** Total number of counties in the state */
  countyCount: number;

  /** NBC News results page URL for this state */
  nbcResultsUrl: string;
  /** AP elections API URL pattern (if known) */
  apApiUrl?: string;

  /** Which races to track */
  races: {
    senate: boolean;
    governor: boolean;
    house: boolean;
    /** Number of House districts in the state */
    houseDistricts?: number;
  };

  /** Failover configuration */
  failover: {
    /** Minutes of empty Clarity data before triggering NBC/AP fallback */
    thresholdMinutes: number;
    /** Assumed interval between Heartbeat runs (minutes) */
    runIntervalMinutes: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE CONFIGS — Use these as starting points for new states
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_CONFIGS: Record<string, StateElectionConfig> = {
  // Colorado Primary (the original — already deployed separately)
  CO_PRIMARY_2026: {
    stateCode: "CO",
    stateName: "Colorado",
    electionDate: "2026-06-30",
    electionType: "primary",
    clarityBaseUrl: "https://results.enr.clarityelections.com/CO/122598",
    clarityVersion: "web.345435",
    countyCount: 64,
    nbcResultsUrl: "https://www.nbcnews.com/politics/2026-primary-elections/colorado-results",
    apApiUrl: "https://interactives.ap.org/elections/live-results/2026-06-30/results/2026-06-30/races/CO.json",
    races: { senate: true, governor: true, house: true, houseDistricts: 8 },
    failover: { thresholdMinutes: 15, runIntervalMinutes: 2 },
  },

  // Georgia Runoff (example — adjust URLs when available)
  GA_RUNOFF_2026: {
    stateCode: "GA",
    stateName: "Georgia",
    electionDate: "2026-08-11",
    electionType: "runoff",
    clarityBaseUrl: "https://results.enr.clarityelections.com/GA/XXXXXX",
    clarityVersion: "web.XXXXXX",
    countyCount: 159,
    nbcResultsUrl: "https://www.nbcnews.com/politics/2026-elections/georgia-results",
    races: { senate: true, governor: false, house: true, houseDistricts: 14 },
    failover: { thresholdMinutes: 15, runIntervalMinutes: 2 },
  },

  // Texas Primary (example — adjust URLs when available)
  TX_PRIMARY_2026: {
    stateCode: "TX",
    stateName: "Texas",
    electionDate: "2026-03-03",
    electionType: "primary",
    clarityBaseUrl: "https://results.enr.clarityelections.com/TX/XXXXXX",
    clarityVersion: "web.XXXXXX",
    countyCount: 254,
    nbcResultsUrl: "https://www.nbcnews.com/politics/2026-primary-elections/texas-results",
    races: { senate: true, governor: true, house: true, houseDistricts: 38 },
    failover: { thresholdMinutes: 20, runIntervalMinutes: 2 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENGINE — Do not modify unless fixing bugs
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClarityCandidate {
  name: string;
  party: string;
  votes: number;
  pct: number;
  isWinner?: boolean;
}

interface ClarityRace {
  contestName: string;
  candidates: ClarityCandidate[];
  precinctsReporting: number;
  precinctsTotal: number;
  pctReporting: number;
  district?: number;
  party?: string;
}

interface FetchResult {
  races: ClarityRace[];
  lastUpdated: string;
  countiesReporting: number;
  countiesTotal: number;
  source: string;
}

interface UpdateResult {
  race: string;
  status: "updated" | "skipped" | "error";
  detail?: string;
  source: string;
}

// ─── Failover State (per-instance) ───────────────────────────────────────────

interface FailoverState {
  consecutiveEmptyRuns: number;
  firstEmptyRunAt: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RACE_PATTERNS = {
  senate: /u\.?s\.?\s*senat/i,
  governor: /governor/i,
  house: /u\.?s\.?\s*(house|representative|congress)/i,
};

function toEasternTime(date: Date = new Date()): string {
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getPartyCode(partyStr: string): "D" | "R" | "I" | null {
  const p = partyStr.toUpperCase().trim();
  if (p.includes("DEM") || p === "D") return "D";
  if (p.includes("REP") || p === "R") return "R";
  if (p.includes("IND") || p.includes("LIB") || p.includes("GRN") || p === "I") return "I";
  return null;
}

function extractDistrict(contestName: string): number | undefined {
  const match = contestName.match(/district\s*(\d+)/i) || contestName.match(/cd[- ]?(\d+)/i);
  return match ? parseInt(match[1]) : undefined;
}

// ─── Clarity Fetcher ─────────────────────────────────────────────────────────

async function fetchClarity(config: StateElectionConfig, log: (msg: string) => void): Promise<FetchResult | null> {
  const summaryUrl = `${config.clarityBaseUrl}/${config.clarityVersion}/json/en/summary.json`;

  try {
    // Try static version URL first
    const response = await fetch(summaryUrl, {
      headers: { "User-Agent": "ElectionCenter/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log(`Clarity summary returned ${response.status} — trying dynamic version`);
      return await fetchClarityDynamic(config, log);
    }

    const data = await response.json();
    return parseClaritySummary(data, config, log);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Clarity fetch error: ${msg}`);
    return await fetchClarityDynamic(config, log);
  }
}

async function fetchClarityDynamic(config: StateElectionConfig, log: (msg: string) => void): Promise<FetchResult | null> {
  try {
    const verUrl = `${config.clarityBaseUrl}/current_ver.txt`;
    const verResp = await fetch(verUrl, { signal: AbortSignal.timeout(10000) });
    if (!verResp.ok) {
      log(`current_ver.txt returned ${verResp.status}`);
      return null;
    }
    const version = (await verResp.text()).trim();
    log(`Dynamic version: ${version}`);

    const summaryUrl = `${config.clarityBaseUrl}/${version}/json/en/summary.json`;
    const summaryResp = await fetch(summaryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!summaryResp.ok) {
      log(`Dynamic summary returned ${summaryResp.status}`);
      return null;
    }

    const data = await summaryResp.json();
    return parseClaritySummary(data, config, log);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Dynamic fetch error: ${msg}`);
    return null;
  }
}

function parseClaritySummary(data: any, config: StateElectionConfig, log: (msg: string) => void): FetchResult | null {
  const races: ClarityRace[] = [];

  try {
    const contests = data.Contests || data.contests || data.races || data.C || data;
    const contestArray = Array.isArray(contests) ? contests : (Array.isArray(data.C) ? data.C : null);

    if (!contestArray) {
      log(`Unexpected data structure: ${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }

    for (const contest of contestArray) {
      const race = parseContest(contest);
      if (race) races.push(race);
    }

    const countiesReporting = data.CountiesReporting || data.countiesReporting || 0;
    const countiesTotal = data.CountiesTotal || data.countiesTotal || config.countyCount;

    log(`Parsed ${races.length} races, ${countiesReporting}/${countiesTotal} counties`);

    return {
      races,
      lastUpdated: toEasternTime(),
      countiesReporting,
      countiesTotal,
      source: `${config.stateName} Secretary of State (Clarity Elections ENR)`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Parse error: ${msg}`);
    return null;
  }
}

function parseContest(contest: any): ClarityRace | null {
  const name = contest.C || contest.ContestName || contest.name || contest.contestName || "";
  if (!name) return null;

  const candidates: ClarityCandidate[] = [];
  const choices = contest.CH || contest.Choices || contest.candidates || [];

  for (const choice of choices) {
    const candidateName = choice.C || choice.Name || choice.name || "";
    const party = choice.P || choice.Party || choice.party || "";
    const votes = choice.V || choice.Votes || choice.votes || 0;
    const pct = choice.PCT || choice.Pct || choice.pct || 0;
    const isWinner = choice.W || choice.IsWinner || false;

    if (candidateName.toLowerCase().includes("write-in")) continue;

    candidates.push({
      name: candidateName,
      party,
      votes: typeof votes === "number" ? votes : parseInt(String(votes)) || 0,
      pct: typeof pct === "number" ? pct : parseFloat(String(pct)) || 0,
      isWinner,
    });
  }

  const precinctsReporting = contest.PR || contest.PrecinctsReporting || 0;
  const precinctsTotal = contest.PT || contest.PrecinctsTotal || 0;

  return {
    contestName: name,
    candidates,
    precinctsReporting,
    precinctsTotal,
    pctReporting: precinctsTotal > 0 ? (precinctsReporting / precinctsTotal) * 100 : 0,
    district: extractDistrict(name),
    party: contest.Party || contest.party || undefined,
  };
}

// ─── AP/NBC Fallback ─────────────────────────────────────────────────────────

async function fetchAPFallback(config: StateElectionConfig, log: (msg: string) => void): Promise<FetchResult | null> {
  // Try AP JSON API first (most reliable)
  if (config.apApiUrl) {
    try {
      const response = await fetch(config.apApiUrl, {
        headers: { "User-Agent": "ElectionCenter/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        return parseAPResults(data, config, log);
      }
      log(`AP API returned ${response.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`AP API error: ${msg}`);
    }
  }

  // Fallback: scrape NBC's __NEXT_DATA__
  return await fetchNBCScrape(config, log);
}

function parseAPResults(data: any, config: StateElectionConfig, log: (msg: string) => void): FetchResult | null {
  const races: ClarityRace[] = [];

  try {
    const apRaces = data.races || data.results || data;
    if (!Array.isArray(apRaces)) {
      log("AP data is not an array");
      return null;
    }

    for (const race of apRaces) {
      const contestName = race.officeName || race.raceName || race.name || "";
      const candidates: ClarityCandidate[] = [];

      const apCandidates = race.candidates || race.reportingUnits?.[0]?.candidates || [];
      for (const c of apCandidates) {
        candidates.push({
          name: `${c.first || ""} ${c.last || c.name || ""}`.trim(),
          party: c.party || "",
          votes: c.voteCount || c.votes || 0,
          pct: c.votePct || c.pct || 0,
          isWinner: c.winner === "X" || c.winner === true || c.isWinner || false,
        });
      }

      const precinctsReporting = race.precinctsReporting || race.reportingUnits?.[0]?.precinctsReporting || 0;
      const precinctsTotal = race.precinctsTotal || race.reportingUnits?.[0]?.precinctsTotal || 0;

      races.push({
        contestName,
        candidates,
        precinctsReporting,
        precinctsTotal,
        pctReporting: precinctsTotal > 0 ? (precinctsReporting / precinctsTotal) * 100 : 0,
        district: extractDistrict(contestName),
        party: race.party || undefined,
      });
    }

    log(`Parsed ${races.length} races from AP`);
    return {
      races,
      lastUpdated: toEasternTime(),
      countiesReporting: races.length > 0 ? config.countyCount : 0,
      countiesTotal: config.countyCount,
      source: `Associated Press (fallback for ${config.stateName})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`AP parse error: ${msg}`);
    return null;
  }
}

async function fetchNBCScrape(config: StateElectionConfig, log: (msg: string) => void): Promise<FetchResult | null> {
  try {
    const response = await fetch(config.nbcResultsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ElectionCenter/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log(`NBC page returned ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract __NEXT_DATA__ or similar embedded JSON
    const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
      || html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/)
      || html.match(/"races"\s*:\s*(\[[\s\S]*?\])(?=,\s*")/);

    if (!jsonMatch) {
      log("Could not extract structured data from NBC page");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const races = parsed?.props?.pageProps?.races || parsed?.races || parsed;

    if (!Array.isArray(races) || races.length === 0) {
      log("NBC data parsed but no races found");
      return null;
    }

    const clarityRaces: ClarityRace[] = [];
    for (const race of races) {
      const contestName = race.officeName || race.name || race.raceName || "";
      const candidates: ClarityCandidate[] = [];

      for (const c of (race.candidates || [])) {
        candidates.push({
          name: c.fullName || c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          party: c.party || c.partyId || "",
          votes: c.votes || c.voteCount || 0,
          pct: c.percentage || c.votePct || 0,
          isWinner: c.winner || c.isWinner || false,
        });
      }

      clarityRaces.push({
        contestName,
        candidates,
        precinctsReporting: race.precinctsReporting || 0,
        precinctsTotal: race.precinctsTotal || 0,
        pctReporting: race.pctReporting || 0,
        district: extractDistrict(contestName),
        party: race.party || undefined,
      });
    }

    log(`Parsed ${clarityRaces.length} races from NBC`);
    return {
      races: clarityRaces,
      lastUpdated: toEasternTime(),
      countiesReporting: clarityRaces.length > 0 ? config.countyCount : 0,
      countiesTotal: config.countyCount,
      source: `NBC News / Associated Press (fallback for ${config.stateName})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`NBC scrape error: ${msg}`);
    return null;
  }
}

// ─── Result Processing ───────────────────────────────────────────────────────

async function processResults(
  fetchResult: FetchResult,
  config: StateElectionConfig,
  log: (msg: string) => void
): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];

  const [allSenate, allHouse, allGovernor] = await Promise.all([
    config.races.senate ? getAllSenateRaces() : Promise.resolve([]),
    config.races.house ? getAllHouseRaces() : Promise.resolve([]),
    config.races.governor ? getAllGovernorRaces() : Promise.resolve([]),
  ]);

  const stateRaces = {
    senate: allSenate.filter((r: any) => r.stateCode === config.stateCode),
    house: allHouse.filter((r: any) => r.stateCode === config.stateCode),
    governor: allGovernor.filter((r: any) => r.stateCode === config.stateCode),
  };

  log(`DB: ${stateRaces.senate.length} senate, ${stateRaces.house.length} house, ${stateRaces.governor.length} governor`);

  for (const race of fetchResult.races) {
    try {
      if (config.races.senate && RACE_PATTERNS.senate.test(race.contestName)) {
        await processSenateRace(race, stateRaces.senate, config, results, log);
      } else if (config.races.governor && RACE_PATTERNS.governor.test(race.contestName)) {
        await processGovernorRace(race, stateRaces.governor, config, results, log);
      } else if (config.races.house && RACE_PATTERNS.house.test(race.contestName)) {
        await processHouseRace(race, stateRaces.house, config, results, log);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ race: race.contestName, status: "error", detail: msg, source: fetchResult.source });
    }
  }

  return results;
}

async function processSenateRace(
  race: ClarityRace, dbRaces: any[], config: StateElectionConfig, results: UpdateResult[], log: (msg: string) => void
) {
  if (dbRaces.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No race in DB", source: config.stateName });
    return;
  }

  const dbRace = dbRaces[0];
  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);
  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates", source: config.stateName });
    return;
  }

  const isDemPrimary = race.party?.includes("DEM") || race.contestName.toLowerCase().includes("democrat");
  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: config.electionType === "primary" ? "Primary" : "General",
  };

  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    update.primaryWinner = winner.name;
    update.primaryParty = getPartyCode(winner.party) || (isDemPrimary ? "D" : "R");
    log(`Senate winner: ${winner.name} (${winner.pct}%)`);

    broadcastElectionEvent({
      type: "race_called",
      chamber: "senate",
      stateCode: config.stateCode,
      stateName: config.stateName,
      calledParty: getPartyCode(winner.party) || "D",
      calledWinner: winner.name,
      electionDate: config.electionDate,
      isUncontested: topCandidates.length <= 1,
      timestamp: new Date().toISOString(),
    });
  }

  await updateSenateRace(dbRace.id, update);
  results.push({
    race: `${config.stateCode} Senate`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}%`,
    source: config.stateName,
  });
}

async function processGovernorRace(
  race: ClarityRace, dbRaces: any[], config: StateElectionConfig, results: UpdateResult[], log: (msg: string) => void
) {
  if (dbRaces.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No race in DB", source: config.stateName });
    return;
  }

  const dbRace = dbRaces[0];
  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);
  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates", source: config.stateName });
    return;
  }

  const isDemPrimary = race.party?.includes("DEM") || race.contestName.toLowerCase().includes("democrat");
  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: config.electionType === "primary" ? "Primary" : "General",
  };

  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    if (isDemPrimary || getPartyCode(winner.party) === "D") {
      update.demCandidate = winner.name;
    } else {
      update.repCandidate = winner.name;
    }
    log(`Governor winner: ${winner.name} (${winner.pct}%)`);
  }

  await updateGovernorRace(dbRace.id, update);
  results.push({
    race: `${config.stateCode} Governor`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}%`,
    source: config.stateName,
  });
}

async function processHouseRace(
  race: ClarityRace, dbRaces: any[], config: StateElectionConfig, results: UpdateResult[], log: (msg: string) => void
) {
  const district = race.district || extractDistrict(race.contestName);
  if (!district) {
    results.push({ race: race.contestName, status: "skipped", detail: "No district found", source: config.stateName });
    return;
  }

  const dbRace = dbRaces.find((r: any) => r.district === district);
  if (!dbRace) {
    results.push({ race: race.contestName, status: "skipped", detail: `No ${config.stateCode}-${district} in DB`, source: config.stateName });
    return;
  }

  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);
  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates", source: config.stateName });
    return;
  }

  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: config.electionType === "primary" ? "Primary" : "General",
  };

  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    update.primaryWinner = winner.name;
    update.primaryParty = getPartyCode(winner.party) || "D";
    log(`${config.stateCode}-${district} winner: ${winner.name} (${winner.pct}%)`);

    broadcastElectionEvent({
      type: "race_called",
      chamber: "house",
      stateCode: config.stateCode,
      stateName: config.stateName,
      calledParty: getPartyCode(winner.party) || "D",
      calledWinner: winner.name,
      district,
      districtLabel: String(district),
      electionDate: config.electionDate,
      isUncontested: topCandidates.length <= 1,
      timestamp: new Date().toISOString(),
    });
  }

  await updateHouseRace(dbRace.id, update);
  results.push({
    race: `${config.stateCode}-${district}`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}%`,
    source: config.stateName,
  });
}

// ─── Main Handler Factory ────────────────────────────────────────────────────

/**
 * Creates a Heartbeat-compatible HTTP handler for a state election.
 *
 * Usage:
 * ```ts
 * import { createElectionHandler, EXAMPLE_CONFIGS } from "./clarityFailoverTemplate";
 *
 * // In scheduledRoutes.ts:
 * const gaHandler = createElectionHandler(EXAMPLE_CONFIGS.GA_RUNOFF_2026);
 * app.post("/api/scheduled/ga-runoff", gaHandler);
 * ```
 */
export function createElectionHandler(config: StateElectionConfig) {
  // Per-handler failover state (persists across requests within the same process)
  const state: FailoverState = {
    consecutiveEmptyRuns: 0,
    firstEmptyRunAt: null,
  };

  return async function handler(req: Request, res: Response): Promise<void> {
    const prefix = `[${config.stateCode} ${config.electionType}]`;
    const log = (msg: string) => console.log(`${prefix} ${msg}`);
    const startTime = Date.now();

    log(`Starting update at ${toEasternTime()}`);

    try {
      // Step 1: Fetch from Clarity
      const clarityData = await fetchClarity(config, log);

      // Step 2: Check for empty-data condition
      const clarityIsEmpty = !clarityData ||
        (clarityData.countiesReporting === 0 && clarityData.races.length === 0) ||
        (clarityData.countiesReporting === 0 &&
          clarityData.races.every(r => r.candidates.length === 0 || r.candidates.every(c => c.votes === 0)));

      if (clarityIsEmpty) {
        state.consecutiveEmptyRuns++;
        if (!state.firstEmptyRunAt) state.firstEmptyRunAt = new Date();
        const minutesEmpty = (Date.now() - state.firstEmptyRunAt.getTime()) / (1000 * 60);

        log(`Clarity empty (run #${state.consecutiveEmptyRuns}, ${minutesEmpty.toFixed(1)} min)`);

        // Step 3: Failover if threshold exceeded
        if (minutesEmpty >= config.failover.thresholdMinutes) {
          log(`⚠️ FAILOVER: Clarity empty for ${minutesEmpty.toFixed(0)} min. Switching to AP/NBC.`);

          const fallbackData = await fetchAPFallback(config, log);

          if (fallbackData && fallbackData.races.length > 0) {
            const updateResults = await processResults(fallbackData, config, log);
            const updated = updateResults.filter(r => r.status === "updated").length;

            if (updated > 0) {
              state.consecutiveEmptyRuns = 0;
              state.firstEmptyRunAt = null;
            }

            log(`Fallback done: ${updated} updated in ${Date.now() - startTime}ms`);
            res.json({
              success: true,
              timestamp: toEasternTime(),
              source: fallbackData.source,
              failover: true,
              failoverReason: `Clarity empty for ${minutesEmpty.toFixed(0)} min`,
              updated,
              details: updateResults,
              elapsed_ms: Date.now() - startTime,
            });
            return;
          } else {
            log("Both Clarity and AP/NBC empty");
            res.json({
              success: true,
              message: "Both sources empty — results may not be posted yet",
              failover: true,
              elapsed_ms: Date.now() - startTime,
            });
            return;
          }
        }

        // Not yet at threshold
        res.json({
          success: true,
          message: `Clarity empty (${minutesEmpty.toFixed(1)}/${config.failover.thresholdMinutes} min until failover)`,
          clarityEmptyRuns: state.consecutiveEmptyRuns,
          elapsed_ms: Date.now() - startTime,
        });
        return;
      }

      // Step 4: Clarity has data — process normally
      if (state.consecutiveEmptyRuns > 0) {
        log(`Clarity restored after ${state.consecutiveEmptyRuns} empty runs`);
      }
      state.consecutiveEmptyRuns = 0;
      state.firstEmptyRunAt = null;

      const updateResults = await processResults(clarityData, config, log);
      const updated = updateResults.filter(r => r.status === "updated").length;

      log(`Done: ${updated} updated in ${Date.now() - startTime}ms`);

      res.json({
        success: true,
        timestamp: toEasternTime(),
        source: clarityData.source,
        countiesReporting: `${clarityData.countiesReporting}/${clarityData.countiesTotal}`,
        updated,
        details: updateResults,
        elapsed_ms: Date.now() - startTime,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Fatal error: ${msg}`);
      res.status(500).json({ success: false, error: msg, elapsed_ms: Date.now() - startTime });
    }
  };
}
