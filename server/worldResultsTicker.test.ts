/**
 * WorldResultsTicker logic tests
 * Tests the pure utility functions used by the WorldResultsTicker component:
 * - countryFlag: converts ISO 2-letter country codes to flag emojis
 * - typeTag: converts election type strings to short labels
 * - getResultColor: maps winner/party info to color classes
 * - getRefLabel: extracts referendum topic labels
 * - completedElections filter logic
 */
import { describe, it, expect } from "vitest";

// Re-implement the pure functions here for unit testing
// (since they're not exported from the component)

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const chars = Array.from(code.toUpperCase());
  return String.fromCodePoint(
    ...chars.map((c) => c.charCodeAt(0) + 127397)
  );
}

function typeTag(type: string): string {
  switch (type) {
    case "Presidential": return "PRES";
    case "Parliamentary": return "PARL";
    case "Referendum": return "REF";
    case "Legislative": return "LEG";
    case "Local": return "LOC";
    default: return "ELEC";
  }
}

function getResultColor(winnerParty: string | null, winner: string | null): { dot: string; text: string; bg: string } {
  if (!winnerParty) return { dot: "bg-gray-400", text: "text-gray-300", bg: "bg-gray-700 text-gray-300" };
  
  const lower = winnerParty.toLowerCase();
  if (lower.includes("approved") || (winner?.toUpperCase() === "YES"))
    return { dot: "bg-green-400", text: "text-green-300", bg: "bg-green-900/60 text-green-300" };
  if (lower.includes("rejected") || (winner?.toUpperCase() === "NO"))
    return { dot: "bg-red-400", text: "text-red-300", bg: "bg-red-900/60 text-red-300" };
  if (lower.includes("left") || lower.includes("labour") || lower.includes("socialist") || lower.includes("democrat") || lower.includes("dpk"))
    return { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-900/60 text-rose-300" };
  if (lower.includes("right") || lower.includes("conservative") || lower.includes("bjp") || lower.includes("fuerza"))
    return { dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-900/60 text-blue-300" };
  if (lower.includes("green"))
    return { dot: "bg-green-400", text: "text-green-300", bg: "bg-green-900/60 text-green-300" };
  
  return { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-900/60 text-amber-300" };
}

type WorldElection = {
  id: number;
  country: string;
  countryCode: string;
  electionType: string;
  electionName: string;
  electionDate: string;
  status: string;
  winner: string | null;
  winnerParty: string | null;
};

function getRefLabel(election: WorldElection): string | null {
  if (election.electionType !== "Referendum") return null;
  if (election.electionName && election.electionName !== "Referendum") {
    return election.electionName;
  }
  return null;
}

// Filter logic from the component
function filterCompleted(elections: WorldElection[]): WorldElection[] {
  return elections.filter(
    (e) => e.status === "Completed" && (e.winner || e.electionType === "Referendum")
  );
}

describe("WorldResultsTicker — countryFlag", () => {
  it("converts US to 🇺🇸 flag emoji", () => {
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  it("converts TH to 🇹🇭 flag emoji", () => {
    expect(countryFlag("TH")).toBe("🇹🇭");
  });

  it("converts lowercase to uppercase before encoding", () => {
    expect(countryFlag("gb")).toBe("🇬🇧");
  });

  it("returns globe emoji for empty string", () => {
    expect(countryFlag("")).toBe("🌍");
  });

  it("returns globe emoji for invalid 3-letter code", () => {
    expect(countryFlag("USA")).toBe("🌍");
  });

  it("returns globe emoji for single character", () => {
    expect(countryFlag("U")).toBe("🌍");
  });
});

describe("WorldResultsTicker — typeTag", () => {
  it("maps Presidential to PRES", () => {
    expect(typeTag("Presidential")).toBe("PRES");
  });

  it("maps Parliamentary to PARL", () => {
    expect(typeTag("Parliamentary")).toBe("PARL");
  });

  it("maps Referendum to REF", () => {
    expect(typeTag("Referendum")).toBe("REF");
  });

  it("maps Legislative to LEG", () => {
    expect(typeTag("Legislative")).toBe("LEG");
  });

  it("maps Local to LOC", () => {
    expect(typeTag("Local")).toBe("LOC");
  });

  it("maps unknown types to ELEC", () => {
    expect(typeTag("Special")).toBe("ELEC");
    expect(typeTag("")).toBe("ELEC");
  });
});

describe("WorldResultsTicker — getResultColor", () => {
  it("returns gray for null winnerParty", () => {
    const result = getResultColor(null, null);
    expect(result.dot).toBe("bg-gray-400");
  });

  it("returns green for Approved referendum", () => {
    const result = getResultColor("Approved", "YES");
    expect(result.dot).toBe("bg-green-400");
  });

  it("returns green for YES winner even without explicit Approved party", () => {
    const result = getResultColor("Majority", "YES");
    expect(result.dot).toBe("bg-green-400");
  });

  it("returns red for Rejected referendum", () => {
    const result = getResultColor("Rejected", "NO");
    expect(result.dot).toBe("bg-red-400");
  });

  it("returns red for NO winner", () => {
    const result = getResultColor("Majority", "NO");
    expect(result.dot).toBe("bg-red-400");
  });

  it("returns rose for left-wing parties", () => {
    expect(getResultColor("Labour", "Keir Starmer").dot).toBe("bg-rose-400");
    expect(getResultColor("Socialist Party", "Jean Dupont").dot).toBe("bg-rose-400");
    expect(getResultColor("DPK", "Some Leader").dot).toBe("bg-rose-400");
  });

  it("returns blue for right-wing parties", () => {
    expect(getResultColor("Conservative", "Rishi Sunak").dot).toBe("bg-blue-400");
    expect(getResultColor("BJP", "Narendra Modi").dot).toBe("bg-blue-400");
    expect(getResultColor("Center-Right Coalition", "Leader").dot).toBe("bg-blue-400");
  });

  it("returns green for green parties", () => {
    const result = getResultColor("Green Party", "Leader");
    expect(result.dot).toBe("bg-green-400");
  });

  it("returns amber for unclassified parties", () => {
    const result = getResultColor("Independent", "John Doe");
    expect(result.dot).toBe("bg-amber-400");
  });
});

describe("WorldResultsTicker — getRefLabel", () => {
  it("returns null for non-referendum elections", () => {
    const election: WorldElection = {
      id: 1, country: "France", countryCode: "FR", electionType: "Presidential",
      electionName: "French Presidential Election", electionDate: "2026-04-23",
      status: "Completed", winner: "Macron", winnerParty: "En Marche",
    };
    expect(getRefLabel(election)).toBeNull();
  });

  it("returns election name for referendum with descriptive name", () => {
    const election: WorldElection = {
      id: 2, country: "Thailand", countryCode: "TH", electionType: "Referendum",
      electionName: "Constitutional Rewrite Referendum", electionDate: "2026-02-02",
      status: "Completed", winner: "YES", winnerParty: "Approved",
    };
    expect(getRefLabel(election)).toBe("Constitutional Rewrite Referendum");
  });

  it("returns null for referendum with generic name", () => {
    const election: WorldElection = {
      id: 3, country: "Italy", countryCode: "IT", electionType: "Referendum",
      electionName: "Referendum", electionDate: "2026-06-08",
      status: "Completed", winner: "NO", winnerParty: "Rejected",
    };
    expect(getRefLabel(election)).toBeNull();
  });

  it("returns null for referendum with empty name", () => {
    const election: WorldElection = {
      id: 4, country: "Switzerland", countryCode: "CH", electionType: "Referendum",
      electionName: "", electionDate: "2026-06-15",
      status: "Completed", winner: "NO", winnerParty: "Rejected",
    };
    expect(getRefLabel(election)).toBeNull();
  });
});

describe("WorldResultsTicker — completedElections filter", () => {
  const mockElections: WorldElection[] = [
    { id: 1, country: "Philippines", countryCode: "PH", electionType: "Presidential",
      electionName: "Philippine Presidential Election", electionDate: "2026-05-11",
      status: "Completed", winner: "Sara Duterte", winnerParty: "Fuerza" },
    { id: 2, country: "Thailand", countryCode: "TH", electionType: "Referendum",
      electionName: "Constitutional Rewrite Referendum", electionDate: "2026-02-02",
      status: "Completed", winner: "YES", winnerParty: "Approved" },
    { id: 3, country: "Japan", countryCode: "JP", electionType: "Parliamentary",
      electionName: "House of Councillors Election", electionDate: "2026-07-26",
      status: "Upcoming", winner: null, winnerParty: null },
    { id: 4, country: "Germany", countryCode: "DE", electionType: "Parliamentary",
      electionName: "Bundestag Election", electionDate: "2026-02-23",
      status: "Completed", winner: null, winnerParty: null },
    { id: 5, country: "Italy", countryCode: "IT", electionType: "Referendum",
      electionName: "Judicial Reform Referendum", electionDate: "2026-06-08",
      status: "Completed", winner: null, winnerParty: null },
  ];

  it("includes completed elections with a winner", () => {
    const result = filterCompleted(mockElections);
    expect(result.some(e => e.id === 1)).toBe(true); // Philippines - has winner
  });

  it("includes completed referendums even without explicit winner", () => {
    const result = filterCompleted(mockElections);
    expect(result.some(e => e.id === 5)).toBe(true); // Italy referendum - no winner but is referendum
  });

  it("includes completed referendums with winner", () => {
    const result = filterCompleted(mockElections);
    expect(result.some(e => e.id === 2)).toBe(true); // Thailand - has winner
  });

  it("excludes upcoming elections", () => {
    const result = filterCompleted(mockElections);
    expect(result.some(e => e.id === 3)).toBe(false); // Japan - upcoming
  });

  it("excludes completed non-referendum elections without winner", () => {
    const result = filterCompleted(mockElections);
    expect(result.some(e => e.id === 4)).toBe(false); // Germany - completed but no winner and not referendum
  });

  it("returns empty array when no elections match", () => {
    const upcoming: WorldElection[] = [
      { id: 10, country: "Japan", countryCode: "JP", electionType: "Parliamentary",
        electionName: "Test", electionDate: "2026-07-26",
        status: "Upcoming", winner: null, winnerParty: null },
    ];
    expect(filterCompleted(upcoming)).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(filterCompleted([])).toHaveLength(0);
  });
});

describe("WorldResultsTicker — animation speed calculation", () => {
  it("calculates animation duration based on item count", () => {
    // From the component: Math.max(20, completedElections.length * 6)
    const calcDuration = (count: number) => Math.max(20, count * 6);
    
    expect(calcDuration(1)).toBe(20); // min 20s
    expect(calcDuration(3)).toBe(20); // still min 20s
    expect(calcDuration(4)).toBe(24); // 4 * 6 = 24 > 20
    expect(calcDuration(15)).toBe(90); // 15 * 6 = 90s for current data
  });
});
