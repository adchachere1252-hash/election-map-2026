/**
 * Election Dates Configuration
 * 
 * This file defines all known election dates for the 2026 and 2028 cycles.
 * The AP auto-updater and Primary-to-General promotion will ONLY run during
 * the configured window on these dates (7 PM – 7 AM ET the next morning).
 * 
 * To add a new election date, simply add it to the ELECTION_DATES array.
 * Format: "YYYY-MM-DD" (the date of the election in US Eastern Time)
 */

export const ELECTION_DATES: string[] = [
  // ── 2026 Primaries ──────────────────────────────────────────────────────────
  "2026-03-03", // Texas primary
  "2026-05-05", // Indiana, Ohio primaries
  "2026-05-12", // Nebraska, West Virginia primaries
  "2026-05-19", // Georgia, Kentucky, Oregon primaries
  "2026-06-02", // California, Iowa, Montana, New Jersey, New Mexico, South Dakota primaries
  "2026-06-09", // Maine, Nevada, North Dakota, South Carolina primaries
  "2026-06-16", // Georgia runoff, Oklahoma primary, DC primaries
  "2026-06-23", // South Carolina runoff (if needed), New York, Utah primaries
  "2026-06-27", // Louisiana runoffs
  "2026-06-30", // Colorado, Mississippi primaries
  "2026-07-07", // Alabama runoff
  "2026-07-21", // Arizona primary (governor, House, state legislature)
  "2026-07-28", // South Dakota runoff
  "2026-08-04", // Kansas, Michigan, Missouri, Virginia, Washington primaries
  "2026-08-06", // Tennessee primary
  "2026-08-08", // Hawaii primary
  "2026-08-11", // Alabama (House CD-1,2,6,7), Connecticut, Minnesota, SC Senate special (R), Vermont, Wisconsin primaries
  "2026-08-18", // Alaska, Florida, Wyoming primaries
  "2026-08-25", // Oklahoma runoffs (Governor R: Drummond vs Mazzei, Senate D: Thomas vs Priest, CD-1 R: Tedford)
  "2026-09-01", // Massachusetts primary
  "2026-09-08", // New Hampshire primary
  "2026-09-09", // Rhode Island primary
  "2026-09-15", // Delaware primary

  // ── 2026 General Election ───────────────────────────────────────────────────
  "2026-11-03", // General Election Day

  // ── 2026 Runoffs (post-general) ─────────────────────────────────────────────
  "2026-12-01", // Georgia runoff (if needed)
  "2026-12-12", // Louisiana House runoff (if needed)

  // ── 2028 Presidential Primaries (major dates) ───────────────────────────────
  "2028-01-24", // Iowa caucuses (estimated)
  "2028-02-01", // New Hampshire primary (estimated)
  "2028-02-08", // Nevada caucuses (estimated)
  "2028-02-29", // South Carolina primary (estimated)
  "2028-03-05", // Super Tuesday (estimated)
  "2028-03-12", // Georgia, Mississippi, Washington primaries (estimated)
  "2028-03-19", // Arizona, Florida, Illinois, Ohio primaries (estimated)
  "2028-04-02", // Wisconsin primary (estimated)
  "2028-04-23", // New York, Pennsylvania primaries (estimated)
  "2028-06-06", // California, New Jersey primaries (estimated)

  // ── 2028 General Election ───────────────────────────────────────────────────
  "2028-11-07", // Presidential Election Day
];

/**
 * Check if the current time falls within an active election window.
 * Election window: 7 PM ET on election day → 7 AM ET the next morning (12 hours).
 * 
 * @returns { isActive: boolean, nextWindowStart?: Date }
 */
export function getElectionWindowStatus(): {
  isActive: boolean;
  currentDate: string | null;
  nextWindowStart: Date | null;
  nextWindowEnd: Date | null;
} {
  const now = new Date();

  for (const dateStr of ELECTION_DATES) {
    const [year, month, day] = dateStr.split("-").map(Number);

    // Window start: election day at 7 PM ET (23:00 UTC or 24:00 UTC depending on DST)
    // Use America/New_York timezone logic
    const windowStart = new Date(`${dateStr}T19:00:00-04:00`); // EDT (summer)
    const windowEnd = new Date(windowStart.getTime() + 12 * 60 * 60 * 1000); // +12 hours = 7 AM ET next day

    // Adjust for EST (November elections) — check if date is in Nov-Mar
    if (month >= 11 || month <= 2) {
      windowStart.setTime(new Date(`${dateStr}T19:00:00-05:00`).getTime()); // EST
      windowEnd.setTime(windowStart.getTime() + 12 * 60 * 60 * 1000);
    }

    if (now >= windowStart && now <= windowEnd) {
      return { isActive: true, currentDate: dateStr, nextWindowStart: windowStart, nextWindowEnd: windowEnd };
    }

    // Find the next upcoming window
    if (windowStart > now) {
      return { isActive: false, currentDate: null, nextWindowStart: windowStart, nextWindowEnd: windowEnd };
    }
  }

  return { isActive: false, currentDate: null, nextWindowStart: null, nextWindowEnd: null };
}

/**
 * Check if we're within 2 hours of an election window starting.
 * Used to increase polling frequency as election night approaches.
 */
export function isApproachingElectionWindow(): boolean {
  const { isActive, nextWindowStart } = getElectionWindowStatus();
  if (isActive) return true;
  if (!nextWindowStart) return false;

  const now = new Date();
  const twoHoursBefore = new Date(nextWindowStart.getTime() - 2 * 60 * 60 * 1000);
  return now >= twoHoursBefore;
}
