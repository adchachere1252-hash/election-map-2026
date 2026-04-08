import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAllSenateRaces, getSenateRaceById, updateSenateRace,
  getAllHouseRaces, getHouseRaceById, getHouseRacesByState, updateHouseRace,
  getAllRedistrictingStates, updateRedistrictingState,
  getAllReferendums, updateReferendum,
  getScoreboard,
  createAdminSession, validateAdminSession, deleteAdminSession,
} from "./db";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

// ─── Admin password (stored as env var, fallback to a default for dev) ────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "election2026admin";

// ─── Admin token validator (called inline with input.adminToken) ──────────────
async function requireAdminToken(token: string | undefined) {
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin token required" });
  const valid = await validateAdminSession(token);
  if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired admin token" });
}

// ─── Rating / Status enums ────────────────────────────────────────────────────
const ratingEnum = z.enum(["Solid D", "Lean D", "Toss-up", "Lean R", "Solid R"]);
const raceStatusEnum = z.enum(["Scheduled", "Primary", "General", "Called", "Certified"]);
const partyEnum = z.enum(["D", "R", "I", "L", "G"]);
const partyMainEnum = z.enum(["D", "R", "I"]);

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Admin Auth ─────────────────────────────────────────────────────────────
  admin: router({
    login: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password" });
        }
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await createAdminSession(token, expiresAt);
        return { token, expiresAt };
      }),

    logout: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        await deleteAdminSession(input.token);
        return { success: true };
      }),

    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const valid = await validateAdminSession(input.token);
        return { valid };
      }),
  }),

  // ─── Senate ─────────────────────────────────────────────────────────────────
  senate: router({
    list: publicProcedure.query(async () => {
      return getAllSenateRaces();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSenateRaceById(input.id);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        incumbent: z.string().nullable().optional(),
        incumbentParty: partyMainEnum.nullable().optional(),
        incumbentRetiring: z.boolean().optional(),
        candidate1Name: z.string().nullable().optional(),
        candidate1Party: partyEnum.nullable().optional(),
        candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
        candidate2Name: z.string().nullable().optional(),
        candidate2Party: partyEnum.nullable().optional(),
        candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        rating: ratingEnum.nullable().optional(),
        status: raceStatusEnum.optional(),
        primaryDate: z.string().nullable().optional(),
        primaryRunoffDate: z.string().nullable().optional(),
        pctReporting: z.number().min(0).max(100).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        await updateSenateRace(id, updateData as Parameters<typeof updateSenateRace>[1]);
        return { success: true };
      }),
  }),

  // ─── House ──────────────────────────────────────────────────────────────────
  house: router({
    list: publicProcedure.query(async () => {
      return getAllHouseRaces();
    }),

    byState: publicProcedure
      .input(z.object({ stateCode: z.string().length(2) }))
      .query(async ({ input }) => {
        return getHouseRacesByState(input.stateCode);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getHouseRaceById(input.id);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        incumbent: z.string().nullable().optional(),
        incumbentParty: partyMainEnum.nullable().optional(),
        incumbentRetiring: z.boolean().optional(),
        candidate1Name: z.string().nullable().optional(),
        candidate1Party: partyEnum.nullable().optional(),
        candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
        candidate2Name: z.string().nullable().optional(),
        candidate2Party: partyEnum.nullable().optional(),
        candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        rating: ratingEnum.nullable().optional(),
        status: raceStatusEnum.optional(),
        primaryDate: z.string().nullable().optional(),
        pctReporting: z.number().min(0).max(100).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        await updateHouseRace(id, updateData as Parameters<typeof updateHouseRace>[1]);
        return { success: true };
      }),
  }),

  // ─── Redistricting ──────────────────────────────────────────────────────────
  redistricting: router({
    list: publicProcedure.query(async () => {
      return getAllRedistrictingStates();
    }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        enacted: z.boolean().optional(),
        reason: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        method: z.string().nullable().optional(),
        delegationBefore: z.string().nullable().optional(),
        projectedImpact: z.string().nullable().optional(),
        litigationNotes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        await updateRedistrictingState(id, updateData as Parameters<typeof updateRedistrictingState>[1]);
        return { success: true };
      }),
  }),

  // ─── Referendums ────────────────────────────────────────────────────────────
  referendum: router({
    list: publicProcedure.query(async () => {
      return getAllReferendums();
    }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        yesVotes: z.number().min(0).optional(),
        noVotes: z.number().min(0).optional(),
        pctReporting: z.number().min(0).max(100).optional(),
        status: z.enum(["Scheduled", "Voting", "Called", "Certified"]).optional(),
        calledResult: z.enum(["Yes", "No"]).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        await updateReferendum(id, updateData as Parameters<typeof updateReferendum>[1]);
        return { success: true };
      }),
  }),

  // ─── Scoreboard ─────────────────────────────────────────────────────────────
  scoreboard: router({
    get: publicProcedure.query(async () => {
      return getScoreboard();
    }),
  }),
});

export type AppRouter = typeof appRouter;
