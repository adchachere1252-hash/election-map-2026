/**
 * Unit tests for candidate photo URL resolution.
 * 
 * The server-side getCandidatePhoto() resolves candidate names to manus-storage
 * photo URLs. All photos are now served via the /manus-storage/ proxy (migrated
 * from the external CDN in Round 39).
 *
 * Tests verify:
 *   1. Photo resolution for non-Congress candidates (governors, challengers)
 *   2. Roy Cooper specifically uses manus-storage (NC Governor — never served in Congress)
 *   3. Returns null for unknown candidates
 *   4. Case-insensitive lookup
 */
import { describe, it, expect } from "vitest";

import { getCandidatePhoto } from "./candidatePhotos";

const STORAGE_PREFIX = "/manus-storage/";

describe("getCandidatePhoto (server-side photo lookup)", () => {
  it("returns null for null input", () => {
    expect(getCandidatePhoto(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getCandidatePhoto("")).toBeNull();
  });

  it("returns null for unknown candidate", () => {
    expect(getCandidatePhoto("Unknown Candidate XYZ")).toBeNull();
  });

  it("resolves Roy Cooper via manus-storage (NC Governor — never served in Congress)", () => {
    const url = getCandidatePhoto("Roy Cooper");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("roy-cooper");
  });

  it("resolves Jon Husted via manus-storage (OH Senate R — appointed, not in bioguide)", () => {
    const url = getCandidatePhoto("Jon Husted");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("jon-husted");
  });

  it("resolves Jim Justice via manus-storage (WV Senate R — former governor)", () => {
    const url = getCandidatePhoto("Jim Justice");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("jim-justice");
  });

  it("resolves Michael Whatley via manus-storage (NC Senate R challenger)", () => {
    const url = getCandidatePhoto("Michael Whatley");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("michael-whatley");
  });

  it("resolves Ned Lamont via manus-storage (CT Governor D)", () => {
    const url = getCandidatePhoto("Ned Lamont");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("ned-lamont");
  });

  it("resolves Wes Moore via manus-storage (MD Governor D)", () => {
    const url = getCandidatePhoto("Wes Moore");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("wes-moore");
  });

  it("resolves Sarah Huckabee Sanders via manus-storage (AR Governor R)", () => {
    const url = getCandidatePhoto("Sarah Huckabee Sanders");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("sarah-huckabee-sanders");
  });

  it("resolves Greg Abbott via manus-storage (TX Governor R)", () => {
    const url = getCandidatePhoto("Greg Abbott");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("greg-abbott");
  });

  it("resolves Joe Lombardo via manus-storage (NV Governor R)", () => {
    const url = getCandidatePhoto("Joe Lombardo");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("joe-lombardo");
  });

  it("resolves Larry Rhoden via manus-storage (SD Governor R)", () => {
    const url = getCandidatePhoto("Larry Rhoden");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("larry-rhoden");
  });

  it("is case-insensitive for lookups", () => {
    const url1 = getCandidatePhoto("roy cooper");
    const url2 = getCandidatePhoto("ROY COOPER");
    const url3 = getCandidatePhoto("Roy Cooper");
    expect(url1).toEqual(url2);
    expect(url2).toEqual(url3);
    expect(url1).not.toBeNull();
  });

  it("resolves Kathy Hochul via manus-storage (NY Governor D)", () => {
    const url = getCandidatePhoto("Kathy Hochul");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("kathy-hochul");
  });

  it("resolves Maura Healey via manus-storage (MA Governor D)", () => {
    const url = getCandidatePhoto("Maura Healey");
    expect(url).not.toBeNull();
    expect(url).toContain(STORAGE_PREFIX);
    expect(url).toContain("maura-healey");
  });
});
