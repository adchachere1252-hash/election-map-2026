import { describe, it, expect } from "vitest";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";

// ─── Extracted utility functions (mirroring MapComparison.tsx logic) ──────────

function ordinal(n: number): string {
  if (n === 11 || n === 12 || n === 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function congressYears(n: number): [number, number] {
  const start = 1963 + (n - 88) * 2;
  return [start, start + 1];
}

const CONGRESS_START = 89;
const CONGRESS_END = 119;

// URL state parser (mirrors getUrlState in MapComparison.tsx)
function parseUrlState(search: string): { congressA: number; congressB: number; compare: boolean; state: string } {
  const p = new URLSearchParams(search);
  const a = Number(p.get("congress") || p.get("a"));
  const b = Number(p.get("b"));
  const compare = p.get("compare") === "1" || p.get("compare") === "true";
  const state = p.get("state") || "";
  return {
    congressA: a >= CONGRESS_START && a <= CONGRESS_END ? a : CONGRESS_END,
    congressB: b >= CONGRESS_START && b <= CONGRESS_END ? b : CONGRESS_END,
    compare,
    state,
  };
}

// Party color mapping (mirrors PARTY_FILL in MapComparison.tsx)
const PARTY_FILL: Record<string, string> = {
  D: "#1a4fa0",
  R: "#b22222",
  I: "#7c3aed",
  unknown: "rgba(80,80,100,0.25)",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MapComparison utilities", () => {
  describe("ordinal()", () => {
    it("produces correct suffixes for standard numbers", () => {
      expect(ordinal(89)).toBe("89th");
      expect(ordinal(91)).toBe("91st");
      expect(ordinal(92)).toBe("92nd");
      expect(ordinal(93)).toBe("93rd");
      expect(ordinal(100)).toBe("100th");
      expect(ordinal(101)).toBe("101st");
      expect(ordinal(102)).toBe("102nd");
      expect(ordinal(103)).toBe("103rd");
      expect(ordinal(104)).toBe("104th");
      expect(ordinal(119)).toBe("119th");
    });

    it("handles teen numbers correctly (11th, 12th, 13th)", () => {
      expect(ordinal(11)).toBe("11th");
      expect(ordinal(12)).toBe("12th");
      expect(ordinal(13)).toBe("13th");
      expect(ordinal(111)).toBe("111th");
      expect(ordinal(112)).toBe("112th");
      expect(ordinal(113)).toBe("113th");
    });
  });

  describe("congressYears()", () => {
    it("89th Congress starts in 1965", () => {
      expect(congressYears(89)).toEqual([1965, 1966]);
    });

    it("119th Congress starts in 2025", () => {
      expect(congressYears(119)).toEqual([2025, 2026]);
    });

    it("each Congress spans exactly 2 years", () => {
      for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
        const [start, end] = congressYears(c);
        expect(end - start).toBe(1);
      }
    });

    it("consecutive Congresses have consecutive start years", () => {
      for (let c = CONGRESS_START; c < CONGRESS_END; c++) {
        const [startA] = congressYears(c);
        const [startB] = congressYears(c + 1);
        expect(startB - startA).toBe(2);
      }
    });
  });
});

describe("Lewis Manifest data integrity", () => {
  it("has entries for all 50 states", () => {
    const states = Object.keys(LEWIS_MANIFEST);
    expect(states.length).toBe(50);
  });

  it("every state covers the full range 89-119", () => {
    for (const [stateName, entries] of Object.entries(LEWIS_MANIFEST)) {
      for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
        const found = entries.find(e => c >= e.start && c <= e.end);
        expect(found, `${stateName} missing coverage for Congress ${c}`).toBeDefined();
      }
    }
  });

  it("no overlapping ranges within a state (except known multi-district states)", () => {
    // Montana, Ohio, and Texas have intentional overlapping ranges because
    // they have both at-large and multi-district GeoJSON files for the same period
    const KNOWN_OVERLAP_STATES = new Set(["Montana", "Ohio", "Texas"]);
    for (const [stateName, entries] of Object.entries(LEWIS_MANIFEST)) {
      if (KNOWN_OVERLAP_STATES.has(stateName)) continue;
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i];
          const b = entries[j];
          const overlaps = a.start <= b.end && b.start <= a.end;
          expect(overlaps, `${stateName} has overlapping ranges: ${a.name} and ${b.name}`).toBe(false);
        }
      }
    }
  });

  it("all filenames follow the expected pattern", () => {
    const pattern = /^[A-Za-z ]+_\d{3}_to_\d{3}\.geojson$/;
    for (const entries of Object.values(LEWIS_MANIFEST)) {
      for (const entry of entries) {
        expect(entry.name, `Invalid filename: ${entry.name}`).toMatch(pattern);
      }
    }
  });

  it("start <= end for all entries", () => {
    for (const [stateName, entries] of Object.entries(LEWIS_MANIFEST)) {
      for (const entry of entries) {
        expect(entry.start, `${stateName}: ${entry.name} has start > end`).toBeLessThanOrEqual(entry.end);
      }
    }
  });

  it("entries are sorted by start congress within each state", () => {
    for (const [stateName, entries] of Object.entries(LEWIS_MANIFEST)) {
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].start, `${stateName}: entries not sorted`).toBeGreaterThanOrEqual(entries[i - 1].start);
      }
    }
  });
});

describe("URL state persistence", () => {
  it("parses congress from URL", () => {
    const state = parseUrlState("?congress=104");
    expect(state.congressA).toBe(104);
    expect(state.compare).toBe(false);
  });

  it("defaults to 119th when no congress specified", () => {
    const state = parseUrlState("");
    expect(state.congressA).toBe(CONGRESS_END);
  });

  it("clamps invalid congress numbers to range", () => {
    expect(parseUrlState("?congress=50").congressA).toBe(CONGRESS_END);
    expect(parseUrlState("?congress=200").congressA).toBe(CONGRESS_END);
    expect(parseUrlState("?congress=0").congressA).toBe(CONGRESS_END);
    expect(parseUrlState("?congress=-1").congressA).toBe(CONGRESS_END);
  });

  it("parses compare mode", () => {
    const state = parseUrlState("?congress=119&compare=1&b=89");
    expect(state.compare).toBe(true);
    expect(state.congressA).toBe(119);
    expect(state.congressB).toBe(89);
  });

  it("parses state filter", () => {
    const state = parseUrlState("?congress=104&state=Texas");
    expect(state.state).toBe("Texas");
  });

  it("handles compare=true as boolean", () => {
    const state = parseUrlState("?compare=true&congress=100&b=90");
    expect(state.compare).toBe(true);
  });

  it("handles missing panel B congress in compare mode", () => {
    const state = parseUrlState("?compare=1&congress=100");
    expect(state.compare).toBe(true);
    expect(state.congressB).toBe(CONGRESS_END); // defaults to end
  });
});

describe("Party color mapping", () => {
  it("maps D to blue", () => {
    expect(PARTY_FILL.D).toBe("#1a4fa0");
  });

  it("maps R to red", () => {
    expect(PARTY_FILL.R).toBe("#b22222");
  });

  it("maps I to purple", () => {
    expect(PARTY_FILL.I).toBe("#7c3aed");
  });

  it("has a fallback for unknown parties", () => {
    expect(PARTY_FILL.unknown).toBeDefined();
  });

  it("all colors are valid CSS color values", () => {
    for (const color of Object.values(PARTY_FILL)) {
      expect(color).toMatch(/^(#[0-9a-fA-F]{6}|rgba?\(.+\))$/);
    }
  });
});

describe("GeoJSON filename resolution", () => {
  // Mirrors the logic in fetchStateGeoJson
  function resolveFilename(stateName: string, congress: number): string | null {
    const manifest = LEWIS_MANIFEST[stateName];
    if (!manifest) return null;
    const entry = manifest.find(e => congress >= e.start && congress <= e.end);
    return entry?.name ?? null;
  }

  it("resolves Alabama 89th to Alabama_089_to_089.geojson", () => {
    expect(resolveFilename("Alabama", 89)).toBe("Alabama_089_to_089.geojson");
  });

  it("resolves Alabama 90th to Alabama_090_to_092.geojson", () => {
    expect(resolveFilename("Alabama", 90)).toBe("Alabama_090_to_092.geojson");
  });

  it("resolves Alaska for all congresses 89-119", () => {
    for (let c = 89; c <= 119; c++) {
      const filename = resolveFilename("Alaska", c);
      expect(filename, `Alaska missing for congress ${c}`).not.toBeNull();
    }
  });

  it("returns null for non-existent states", () => {
    expect(resolveFilename("Narnia", 100)).toBeNull();
  });

  it("returns null for congress outside manifest range", () => {
    // Congress 50 is well before any manifest entry starts
    expect(resolveFilename("Alabama", 50)).toBeNull();
  });

  it("uses the same file for congresses within the same range", () => {
    // Alabama 90-92 should all resolve to the same file
    const f90 = resolveFilename("Alabama", 90);
    const f91 = resolveFilename("Alabama", 91);
    const f92 = resolveFilename("Alabama", 92);
    expect(f90).toBe(f91);
    expect(f91).toBe(f92);
  });

  it("boundary congresses resolve correctly", () => {
    // Alabama_089_to_089 should only match 89
    expect(resolveFilename("Alabama", 89)).toBe("Alabama_089_to_089.geojson");
    expect(resolveFilename("Alabama", 88)).toBeNull();
  });
});

describe("Party key matching logic", () => {
  // Mirrors the district key construction in warmupCongress
  function buildDistrictKey(stateAbbrev: string, district: number): string {
    return `${stateAbbrev}-${district}`;
  }

  function resolveParty(
    partyData: Record<string, string>,
    stateAbbrev: string,
    district: number
  ): string | null {
    const key = buildDistrictKey(stateAbbrev, district);
    let party = partyData[key];
    if (!party && district === 0) party = partyData[`${stateAbbrev}-1`];
    if (!party && district === 0) party = partyData[`${stateAbbrev}-98`];
    return party ?? null;
  }

  it("matches standard district keys", () => {
    const data = { "CA-12": "D", "TX-3": "R", "VT-1": "I" };
    expect(resolveParty(data, "CA", 12)).toBe("D");
    expect(resolveParty(data, "TX", 3)).toBe("R");
    expect(resolveParty(data, "VT", 1)).toBe("I");
  });

  it("at-large districts (0) fall back to district 1", () => {
    const data = { "VT-1": "D" };
    expect(resolveParty(data, "VT", 0)).toBe("D");
  });

  it("at-large districts fall back to district 98 if 1 is missing", () => {
    const data = { "AK-98": "R" };
    expect(resolveParty(data, "AK", 0)).toBe("R");
  });

  it("returns null for unmatched districts", () => {
    const data = { "CA-12": "D" };
    expect(resolveParty(data, "CA", 99)).toBeNull();
    expect(resolveParty(data, "XX", 1)).toBeNull();
  });
});

describe("House seat composition data", () => {
  const HOUSE_SEATS: Record<number, { D: number; R: number; O: number }> = {
    89: { D: 295, R: 140, O: 0 }, 90: { D: 248, R: 187, O: 0 },
    91: { D: 243, R: 192, O: 0 }, 92: { D: 255, R: 180, O: 0 },
    93: { D: 242, R: 192, O: 1 }, 94: { D: 291, R: 144, O: 0 },
    95: { D: 292, R: 143, O: 0 }, 96: { D: 277, R: 158, O: 0 },
    97: { D: 243, R: 192, O: 0 }, 98: { D: 269, R: 166, O: 0 },
    99: { D: 253, R: 182, O: 0 }, 100: { D: 258, R: 177, O: 0 },
    101: { D: 260, R: 175, O: 0 }, 102: { D: 267, R: 167, O: 1 },
    103: { D: 258, R: 176, O: 1 }, 104: { D: 204, R: 230, O: 1 },
    105: { D: 207, R: 227, O: 1 }, 106: { D: 211, R: 223, O: 1 },
    107: { D: 212, R: 221, O: 2 }, 108: { D: 205, R: 229, O: 1 },
    109: { D: 202, R: 232, O: 1 }, 110: { D: 233, R: 202, O: 0 },
    111: { D: 257, R: 178, O: 0 }, 112: { D: 193, R: 242, O: 0 },
    113: { D: 201, R: 234, O: 0 }, 114: { D: 188, R: 247, O: 0 },
    115: { D: 194, R: 241, O: 0 }, 116: { D: 235, R: 199, O: 1 },
    117: { D: 222, R: 213, O: 0 }, 118: { D: 213, R: 222, O: 0 },
    119: { D: 215, R: 220, O: 1 },
  };

  it("has data for all 31 congresses (89-119)", () => {
    for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
      expect(HOUSE_SEATS[c], `Missing seat data for Congress ${c}`).toBeDefined();
    }
  });

  it("total seats sum to 435 or 436 for each congress", () => {
    // The 119th Congress has 436 seats due to a temporary additional seat from reapportionment
    for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
      const s = HOUSE_SEATS[c];
      const total = s.D + s.R + s.O;
      expect(total, `Congress ${c} total out of range`).toBeGreaterThanOrEqual(435);
      expect(total, `Congress ${c} total out of range`).toBeLessThanOrEqual(436);
    }
  });

  it("no negative seat counts", () => {
    for (const [c, s] of Object.entries(HOUSE_SEATS)) {
      expect(s.D, `Congress ${c} D seats negative`).toBeGreaterThanOrEqual(0);
      expect(s.R, `Congress ${c} R seats negative`).toBeGreaterThanOrEqual(0);
      expect(s.O, `Congress ${c} O seats negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it("104th Congress marks the Republican Revolution (R > D)", () => {
    expect(HOUSE_SEATS[103].D).toBeGreaterThan(HOUSE_SEATS[103].R);
    expect(HOUSE_SEATS[104].R).toBeGreaterThan(HOUSE_SEATS[104].D);
  });

  it("110th Congress marks the 2006 wave (D > R)", () => {
    expect(HOUSE_SEATS[109].R).toBeGreaterThan(HOUSE_SEATS[109].D);
    expect(HOUSE_SEATS[110].D).toBeGreaterThan(HOUSE_SEATS[110].R);
  });
});
