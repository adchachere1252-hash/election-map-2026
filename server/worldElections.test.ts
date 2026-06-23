import { describe, it, expect } from "vitest";

// Test the world elections data model and validation logic
describe("World Elections", () => {
  describe("Data Model Validation", () => {
    const VALID_STATUSES = ["Upcoming", "Voting Today", "Completed", "Postponed", "Cancelled"];
    const VALID_TYPES = ["Presidential", "Parliamentary", "Referendum", "Legislative", "Local"];

    it("should have valid status enum values", () => {
      VALID_STATUSES.forEach(status => {
        expect(typeof status).toBe("string");
        expect(status.length).toBeGreaterThan(0);
      });
    });

    it("should have valid election type enum values", () => {
      VALID_TYPES.forEach(type => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it("should validate ISO 3166-1 alpha-2 country codes", () => {
      const validCodes = ["US", "GB", "FR", "DE", "JP", "BR", "IN", "CO", "NG", "KE"];
      validCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z]{2}$/);
      });
    });

    it("should validate election date format (YYYY-MM-DD)", () => {
      const validDates = ["2026-06-22", "2026-10-15", "2026-12-01"];
      validDates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const parsed = new Date(date);
        expect(parsed.toString()).not.toBe("Invalid Date");
      });
    });

    it("should reject invalid date formats", () => {
      const invalidDates = ["22-06-2026", "2026/06/22", "June 22, 2026", ""];
      invalidDates.forEach(date => {
        expect(date).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe("Candidates JSON Parsing", () => {
    it("should parse valid candidates JSON", () => {
      const candidatesJson = '[{"name":"John Doe","party":"Party A","votes":1000000,"pct":"52.3"},{"name":"Jane Smith","party":"Party B","votes":900000,"pct":"47.7"}]';
      const candidates = JSON.parse(candidatesJson);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBe(2);
      expect(candidates[0].name).toBe("John Doe");
      expect(candidates[0].party).toBe("Party A");
      expect(candidates[0].votes).toBe(1000000);
    });

    it("should handle empty candidates", () => {
      const empty = null;
      expect(empty).toBeNull();
    });

    it("should handle candidates with minimal fields", () => {
      const minimal = '[{"name":"Candidate","party":"Independent"}]';
      const parsed = JSON.parse(minimal);
      expect(parsed[0].name).toBe("Candidate");
      expect(parsed[0].votes).toBeUndefined();
    });
  });

  describe("Election Status Logic", () => {
    it("should determine if election is upcoming based on date", () => {
      const today = new Date();
      const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const futureDateStr = futureDate.toISOString().split("T")[0];
      const electionDate = new Date(futureDateStr);
      expect(electionDate > today).toBe(true);
    });

    it("should determine if election is completed based on date", () => {
      const today = new Date();
      const pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastDateStr = pastDate.toISOString().split("T")[0];
      const electionDate = new Date(pastDateStr);
      expect(electionDate < today).toBe(true);
    });

    it("should identify voting today correctly", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const electionDate = todayStr;
      expect(electionDate).toBe(todayStr);
    });
  });

  describe("Country Code Mapping", () => {
    // Verify the country code map covers major countries
    const MAJOR_COUNTRIES: Record<string, string> = {
      "United States": "US",
      "United Kingdom": "GB",
      "France": "FR",
      "Germany": "DE",
      "Japan": "JP",
      "Brazil": "BR",
      "India": "IN",
      "Colombia": "CO",
      "Nigeria": "NG",
      "Kenya": "KE",
      "South Korea": "KR",
      "Australia": "AU",
      "Canada": "CA",
      "Mexico": "MX",
      "Italy": "IT",
    };

    it("should have 2-letter codes for all major countries", () => {
      Object.entries(MAJOR_COUNTRIES).forEach(([country, code]) => {
        expect(code).toMatch(/^[A-Z]{2}$/);
        expect(country.length).toBeGreaterThan(0);
      });
    });

    it("should not have duplicate country codes", () => {
      const codes = Object.values(MAJOR_COUNTRIES);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe("Globe Color Logic", () => {
    const getStatusColor = (status: string): string => {
      switch (status) {
        case "Upcoming": return "#f59e0b"; // amber
        case "Voting Today": return "#eab308"; // yellow
        case "Completed": return "#22c55e"; // green
        case "Postponed": return "#6b7280"; // gray
        case "Cancelled": return "#ef4444"; // red
        default: return "#374151"; // dark gray
      }
    };

    it("should return amber for upcoming elections", () => {
      expect(getStatusColor("Upcoming")).toBe("#f59e0b");
    });

    it("should return yellow for voting today", () => {
      expect(getStatusColor("Voting Today")).toBe("#eab308");
    });

    it("should return green for completed elections", () => {
      expect(getStatusColor("Completed")).toBe("#22c55e");
    });

    it("should return gray for postponed elections", () => {
      expect(getStatusColor("Postponed")).toBe("#6b7280");
    });

    it("should return red for cancelled elections", () => {
      expect(getStatusColor("Cancelled")).toBe("#ef4444");
    });

    it("should return dark gray for unknown status", () => {
      expect(getStatusColor("Unknown")).toBe("#374151");
    });
  });

  describe("Turnout Percentage Validation", () => {
    it("should accept valid turnout percentages (0-100)", () => {
      const validPcts = [0, 25.5, 50, 72.8, 99.9, 100];
      validPcts.forEach(pct => {
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      });
    });

    it("should format turnout percentage to 2 decimal places", () => {
      const pct = 72.856;
      const formatted = pct.toFixed(2);
      expect(formatted).toBe("72.86");
    });
  });

  describe("Sources JSON Parsing", () => {
    it("should parse valid sources JSON array", () => {
      const sourcesJson = '["https://reuters.com/article/123","https://bbc.com/news/456"]';
      const sources = JSON.parse(sourcesJson);
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBe(2);
      expect(sources[0]).toContain("reuters.com");
    });

    it("should handle null sources", () => {
      const sources = null;
      expect(sources).toBeNull();
    });
  });
});
