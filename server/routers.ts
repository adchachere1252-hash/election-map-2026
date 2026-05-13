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
  getScoreboard, getFlipTracker,
  createAdminSession, validateAdminSession, deleteAdminSession,
  getAllSenators, getSenatorsByState, searchSenators, getSenatorById,
  getPinnedKeyRaces, pinKeyRace, unpinKeyRaceByRace,
  getAllGovernorRaces, getGovernorRaceById, getGovernorRaceByState, updateGovernorRace,
} from "./db";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { broadcastElectionEvent, getConnectedClientCount } from "./ws";
import { getCandidatePhoto, PARTY_LOGOS } from "./candidatePhotos";

// ─── Admin password (must be set via ADMIN_PASSWORD environment variable) ────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// ─── Admin token validator (called inline with input.adminToken) ──────────────
async function requireAdminToken(token: string | undefined) {
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin token required" });
  const valid = await validateAdminSession(token);
  if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired admin token" });
}

// ─── Rating / Status enums ────────────────────────────────────────────────────
const ratingEnum = z.enum(["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"]);
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
        if (!ADMIN_PASSWORD) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Admin password not configured" });
        }
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

    // Force-trigger an AP results update immediately
    forceUpdate: publicProcedure
      .input(z.object({ adminToken: z.string() }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        // Trigger the AP update inline
        const { scrapeAndPushResults } = await import("./scheduledApUpdate");
        const result = await scrapeAndPushResults();
        return result;
      }),

    // Get live system status for admin dashboard
    status: publicProcedure
      .input(z.object({ adminToken: z.string() }))
      .query(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        return {
          connectedClients: getConnectedClientCount(),
          timestamp: new Date().toISOString(),
        };
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
        candidate1Votes: z.number().int().min(0).nullable().optional(),
        candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
        candidate2Name: z.string().nullable().optional(),
        candidate2Party: partyEnum.nullable().optional(),
        candidate2Votes: z.number().int().min(0).nullable().optional(),
        candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        primaryWinner: z.string().nullable().optional(),
        primaryParty: partyMainEnum.nullable().optional(),
        otherCandidateName: z.string().nullable().optional(),
        otherCandidateParty: partyEnum.nullable().optional(),
        otherVotes: z.number().int().min(0).nullable().optional(),
        otherVotePct: z.number().min(0).max(100).nullable().optional(),
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
        // Auto-stamp calledAt when a winner is set; clear when winner is removed
        if (input.calledWinner !== undefined) {
          updateData.calledAt = input.calledWinner ? Date.now() : null;
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
        candidate1Votes: z.number().int().min(0).nullable().optional(),
        candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
        candidate2Name: z.string().nullable().optional(),
        candidate2Party: partyEnum.nullable().optional(),
        candidate2Votes: z.number().int().min(0).nullable().optional(),
        candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        primaryWinner: z.string().nullable().optional(),
        primaryParty: partyMainEnum.nullable().optional(),
        otherCandidateName: z.string().nullable().optional(),
        otherCandidateParty: partyEnum.nullable().optional(),
        otherVotes: z.number().int().min(0).nullable().optional(),
        otherVotePct: z.number().min(0).max(100).nullable().optional(),
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
        // Auto-stamp calledAt when a winner is set; clear when winner is removed
        if (input.calledWinner !== undefined) {
          updateData.calledAt = input.calledWinner ? Date.now() : null;
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

  // ─── Primary Results Workflow ─────────────────────────────────────────────────
  primary: router({
    // Promote a primary winner to the general election candidate slot
    promoteSenate: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        winnerName: z.string().min(1),
        winnerParty: partyEnum,
        primaryVotePct: z.number().min(0).max(100).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        // Set candidate1 to the primary winner and advance status to General
        await updateSenateRace(input.id, {
          candidate1Name: input.winnerName,
          candidate1Party: input.winnerParty as any,
          status: "General",
          notes: `Primary winner: ${input.winnerName} (${input.winnerParty})`,
        });
        return { success: true };
      }),

    promoteHouse: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        winnerName: z.string().min(1),
        winnerParty: partyEnum,
        primaryVotePct: z.number().min(0).max(100).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        await updateHouseRace(input.id, {
          candidate1Name: input.winnerName,
          candidate1Party: input.winnerParty as any,
          status: "General",
          notes: `Primary winner: ${input.winnerName} (${input.winnerParty})`,
        });
        return { success: true };
      }),

    // List all races currently in Primary status
    listPending: publicProcedure
      .input(z.object({ adminToken: z.string() }))
      .query(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const [senateRaces, houseRaces] = await Promise.all([
          getAllSenateRaces(),
          getAllHouseRaces(),
        ]);
        return {
          senate: senateRaces.filter(r => r.status === "Primary"),
          house: houseRaces.filter(r => r.status === "Primary"),
        };
      }),
  }),

  // ─── Election Night Rapid Entry ─────────────────────────────────────────────
  electionNight: router({
    // Returns all General + Called races sorted by competitiveness for rapid entry
    queue: publicProcedure
      .input(z.object({ adminToken: z.string() }))
      .query(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const [senateRaces, houseRaces, govRaces] = await Promise.all([
          getAllSenateRaces(),
          getAllHouseRaces(),
          getAllGovernorRaces(),
        ]);
        const ratingOrder: Record<string, number> = {
          "Toss-up": 0, "Lean D": 1, "Lean R": 2, "Likely D": 3, "Likely R": 4, "Solid D": 5, "Solid R": 6,
        };
        const senateQueue = senateRaces
          .filter(r => r.status === "General" || r.status === "Called" || r.status === "Certified")
          .sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
        const houseQueue = houseRaces
          .filter(r => r.status === "General" || r.status === "Called" || r.status === "Certified")
          .sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
        const governorQueue = govRaces
          .filter(r => r.status === "Voting" || r.status === "Called" || r.status === "Certified")
          .sort((a, b) => (ratingOrder[a.rating ?? ""] ?? 7) - (ratingOrder[b.rating ?? ""] ?? 7));
        return { senate: senateQueue, house: houseQueue, governors: governorQueue };
      }),

    // Rapid single-race update: vote pcts + called winner + pct reporting
    updateRace: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        chamber: z.enum(["senate", "house", "governor"]),
        id: z.number(),
        candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
        candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
        // Governor-specific vote fields (dem/rep votes as raw numbers)
        demVotes: z.number().min(0).optional(),
        repVotes: z.number().min(0).optional(),
        pctReporting: z.number().min(0).max(100).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        calledParty: partyMainEnum.nullable().optional(),
        status: raceStatusEnum.optional(),
        // Governor status uses different enum values
        govStatus: z.enum(["Scheduled", "Voting", "Called", "Certified"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, chamber, govStatus, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        // Auto-stamp calledAt when a winner is set; clear when winner is removed
        const calledAtMs = input.calledWinner ? Date.now() : (input.calledWinner === null ? null : undefined);
        if (calledAtMs !== undefined) updateData.calledAt = calledAtMs;
        if (chamber === "senate") {
          await updateSenateRace(id, updateData as Parameters<typeof updateSenateRace>[1]);
        } else if (chamber === "house") {
          await updateHouseRace(id, updateData as Parameters<typeof updateHouseRace>[1]);
        } else {
          // Governor: map govStatus → status, remove senate/house-specific fields
          const govData: Record<string, unknown> = {};
          if (input.pctReporting !== undefined) govData.pctReporting = input.pctReporting;
          if (input.calledWinner !== undefined) govData.calledWinner = input.calledWinner;
          if (input.calledParty !== undefined) govData.calledParty = input.calledParty;
          if (input.demVotes !== undefined) govData.demVotes = input.demVotes;
          if (input.repVotes !== undefined) govData.repVotes = input.repVotes;
          if (govStatus !== undefined) govData.status = govStatus;
          if (calledAtMs !== undefined) govData.calledAt = calledAtMs;
          await updateGovernorRace(id, govData as Parameters<typeof updateGovernorRace>[1]);
        }
        // Broadcast live push to all connected WebSocket clients
        if (input.calledWinner && input.calledParty) {
          const raceInfo = chamber === "senate"
            ? await getSenateRaceById(id)
            : chamber === "house"
            ? await getHouseRaceById(id)
            : await getGovernorRaceById(id);
          broadcastElectionEvent({
            type: "race_called",
            chamber: input.chamber,
            stateCode: raceInfo?.stateCode ?? String(id),
            stateName: raceInfo?.stateName ?? undefined,
            district: chamber === "house" && raceInfo && "district" in raceInfo ? raceInfo.district : undefined,
            districtLabel: chamber === "house" && raceInfo && "districtLabel" in raceInfo ? raceInfo.districtLabel : undefined,
            calledParty: input.calledParty,
            calledWinner: input.calledWinner,
            timestamp: new Date().toISOString(),
          });
        } else if ((input.status === "General" || govStatus === "Voting") && !input.calledWinner) {
          const raceInfo = chamber === "senate"
            ? await getSenateRaceById(id)
            : chamber === "house"
            ? await getHouseRaceById(id)
            : await getGovernorRaceById(id);
          broadcastElectionEvent({
            type: "race_uncalled",
            chamber: input.chamber,
            stateCode: raceInfo?.stateCode ?? String(id),
            stateName: raceInfo?.stateName ?? undefined,
            district: chamber === "house" && raceInfo && "district" in raceInfo ? raceInfo.district : undefined,
            timestamp: new Date().toISOString(),
          });
        }
        return { success: true, calledAt: calledAtMs ?? null };
      }),

    // Batch update: submit multiple race results at once
    batchUpdate: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        updates: z.array(z.object({
          chamber: z.enum(["senate", "house"]),
          id: z.number(),
          candidate1VotePct: z.number().min(0).max(100).nullable().optional(),
          candidate2VotePct: z.number().min(0).max(100).nullable().optional(),
          pctReporting: z.number().min(0).max(100).nullable().optional(),
          calledWinner: z.string().nullable().optional(),
          calledParty: partyMainEnum.nullable().optional(),
          status: raceStatusEnum.optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const results = await Promise.allSettled(
          input.updates.map(async (u) => {
            const { id, chamber, ...data } = u;
            const updateData: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) updateData[k] = v;
            }
            if (chamber === "senate") {
              await updateSenateRace(id, updateData as Parameters<typeof updateSenateRace>[1]);
            } else {
              await updateHouseRace(id, updateData as Parameters<typeof updateHouseRace>[1]);
            }
            // Broadcast live push for each called race in the batch
            if (u.calledWinner && u.calledParty) {
              broadcastElectionEvent({
                type: "race_called",
                chamber,
                stateCode: String(id),
                district: chamber === "house" ? id : undefined,
                calledParty: u.calledParty,
                calledWinner: u.calledWinner,
                timestamp: new Date().toISOString(),
              });
            }
            return { id, chamber };
          })
        );
        const succeeded = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;
        return { succeeded, failed };
      }),
  }),

   // ─── Key Races ───────────────────────────────────────────────────────────
  keyRaces: router({
    // Returns pinned key races (admin-curated) if any exist, otherwise falls back to auto-computed
    get: publicProcedure.query(async () => {
      const [senateRaces, houseRaces, pinned] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces(),
        getPinnedKeyRaces(),
      ]);

      const RATING_ORDER: Record<string, number> = {
        "Toss-up": 0,
        "Lean D": 1,
        "Lean R": 2,
        "Likely D": 3,
        "Likely R": 4,
        "Solid D": 5,
        "Solid R": 6,
      };

      const mapSenate = (r: typeof senateRaces[0], pinnedId?: number) => ({
        id: r.id,
        pinnedId: pinnedId ?? null,
        chamber: "senate" as const,
        stateCode: r.stateCode,
        stateName: r.stateName,
        rating: r.rating,
        incumbent: r.incumbent,
        incumbentParty: r.incumbentParty,
        candidate1Name: r.candidate1Name,
        candidate1Party: r.candidate1Party,
        candidate1Photo: getCandidatePhoto(r.candidate1Name),
        candidate2Name: r.candidate2Name,
        candidate2Party: r.candidate2Party,
        candidate2Photo: getCandidatePhoto(r.candidate2Name),
        partyLogos: PARTY_LOGOS,
        status: r.status,
        calledParty: r.calledParty,
        calledWinner: r.calledWinner,
        incumbentRetiring: r.incumbentRetiring,
        notes: r.notes,
        generalDate: r.generalDate,
        primaryDate: r.primaryDate ?? null,
        isSpecial: r.isSpecial ?? false,
      });

      const mapHouse = (r: typeof houseRaces[0], pinnedId?: number) => ({
        id: r.id,
        pinnedId: pinnedId ?? null,
        chamber: "house" as const,
        stateCode: r.stateCode,
        stateName: r.stateName,
        district: r.district,
        districtLabel: r.districtLabel,
        rating: r.rating,
        incumbent: r.incumbent,
        incumbentParty: r.incumbentParty,
        candidate1Name: r.candidate1Name,
        candidate1Party: r.candidate1Party,
        candidate1Photo: getCandidatePhoto(r.candidate1Name),
        candidate2Name: r.candidate2Name,
        candidate2Party: r.candidate2Party,
        candidate2Photo: getCandidatePhoto(r.candidate2Name),
        partyLogos: PARTY_LOGOS,
        status: r.status,
        calledParty: r.calledParty,
        calledWinner: r.calledWinner,
        incumbentRetiring: r.incumbentRetiring,
        notes: r.notes,
        generalDate: r.generalDate,
        primaryDate: r.primaryDate ?? null,
        isSpecial: false,
      });

      // If admin has pinned races, use those (sorted by sortOrder)
      if (pinned.length > 0) {
        const pinnedSenate = pinned
          .filter(p => p.chamber === "senate")
          .map(p => {
            const race = senateRaces.find(r => r.id === p.raceId);
            return race ? mapSenate(race, p.id) : null;
          })
          .filter(Boolean) as ReturnType<typeof mapSenate>[];

        const pinnedHouse = pinned
          .filter(p => p.chamber === "house")
          .map(p => {
            const race = houseRaces.find(r => r.id === p.raceId);
            return race ? mapHouse(race, p.id) : null;
          })
          .filter(Boolean) as ReturnType<typeof mapHouse>[];

        return { senate: pinnedSenate, house: pinnedHouse, isPinned: true };
      }

      // Fallback: auto-compute from competitive ratings
      const senateKey = senateRaces
        .filter(r => r.rating && ["Toss-up", "Lean D", "Lean R", "Likely D", "Likely R"].includes(r.rating) && r.status !== "Called" && r.status !== "Certified")
        .sort((a, b) => (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9))
        .slice(0, 20)
        .map(r => mapSenate(r));

      const houseKey = houseRaces
        .filter(r => r.rating && ["Toss-up", "Lean D", "Lean R", "Likely D", "Likely R"].includes(r.rating) && r.status !== "Called" && r.status !== "Certified")
        .sort((a, b) => (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9))
        .slice(0, 60)
        .map(r => mapHouse(r));

      return { senate: senateKey, house: houseKey, isPinned: false };
    }),

    // Admin: list all pinned races with their pin IDs
    listPinned: publicProcedure.query(async () => {
      return getPinnedKeyRaces();
    }),

    // Admin: pin a race to the Key Races sidebar
    pin: publicProcedure
      .input((input: unknown) => {
        const i = input as { adminToken: string; chamber: "senate" | "house"; raceId: number };
        if (!i.adminToken || !i.chamber || !i.raceId) throw new TRPCError({ code: "BAD_REQUEST", message: "adminToken, chamber, raceId required" });
        return i;
      })
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        await pinKeyRace(input.chamber, input.raceId);
        return { success: true };
      }),

    // Admin: unpin a race from the Key Races sidebar
    unpin: publicProcedure
      .input((input: unknown) => {
        const i = input as { adminToken: string; chamber: "senate" | "house"; raceId: number };
        if (!i.adminToken || !i.chamber || !i.raceId) throw new TRPCError({ code: "BAD_REQUEST", message: "adminToken, chamber, raceId required" });
        return i;
      })
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        await unpinKeyRaceByRace(input.chamber, input.raceId);
        return { success: true };
      }),

    // Admin: clear all pinned races (revert to auto-computed)
    clearAll: publicProcedure
      .input((input: unknown) => {
        const i = input as { adminToken: string };
        if (!i.adminToken) throw new TRPCError({ code: "BAD_REQUEST", message: "adminToken required" });
        return i;
      })
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const pinned = await getPinnedKeyRaces();
        await Promise.all(pinned.map(p => unpinKeyRaceByRace(p.chamber, p.raceId)));
        return { success: true, cleared: pinned.length };
      }),
  }),

  // ─── Scoreboard ────────────────────────────────────────────────────────────
  scoreboard: router({
    get: publicProcedure.query(async () => {
      return getScoreboard();
    }),
  }),
  // ─── Flip Tracker ────────────────────────────────────────────────────────────
  flips: router({
    get: publicProcedure.query(async () => {
      return getFlipTracker();
    }),
  }),
  // ─── Live Status (viewer count + recent results for ticker) ──────────────────
  live: router({
    // Returns the number of WebSocket clients currently connected
    viewerCount: publicProcedure.query(() => {
      return { count: getConnectedClientCount() };
    }),
    // Returns the most recent called races for the results ticker (up to 20)
    recentResults: publicProcedure.query(async () => {
      const [senateRaces, houseRaces, govRaces, allReferendums] = await Promise.all([
        getAllSenateRaces(),
        getAllHouseRaces(),
        getAllGovernorRaces(),
        getAllReferendums(),
      ]);
      const called = [
        ...senateRaces
          // Only include races that have actually been decided (Called or Certified).
          // Races in "General" status may have calledWinner set from the primary phase — exclude those.
          .filter(r => r.calledWinner && r.calledParty && (r.status === 'Called' || r.status === 'Certified'))
          .map(r => ({
            id: `senate-${r.id}`,
            chamber: "senate" as const,
            stateCode: r.stateCode,
            stateName: r.stateName,
            district: null as number | null,
            calledWinner: r.calledWinner!,
            calledParty: r.calledParty!,
            previousParty: r.previousParty ?? null,
            updatedAt: r.updatedAt,
            generalDate: r.generalDate ?? null,
            isSpecial: r.isSpecial ?? false,
          })),
        ...houseRaces
          .filter(r => r.calledWinner && r.calledParty && (r.status === 'Called' || r.status === 'Certified'))
          .map(r => ({
            id: `house-${r.id}`,
            chamber: "house" as const,
            stateCode: r.stateCode,
            stateName: r.stateName,
            district: r.district,
            calledWinner: r.calledWinner!,
            calledParty: r.calledParty!,
            previousParty: r.previousParty ?? null,
            updatedAt: r.updatedAt,
            generalDate: r.generalDate ?? null,
            isSpecial: false,
          })),
        ...govRaces
          .filter(r => r.calledWinner && r.calledParty && (r.status === 'Called' || r.status === 'Certified'))
          .map(r => ({
            id: `governor-${r.id}`,
            chamber: "governor" as const,
            stateCode: r.stateCode,
            stateName: r.stateName,
            district: null as number | null,
            calledWinner: r.calledWinner!,
            calledParty: r.calledParty!,
            previousParty: r.previousParty ?? null,
            updatedAt: r.updatedAt,
            generalDate: r.generalDate ?? null,
            isSpecial: r.isSpecial ?? false,
          })),
        ...allReferendums
          .filter(r => r.status === 'Called' && r.calledResult)
          .map(r => ({
            id: `referendum-${r.id}`,
            chamber: 'referendum' as const,
            stateCode: r.stateCode,
            stateName: r.stateName,
            district: null as number | null,
            calledWinner: r.calledResult === 'Yes' ? (r.yesLabel ?? 'YES PASSES') : (r.noLabel ?? 'NO WINS'),
            calledParty: r.calledResult === 'Yes' ? 'YES' : 'NO',
            previousParty: null,
            updatedAt: r.updatedAt,
            generalDate: null,
            isSpecial: false,
          })),
      ]
        .sort((a, b) => {
          // Sort by generalDate (election date) descending — most recent election first
          // Referendums use updatedAt as proxy since they have no generalDate
          const parseDate = (r: typeof a) => {
            if (r.generalDate) {
              const d = new Date(r.generalDate);
              return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            return r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
          };
          return parseDate(b) - parseDate(a); // newest first
        })
        .slice(0, 20);
      return called;
    }),
  }),
  // ─── Senators (all 100 members of the 119th Congress) ──────────────────────────────────────────
  senators: router({
    // Get all 100 senators
    list: publicProcedure.query(async () => {
      return getAllSenators();
    }),
    // Get senators for a specific state (2 per state)
    byState: publicProcedure
      .input(z.object({ stateCode: z.string().length(2) }))
      .query(async ({ input }) => {
        return getSenatorsByState(input.stateCode);
      }),
    // Search senators by name, state name, or state code
    search: publicProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(async ({ input }) => {
        return searchSenators(input.query);
      }),
    // Get a single senator by ID (full detail including bio, committees, website)
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getSenatorById(input.id);
      }),
  }),

  // ─── Governor Races ─────────────────────────────────────────────────────────
  governor: router({
    // List all 36 governor races
    list: publicProcedure.query(async () => {
      return getAllGovernorRaces();
    }),

    // Get a single governor race by state code
    byState: publicProcedure
      .input(z.object({ stateCode: z.string().length(2) }))
      .query(async ({ input }) => {
        return getGovernorRaceByState(input.stateCode);
      }),

    // Admin: update a governor race (rating, candidates, results, status)
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        adminToken: z.string(),
        incumbentName: z.string().nullable().optional(),
        incumbentParty: z.enum(["D", "R", "I"]).nullable().optional(),
        isOpen: z.boolean().optional(),
        isTermLimited: z.boolean().optional(),
        previousParty: z.enum(["D", "R", "I"]).optional(),
        rating: z.enum(["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"]).optional(),
        primaryDate: z.string().nullable().optional(),
        runoffDate: z.string().nullable().optional(),
        generalDate: z.string().optional(),
        demCandidate: z.string().nullable().optional(),
        repCandidate: z.string().nullable().optional(),
        status: z.enum(["Scheduled", "Voting", "Called", "Certified"]).optional(),
        calledParty: z.enum(["D", "R", "I"]).nullable().optional(),
        calledWinner: z.string().nullable().optional(),
        demVotes: z.number().min(0).optional(),
        repVotes: z.number().min(0).optional(),
        otherCandidateName: z.string().nullable().optional(),
        otherCandidateParty: partyEnum.nullable().optional(),
        otherVotes: z.number().int().min(0).nullable().optional(),
        otherVotePct: z.number().min(0).max(100).nullable().optional(),
        pctReporting: z.number().min(0).max(100).optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await requireAdminToken(input.adminToken);
        const { id, adminToken: _t, ...data } = input;
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) updateData[k] = v;
        }
        // Auto-stamp calledAt when a winner is set; clear when winner is removed
        if (input.calledWinner !== undefined) {
          updateData.calledAt = input.calledWinner ? Date.now() : null;
        }
        await updateGovernorRace(id, updateData as Parameters<typeof updateGovernorRace>[1]);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
