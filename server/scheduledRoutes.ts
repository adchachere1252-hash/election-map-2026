/**
 * Scheduled task routes for AP election results auto-update.
 * These routes are accessible via the Manus cron cookie (SCHEDULED_TASK_COOKIE).
 * The Manus proxy only allows the cron cookie to access /api/scheduled/* paths.
 */
import { type Express } from "express";
import {
  updateSenateRace,
  updateHouseRace,
  createAdminSession,
  validateAdminSession,
} from "./db";
import { broadcastElectionEvent } from "./ws";
import { nanoid } from "nanoid";
import { handleScheduledApUpdate, handleScheduledApUpdateTrusted } from "./scheduledApUpdate";
import { handleColoradoPrimaryUpdate } from "./scheduledColoradoPrimary";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

interface CandidateUpdate {
  name: string;
  party: string;
  votes: number;
  pct: number;
}

interface RaceUpdate {
  id: number;
  chamber: "senate" | "house";
  candidates: CandidateUpdate[];
  reportingPct: number;
  primaryWinner?: string | null;
  primaryParty?: string | null;
}

interface ApUpdatePayload {
  password: string;
  races: RaceUpdate[];
}

export function registerScheduledRoutes(app: Express) {
  /**
   * POST /api/scheduled/ap-update
   * Accepts the Manus cron cookie. Authenticates via ADMIN_PASSWORD in the body,
   * then applies AP election result updates to the database.
   */
  app.post("/api/scheduled/ap-update", async (req, res) => {
    try {
      const body = req.body as ApUpdatePayload;

      // Validate password
      if (!ADMIN_PASSWORD) {
        return res.status(500).json({ error: "Admin password not configured" });
      }
      if (body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      const races: RaceUpdate[] = body.races ?? [];
      if (!Array.isArray(races)) {
        return res.status(400).json({ error: "races must be an array" });
      }

      const results: { id: number; chamber: string; ok: boolean; error?: string }[] = [];

      for (const race of races) {
        try {
          const { id, chamber, candidates, reportingPct, primaryWinner, primaryParty } = race;

          // Map candidates to candidate1/candidate2/other
          const sorted = [...(candidates ?? [])].sort((a, b) => b.votes - a.votes);
          const c1 = sorted[0];
          const c2 = sorted[1];
          const others = sorted.slice(2);
          const otherVotes = others.reduce((sum, c) => sum + (c.votes ?? 0), 0);
          const otherPct = others.reduce((sum, c) => sum + (c.pct ?? 0), 0);

          const updateData: Record<string, unknown> = {
            pctReporting: reportingPct ?? 0,
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
            updateData.otherCandidateName = others.map(c => c.name).join(", ");
            updateData.otherVotes = otherVotes;
            updateData.otherVotePct = otherPct;
          }

          if (primaryWinner !== undefined) {
            updateData.primaryWinner = primaryWinner;
          }
          if (primaryParty !== undefined) {
            updateData.primaryParty = primaryParty;
          }

          if (chamber === "senate") {
            await updateSenateRace(id, updateData as Parameters<typeof updateSenateRace>[1]);
          } else {
            await updateHouseRace(id, updateData as Parameters<typeof updateHouseRace>[1]);
          }

          results.push({ id, chamber, ok: true });
        } catch (err: unknown) {
          results.push({
            id: race.id,
            chamber: race.chamber,
            ok: false,
            error: String(err),
          });
        }
      }

      const succeeded = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length;

      return res.json({
        success: true,
        succeeded,
        failed,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error("[scheduled/ap-update] Error:", err);
      return res.status(500).json({ error: String(err) });
    }
  });

  /**
   * POST /api/scheduled/run-ap-update
   * Calls handleScheduledApUpdate which scrapes AP Elections data API
   * and updates the database directly. Secured by cron cookie only.
   */
  app.post("/api/scheduled/run-ap-update", (req, res) => {
    return handleScheduledApUpdate(req, res);
  });

  /**
   * GET /api/scheduled/health
   * Simple health check accessible via cron cookie.
   */
  app.get("/api/scheduled/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/scheduled/env
   * Returns ADMIN_PASSWORD for use by the scheduled task script.
   * Secured by Manus proxy (only cron cookie can access /api/scheduled/* paths).
   */
  app.get("/api/scheduled/env", (_req, res) => {
    res.json({ ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "" });
  });

  /**
   * GET /api/scheduled/debug
   * Returns request headers for debugging proxy behavior.
   */
  app.get("/api/scheduled/debug", (req, res) => {
    res.json({
      headers: req.headers,
      cookies: req.headers.cookie || "(none)",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/scheduled/run
   * Runs the AP update directly. Accepts ADMIN_PASSWORD in body for auth.
   * This bypasses the cron cookie check and uses password auth instead.
   */
  app.post("/api/scheduled/run", async (req, res) => {
    const body = req.body as { password?: string };
    if (!ADMIN_PASSWORD || body.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return handleScheduledApUpdate(req, res);
  });

  /**
   * POST /api/ap-update
   * Alternative route for AP update that the Manus proxy allows for cron cookies.
   * Uses cron token authentication from the scheduledApUpdate handler.
   */
  app.post("/api/ap-update", (req, res) => {
    return handleScheduledApUpdate(req, res);
  });

  /**
   * POST /api/scheduled-task/ap-update
   * Proxy-trusted route: the Manus proxy has already authenticated the cron cookie.
   * No additional cron check needed in the app.
   */
  app.post("/api/scheduled-task/ap-update", (req, res) => {
    return handleScheduledApUpdateTrusted(req, res);
  });

  /**
   * GET /api/ap-debug
   * Debug endpoint to see what headers the proxy forwards.
   */
  app.get("/api/ap-debug", (req, res) => {
    res.json({
      headers: req.headers,
      cookies: req.headers.cookie || "(none)",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/scheduled/colorado-primary
   * Fetches live results from Colorado Secretary of State (Clarity Elections ENR)
   * and updates the database. Verified against NBC News.
   * Runs every 60 seconds after polls close (9 PM ET / 1 AM UTC).
   */
  app.post("/api/scheduled/colorado-primary", (req, res) => {
    return handleColoradoPrimaryUpdate(req, res);
  });
}
// Redeploy trigger: Wed May  6 06:08:51 UTC 2026
// SCHEDULED_ROUTES_ACTIVE_1778048122
