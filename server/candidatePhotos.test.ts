/**
 * Unit tests for candidate photo URL resolution.
 * 
 * The server-side getCandidatePhoto() is a CDN-only lookup used for key-race
 * data and server-generated contexts. It does NOT use bioguide IDs — those are
 * handled client-side by getCandidatePhotoUrl() in client/src/lib/candidatePhotos.ts.
 *
 * Tests verify:
 *   1. CDN photo resolution for non-Congress candidates (governors, challengers)
 *   2. Roy Cooper specifically uses CDN (NC Governor — never served in Congress)
 *   3. Returns null for unknown candidates
 *   4. Case-insensitive lookup
 */
import { describe, it, expect } from "vitest";

import { getCandidatePhoto } from "./candidatePhotos";

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

describe("getCandidatePhoto (server-side CDN lookup)", () => {
  it("returns null for null input", () => {
    expect(getCandidatePhoto(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getCandidatePhoto("")).toBeNull();
  });

  it("returns null for unknown candidate", () => {
    expect(getCandidatePhoto("Unknown Candidate XYZ")).toBeNull();
  });

  it("resolves Roy Cooper via CDN (NC Governor — never served in Congress)", () => {
    const url = getCandidatePhoto("Roy Cooper");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("roy-cooper");
  });

  it("resolves Jon Husted via CDN (OH Senate R — appointed, not in bioguide)", () => {
    const url = getCandidatePhoto("Jon Husted");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("jon-husted");
  });

  it("resolves Jim Justice via CDN (WV Senate R — former governor)", () => {
    const url = getCandidatePhoto("Jim Justice");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("jim-justice");
  });

  it("resolves Michael Whatley via CDN (NC Senate R challenger)", () => {
    const url = getCandidatePhoto("Michael Whatley");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("michael-whatley");
  });

  it("resolves Ned Lamont via CDN (CT Governor D)", () => {
    const url = getCandidatePhoto("Ned Lamont");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("ned-lamont");
  });

  it("resolves Wes Moore via CDN (MD Governor D)", () => {
    const url = getCandidatePhoto("Wes Moore");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("wes-moore");
  });

  it("resolves Sarah Huckabee Sanders via CDN (AR Governor R)", () => {
    const url = getCandidatePhoto("Sarah Huckabee Sanders");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("sarah-huckabee-sanders");
  });

  it("resolves Greg Abbott via CDN (TX Governor R)", () => {
    const url = getCandidatePhoto("Greg Abbott");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("greg-abbott");
  });

  it("resolves Joe Lombardo via CDN (NV Governor R)", () => {
    const url = getCandidatePhoto("Joe Lombardo");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("joe-lombardo");
  });

  it("resolves Larry Rhoden via CDN (SD Governor R)", () => {
    const url = getCandidatePhoto("Larry Rhoden");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("larry-rhoden");
  });

  it("is case-insensitive for CDN lookups", () => {
    const url1 = getCandidatePhoto("roy cooper");
    const url2 = getCandidatePhoto("ROY COOPER");
    const url3 = getCandidatePhoto("Roy Cooper");
    expect(url1).toEqual(url2);
    expect(url2).toEqual(url3);
    expect(url1).not.toBeNull();
  });

  it("resolves Kathy Hochul via CDN (NY Governor D)", () => {
    const url = getCandidatePhoto("Kathy Hochul");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("kathy-hochul");
  });

  it("resolves Maura Healey via CDN (MA Governor D)", () => {
    const url = getCandidatePhoto("Maura Healey");
    expect(url).not.toBeNull();
    expect(url).toContain(CDN_BASE);
    expect(url).toContain("maura-healey");
  });
});
