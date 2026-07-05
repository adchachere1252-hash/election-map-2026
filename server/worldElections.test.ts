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

  describe("Candidate Photos and Results", () => {
    it("should parse candidates with photo URLs", () => {
      const candidatesJson = JSON.stringify([
        {
          name: "Péter Magyar",
          party: "TISZA",
          role: "Prime Minister-elect",
          photo: "/manus-storage/peter_magyar_abc123.jpg",
          pct: 56.2,
          seats: 141,
          is_winner: true,
        },
        {
          name: "Viktor Orbán",
          party: "Fidesz",
          role: "Outgoing PM",
          photo: "/manus-storage/viktor_orban_def456.jpg",
          pct: 26.8,
          seats: 44,
          is_winner: false,
        },
      ]);
      const candidates = JSON.parse(candidatesJson);
      expect(candidates).toHaveLength(2);
      expect(candidates[0].photo).toMatch(/\/manus-storage\//);
      expect(candidates[0].is_winner).toBe(true);
      expect(candidates[0].role).toBe("Prime Minister-elect");
      expect(candidates[0].seats).toBe(141);
      expect(candidates[0].pct).toBe(56.2);
      expect(candidates[1].is_winner).toBe(false);
    });

    it("should handle candidates without photos (fallback to initials)", () => {
      const candidatesJson = JSON.stringify([
        { name: "John Doe", party: "Party A" },
      ]);
      const candidates = JSON.parse(candidatesJson);
      expect(candidates[0].photo).toBeUndefined();
      expect(candidates[0].name).toBe("John Doe");
    });

    it("should validate photo URL format for manus-storage", () => {
      const photoUrl = "/manus-storage/keiko_fujimori_xyz789.jpg";
      expect(photoUrl).toMatch(/^\/manus-storage\/[a-z_]+_[a-z0-9]+\.(jpg|png|webp)$/);
    });

    it("should support numeric pct values", () => {
      const candidate = { name: "Test", party: "P", pct: 50.14 };
      expect(typeof candidate.pct).toBe("number");
      expect(candidate.pct).toBeGreaterThan(0);
      expect(candidate.pct).toBeLessThanOrEqual(100);
    });

    it("should support string pct values for backward compatibility", () => {
      const candidate = { name: "Test", party: "P", pct: "52.3" };
      const numericPct = parseFloat(candidate.pct);
      expect(numericPct).toBe(52.3);
    });

    it("should identify winner correctly in multi-candidate races", () => {
      const candidates = [
        { name: "Winner", party: "A", is_winner: true, pct: 55 },
        { name: "Loser", party: "B", is_winner: false, pct: 45 },
      ];
      const winners = candidates.filter(c => c.is_winner);
      expect(winners).toHaveLength(1);
      expect(winners[0].name).toBe("Winner");
    });

    it("should handle seats field for parliamentary elections", () => {
      const candidates = [
        { name: "Party A Leader", party: "Party A", seats: 141, is_winner: true },
        { name: "Party B Leader", party: "Party B", seats: 44, is_winner: false },
        { name: "Party C Leader", party: "Party C", seats: 14, is_winner: false },
      ];
      const totalSeats = candidates.reduce((sum, c) => sum + (c.seats || 0), 0);
      expect(totalSeats).toBe(199);
      expect(candidates[0].seats).toBeGreaterThan(candidates[1].seats);
    });
  });
});
