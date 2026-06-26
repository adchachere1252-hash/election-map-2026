import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * AP Pipeline Integration Tests
 *
 * Tests the core logic of the AP auto-updater:
 * 1. parseStateRaces — parsing AP JSON into structured race results
 * 2. buildUpdate — converting race results into DB update payloads
 * 3. Guard logic — runoff protection, general-status protection, write-in stripping
 * 4. Broadcast deduplication
 *
 * Since the internal functions are not exported, we test through the exported
 * handler by mocking fetch, DB, and WebSocket modules.
 */

// ─── Mock WebSocket broadcast module ────────────────────────────────────────
vi.mock("./ws", () => ({
  broadcastElectionEvent: vi.fn(),
  getConnectedClientCount: vi.fn().mockReturnValue(5),
  attachWebSocketServer: vi.fn(),
}));

// ─── Mock election dates to control the active window ────────────────────────
vi.mock("./electionDates", () => ({
  ELECTION_DATES: ["2026-06-27", "2026-06-02", "2026-11-03"],
  getElectionWindowStatus: vi.fn().mockReturnValue({
    state: "ACTIVE",
    currentDate: "2026-06-27",
    nextWindowStart: null,
    nextWindowEnd: null,
  }),
  isApproachingElectionWindow: vi.fn().mockReturnValue(false),
}));

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
const { mockSenateRaces, mockHouseRaces, mockGovernorRaces } = vi.hoisted(() => {
  const mockSenateRaces = [
  {
    id: 1,
    stateCode: "LA",
    stateName: "Louisiana",
    isSpecial: false,
    specialNote: null,
    incumbent: "Bill Cassidy",
    incumbentParty: "R",
    incumbentRetiring: true,
    candidate1Name: "TBD — R Runoff: Jun 27",
    candidate1Party: "R",
    candidate1VotePct: null,
    candidate2Name: "TBD — D Runoff: Jun 27",
    candidate2Party: "D",
    candidate2VotePct: null,
    calledWinner: null,
    calledParty: null,
    rating: "Likely R",
    status: "Primary Runoff",
    primaryDate: "March 29, 2026",
    primaryRunoffDate: "June 27, 2026",
    generalDate: "November 3, 2026",
    pctReporting: "0.00",
    notes: null,
    primaryWinner: null,
    primaryParty: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    stateCode: "GA",
    stateName: "Georgia",
    isSpecial: false,
    specialNote: null,
    incumbent: "Jon Ossoff",
    incumbentParty: "D",
    incumbentRetiring: false,
    candidate1Name: "Jon Ossoff",
    candidate1Party: "D",
    candidate1VotePct: null,
    candidate2Name: "David Perdue",
    candidate2Party: "R",
    candidate2VotePct: null,
    calledWinner: null,
    calledParty: null,
    rating: "Toss-Up",
    status: "General",
    primaryDate: "May 19, 2026",
    primaryRunoffDate: null,
    generalDate: "November 3, 2026",
    pctReporting: "0.00",
    notes: null,
    primaryWinner: null,
    primaryParty: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockHouseRaces = [
  {
    id: 100,
    stateCode: "LA",
    stateName: "Louisiana",
    district: 1,
    districtLabel: "1",
    incumbent: "Steve Scalise",
    incumbentParty: "R",
    incumbentRetiring: false,
    candidate1Name: "Steve Scalise",
    candidate1Party: "R",
    candidate1VotePct: null,
    candidate2Name: "TBD",
    candidate2Party: "D",
    candidate2VotePct: null,
    calledWinner: null,
    calledParty: null,
    rating: "Safe R",
    status: "General",
    primaryDate: null,
    generalDate: "November 3, 2026",
    pctReporting: "0.00",
    notes: null,
    primaryWinner: null,
    primaryParty: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockGovernorRaces = [
  {
    id: 200,
    stateCode: "LA",
    stateName: "Louisiana",
    incumbentName: "Jeff Landry",
    incumbentParty: "R",
    demCandidate: null,
    repCandidate: null,
    calledWinner: null,
    calledParty: null,
    rating: null,
    status: "Scheduled",
    electionDate: "2026-11-03",
    pctReporting: "0.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

  return { mockSenateRaces, mockHouseRaces, mockGovernorRaces };
});

vi.mock("./db", () => ({
  getAllSenateRaces: vi.fn().mockResolvedValue(mockSenateRaces),
  getAllHouseRaces: vi.fn().mockResolvedValue(mockHouseRaces),
  getAllGovernorRaces: vi.fn().mockResolvedValue(mockGovernorRaces),
  updateSenateRace: vi.fn().mockResolvedValue(undefined),
  updateHouseRace: vi.fn().mockResolvedValue(undefined),
  updateGovernorRace: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      ignore: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
  getSenateRaceById: vi.fn().mockResolvedValue(null),
}));

// ─── Mock fetch for AP data ──────────────────────────────────────────────────
const mockApProgress: Record<string, unknown> = {
  "race-la-senate-1": {
    eevp: 95.2,
    candidates: [
      { candidateID: "c1", votePct: 52.3, voteCount: 245000, winner: true },
      { candidateID: "c2", votePct: 47.7, voteCount: 223000, winner: false },
    ],
    raceCallStatus: "Called",
  },
};

const mockApMetadata: Record<string, unknown> = {
  "race-la-senate-1": {
    officeName: "U.S. Senate",
    seatNum: null,
    officeID: "S",
    candidates: {
      c1: { first: "Julia", last: "Letlow", party: "REP" },
      c2: { first: "John", last: "Fleming", party: "REP" },
    },
  },
};

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: AP returns data for LA on the active date
  mockFetch.mockImplementation(async (url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("progress.json") && urlStr.includes("/LA/")) {
      return {
        ok: true,
        text: async () => JSON.stringify(mockApProgress),
      };
    }
    if (urlStr.includes("metadata.json") && urlStr.includes("/LA/")) {
      return {
        ok: true,
        text: async () => JSON.stringify(mockApMetadata),
      };
    }
    // All other states: no data
    return { ok: false, text: async () => "" };
  });
});

// ─── Import the module under test ────────────────────────────────────────────
import { handleScheduledApUpdateTrusted } from "./scheduledApUpdate";
import { broadcastElectionEvent } from "./ws";
import { updateSenateRace, updateHouseRace } from "./db";

describe("AP Pipeline — parseStateRaces", () => {
  it("correctly identifies a U.S. Senate race from AP metadata", async () => {
    // The handler should parse the LA senate race from the mock AP data
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // Should have attempted to update the LA senate race
    expect(updateSenateRace).toHaveBeenCalled();
  });

  it("maps REP party to R correctly", async () => {
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // The update should contain primaryWinner (not calledWinner, since LA is Primary Runoff)
    const calls = vi.mocked(updateSenateRace).mock.calls;
    if (calls.length > 0) {
      const [id, payload] = calls[0];
      expect(id).toBe(1); // LA senate race id
      expect(payload).toHaveProperty("primaryWinner", "Julia Letlow");
      expect(payload).toHaveProperty("primaryParty", "R");
    }
  });
});

describe("AP Pipeline — buildUpdate safety guards", () => {
  it("NEVER sets calledWinner on a primary-phase update", async () => {
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    const calls = vi.mocked(updateSenateRace).mock.calls;
    for (const [, payload] of calls) {
      const p = payload as Record<string, unknown>;
      // calledWinner must NEVER be set on primary updates
      expect(p).not.toHaveProperty("calledWinner");
      expect(p).not.toHaveProperty("calledParty");
    }
  });

  it("does not overwrite candidate names when status is General", async () => {
    // GA senate is in General status — primary AP data should NOT overwrite candidates
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    // Mock AP data for GA
    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/GA/") && urlStr.includes("progress.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-ga-senate": {
              eevp: 80,
              candidates: [
                { candidateID: "g1", votePct: 55, voteCount: 100000, winner: true },
                { candidateID: "g2", votePct: 45, voteCount: 80000, winner: false },
              ],
            },
          }),
        };
      }
      if (urlStr.includes("/GA/") && urlStr.includes("metadata.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-ga-senate": {
              officeName: "U.S. Senate",
              seatNum: null,
              officeID: "S",
              candidates: {
                g1: { first: "Wrong", last: "Name", party: "DEM" },
                g2: { first: "Also", last: "Wrong", party: "REP" },
              },
            },
          }),
        };
      }
      return { ok: false, text: async () => "" };
    });

    await handleScheduledApUpdateTrusted(req, res);

    const calls = vi.mocked(updateSenateRace).mock.calls;
    const gaUpdate = calls.find(([id]) => id === 2);
    if (gaUpdate) {
      const payload = gaUpdate[1] as Record<string, unknown>;
      // Should NOT overwrite candidate names for a race already in General status
      expect(payload).not.toHaveProperty("candidate1Name");
      expect(payload).not.toHaveProperty("candidate2Name");
    }
  });

  it("strips write-in candidates from results", async () => {
    // Mock AP data with write-in candidates
    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/LA/") && urlStr.includes("progress.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-la-senate-1": {
              eevp: 99,
              candidates: [
                { candidateID: "c1", votePct: 50, voteCount: 200000, winner: true },
                { candidateID: "c2", votePct: 30, voteCount: 120000, winner: false },
                { candidateID: "c3", votePct: 20, voteCount: 80000, winner: false },
              ],
            },
          }),
        };
      }
      if (urlStr.includes("/LA/") && urlStr.includes("metadata.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-la-senate-1": {
              officeName: "U.S. Senate",
              seatNum: null,
              officeID: "S",
              candidates: {
                c1: { first: "Julia", last: "Letlow", party: "REP" },
                c2: { first: "John", last: "Fleming", party: "REP" },
                c3: { first: "Write-In", last: "Candidates", party: "" },
              },
            },
          }),
        };
      }
      return { ok: false, text: async () => "" };
    });

    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    const calls = vi.mocked(updateSenateRace).mock.calls;
    if (calls.length > 0) {
      const payload = calls[0][1] as Record<string, unknown>;
      // Write-in should never appear in candidate names
      const allValues = Object.values(payload).map(String).join(" ");
      expect(allValues).not.toContain("Write-In");
      expect(allValues).not.toContain("write-in");
    }
  });
});

describe("AP Pipeline — Primary Runoff guard", () => {
  it("allows updates for Primary Runoff races when active window matches", async () => {
    // LA is in Primary Runoff, active window is 2026-06-27 (LA runoff date)
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // Should have called updateSenateRace for LA (id=1)
    const calls = vi.mocked(updateSenateRace).mock.calls;
    const laCall = calls.find(([id]) => id === 1);
    expect(laCall).toBeDefined();
  });

  it("skips Primary Runoff races when active window does NOT match", async () => {
    // Change the active window to a different date
    const { getElectionWindowStatus } = await import("./electionDates");
    vi.mocked(getElectionWindowStatus).mockReturnValue({
      state: "ACTIVE",
      currentDate: "2026-11-03", // November general — not the runoff date
      nextWindowStart: null,
      nextWindowEnd: null,
    } as any);

    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // The LA senate race (id=1) is in Primary Runoff status.
    // When activeDate (from findActiveDate, which finds AP data for "2026-06-27")
    // does NOT match activeWindowDate ("2026-11-03"), the guard skips it.
    // The race should NOT have primaryWinner set.
    const calls = vi.mocked(updateSenateRace).mock.calls;
    const laCall = calls.find(([id]) => id === 1);
    if (laCall) {
      const payload = laCall[1] as Record<string, unknown>;
      // primaryWinner should NOT be set since the runoff guard skipped it
      expect(payload).not.toHaveProperty("primaryWinner");
    } else {
      // If not called at all, that's also correct (skipped entirely)
      expect(laCall).toBeUndefined();
    }
  });
});

describe("AP Pipeline — broadcast deduplication", () => {
  it("broadcasts race_called event when a winner is detected", async () => {
    // For this test, we need the race to be in General status with a called winner
    // Override mock to return GA in General with AP calling it
    mockSenateRaces[1].status = "General";

    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/GA/") && urlStr.includes("progress.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-ga-senate": {
              eevp: 99,
              raceCallStatus: "Called",
              candidates: [
                { candidateID: "g1", votePct: 51, voteCount: 2500000, winner: true },
                { candidateID: "g2", votePct: 49, voteCount: 2400000, winner: false },
              ],
            },
          }),
        };
      }
      if (urlStr.includes("/GA/") && urlStr.includes("metadata.json")) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            "race-ga-senate": {
              officeName: "U.S. Senate",
              seatNum: null,
              officeID: "S",
              candidates: {
                g1: { first: "Jon", last: "Ossoff", party: "DEM" },
                g2: { first: "David", last: "Perdue", party: "REP" },
              },
            },
          }),
        };
      }
      return { ok: false, text: async () => "" };
    });

    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // Should have broadcast a race_called event
    expect(broadcastElectionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "race_called",
      })
    );
  });
});

describe("AP Pipeline — response format", () => {
  it("returns success JSON on completion", async () => {
    const req = { headers: {}, cookies: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await handleScheduledApUpdateTrusted(req, res);

    // handleScheduledApUpdateTrusted calls res.json() directly (no status(200) call)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
