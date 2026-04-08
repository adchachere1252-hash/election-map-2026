// ─── Rating color utilities ───────────────────────────────────────────────────
export type Rating = "Solid D" | "Lean D" | "Toss-up" | "Lean R" | "Solid R" | null | undefined;
export type Party = "D" | "R" | "I" | "L" | "G" | null | undefined;
export type RaceStatus = "Scheduled" | "Primary" | "General" | "Called" | "Certified" | null | undefined;

export const RATING_COLORS: Record<string, string> = {
  "Solid D": "#1a4fa0",
  "Lean D": "#5b8fd4",
  "Toss-up": "#c8a951",
  "Lean R": "#d96b4a",
  "Solid R": "#b22222",
};

export const RATING_TEXT_COLORS: Record<string, string> = {
  "Solid D": "#ffffff",
  "Lean D": "#ffffff",
  "Toss-up": "#1a1a1a",
  "Lean R": "#ffffff",
  "Solid R": "#ffffff",
};

export const PARTY_COLORS: Record<string, string> = {
  D: "#1a4fa0",
  R: "#b22222",
  I: "#8b6914",
};

export const PARTY_LABELS: Record<string, string> = {
  D: "Democrat",
  R: "Republican",
  I: "Independent",
  L: "Libertarian",
  G: "Green",
};

export function getRatingColor(rating: Rating): string {
  if (!rating) return "#2a2f3a";
  return RATING_COLORS[rating] ?? "#2a2f3a";
}

export function getPartyColor(party: Party): string {
  if (!party) return "#2a2f3a";
  return PARTY_COLORS[party] ?? "#888888";
}

export function getRatingClass(rating: Rating): string {
  if (!rating) return "";
  const map: Record<string, string> = {
    "Solid D": "rating-solid-d",
    "Lean D": "rating-lean-d",
    "Toss-up": "rating-toss-up",
    "Lean R": "rating-lean-r",
    "Solid R": "rating-solid-r",
  };
  return map[rating] ?? "";
}

export function getStatusColor(status: RaceStatus): string {
  const map: Record<string, string> = {
    Scheduled: "#4a5568",
    Primary: "#805ad5",
    General: "#2b6cb0",
    Called: "#276749",
    Certified: "#22543d",
  };
  return status ? (map[status] ?? "#4a5568") : "#4a5568";
}

export function getStatusLabel(status: RaceStatus): string {
  return status ?? "Scheduled";
}

export function formatVotePct(pct: string | number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  const num = typeof pct === "string" ? parseFloat(pct) : pct;
  if (isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

export function formatVoteCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return "0";
  return count.toLocaleString();
}

export function getPartyLabel(party: Party): string {
  if (!party) return "Unknown";
  return PARTY_LABELS[party] ?? party;
}

// ─── State name → code mapping ────────────────────────────────────────────────
export const STATE_CODES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};

export const CODE_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name])
);
