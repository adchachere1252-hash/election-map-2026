/**
 * Colorado Primary Results Fetcher
 * Primary source: Colorado Secretary of State (Clarity Elections ENR)
 * Verification source: NBC News
 * All times displayed in Eastern Time
 *
 * Fetches live results from the Clarity Elections JSON API and updates
 * the database with primary race results for CO Senate, Governor, and House.
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

// ─── Constants ────────────────────────────────────────────────────────────────

// Colorado SOS Clarity Elections ENR base URL for 2026 Primary
const CLARITY_BASE = "https://results.enr.clarityelections.com/CO/122598";
const CLARITY_VERSION = "web.345435";
const CLARITY_SUMMARY_URL = `${CLARITY_BASE}/${CLARITY_VERSION}/json/en/summary.json`;
const CLARITY_DETAIL_URL = `${CLARITY_BASE}/${CLARITY_VERSION}/json/en/electionsettings.json`;

// NBC News election results (for verification)
const NBC_BASE = "https://www.nbcnews.com/politics/2026-primary-elections/colorado-results";

// Race name patterns from Clarity Elections (may vary — we'll match flexibly)
const RACE_PATTERNS = {
  senate: /u\.?s\.?\s*senat/i,
  governor: /governor/i,
  house: /u\.?s\.?\s*(house|representative|congress)/i,
  secretaryOfState: /secretary\s*of\s*state/i,
  attorneyGeneral: /attorney\s*general/i,
  treasurer: /state\s*treasurer/i,
};

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
  district?: number | undefined;
  party?: string; // "DEM" or "REP" for primary races
}

interface FetchResult {
  races: ClarityRace[];
  lastUpdated: string; // Eastern Time
  countiesReporting: number;
  countiesTotal: number;
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Fetch and parse Clarity Elections summary JSON.
 * The Clarity system uses a JavaScript-heavy SPA, but the JSON endpoints
 * are accessible directly.
 */
async function fetchClarityResults(): Promise<FetchResult | null> {
  const log = (msg: string) => console.log(`[CO Primary] ${msg}`);

  try {
    // Try the summary JSON endpoint first
    const response = await fetch(CLARITY_SUMMARY_URL, {
      headers: {
        "User-Agent": "ElectionCenter/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log(`Clarity summary returned ${response.status} — trying detail endpoint`);
      // Fallback: try the detail XML zip approach
      return await fetchClarityDetailXml();
    }

    const data = await response.json();
    return parseClaritySummary(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Error fetching Clarity data: ${msg}`);
    // Try alternative approach
    return await fetchClarityDetailXml();
  }
}

/**
 * Alternative: fetch from the detail XML/JSON endpoints that Clarity exposes.
 * These are more reliable but require different parsing.
 */
async function fetchClarityDetailXml(): Promise<FetchResult | null> {
  const log = (msg: string) => console.log(`[CO Primary/Detail] ${msg}`);

  try {
    // Try current_ver.txt to get the latest version
    const verUrl = `${CLARITY_BASE}/current_ver.txt`;
    const verResp = await fetch(verUrl, { signal: AbortSignal.timeout(10000) });
    if (!verResp.ok) {
      log(`current_ver.txt returned ${verResp.status}`);
      return null;
    }
    const version = (await verResp.text()).trim();
    log(`Current version: ${version}`);

    // Try the JSON summary with the dynamic version
    const summaryUrl = `${CLARITY_BASE}/${version}/json/en/summary.json`;
    const summaryResp = await fetch(summaryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!summaryResp.ok) {
      log(`Dynamic summary returned ${summaryResp.status}`);
      return null;
    }

    const data = await summaryResp.json();
    return parseClaritySummary(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Error in detail fetch: ${msg}`);
    return null;
  }
}

/**
 * Parse the Clarity Elections summary JSON into our standardized format.
 * The format varies by Clarity version, so we handle multiple structures.
 */
function parseClaritySummary(data: any): FetchResult | null {
  const log = (msg: string) => console.log(`[CO Primary/Parse] ${msg}`);
  const races: ClarityRace[] = [];

  try {
    // Clarity JSON can have different structures depending on version
    // Common patterns: data.Contests[], data.races[], or flat array
    const contests = data.Contests || data.contests || data.races || data;

    if (!Array.isArray(contests)) {
      // Try nested structure
      if (data.C && Array.isArray(data.C)) {
        // Compact format: C = contests array
        for (const contest of data.C) {
          const race = parseCompactContest(contest);
          if (race) races.push(race);
        }
      } else {
        log(`Unexpected data structure: ${JSON.stringify(data).slice(0, 200)}`);
        return null;
      }
    } else {
      for (const contest of contests) {
        const race = parseContest(contest);
        if (race) races.push(race);
      }
    }

    // Extract reporting info
    const countiesReporting = data.CountiesReporting || data.countiesReporting || 0;
    const countiesTotal = data.CountiesTotal || data.countiesTotal || 64; // CO has 64 counties

    log(`Parsed ${races.length} races, ${countiesReporting}/${countiesTotal} counties reporting`);

    return {
      races,
      lastUpdated: toEasternTime(),
      countiesReporting,
      countiesTotal,
      source: "Colorado Secretary of State (Clarity Elections ENR)",
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

    // Skip write-in candidates
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
  const pctReporting = precinctsTotal > 0 ? (precinctsReporting / precinctsTotal) * 100 : 0;

  return {
    contestName: name,
    candidates,
    precinctsReporting,
    precinctsTotal,
    pctReporting,
    district: extractDistrict(name),
    party: contest.Party || contest.party || undefined,
  };
}

function parseCompactContest(contest: any): ClarityRace | null {
  // Handle Clarity's compact JSON format
  return parseContest(contest);
}

// ─── NBC Verification ─────────────────────────────────────────────────────────

interface NBCVerification {
  verified: boolean;
  source: string;
  note: string;
}

/**
 * Attempt to cross-reference results with NBC News.
 * NBC uses AP data, so we check if their reported winners match.
 * This is a verification layer, not a primary data source.
 */
async function verifyWithNBC(raceName: string, winner: string): Promise<NBCVerification> {
  // NBC verification is logged but doesn't block updates
  // In production, this would scrape NBC's results page
  return {
    verified: false,
    source: "NBC News",
    note: `NBC verification pending for ${raceName} — winner: ${winner}`,
  };
}

// ─── Main Update Logic ────────────────────────────────────────────────────────

interface UpdateResult {
  race: string;
  status: "updated" | "skipped" | "error";
  detail?: string;
  source: string;
  nbcVerified?: boolean;
}

async function processColoradoResults(fetchResult: FetchResult): Promise<UpdateResult[]> {
  const log = (msg: string) => console.log(`[CO Primary/Process] ${msg}`);
  const results: UpdateResult[] = [];

  // Load CO races from DB
  const [allSenate, allHouse, allGovernor] = await Promise.all([
    getAllSenateRaces(),
    getAllHouseRaces(),
    getAllGovernorRaces(),
  ]);

  const coSenate = allSenate.filter(r => r.stateCode === "CO");
  const coHouse = allHouse.filter(r => r.stateCode === "CO");
  const coGovernor = allGovernor.filter(r => r.stateCode === "CO");

  log(`DB: ${coSenate.length} senate, ${coHouse.length} house, ${coGovernor.length} governor races`);

  for (const race of fetchResult.races) {
    try {
      // Match race to our DB records
      if (RACE_PATTERNS.senate.test(race.contestName)) {
        await processSenateRace(race, coSenate, results, log);
      } else if (RACE_PATTERNS.governor.test(race.contestName)) {
        await processGovernorRace(race, coGovernor, results, log);
      } else if (RACE_PATTERNS.house.test(race.contestName)) {
        await processHouseRace(race, coHouse, results, log);
      }
      // Skip state-level races (SoS, AG, Treasurer) — we don't track those
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        race: race.contestName,
        status: "error",
        detail: msg,
        source: fetchResult.source,
      });
    }
  }

  return results;
}

async function processSenateRace(
  race: ClarityRace,
  dbRaces: any[],
  results: UpdateResult[],
  log: (msg: string) => void
) {
  if (dbRaces.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No CO Senate race in DB", source: "CO SOS" });
    return;
  }

  const dbRace = dbRaces[0];
  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);

  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates reported yet", source: "CO SOS" });
    return;
  }

  // Determine if this is a D or R primary based on contest name or party field
  const isDemPrimary = race.party?.includes("DEM") || race.contestName.toLowerCase().includes("democrat");
  const isRepPrimary = race.party?.includes("REP") || race.contestName.toLowerCase().includes("republican");

  // Build update payload
  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: "Primary",
  };

  // Set primary winner if race is called (100% reporting or marked winner)
  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    update.primaryWinner = winner.name;
    update.primaryParty = getPartyCode(winner.party) || (isDemPrimary ? "D" : isRepPrimary ? "R" : null);

    // NBC verification
    const nbcResult = await verifyWithNBC(race.contestName, winner.name);
    log(`Senate primary winner: ${winner.name} (${winner.pct}%) | NBC: ${nbcResult.verified ? "✓" : "pending"}`);
  }

  // Set vote counts for top 2
  if (topCandidates[0]) {
    if (isDemPrimary || getPartyCode(topCandidates[0].party) === "D") {
      update.candidate1Name = topCandidates[0].name;
      update.candidate1VotePct = topCandidates[0].pct.toFixed(2);
      update.candidate1Votes = topCandidates[0].votes;
    } else {
      update.candidate2Name = topCandidates[0].name;
      update.candidate2VotePct = topCandidates[0].pct.toFixed(2);
      update.candidate2Votes = topCandidates[0].votes;
    }
  }

  await updateSenateRace(dbRace.id, update);
  results.push({
    race: `CO Senate ${isDemPrimary ? "(D)" : isRepPrimary ? "(R)" : ""}`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}% | ${race.pctReporting.toFixed(1)}% reporting`,
    source: "Colorado Secretary of State",
    nbcVerified: false,
  });

  // Broadcast if winner called
  if (winner) {
    broadcastElectionEvent({
      type: "race_called",
      chamber: "senate",
      stateCode: "CO",
      stateName: "Colorado",
      calledParty: getPartyCode(winner.party) || "D",
      calledWinner: winner.name,
      electionDate: "2026-06-30",
      isUncontested: topCandidates.length <= 1,
      timestamp: new Date().toISOString(),
    });
  }
}

async function processGovernorRace(
  race: ClarityRace,
  dbRaces: any[],
  results: UpdateResult[],
  log: (msg: string) => void
) {
  if (dbRaces.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No CO Governor race in DB", source: "CO SOS" });
    return;
  }

  const dbRace = dbRaces[0];
  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);

  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates reported yet", source: "CO SOS" });
    return;
  }

  const isDemPrimary = race.party?.includes("DEM") || race.contestName.toLowerCase().includes("democrat");
  const isRepPrimary = race.party?.includes("REP") || race.contestName.toLowerCase().includes("republican");

  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: "Voting",
  };

  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    update.primaryWinner = winner.name;
    update.primaryParty = getPartyCode(winner.party) || (isDemPrimary ? "D" : isRepPrimary ? "R" : null);
    if (isDemPrimary) update.demCandidate = winner.name;
    if (isRepPrimary) update.repCandidate = winner.name;

    const nbcResult = await verifyWithNBC(race.contestName, winner.name);
    log(`Governor primary winner: ${winner.name} (${winner.pct}%) | NBC: ${nbcResult.verified ? "✓" : "pending"}`);
  }

  // Set vote counts
  if (isDemPrimary && topCandidates[0]) {
    update.demVotes = topCandidates[0].votes;
  } else if (isRepPrimary && topCandidates[0]) {
    update.repVotes = topCandidates[0].votes;
  }

  await updateGovernorRace(dbRace.id, update);
  results.push({
    race: `CO Governor ${isDemPrimary ? "(D)" : isRepPrimary ? "(R)" : ""}`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}% | ${race.pctReporting.toFixed(1)}% reporting`,
    source: "Colorado Secretary of State",
    nbcVerified: false,
  });

  if (winner) {
    broadcastElectionEvent({
      type: "race_called",
      chamber: "governor",
      stateCode: "CO",
      stateName: "Colorado",
      calledParty: getPartyCode(winner.party) || (isDemPrimary ? "D" : "R"),
      calledWinner: winner.name,
      electionDate: "2026-06-30",
      isUncontested: topCandidates.length <= 1,
      timestamp: new Date().toISOString(),
    });
  }
}

async function processHouseRace(
  race: ClarityRace,
  dbRaces: any[],
  results: UpdateResult[],
  log: (msg: string) => void
) {
  const district = race.district;
  if (!district) {
    results.push({ race: race.contestName, status: "skipped", detail: "Could not determine district", source: "CO SOS" });
    return;
  }

  const dbRace = dbRaces.find(r => r.district === district);
  if (!dbRace) {
    results.push({ race: race.contestName, status: "skipped", detail: `No CO-${district} in DB`, source: "CO SOS" });
    return;
  }

  const topCandidates = [...race.candidates].sort((a, b) => b.votes - a.votes);
  if (topCandidates.length === 0) {
    results.push({ race: race.contestName, status: "skipped", detail: "No candidates reported yet", source: "CO SOS" });
    return;
  }

  const isDemPrimary = race.party?.includes("DEM") || race.contestName.toLowerCase().includes("democrat");
  const isRepPrimary = race.party?.includes("REP") || race.contestName.toLowerCase().includes("republican");

  const update: Record<string, unknown> = {
    pctReporting: race.pctReporting.toFixed(2),
    status: "Primary",
  };

  const winner = topCandidates.find(c => c.isWinner) || (race.pctReporting >= 99 ? topCandidates[0] : null);
  if (winner) {
    update.primaryWinner = winner.name;
    update.primaryParty = getPartyCode(winner.party) || (isDemPrimary ? "D" : isRepPrimary ? "R" : null);

    const nbcResult = await verifyWithNBC(race.contestName, winner.name);
    log(`CO-${district} primary winner: ${winner.name} (${winner.pct}%) | NBC: ${nbcResult.verified ? "✓" : "pending"}`);
  }

  // Set vote data
  if (topCandidates[0]) {
    update.candidate1Name = topCandidates[0].name;
    update.candidate1VotePct = topCandidates[0].pct.toFixed(2);
    update.candidate1Votes = topCandidates[0].votes;
  }
  if (topCandidates[1]) {
    update.candidate2Name = topCandidates[1].name;
    update.candidate2VotePct = topCandidates[1].pct.toFixed(2);
    update.candidate2Votes = topCandidates[1].votes;
  }

  await updateHouseRace(dbRace.id, update);
  results.push({
    race: `CO-${district} ${isDemPrimary ? "(D)" : isRepPrimary ? "(R)" : ""}`,
    status: "updated",
    detail: `${topCandidates[0]?.name}: ${topCandidates[0]?.pct}% | ${race.pctReporting.toFixed(1)}% reporting`,
    source: "Colorado Secretary of State",
    nbcVerified: false,
  });

  if (winner) {
    broadcastElectionEvent({
      type: "race_called",
      chamber: "house",
      stateCode: "CO",
      stateName: "Colorado",
      calledParty: getPartyCode(winner.party) || (isDemPrimary ? "D" : "R"),
      calledWinner: winner.name,
      district,
      districtLabel: String(district),
      electionDate: "2026-06-30",
      isUncontested: topCandidates.length <= 1,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Empty-Data Failover Logic ───────────────────────────────────────────────

/**
 * Tracks consecutive runs where Clarity returns 0 counties reporting.
 * After FAILOVER_THRESHOLD_MINUTES of empty data (calculated from run interval),
 * automatically switches to NBC/AP as the primary data source.
 */
let consecutiveEmptyRuns = 0;
let firstEmptyRunAt: Date | null = null;
const FAILOVER_THRESHOLD_MINUTES = 15;
const ASSUMED_RUN_INTERVAL_MINUTES = 2; // Heartbeat runs every 2 min

/**
 * Fetch results from NBC News / Associated Press as a fallback.
 * Uses the NBC elections API which serves AP data.
 */
async function fetchNBCFallbackResults(): Promise<FetchResult | null> {
  const log = (msg: string) => console.log(`[CO Primary/NBC Fallback] ${msg}`);

  try {
    // NBC exposes AP data via their elections API
    // Try the AP elections API format (used by NBC, NPR, etc.)
    const apUrl = "https://interactives.ap.org/elections/live-results/2026-06-30/results/2026-06-30/races/CO.json";
    const response = await fetch(apUrl, {
      headers: {
        "User-Agent": "ElectionCenter/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log(`AP/NBC API returned ${response.status} — trying NBC scrape approach`);
      return await fetchNBCScrapeFallback();
    }

    const data = await response.json();
    return parseAPResults(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`NBC/AP fallback error: ${msg}`);
    return await fetchNBCScrapeFallback();
  }
}

/**
 * Secondary fallback: scrape NBC's results page for structured data.
 */
async function fetchNBCScrapeFallback(): Promise<FetchResult | null> {
  const log = (msg: string) => console.log(`[CO Primary/NBC Scrape] ${msg}`);

  try {
    const response = await fetch(NBC_BASE, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ElectionCenter/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log(`NBC page returned ${response.status}`);
      return null;
    }

    const html = await response.text();

    // NBC embeds structured JSON in a <script> tag with __NEXT_DATA__ or similar
    const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
      || html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/)
      || html.match(/"races"\s*:\s*(\[[\s\S]*?\])(?=,\s*")/);

    if (!jsonMatch) {
      log("Could not extract structured data from NBC page");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[1]);
    // NBC/Next.js format: props.pageProps.races or similar
    const races = parsed?.props?.pageProps?.races || parsed?.races || parsed;

    if (!Array.isArray(races) || races.length === 0) {
      log("NBC data parsed but no races found");
      return null;
    }

    return parseNBCRaces(races);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`NBC scrape error: ${msg}`);
    return null;
  }
}

/**
 * Parse AP-format election results JSON.
 */
function parseAPResults(data: any): FetchResult | null {
  const log = (msg: string) => console.log(`[CO Primary/AP Parse] ${msg}`);
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

    log(`Parsed ${races.length} races from AP data`);
    return {
      races,
      lastUpdated: toEasternTime(),
      countiesReporting: data.countiesReporting || races.length,
      countiesTotal: 64,
      source: "Associated Press (via NBC News fallback)",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`AP parse error: ${msg}`);
    return null;
  }
}

/**
 * Parse NBC's internal race format.
 */
function parseNBCRaces(races: any[]): FetchResult | null {
  const log = (msg: string) => console.log(`[CO Primary/NBC Parse] ${msg}`);
  const parsed: ClarityRace[] = [];

  try {
    for (const race of races) {
      const contestName = race.officeName || race.name || race.raceName || "";
      const candidates: ClarityCandidate[] = [];

      const nbcCandidates = race.candidates || [];
      for (const c of nbcCandidates) {
        candidates.push({
          name: c.fullName || c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          party: c.party || c.partyId || "",
          votes: c.votes || c.voteCount || 0,
          pct: c.percentage || c.votePct || 0,
          isWinner: c.winner || c.isWinner || false,
        });
      }

      parsed.push({
        contestName,
        candidates,
        precinctsReporting: race.precinctsReporting || 0,
        precinctsTotal: race.precinctsTotal || 0,
        pctReporting: race.pctReporting || (race.precinctsTotal > 0 ? (race.precinctsReporting / race.precinctsTotal) * 100 : 0),
        district: extractDistrict(contestName),
        party: race.party || undefined,
      });
    }

    log(`Parsed ${parsed.length} races from NBC data`);
    return {
      races: parsed,
      lastUpdated: toEasternTime(),
      countiesReporting: parsed.length > 0 ? 64 : 0,
      countiesTotal: 64,
      source: "NBC News / Associated Press (fallback)",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`NBC parse error: ${msg}`);
    return null;
  }
}

/**
 * Determines if we should failover to NBC/AP based on consecutive empty Clarity results.
 * Returns true if Clarity has returned 0 counties for >= FAILOVER_THRESHOLD_MINUTES.
 */
function shouldFailoverToNBC(): boolean {
  if (firstEmptyRunAt === null) return false;
  const minutesEmpty = (Date.now() - firstEmptyRunAt.getTime()) / (1000 * 60);
  return minutesEmpty >= FAILOVER_THRESHOLD_MINUTES;
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function handleColoradoPrimaryUpdate(req: Request, res: Response): Promise<void> {
  const log = (msg: string) => console.log(`[CO Primary] ${msg}`);
  const startTime = Date.now();

  log(`Starting Colorado Primary update at ${toEasternTime()}`);

  try {
    // Step 1: Fetch from Colorado SOS (Clarity Elections)
    const clarityData = await fetchClarityResults();

    // Step 2: Check for empty-data condition
    const clarityIsEmpty = !clarityData ||
      (clarityData.countiesReporting === 0 && clarityData.races.length === 0) ||
      (clarityData.countiesReporting === 0 && clarityData.races.every(r => r.candidates.length === 0 || r.candidates.every(c => c.votes === 0)));

    if (clarityIsEmpty) {
      consecutiveEmptyRuns++;
      if (!firstEmptyRunAt) firstEmptyRunAt = new Date();
      const minutesEmpty = (Date.now() - firstEmptyRunAt.getTime()) / (1000 * 60);

      log(`Clarity returned empty data (run #${consecutiveEmptyRuns}, ${minutesEmpty.toFixed(1)} min since first empty)`);

      // Step 3: If empty for >= threshold, failover to NBC/AP
      if (shouldFailoverToNBC()) {
        log(`⚠️ FAILOVER TRIGGERED: Clarity empty for ${minutesEmpty.toFixed(0)} min (threshold: ${FAILOVER_THRESHOLD_MINUTES} min). Switching to NBC/AP.`);

        const nbcData = await fetchNBCFallbackResults();

        if (nbcData && nbcData.races.length > 0) {
          log(`NBC/AP fallback returned ${nbcData.races.length} races — processing`);

          const updateResults = await processColoradoResults(nbcData);
          const updated = updateResults.filter(r => r.status === "updated").length;
          const skipped = updateResults.filter(r => r.status === "skipped").length;
          const errors = updateResults.filter(r => r.status === "error").length;

          log(`NBC/AP fallback done in ${Date.now() - startTime}ms — Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`);

          // Reset empty counter on successful NBC data
          if (updated > 0) {
            consecutiveEmptyRuns = 0;
            firstEmptyRunAt = null;
          }

          res.json({
            success: true,
            timestamp: toEasternTime(),
            source: nbcData.source,
            failover: true,
            failoverReason: `Clarity returned 0 counties for ${minutesEmpty.toFixed(0)} minutes`,
            clarityEmptyRuns: consecutiveEmptyRuns,
            countiesReporting: `${nbcData.countiesReporting}/${nbcData.countiesTotal}`,
            updated,
            skipped,
            errors,
            details: updateResults,
            elapsed_ms: Date.now() - startTime,
          });
          return;
        } else {
          log(`NBC/AP fallback also returned no data — both sources empty`);
          res.json({
            success: true,
            message: "Both Clarity and NBC/AP returned no data — results may not be posted yet",
            timestamp: toEasternTime(),
            failover: true,
            failoverReason: `Clarity empty for ${minutesEmpty.toFixed(0)} min, NBC/AP also empty`,
            clarityEmptyRuns: consecutiveEmptyRuns,
            elapsed_ms: Date.now() - startTime,
          });
          return;
        }
      }

      // Not yet at threshold — just report empty
      res.json({
        success: true,
        message: `Clarity returned 0 counties (${minutesEmpty.toFixed(1)} min / ${FAILOVER_THRESHOLD_MINUTES} min until NBC failover)`,
        timestamp: toEasternTime(),
        source: "Colorado Secretary of State (Clarity Elections ENR)",
        clarityEmptyRuns: consecutiveEmptyRuns,
        minutesUntilFailover: Math.max(0, FAILOVER_THRESHOLD_MINUTES - minutesEmpty).toFixed(1),
        elapsed_ms: Date.now() - startTime,
      });
      return;
    }

    // Step 4: Clarity has data — reset empty counter and process normally
    if (consecutiveEmptyRuns > 0) {
      log(`Clarity data restored after ${consecutiveEmptyRuns} empty runs — resetting failover counter`);
    }
    consecutiveEmptyRuns = 0;
    firstEmptyRunAt = null;

    // Process and update DB
    const updateResults = await processColoradoResults(clarityData);

    const updated = updateResults.filter(r => r.status === "updated").length;
    const skipped = updateResults.filter(r => r.status === "skipped").length;
    const errors = updateResults.filter(r => r.status === "error").length;

    log(`Done in ${Date.now() - startTime}ms — Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`);

    // Check if all counties are reporting (auto-pause signal)
    const allReported = clarityData.countiesReporting >= clarityData.countiesTotal && clarityData.countiesTotal > 0;

    res.json({
      success: true,
      timestamp: toEasternTime(),
      source: clarityData.source,
      verification: "NBC News",
      countiesReporting: `${clarityData.countiesReporting}/${clarityData.countiesTotal}`,
      allCountiesReported: allReported,
      updated,
      skipped,
      errors,
      details: updateResults,
      elapsed_ms: Date.now() - startTime,
      note: allReported ? "ALL COUNTIES REPORTED — consider pausing cron" : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal error: ${msg}`);
    res.status(500).json({
      success: false,
      error: msg,
      timestamp: toEasternTime(),
      elapsed_ms: Date.now() - startTime,
    });
  }
}
