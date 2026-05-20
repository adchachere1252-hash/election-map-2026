/**
 * Scheduled Task: AP Election Results Auto-Update (All-50-States Engine)
 * Route: POST /api/scheduled-task/ap-update
 *
 * Fully dynamic: loads all races from DB, fetches AP JSON feeds in parallel
 * for every state, matches by office/seat, and pushes updates for all
 * 506 races (435 House + 35 Senate + 36 Governor) on election night.
 *
 * Auto-detects the active election date from the AP feed.
 * Falls back gracefully when no AP data is available for a state/date.
 */

import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import {
  getAllSenateRaces, getAllHouseRaces, getAllGovernorRaces,
  updateSenateRace, updateHouseRace, updateGovernorRace,
  getDb,
} from "./db";
import { broadcastElectionEvent } from "./ws";
import { broadcastLog } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Broadcast deduplication (DB-backed, survives server restarts) ───────────────────────────────
// Key format: "<electionDate>:<stateCode>:<chamber>:<district|0>"
async function hasBroadcasted(key: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const rows = await db.select().from(broadcastLog)
      .where(eq(broadcastLog.broadcastKey, key))
      .limit(1);
    return rows.length > 0;
  } catch { return false; }
}

async function markBroadcasted(key: string, electionDate: string, stateCode: string, chamber: string, district: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(broadcastLog).ignore().values({
      broadcastKey: key,
      electionDate,
      stateCode,
      chamber,
      district,
    });
  } catch { /* ignore duplicate key errors */ }
}

// ── AP Elections data API ──────────────────────────────────────────────────────
const AP_DATA_BASE = "https://interactives.apelections.org/election-results/data-live";

// Known election dates to try (most recent first)
// On election night, AP activates the date-specific feed automatically
const ELECTION_DATES = [
  "2026-05-19", // May 19 primaries (GA, KY, OR, etc.) — checked first so primary data takes precedence
  "2026-05-12", // May 12 primaries (NE, WV)
  "2026-05-05", // May 5 primaries (OH, IN)
  "2026-07-15", // July 15 — Louisiana U.S. House primaries
  "2026-11-03", // November 3, 2026 — General Election (checked last as fallback)
];

const AP_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Referer": "https://apnews.com/",
  "Origin": "https://apnews.com",
};

// ── Party mapping ──────────────────────────────────────────────────────────────
function mapParty(p: string | undefined | null): "D" | "R" | "I" | null {
  if (!p) return null;
  const u = p.toUpperCase();
  if (u === "DEM" || u === "D") return "D";
  if (u === "GOP" || u === "REP" || u === "R") return "R";
  if (u === "IND" || u === "I") return "I";
  return null;
}

// ── AP fetch helper ────────────────────────────────────────────────────────────
async function apFetch(url: string): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, {
      headers: AP_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Candidate / race result types ─────────────────────────────────────────────
interface CandidateResult {
  name: string;
  party: "D" | "R" | "I" | null;
  pct: number | null;
  votes: number | null;
  isWinner: boolean;
}

interface RaceResult {
  called: boolean;
  winner: string | null;
  winnerParty: "D" | "R" | "I" | null;
  pctReporting: number;
  candidates: CandidateResult[];
  // For general election (November)
  isGeneral?: boolean;
}

// ── Fetch AP data for a single state on a given election date ─────────────────
async function fetchStateData(
  eventDate: string,
  stateCode: string
): Promise<{ progress: Record<string, unknown>; metadata: Record<string, unknown> } | null> {
  const [progress, metadata] = await Promise.all([
    apFetch(`${AP_DATA_BASE}/${eventDate}/results/national/${stateCode}/progress.json`),
    apFetch(`${AP_DATA_BASE}/${eventDate}/results/national/${stateCode}/metadata.json`),
  ]);
  if (!progress || !metadata) return null;
  // Check if there's any data
  if (Object.keys(progress).length === 0 && Object.keys(metadata).length === 0) return null;
  return { progress, metadata };
}

// ── Find the active election date for a state ─────────────────────────────────
async function findActiveDate(stateCode: string): Promise<string | null> {
  for (const date of ELECTION_DATES) {
    const data = await fetchStateData(date, stateCode);
    if (data && Object.keys(data.metadata).length > 0) {
      return date;
    }
  }
  return null;
}

// ── Parse AP race entries for a state into grouped results ────────────────────
function parseStateRaces(
  progress: Record<string, unknown>,
  metadata: Record<string, unknown>,
  isGeneral: boolean
): {
  senate: Record<string, RaceResult>;    // key: "senate" or "senate-special"
  house: Record<number, RaceResult>;     // key: district number
  governor: RaceResult | null;
} {
  const senate: Record<string, RaceResult> = {};
  const house: Record<number, RaceResult> = {};
  let governor: RaceResult | null = null;

  for (const [raceId, rawMeta] of Object.entries(metadata)) {
    const meta = rawMeta as Record<string, unknown>;
    const prog = (progress[raceId] ?? {}) as Record<string, unknown>;

    const office = String(meta.officeName ?? "").toLowerCase();
    const seatNum = meta.seatNum ? parseInt(String(meta.seatNum)) : null;
    const isSpecial = String(meta.officeID ?? "").includes("SS") ||
      String(meta.officeName ?? "").toLowerCase().includes("unexpired") ||
      String(meta.officeName ?? "").toLowerCase().includes("special");

    // Build candidate list
    const candMeta = (meta.candidates ?? {}) as Record<string, Record<string, unknown>>;
    const candProg = (prog.candidates ?? []) as Array<Record<string, unknown>>;
    const candidates: CandidateResult[] = [];

    for (const cp of candProg) {
      const cid = String(cp.candidateID ?? "");
      const cm = candMeta[cid] ?? {};
      const name = `${cm.first ?? ""} ${cm.last ?? ""}`.trim();
      if (!name) continue;
      candidates.push({
        name,
        party: mapParty(String(cm.party ?? "")),
        pct: cp.votePct != null ? Number(cp.votePct) : null,
        votes: cp.voteCount != null ? Number(cp.voteCount) : null,
        isWinner: !!cp.winner,
      });
    }

    const called = !!(
      prog.raceCallStatus === "Called" ||
      meta.raceCallStatus === "Called" ||
      prog.partyRaceCall ||
      meta.partyRaceCall ||
      candidates.some(c => c.isWinner)
    );
    const winnerCand = candidates.find(c => c.isWinner);
    const pctReporting = Number(prog.eevp ?? prog.precinctsReportingPct ?? 0);

    const result: RaceResult = {
      called,
      winner: winnerCand?.name ?? null,
      winnerParty: winnerCand?.party ?? null,
      pctReporting,
      candidates,
      isGeneral,
    };

    // Classify race type
    if (office.includes("governor") || office.includes("gov.")) {
      if (!governor) {
        governor = result;
      } else {
        // Merge (multiple party primaries)
        governor.candidates.push(...result.candidates);
        if (result.called && result.winner) {
          governor.called = true;
          governor.winner = result.winner;
          governor.winnerParty = result.winnerParty;
        }
        governor.pctReporting = Math.max(governor.pctReporting, result.pctReporting);
      }
    } else if (office.includes("senate") && !office.includes("state senate")) {
      const key = isSpecial ? "senate-special" : "senate";
      if (!senate[key]) {
        senate[key] = result;
      } else {
        senate[key].candidates.push(...result.candidates);
        if (result.called && result.winner) {
          senate[key].called = true;
          senate[key].winner = result.winner;
          senate[key].winnerParty = result.winnerParty;
        }
        senate[key].pctReporting = Math.max(senate[key].pctReporting, result.pctReporting);
      }
    } else if (office.includes("house") && !office.includes("state house") && seatNum !== null) {
      if (!house[seatNum]) {
        house[seatNum] = result;
      } else {
        house[seatNum].candidates.push(...result.candidates);
        if (result.called && result.winner) {
          house[seatNum].called = true;
          house[seatNum].winner = result.winner;
          house[seatNum].winnerParty = result.winnerParty;
        }
        house[seatNum].pctReporting = Math.max(house[seatNum].pctReporting, result.pctReporting);
      }
    }
  }

  return { senate, house, governor };
}

// ── Build DB update payload from a race result ─────────────────────────────────
// raceType: 'senate' | 'house' use status enum [Scheduled,Primary,General,Called,Certified]
//           'governor' uses status enum [Scheduled,Voting,Called,Certified] — no Primary/General values
function buildUpdate(
  race: RaceResult | null,
  isGeneral: boolean,
  raceType: 'senate' | 'house' | 'governor' = 'senate',
  currentStatus?: string | null
): Record<string, unknown> {
  if (!race) return {};

  const update: Record<string, unknown> = {};
  const sorted = [...race.candidates].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  // If the race is already in General status and this is a primary-phase update,
  // do NOT overwrite candidate names/parties — those are the general election matchup candidates
  const isAlreadyGeneral = currentStatus === 'General';

  const isWriteIn = (name: string) =>
    name.toLowerCase().includes("write-in") || name.toLowerCase().includes("write in");

  if (!isAlreadyGeneral || isGeneral) {
    if (sorted[0] && !isWriteIn(sorted[0].name)) {
      update.candidate1Name = sorted[0].name;
      update.candidate1Party = sorted[0].party;
      if (sorted[0].pct !== null) update.candidate1VotePct = Math.round(sorted[0].pct * 10) / 10;
      if (sorted[0].votes !== null) update.candidate1Votes = sorted[0].votes;
    }
    // Only write candidate2 if it's a different real person (not a write-in, not same as candidate1)
    const cand2 = sorted.find(
      c => c.name !== sorted[0]?.name && !isWriteIn(c.name)
    );
    if (cand2) {
      update.candidate2Name = cand2.name;
      update.candidate2Party = cand2.party;
      if (cand2.pct !== null) update.candidate2VotePct = Math.round(cand2.pct * 10) / 10;
      if (cand2.votes !== null) update.candidate2Votes = cand2.votes;
    }
    if (sorted.length > 2) {
      const others = sorted.slice(2);
      update.otherCandidateName = others.map(c => c.name).join(", ");
      update.otherVotes = others.reduce((sum, c) => sum + (c.votes ?? 0), 0);
      update.otherVotePct = Math.round(others.reduce((sum, c) => sum + (c.pct ?? 0), 0) * 10) / 10;
    }
  }
  if (race.pctReporting > 0) {
    update.pctReporting = Math.round(race.pctReporting * 10) / 10;
  }

  if (race.called && race.winner) {
    if (isGeneral) {
      // General election: set calledWinner + calledParty (shows in ticker)
      update.calledWinner = race.winner;
      if (race.winnerParty) update.calledParty = race.winnerParty;
      update.status = "Called";
    } else {
      // PRIMARY RACE — NEVER set calledWinner (ticker-only field reserved for general/special winners)
      update.primaryWinner = race.winner;
      if (race.winnerParty) update.primaryParty = race.winnerParty;
      // Governor uses Voting (no Primary in its enum); senate/house use Primary
      // NEVER downgrade from General — once a race is in General it stays there
      if (currentStatus !== 'General') {
        update.status = raceType === 'governor' ? "Voting" : "Primary";
      }
    }
  } else if (!race.called && !isGeneral) {
    // Voting in progress for a primary — but never downgrade from General
    if (currentStatus !== 'General') {
      update.status = raceType === 'governor' ? "Voting" : "Primary";
    }
  }

  // HARD SAFETY: strip calledWinner from any primary-phase update — no exceptions
  if (!isGeneral) {
    delete update.calledWinner;
    delete update.calledParty;
    delete update.calledAt;
  }

  return update;
}

// ── Cron authentication ────────────────────────────────────────────────────────
function decodeCronToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const openId = payload.openId;
    if (typeof openId !== "string" || !openId.startsWith("cron_")) return false;
    const exp = payload.exp;
    if (typeof exp === "number" && Date.now() / 1000 > exp) return false;
    return true;
  } catch {
    return false;
  }
}

async function isCronRequest(req: Request): Promise<boolean> {
  try {
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookieHeader(cookieHeader);
    if (cookies["app_session_id"] && decodeCronToken(cookies["app_session_id"])) return true;
    const body = req.body as Record<string, unknown> | undefined;
    if (typeof body?.cronToken === "string" && decodeCronToken(body.cronToken)) return true;
    const headerToken = req.headers["x-cron-token"];
    if (typeof headerToken === "string" && decodeCronToken(headerToken)) return true;
    const queryToken = (req.query as Record<string, unknown>)?.cronToken;
    if (typeof queryToken === "string" && decodeCronToken(queryToken)) return true;
    return false;
  } catch {
    return false;
  }
}

// ── Core update engine ─────────────────────────────────────────────────────────
export async function scrapeAndPushResults(): Promise<{
  ok: number; skip: number; error: number;
  updates: Array<{ race: string; id: number; status: string; detail?: string }>;
  elapsed_ms: number;
}> {
  const startTime = Date.now();
  const updates: Array<{ race: string; id: number; status: "ok" | "error" | "skip"; detail?: string }> = [];
  const log = (msg: string) => console.log(`[AP Engine] ${msg}`);

  // Load all races from DB
  const [allSenate, allHouse, allGovernor] = await Promise.all([
    getAllSenateRaces(),
    getAllHouseRaces(),
    getAllGovernorRaces(),
  ]);

  log(`Loaded ${allSenate.length} senate, ${allHouse.length} house, ${allGovernor.length} governor races`);

  // Group by state
  const stateSet = new Set<string>([
    ...allSenate.map(r => r.stateCode),
    ...allHouse.map(r => r.stateCode),
    ...allGovernor.map(r => r.stateCode),
  ]);

  log(`Processing ${stateSet.size} states in parallel...`);

  // Process all states in parallel
  await Promise.all(Array.from(stateSet).map(async (stateCode) => {
    try {
      // Find active election date for this state
      const activeDate = await findActiveDate(stateCode);
      if (!activeDate) {
        // No AP data available for this state — skip silently
        return;
      }

      const isGeneral = activeDate === "2026-11-03";
      const data = await fetchStateData(activeDate, stateCode);
      if (!data) return;

      const { senate, house, governor } = parseStateRaces(data.progress, data.metadata, isGeneral);

      // Helper to push a single race update
      const doUpdate = async (
        label: string,
        id: number,
        raceResult: RaceResult | null,
        fn: (id: number, d: Record<string, unknown>) => Promise<void>,
        raceType: 'senate' | 'house' | 'governor' = 'senate',
        currentStatus?: string | null
      ) => {
        const payload = buildUpdate(raceResult, isGeneral, raceType, currentStatus);
        if (Object.keys(payload).length === 0) {
          updates.push({ race: label, id, status: "skip", detail: "no AP data" });
          return;
        }
        try {
          await fn(id, payload);
          updates.push({ race: label, id, status: "ok" });
          // Broadcast WS if race was called — only once per race per server session
          if (payload.calledWinner || payload.primaryWinner) {
            const winner = String(payload.calledWinner ?? payload.primaryWinner);
            const party = String(payload.calledParty ?? payload.primaryParty ?? "");
            const isSenate = label.toLowerCase().includes("senate");
            const isGov = label.toLowerCase().includes("gov");
            const districtMatch = label.match(/(\d+)$/);
            const chamber = isSenate ? "senate" : isGov ? "governor" : "house";
            const districtNum = districtMatch ? parseInt(districtMatch[1]) : 0;
            const broadcastKey = `${activeDate}:${stateCode}:${chamber}:${districtNum}`;
            const alreadyBroadcasted = await hasBroadcasted(broadcastKey);
            if (!alreadyBroadcasted) {
              await markBroadcasted(broadcastKey, activeDate, stateCode, chamber, String(districtNum));
              // Detect uncontested: only 1 real candidate (excluding write-ins)
              const realCandidates = (raceResult?.candidates ?? []).filter(
                c => !c.name.toLowerCase().includes("write-in") && !c.name.toLowerCase().includes("write in")
              );
              const isUncontested = realCandidates.length === 1;
              broadcastElectionEvent({
                type: "race_called",
                chamber,
                stateCode,
                calledParty: party,
                calledWinner: winner,
                district: districtMatch ? parseInt(districtMatch[1]) : undefined,
                districtLabel: label,
                electionDate: activeDate,
                isUncontested,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          updates.push({ race: label, id, status: "error", detail: msg });
        }
      };

      // Senate races for this state
      const stateSenatRaces = allSenate.filter(r => r.stateCode === stateCode);
      for (const dbRace of stateSenatRaces) {
        const isSpecial = dbRace.isSpecial ?? false;
        const key = isSpecial ? "senate-special" : "senate";
        const apRace = senate[key] ?? senate["senate"] ?? null;
        await doUpdate(`${stateCode} Senate${isSpecial ? " (Special)" : ""}`, dbRace.id, apRace, updateSenateRace, 'senate', dbRace.status);
      }

      // House races for this state
      const stateHouseRaces = allHouse.filter(r => r.stateCode === stateCode);
      for (const dbRace of stateHouseRaces) {
        const district = dbRace.district ?? 1;
        const apRace = house[district] ?? null;
        await doUpdate(`${stateCode}-${district}`, dbRace.id, apRace, updateHouseRace, 'house', dbRace.status);
      }

      // Governor race for this state
      const stateGovRace = allGovernor.find(r => r.stateCode === stateCode);
      if (stateGovRace && governor) {
        await doUpdate(`${stateCode} Governor`, stateGovRace.id, governor, updateGovernorRace, 'governor', stateGovRace.status);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Error processing ${stateCode}: ${msg}`);
    }
  }));

  const elapsed = Date.now() - startTime;
  const ok = updates.filter(u => u.status === "ok").length;
  const skip = updates.filter(u => u.status === "skip").length;
  const error = updates.filter(u => u.status === "error").length;

  log(`Done in ${elapsed}ms — Updated: ${ok} | Skipped: ${skip} | Errors: ${error}`);

  return { ok, skip, error, updates, elapsed_ms: elapsed };
}

// ── HTTP handlers ──────────────────────────────────────────────────────────────
export async function handleScheduledApUpdate(req: Request, res: Response): Promise<void> {
  const log = (msg: string) => console.log(`[ScheduledApUpdate] ${msg}`);
  log("Starting AP results update...");

  const isProxyAuthenticated = req.path.startsWith("/api/scheduled-task/") || req.originalUrl.includes("/api/scheduled-task/");
  const cronOk = isProxyAuthenticated || await isCronRequest(req);
  if (!cronOk) {
    log("Rejected: not a cron request");
    res.status(403).json({ error: "cron cookie cannot access non-scheduled-path" });
    return;
  }

  try {
    const result = await scrapeAndPushResults();
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal error: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

export async function handleScheduledApUpdateTrusted(req: Request, res: Response): Promise<void> {
  const log = (msg: string) => console.log(`[ScheduledApUpdate/trusted] ${msg}`);
  log("Starting AP results update (proxy-trusted)...");
  try {
    const result = await scrapeAndPushResults();
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal error: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}
// Rebuild trigger: 2026-05-06 — all-50-states dynamic engine
// All-50-states engine rebuild: 2026-05-06T13:25:21Z
