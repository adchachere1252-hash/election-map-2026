/**
 * Election Night Scheduler
 * 
 * Replaces the always-on setInterval approach with a smart scheduler that:
 * - During election windows (7 PM – 7 AM ET): polls AP every 1 minute, runs promotion every 5 min
 * - Approaching an election window (within 2 hours): checks every 5 minutes
 * - Outside election windows: checks once per hour if a window is approaching
 * 
 * This eliminates wasted work on non-election days while ensuring real-time
 * results flow during active election nights.
 */

import { getElectionWindowStatus, isApproachingElectionWindow } from "./electionDates";
import { runWorldElectionTracker } from "./worldElectionTracker";
import { notifyOwner } from "./_core/notification";

// Intervals
const ACTIVE_AP_INTERVAL_MS = 1 * 60 * 1000;       // 1 minute during election window
const ACTIVE_PROMOTION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes during election window
const APPROACHING_CHECK_MS = 5 * 60 * 1000;         // 5 minutes when approaching window
const IDLE_CHECK_MS = 60 * 60 * 1000;               // 1 hour when no election is near
const WORLD_TRACKER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours for world election checks

type SchedulerState = "idle" | "approaching" | "active";

let currentState: SchedulerState | null = null; // null = uninitialized, forces first transition to log
let apTimer: ReturnType<typeof setInterval> | null = null;
let promotionTimer: ReturnType<typeof setInterval> | null = null;
let stateCheckTimer: ReturnType<typeof setTimeout> | null = null;
let worldTrackerTimer: ReturnType<typeof setInterval> | null = null;
let lastApRun = 0;
let lastPromotionRun = 0;
let lastWorldTrackerRun = 0;
let lastApErrorCount = 0;
let lastApOkCount = 0;
let lastApError: string | null = null;
let consecutiveFailures = 0;
let alertSentForCurrentWindow = false;

/** Exported health stats for /api/health */
export function getSchedulerHealth() {
  return {
    state: currentState ?? "uninitialized",
    lastApRun: lastApRun ? new Date(lastApRun).toISOString() : null,
    lastPromotionRun: lastPromotionRun ? new Date(lastPromotionRun).toISOString() : null,
    lastWorldTrackerRun: lastWorldTrackerRun ? new Date(lastWorldTrackerRun).toISOString() : null,
    lastApErrorCount,
    lastApOkCount,
    lastApError,
  };
}

/**
 * Initialize the election scheduler. Call once at server startup.
 */
export async function initElectionScheduler(): Promise<void> {
  const { scrapeAndPushResults } = await import("./scheduledApUpdate");
  const { runPrimaryToGeneralPromotion } = await import("./primaryToGeneralPromotion");

  const log = (msg: string) => console.log(`[ElectionScheduler] ${msg}`);

  // Run AP update with consecutive failure tracking and owner alerting
  async function runApUpdate() {
    try {
      const result = await scrapeAndPushResults();
      const okCount = result.updates.filter(u => u.status === "ok").length;
      const skipCount = result.updates.filter(u => u.status === "skip").length;
      const errCount = result.updates.filter(u => u.status === "error").length;
      if (okCount > 0 || errCount > 0) {
        log(`AP Update — Updated: ${okCount} | Skipped: ${skipCount} | Errors: ${errCount} (${result.elapsed_ms}ms)`);
      }
      lastApRun = Date.now();
      lastApOkCount = okCount;
      lastApErrorCount = errCount;
      lastApError = errCount > 0 ? `${errCount} race update errors` : null;

      // Track consecutive failures (a cycle with ALL errors and 0 ok is a failure)
      if (okCount === 0 && errCount > 0) {
        consecutiveFailures++;
        log(`⚠️ Consecutive failure #${consecutiveFailures} (0 successful updates, ${errCount} errors)`);
      } else {
        // Reset on any successful cycle
        if (consecutiveFailures > 0) {
          log(`✅ AP Engine recovered after ${consecutiveFailures} consecutive failures.`);
        }
        consecutiveFailures = 0;
        alertSentForCurrentWindow = false;
      }

      // Alert owner after 3 consecutive failures (once per election window)
      if (consecutiveFailures >= 3 && !alertSentForCurrentWindow) {
        alertSentForCurrentWindow = true;
        const alertMsg = `AP Engine has failed ${consecutiveFailures} consecutive cycles during an active election window. Last error: ${lastApError}. The auto-updater may not be capturing live results. Manual intervention may be required.`;
        log(`🚨 ALERTING OWNER: ${alertMsg}`);
        notifyOwner({
          title: "🚨 AP Engine Failure Alert — Election Night",
          content: alertMsg,
        }).catch(e => log(`Failed to send owner alert: ${e}`));
      }
    } catch (err) {
      lastApError = err instanceof Error ? err.message : String(err);
      lastApErrorCount = -1;
      consecutiveFailures++;
      log(`AP Update Error (consecutive failure #${consecutiveFailures}): ${lastApError}`);

      // Alert owner after 3 consecutive total failures
      if (consecutiveFailures >= 3 && !alertSentForCurrentWindow) {
        alertSentForCurrentWindow = true;
        const alertMsg = `AP Engine has CRASHED ${consecutiveFailures} consecutive times during an active election window. Error: ${lastApError}. The auto-updater is completely non-functional. Immediate attention required.`;
        log(`🚨 ALERTING OWNER: ${alertMsg}`);
        notifyOwner({
          title: "🚨 CRITICAL: AP Engine Down — Election Night",
          content: alertMsg,
        }).catch(e => log(`Failed to send owner alert: ${e}`));
      }
    }
  }

  // Run promotion
  async function runPromotion() {
    try {
      const r = await runPrimaryToGeneralPromotion();
      if (r.promoted > 0 || r.errors > 0) {
        log(`Promotion — Promoted: ${r.promoted} | Skipped: ${r.skipped} | Errors: ${r.errors}`);
        r.log.forEach(line => log(`  ${line}`));
      }
      lastPromotionRun = Date.now();
    } catch (err) {
      log(`Promotion Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Run world election tracker
  async function runWorldTracker() {
    try {
      const result = await runWorldElectionTracker();
      if (result.updated > 0) {
        log(`World Tracker — Updated: ${result.updated} elections with results`);
        result.results.forEach(r => log(`  ${r.country}: ${r.winner} (${r.party}) [${r.confidence}]`));
      } else if (result.checked > 0) {
        log(`World Tracker — Checked ${result.checked} elections, no new results.`);
      }
      lastWorldTrackerRun = Date.now();
    } catch (err) {
      log(`World Tracker Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Clear all active timers
  function clearTimers() {
    if (apTimer) { clearInterval(apTimer); apTimer = null; }
    if (promotionTimer) { clearInterval(promotionTimer); promotionTimer = null; }
    if (stateCheckTimer) { clearTimeout(stateCheckTimer); stateCheckTimer = null; }
    if (worldTrackerTimer) { clearInterval(worldTrackerTimer); worldTrackerTimer = null; }
  }

  // Transition to a new state
  function transitionTo(newState: SchedulerState) {
    if (newState === currentState && currentState !== null) return;
    clearTimers();
    currentState = newState;

    switch (newState) {
      case "active": {
        const status = getElectionWindowStatus();
        log(`🟢 ACTIVE — Election window open (${status.currentDate}). Polling AP every 60s, promotion every 5m.`);
        // Run immediately on activation
        runApUpdate();
        runPromotion();
        // Set up recurring timers
        apTimer = setInterval(runApUpdate, ACTIVE_AP_INTERVAL_MS);
        promotionTimer = setInterval(runPromotion, ACTIVE_PROMOTION_INTERVAL_MS);
        // Check every 5 minutes if window has closed
        stateCheckTimer = setInterval(checkState, APPROACHING_CHECK_MS);
        break;
      }
      case "approaching": {
        const status = getElectionWindowStatus();
        const timeUntil = status.nextWindowStart
          ? Math.round((status.nextWindowStart.getTime() - Date.now()) / 60000)
          : "?";
        log(`🟡 APPROACHING — Election window starts in ~${timeUntil} minutes. Checking every 5m.`);
        // Run one AP check to warm up and catch early results
        runApUpdate();
        stateCheckTimer = setInterval(checkState, APPROACHING_CHECK_MS);
        break;
      }
      case "idle": {
        const status = getElectionWindowStatus();
        if (status.nextWindowStart) {
          const daysUntil = Math.round((status.nextWindowStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          log(`⚪ IDLE — Next election window in ~${daysUntil} days (${status.nextWindowStart.toISOString()}). Checking hourly.`);
        } else {
          log(`⚪ IDLE — No upcoming election dates configured. Checking hourly.`);
        }
        stateCheckTimer = setInterval(checkState, IDLE_CHECK_MS);
        break;
      }
    }
  }

  // Determine what state we should be in
  function checkState() {
    const status = getElectionWindowStatus();

    if (status.isActive) {
      transitionTo("active");
    } else if (isApproachingElectionWindow()) {
      transitionTo("approaching");
    } else {
      transitionTo("idle");
    }
  }

  // Run promotion once on startup to catch any pending promotions
  await runPromotion();

  // Start world election tracker (runs every 6 hours regardless of U.S. election state)
  worldTrackerTimer = setInterval(runWorldTracker, WORLD_TRACKER_INTERVAL_MS);
  // Run once on startup (delayed 30s to let server fully initialize)
  setTimeout(runWorldTracker, 30000);

  log("Initialized. Checking election window status...");

  // Initial state check
  checkState();
}
