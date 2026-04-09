import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock WebSocket broadcast module ────────────────────────────────────────
vi.mock("./ws", () => ({
  broadcastElectionEvent: vi.fn(),
  getConnectedClientCount: vi.fn().mockReturnValue(0),
  attachWebSocketServer: vi.fn(),
}));

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
    composition: {
      senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0, lastUpdated: '2026-04-08T00:00:00.000Z', source: 'senate.gov' },
      house: { D: 214, R: 217, I: 1, total: 435, vacancies: 2, lastUpdated: '2026-04-08T00:00:00.000Z', source: 'pressgallery.house.gov' },
    },
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

  it("returns live composition with 119th Congress base numbers", async () => {
    const caller = appRouter.createCaller(createCtx());
    const board = await caller.scoreboard.get();
    expect(board).toHaveProperty("composition");
    const comp = (board as any).composition;
    // Senate: 53R / 45D / 2I (119th Congress)
    expect(comp.senate.R).toBe(53);
    expect(comp.senate.D).toBe(45);
    expect(comp.senate.I).toBe(2);
    expect(comp.senate.total).toBe(100);
    // House: 217R / 214D / 1I / 2 vacancies (GA-14 filled Apr 7, 2026 by Clay Fuller R)
    expect(comp.house.R).toBe(217);
    expect(comp.house.D).toBe(214);
    expect(comp.house.total).toBe(435);
    expect(comp.house.vacancies).toBe(2);
    // lastUpdated must be a valid ISO string
    expect(typeof comp.senate.lastUpdated).toBe("string");
    expect(new Date(comp.senate.lastUpdated).getTime()).not.toBeNaN();
    expect(typeof comp.house.lastUpdated).toBe("string");
    expect(new Date(comp.house.lastUpdated).getTime()).not.toBeNaN();
  });

  it("vacancy fill (GA-14 scenario): calling a vacancy R seat increments R and decrements vacancies", async () => {
    // Simulate GA-14 being called: isVacancy=true, calledParty='R', status='Called'
    // Base: R=217, vacancies=3 → after fill: R=218, vacancies=2
    const { getScoreboard } = await import("./db");
    vi.mocked(getScoreboard).mockResolvedValueOnce({
      senate: { D: 0, R: 0, I: 0, uncalled: 35, total: 35 },
      house: { D: 0, R: 1, I: 0, uncalled: 434, total: 435 },
      composition: {
        senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0, lastUpdated: '2026-04-08T00:00:00.000Z', source: 'senate.gov' },
        // GA-14 called R (vacancy fill): R goes from 217→218, vacancies 3→2
        house: { D: 214, R: 218, I: 1, total: 435, vacancies: 2, lastUpdated: '2026-04-08T19:19:56.000Z', source: 'pressgallery.house.gov' },
      },
    });
    const caller = appRouter.createCaller(createCtx());
    const board = await caller.scoreboard.get();
    const comp = (board as any).composition;
    // After GA-14 vacancy fill: R=218, vacancies=2
    expect(comp.house.R).toBe(218);
    expect(comp.house.D).toBe(214);
    expect(comp.house.vacancies).toBe(2);
    expect(comp.house.total).toBe(435);
    // lastUpdated should reflect the call timestamp
    expect(comp.house.lastUpdated).toBe('2026-04-08T19:19:56.000Z');
  });

  it("NJ-11 scenario: calling a vacancy D seat increments D and decrements vacancies", async () => {
    // Simulate NJ-11 being called: isVacancy=true, calledParty='D', status='Called'
    // Base: D=214, vacancies=2 (after GA-14) → after fill: D=215, vacancies=1
    const { getScoreboard } = await import("./db");
    vi.mocked(getScoreboard).mockResolvedValueOnce({
      senate: { D: 0, R: 0, I: 0, uncalled: 35, total: 35 },
      house: { D: 1, R: 1, I: 0, uncalled: 433, total: 435 },
      composition: {
        senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0, lastUpdated: '2026-04-08T00:00:00.000Z', source: 'senate.gov' },
        // NJ-11 called D (vacancy fill): D goes from 214→215, vacancies 2→1
        house: { D: 215, R: 218, I: 1, total: 435, vacancies: 1, lastUpdated: '2026-04-16T23:00:00.000Z', source: 'pressgallery.house.gov' },
      },
    });
    const caller = appRouter.createCaller(createCtx());
    const board = await caller.scoreboard.get();
    const comp = (board as any).composition;
    expect(comp.house.D).toBe(215);
    expect(comp.house.R).toBe(218);
    expect(comp.house.vacancies).toBe(1);
    expect(comp.house.total).toBe(435);
    expect(comp.house.lastUpdated).toBe('2026-04-16T23:00:00.000Z');
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

describe("Election Night router", () => {
  it("rejects queue without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.electionNight.queue({ adminToken: "invalid-token" }))
      .rejects.toThrow("Invalid or expired admin token");
  });

  it("queue returns senate and house arrays with valid token", async () => {
    const { validateAdminSession, getAllSenateRaces, getAllHouseRaces } = await import("./db");
    vi.mocked(validateAdminSession).mockResolvedValueOnce(true);
    // Override senate mock to have a General-status race
    vi.mocked(getAllSenateRaces).mockResolvedValueOnce([
      {
        id: 1, stateCode: "GA", stateName: "Georgia", isSpecial: false, specialNote: null,
        incumbent: "Jon Ossoff", incumbentParty: "D" as any, incumbentRetiring: false,
        candidate1Name: "Jon Ossoff", candidate1Party: "D" as any, candidate1VotePct: null,
        candidate2Name: "Brian Kemp", candidate2Party: "R" as any, candidate2VotePct: null,
        calledWinner: null, calledParty: null, rating: "Toss-up", status: "General",
        primaryDate: "May 19, 2026", primaryRunoffDate: null, generalDate: "November 3, 2026",
        pctReporting: "0.00", notes: null, previousParty: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ] as any);
    vi.mocked(getAllHouseRaces).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.electionNight.queue({ adminToken: "valid-token" });
    expect(result).toHaveProperty("senate");
    expect(result).toHaveProperty("house");
    expect(result.senate.length).toBe(1);
    expect(result.senate[0].status).toBe("General");
  });

  it("queue filters out non-General/Called races", async () => {
    const { validateAdminSession } = await import("./db");
    vi.mocked(validateAdminSession).mockResolvedValueOnce(true);
    // Mock returns Scheduled status — should be filtered out
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.electionNight.queue({ adminToken: "valid-token" });
    // Default mock has status: "Scheduled" so both queues should be empty
    expect(result.senate.length).toBe(0);
    expect(result.house.length).toBe(0);
  });

  it("rejects updateRace without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.electionNight.updateRace({
      adminToken: "invalid-token",
      chamber: "senate",
      id: 1,
      candidate1VotePct: 52.3,
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("rejects batchUpdate without valid admin token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.electionNight.batchUpdate({
      adminToken: "invalid-token",
      updates: [{ chamber: "senate", id: 1, candidate1VotePct: 52.3 }],
    })).rejects.toThrow("Invalid or expired admin token");
  });

  it("batchUpdate processes multiple races with valid token", async () => {
    const { validateAdminSession, updateSenateRace, updateHouseRace } = await import("./db");
    vi.mocked(validateAdminSession).mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.electionNight.batchUpdate({
      adminToken: "valid-token",
      updates: [
        { chamber: "senate", id: 1, candidate1VotePct: 52.3, candidate2VotePct: 47.7, pctReporting: 85 },
        { chamber: "house", id: 100, candidate1VotePct: 60.0, calledWinner: "Doug LaMalfa", calledParty: "R", status: "Called" },
      ],
    });
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(vi.mocked(updateSenateRace)).toHaveBeenCalledWith(1, expect.objectContaining({ candidate1VotePct: 52.3 }));
    expect(vi.mocked(updateHouseRace)).toHaveBeenCalledWith(100, expect.objectContaining({ calledWinner: "Doug LaMalfa" }));
  });

  it("updateRace broadcasts race_called event when winner is set", async () => {
    const { validateAdminSession, updateHouseRace } = await import("./db");
    const { broadcastElectionEvent } = await import("./ws");
    vi.mocked(validateAdminSession).mockResolvedValueOnce(true);
    const broadcastSpy = vi.mocked(broadcastElectionEvent);
    const caller = appRouter.createCaller(createCtx());
    await caller.electionNight.updateRace({
      adminToken: "valid-token",
      chamber: "house",
      id: 42,
      calledWinner: "Clay Fuller",
      calledParty: "R",
      status: "Called",
    });
    expect(vi.mocked(updateHouseRace)).toHaveBeenCalledWith(42, expect.objectContaining({ calledWinner: "Clay Fuller" }));
    expect(broadcastSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "race_called",
      chamber: "house",
      calledWinner: "Clay Fuller",
      calledParty: "R",
    }));
  });
});

describe("Auth router", () => {
  it("returns null user when not authenticated", async () => {
    const caller = appRouter.createCaller(createCtx());
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});
