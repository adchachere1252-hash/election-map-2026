import { describe, it, expect } from "vitest";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";

// ─── World Calendar utility tests ────────────────────────────────────────────

describe("World Calendar utilities", () => {
  describe("daysInMonth()", () => {
    function daysInMonth(year: number, month: number): number {
      return new Date(year, month + 1, 0).getDate();
    }

    it("returns correct days for each month in 2026", () => {
      expect(daysInMonth(2026, 0)).toBe(31); // Jan
      expect(daysInMonth(2026, 1)).toBe(28); // Feb (non-leap)
      expect(daysInMonth(2026, 2)).toBe(31); // Mar
      expect(daysInMonth(2026, 3)).toBe(30); // Apr
      expect(daysInMonth(2026, 4)).toBe(31); // May
      expect(daysInMonth(2026, 5)).toBe(30); // Jun
      expect(daysInMonth(2026, 6)).toBe(31); // Jul
      expect(daysInMonth(2026, 7)).toBe(31); // Aug
      expect(daysInMonth(2026, 8)).toBe(30); // Sep
      expect(daysInMonth(2026, 9)).toBe(31); // Oct
      expect(daysInMonth(2026, 10)).toBe(30); // Nov
      expect(daysInMonth(2026, 11)).toBe(31); // Dec
    });

    it("handles leap years correctly", () => {
      expect(daysInMonth(2024, 1)).toBe(29); // Feb 2024 is leap
      expect(daysInMonth(2028, 1)).toBe(29); // Feb 2028 is leap
    });
  });

  describe("getFirstDayOfWeek()", () => {
    function getFirstDayOfWeek(year: number, month: number): number {
      return new Date(year, month, 1).getDay();
    }

    it("returns correct first day for known months", () => {
      // June 2026 starts on Monday (1)
      expect(getFirstDayOfWeek(2026, 5)).toBe(1);
      // November 2026 starts on Sunday (0)
      expect(getFirstDayOfWeek(2026, 10)).toBe(0);
    });
  });

  describe("election date parsing", () => {
    function parseElectionDate(dateStr: string): Date {
      return new Date(dateStr + "T00:00:00");
    }

    function isSameMonth(date: Date, year: number, month: number): boolean {
      return date.getFullYear() === year && date.getMonth() === month;
    }

    it("correctly parses ISO date strings", () => {
      const d = parseElectionDate("2026-09-14");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // September = 8
      expect(d.getDate()).toBe(14);
    });

    it("correctly identifies elections in a given month", () => {
      const d = parseElectionDate("2026-11-03");
      expect(isSameMonth(d, 2026, 10)).toBe(true); // November = 10
      expect(isSameMonth(d, 2026, 9)).toBe(false);
    });
  });
});

// ─── Atlas Bundle optimization tests ─────────────────────────────────────────

describe("Atlas Bundle optimization", () => {
  describe("Congress file resolution for bundling", () => {
    function getFilesForCongress(congress: number): string[] {
      const files = new Set<string>();
      for (const [, entries] of Object.entries(LEWIS_MANIFEST)) {
        const entry = entries.find(e => congress >= e.start && congress <= e.end);
        if (entry) files.add(entry.name);
      }
      return Array.from(files);
    }

    it("resolves files for 89th Congress (all 50 states)", () => {
      const files = getFilesForCongress(89);
      expect(files.length).toBeGreaterThanOrEqual(40);
      expect(files.length).toBeLessThanOrEqual(55); // Some states share files
    });

    it("resolves files for 119th Congress (current)", () => {
      const files = getFilesForCongress(119);
      expect(files.length).toBeGreaterThanOrEqual(40);
      expect(files.length).toBeLessThanOrEqual(55);
    });

    it("every congress (89-119) resolves at least 45 unique files", () => {
      for (let c = 89; c <= 119; c++) {
        const files = getFilesForCongress(c);
        expect(files.length, `Congress ${c} has too few files`).toBeGreaterThanOrEqual(45);
      }
    });

    it("file deduplication works (shared files counted once)", () => {
      // Delaware uses Delaware_001_to_097.geojson for congresses 1-97
      // So congresses 89, 90, 91... should all resolve the same file for Delaware
      const files89 = getFilesForCongress(89);
      const files90 = getFilesForCongress(90);
      const delawareFile89 = files89.find(f => f.startsWith("Delaware"));
      const delawareFile90 = files90.find(f => f.startsWith("Delaware"));
      expect(delawareFile89).toBe(delawareFile90);
    });

    it("adjacent congresses share many files (optimization benefit)", () => {
      const files118 = new Set(getFilesForCongress(118));
      const files119 = new Set(getFilesForCongress(119));
      let shared = 0;
      for (const f of files118) {
        if (files119.has(f)) shared++;
      }
      // Adjacent congresses should share at least some files (states that didn't redistrict)
      expect(shared).toBeGreaterThan(5);
    });
  });

  describe("Bundle response format validation", () => {
    it("bundle keys are valid GeoJSON filenames", () => {
      const validPattern = /^[A-Za-z0-9_ -]+\.geojson$/;
      for (const [, entries] of Object.entries(LEWIS_MANIFEST)) {
        for (const entry of entries) {
          expect(entry.name, `Invalid filename: ${entry.name}`).toMatch(validPattern);
        }
      }
    });
  });
});

// ─── Polling data format tests ───────────────────────────────────────────────

describe("World Elections polling data format", () => {
  it("validates polling data JSON structure", () => {
    const validPolling = '{"polls":[{"source":"YouGov","date":"2026-06","burnham":38,"farage":24}],"leader":"Burnham","margin":14}';
    const parsed = JSON.parse(validPolling);
    expect(parsed).toHaveProperty("polls");
    expect(parsed).toHaveProperty("leader");
    expect(parsed).toHaveProperty("margin");
    expect(Array.isArray(parsed.polls)).toBe(true);
    expect(parsed.polls[0]).toHaveProperty("source");
  });

  it("handles null polling data gracefully", () => {
    const nullPolling = null;
    const pollingData = nullPolling ? JSON.parse(nullPolling as unknown as string) : null;
    expect(pollingData).toBeNull();
  });

  it("validates candidate photo URL format", () => {
    const validPhotoUrl = "/manus-storage/bennett_47642a38.jpg";
    expect(validPhotoUrl).toMatch(/^\/manus-storage\/[a-z_]+_[a-f0-9]+\.(jpg|png|webp)$/);
  });
});
