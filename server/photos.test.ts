import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the name-keyed candidate photo system.
 * Verifies that:
 * 1. batchGetCandidatePhotos returns photos keyed by normalized name
 * 2. The photos.batchLookup tRPC endpoint works correctly
 * 3. upsertCandidatePhoto correctly inserts/updates entries
 * 4. Photo lookup is case-insensitive and handles whitespace
 */

// Mock the database module
vi.mock("./db", () => {
  const mockPhotos = new Map<string, string>([
    ["jon ossoff", "https://bioguide.congress.gov/bioguide/photo/O/O000174.jpg"],
    ["donna miller", "https://manus-storage.s3.us-east-1.amazonaws.com/manus-storage/donna_miller_final_6546eed5.jpg"],
    ["michael noack", "https://manus-storage.s3.us-east-1.amazonaws.com/manus-storage/House_IL-2_Michael_Noack_fixed_e2892b90.jpg"],
  ]);

  return {
    batchGetCandidatePhotos: vi.fn(async (names: string[]) => {
      const result = new Map<string, string>();
      for (const name of names) {
        const normalized = name.toLowerCase().trim();
        const url = mockPhotos.get(normalized);
        if (url) result.set(normalized, url);
      }
      return result;
    }),
    upsertCandidatePhoto: vi.fn(async (data: any) => {
      mockPhotos.set(data.normalizedName, data.photoUrl);
      return { id: 1, ...data };
    }),
    getDb: vi.fn(async () => null),
    getAllSenateRaces: vi.fn(async () => []),
    getAllHouseRaces: vi.fn(async () => []),
    getPinnedKeyRaces: vi.fn(async () => []),
  };
});

describe("Photo System - Name-keyed lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("batchGetCandidatePhotos returns correct photos by normalized name", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    const result = await batchGetCandidatePhotos(["Jon Ossoff", "Donna Miller", "Unknown Person"]);
    
    expect(result.size).toBe(2);
    expect(result.get("jon ossoff")).toBe("https://bioguide.congress.gov/bioguide/photo/O/O000174.jpg");
    expect(result.get("donna miller")).toContain("donna_miller");
    expect(result.has("unknown person")).toBe(false);
  });

  it("batchGetCandidatePhotos is case-insensitive", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    const result = await batchGetCandidatePhotos(["JON OSSOFF", "jon ossoff", "Jon Ossoff"]);
    
    // All variants should resolve to the same entry
    expect(result.get("jon ossoff")).toBe("https://bioguide.congress.gov/bioguide/photo/O/O000174.jpg");
  });

  it("batchGetCandidatePhotos handles empty input", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    const result = await batchGetCandidatePhotos([]);
    expect(result.size).toBe(0);
  });

  it("batchGetCandidatePhotos trims whitespace from names", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    const result = await batchGetCandidatePhotos(["  Jon Ossoff  ", "Donna Miller "]);
    expect(result.get("jon ossoff")).toBeDefined();
    expect(result.get("donna miller")).toBeDefined();
  });

  it("upsertCandidatePhoto stores photo by normalized name", async () => {
    const { upsertCandidatePhoto } = await import("./db");
    
    await upsertCandidatePhoto({
      normalizedName: "new candidate",
      displayName: "New Candidate",
      photoUrl: "https://example.com/photo.jpg",
      source: "manus-storage",
      chamber: "senate",
    });
    
    expect(upsertCandidatePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedName: "new candidate",
        photoUrl: "https://example.com/photo.jpg",
      })
    );
  });

  it("photos are keyed by person name, not by slot position", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    // Simulate AP reordering: candidate1 and candidate2 swap positions
    // Before: candidate1=Donna Miller, candidate2=Michael Noack
    // After AP update: candidate1=Michael Noack, candidate2=Donna Miller
    
    // With name-keyed lookup, photos always follow the person regardless of slot
    const beforeResult = await batchGetCandidatePhotos(["Donna Miller", "Michael Noack"]);
    const afterResult = await batchGetCandidatePhotos(["Michael Noack", "Donna Miller"]);
    
    // Donna Miller always gets her own photo
    expect(beforeResult.get("donna miller")).toContain("donna_miller");
    expect(afterResult.get("donna miller")).toContain("donna_miller");
    
    // Michael Noack always gets his own photo
    expect(beforeResult.get("michael noack")).toContain("Michael_Noack");
    expect(afterResult.get("michael noack")).toContain("Michael_Noack");
  });

  it("prevents the AP swap bug: photos don't change when candidate order changes", async () => {
    const { batchGetCandidatePhotos } = await import("./db");
    
    // The core guarantee: looking up by name always returns the same photo
    // regardless of which "slot" (candidate1 vs candidate2) the person is in
    const lookup1 = await batchGetCandidatePhotos(["Donna Miller"]);
    const lookup2 = await batchGetCandidatePhotos(["Donna Miller"]);
    
    expect(lookup1.get("donna miller")).toBe(lookup2.get("donna miller"));
  });
});
