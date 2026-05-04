import { describe, it, expect } from "vitest";

// Test the ordinal function logic (extracted for testing)
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Test Congress list generation
function generateCongresses() {
  return Array.from({ length: 31 }, (_, i) => {
    const num = 89 + i;
    const startYear = 1965 + i * 2;
    const endYear = startYear + 1;
    const endShort = String(endYear).slice(-2);
    return { number: num, label: ordinal(num), years: `${startYear}–${endShort}`, startYear };
  });
}

describe("MapComparison utilities", () => {
  it("ordinal function produces correct suffixes", () => {
    expect(ordinal(89)).toBe("89th");
    expect(ordinal(91)).toBe("91st");
    expect(ordinal(92)).toBe("92nd");
    expect(ordinal(93)).toBe("93rd");
    expect(ordinal(100)).toBe("100th");
    expect(ordinal(101)).toBe("101st");
    expect(ordinal(111)).toBe("111th");
    expect(ordinal(119)).toBe("119th");
  });

  it("generates 31 Congresses from 89th to 119th", () => {
    const congresses = generateCongresses();
    expect(congresses).toHaveLength(31);
    expect(congresses[0].number).toBe(89);
    expect(congresses[30].number).toBe(119);
  });

  it("89th Congress starts in 1965", () => {
    const congresses = generateCongresses();
    expect(congresses[0].startYear).toBe(1965);
    expect(congresses[0].years).toBe("1965–66");
  });

  it("119th Congress starts in 2025", () => {
    const congresses = generateCongresses();
    const last = congresses[congresses.length - 1];
    expect(last.startYear).toBe(2025);
    expect(last.years).toBe("2025–26");
  });

  it("Congress numbers are sequential", () => {
    const congresses = generateCongresses();
    for (let i = 1; i < congresses.length; i++) {
      expect(congresses[i].number).toBe(congresses[i - 1].number + 1);
    }
  });
});
