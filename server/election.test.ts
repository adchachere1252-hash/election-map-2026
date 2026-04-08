import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllSenateRaces: vi.fn().mockResolvedValue([
    {
      id: 1,
      stateCode: "GA",
      stateName: "Georgia",
      isSpecial: false,
      specialNote: null,
      incumbent: "Jon Ossoff",
      incumbentParty: "D",
      incumbentRetiring: false,
      candidate1Name: null,
      candidate1Party: null,
      candidate1VotePct: null,
      candidate2Name: null,
      candidate2Party: null,
      candidate2VotePct: null,
      calledWinner: null,
      calledParty: null,
      rating: "Toss-up",
      status: "Scheduled",
      primaryDate: "May 19, 2026",
      primaryRunoffDate: null,
      generalDate: "November 3, 2026",
      pctReporting: "0.00",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getSenateRaceById: vi.fn().mockResolvedValue(null),
  updateSenateRace: vi.fn().mockResolvedValue(undefined),
  getAllHouseRaces: vi.fn().mockResolvedValue([
    {
      id: 100,
      stateCode: "CA",
      stateName: "California",
      district: 1,
      districtLabel: "1",
      incumbent: "Doug LaMalfa",
      incumbentParty: "R",
      incumbentRetiring: false,
      candidate1Name: null,
      candidate1Party: null,
      candidate1VotePct: null,
      candidate2Name: null,
      candidate2Party: null,
      candidate2VotePct: null,
      calledWinner: null,
      calledParty: null,
      rating: "Solid R",
      status: "Scheduled",
      primaryDate: "June 2, 2026",
      generalDate: "November 3, 2026",
      pctReporting: "0.00",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getHouseRaceById: vi.fn().mockResolvedValue(null),
  getHouseRacesByState: vi.fn().mockResolvedValue([]),
  updateHouseRace: vi.fn().mockResolvedValue(undefined),
  getAllRedistrictingStates: vi.fn().mockResolvedValue([
    {
      id: 1,
      stateCode: "CA",
      stateName: "California",
      enacted: true,
      reason: "Court-ordered redistricting",
      status: "New maps enacted",
      method: "Independent Commission",
      delegationBefore: "42D-10R",
      projectedImpact: "+1 D",
      litigationNotes: null,
      updatedAt: new Date(),
    },
  ]),
  updateRedistrictingState: vi.fn().mockResolvedValue(undefined),
  getAllReferendums: vi.fn().mockResolvedValue([
    {
      id: 1,
      stateCode: "VA",
      stateName: "Virginia",
      name: "Virginia Redistricting Referendum",
      description: "Approve new congressional district maps",
      yesLabel: "Yes",
      noLabel: "No",
      yesVotes: 0,
      noVotes: 0,
      pctReporting: "0.00",
      electionDate: "April 21, 2026",
      status: "Scheduled",
      calledResult: null,
      notes: null,
      updatedAt: new Date(),
    },
  ]),
  updateReferendum: vi.fn().mockResolvedValue(undefined),
  getScoreboard: vi.fn().mockResolvedValue({
    senate: { D: 0, R: 0, I: 0, uncalled: 35, total: 35 },
    house: { D: 0, R: 0, I: 0, uncalled: 435, total: 435 },
  }),
  getFlipTracker: vi.fn().mockResolvedValue({
    senate: {
      dToR: [{ id: 1, stateCode: "WV", stateName: "West Virginia", calledParty: "R", previousParty: "D", calledWinner: "John Smith", status: "Called" }],
      rToD: [],
      netD: -1,
      netR: 1,
    },
    house: {
      dToR: [],
      rToD: [{ id: 200, stateCode: "NY", stateName: "New York", districtLabel: "3", calledParty: "D", previousParty: "R", calledWinner: "Jane Doe", status: "Called" }],
      netD: 1,
      netR: -1,
    },
  }),
  createAdminSession: vi.fn().mockResolvedValue(undefined),
  validateAdminSession: vi.fn().mockResolvedValue(false),
  deleteAdminSession: vi.fn().mockResolvedValue(undefined),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("Senate router", () => {
  it("lists all senate races", async () => {
    const caller = appRouter.createCaller(createCtx());
    const races = await caller.senate.list();
    expect(Array.isArray(races)).toBe(true);
    expect(races.length).toBeGreaterThan(0);
    expect(races[0].stateCode).toBe("GA");
    expect(races[0].rating).toBe("Toss-up");
  });
});

describe("House router", () => {
  it("lists all house races", async () => {
    const caller = appRouter.createCaller(createCtx());
    const races = await caller.house.list();
    expect(Array.isArray(races)).toBe(true);
    expect(races.length).toBeGreaterThan(0);
    expect(races[0].stateCode).toBe("CA");
    expect(races[0].rating).toBe("Solid R");
  });
});

describe("Redistricting router", () => {
  it("lists all redistricting states", async () => {
    const caller = appRouter.createCaller(createCtx());
    const states = await caller.redistricting.list();
    expect(Array.isArray(states)).toBe(true);
    expect(states[0].stateCode).toBe("CA");
    expect(states[0].enacted).toBe(true);
  });
});

describe("Referendum router", () => {
  it("lists all referendums", async () => {
    const caller = appRouter.createCaller(createCtx());
    const refs = await caller.referendum.list();
    expect(Array.isArray(refs)).toBe(true);
    expect(refs[0].stateCode).toBe("VA");
    expect(refs[0].electionDate).toBe("April 21, 2026");
  });
});

describe("Scoreboard router", () => {
  it("returns scoreboard with senate and house tallies", async () => {
    const caller = appRouter.createCaller(createCtx());
    const board = await caller.scoreboard.get();
    expect(board).toHaveProperty("senate");
    expect(board).toHaveProperty("house");
    expect(board.senate.total).toBe(35);
    expect(board.house.total).toBe(435);
  });
});

describe("Admin router", () => {
  it("rejects wrong password", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.admin.login({ password: "wrongpassword" }))
      .rejects.toThrow("Incorrect password");
  });

  it("verifies invalid token as false", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.admin.verify({ token: "invalid-token-xyz" });
    expect(result.valid).toBe(false);
  });

  it("rejects senate update without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.senate.update({
      id: 1,
      adminToken: "invalid-token",
      rating: "Lean D",
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects house update without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.house.update({
      id: 100,
      adminToken: "invalid-token",
      rating: "Lean R",
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects referendum update without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.referendum.update({
      id: 1,
      adminToken: "invalid-token",
      yesVotes: 1000,
      noVotes: 500,
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects redistricting update without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.redistricting.update({
      id: 1,
      adminToken: "invalid-token",
      enacted: true,
    })).rejects.toThrow("Invalid or expired admin token");
  });
});

describe("Primary router", () => {
  it("rejects listPending without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.primary.listPending({ adminToken: "invalid-token" }))
      .rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects promoteSenate without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.primary.promoteSenate({
      id: 1,
      adminToken: "invalid-token",
      winnerName: "Test Candidate",
      winnerParty: "D",
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects promoteHouse without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.primary.promoteHouse({
      id: 100,
      adminToken: "invalid-token",
      winnerName: "Test Candidate",
      winnerParty: "R",
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("listPending returns senate and house arrays with valid token", async () => {
    // Override validateAdminSession to return true for this test
    const { validateAdminSession } = await import("./db");
    vi.mocked(validateAdminSession).mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.primary.listPending({ adminToken: "valid-token" });
    expect(result).toHaveProperty("senate");
    expect(result).toHaveProperty("house");
    // Both should be arrays (filtered to Primary status — our mock has Scheduled, so both empty)
    expect(Array.isArray(result.senate)).toBe(true);
    expect(Array.isArray(result.house)).toBe(true);
  });
});

describe("Flip Tracker router", () => {
  it("returns flip tracker data with senate and house chambers", async () => {
    const caller = appRouter.createCaller(createCtx());
    const flips = await caller.flips.get();
    expect(flips).toHaveProperty("senate");
    expect(flips).toHaveProperty("house");
  });

  it("senate flips contain expected D→R flip entry", async () => {
    const caller = appRouter.createCaller(createCtx());
    const flips = await caller.flips.get();
    expect(flips.senate.dToR.length).toBe(1);
    expect(flips.senate.dToR[0].stateCode).toBe("WV");
    expect(flips.senate.dToR[0].calledParty).toBe("R");
    expect(flips.senate.dToR[0].previousParty).toBe("D");
  });

  it("house flips contain expected R→D flip entry", async () => {
    const caller = appRouter.createCaller(createCtx());
    const flips = await caller.flips.get();
    expect(flips.house.rToD.length).toBe(1);
    expect(flips.house.rToD[0].stateCode).toBe("NY");
    expect(flips.house.rToD[0].calledParty).toBe("D");
    expect(flips.house.rToD[0].previousParty).toBe("R");
  });

  it("net seat gains are correctly signed", async () => {
    const caller = appRouter.createCaller(createCtx());
    const flips = await caller.flips.get();
    // Senate: 1 D→R flip means Dems lost 1, Reps gained 1
    expect(flips.senate.netD).toBe(-1);
    expect(flips.senate.netR).toBe(1);
    // House: 1 R→D flip means Dems gained 1, Reps lost 1
    expect(flips.house.netD).toBe(1);
    expect(flips.house.netR).toBe(-1);
  });

  it("returns empty flip lists when no seats have changed party", async () => {
    const { getFlipTracker } = await import("./db");
    vi.mocked(getFlipTracker).mockResolvedValueOnce({
      senate: { dToR: [], rToD: [], netD: 0, netR: 0 },
      house: { dToR: [], rToD: [], netD: 0, netR: 0 },
    });
    const caller = appRouter.createCaller(createCtx());
    const flips = await caller.flips.get();
    expect(flips.senate.dToR).toHaveLength(0);
    expect(flips.senate.rToD).toHaveLength(0);
    expect(flips.house.dToR).toHaveLength(0);
    expect(flips.house.rToD).toHaveLength(0);
    expect(flips.senate.netD).toBe(0);
    expect(flips.senate.netR).toBe(0);
  });
});

describe("Auth router", () => {
  it("returns null user when not authenticated", async () => {
    const caller = appRouter.createCaller(createCtx());
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});
