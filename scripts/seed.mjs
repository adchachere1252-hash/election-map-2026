import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// ─── Senate Races ─────────────────────────────────────────────────────────────
const senateRaces = [
  // Class 2 Regular Elections
  { stateCode: "AL", stateName: "Alabama", incumbent: "Tommy Tuberville", incumbentParty: "R", incumbentRetiring: true, rating: "Solid R", primaryDate: "May 19, 2026", primaryRunoffDate: "Jun 16, 2026", notes: "Tuberville running for governor" },
  { stateCode: "AK", stateName: "Alaska", incumbent: "Daniel S. Sullivan", incumbentParty: "R", incumbentRetiring: false, rating: "Lean R", primaryDate: "Aug 18, 2026" },
  { stateCode: "AR", stateName: "Arkansas", incumbent: "Tom Cotton", incumbentParty: "R", incumbentRetiring: false, candidate1Name: "Tom Cotton", candidate1Party: "R", candidate2Name: "Hallie Shoffner", candidate2Party: "D", rating: "Solid R", primaryDate: "Mar 3, 2026", primaryRunoffDate: "Mar 31, 2026", status: "General" },
  { stateCode: "CO", stateName: "Colorado", incumbent: "John Hickenlooper", incumbentParty: "D", incumbentRetiring: false, rating: "Lean D", primaryDate: "Jun 30, 2026" },
  { stateCode: "DE", stateName: "Delaware", incumbent: "Chris Coons", incumbentParty: "D", incumbentRetiring: false, rating: "Solid D", primaryDate: "Sep 15, 2026" },
  { stateCode: "GA", stateName: "Georgia", incumbent: "Jon Ossoff", incumbentParty: "D", incumbentRetiring: false, rating: "Toss-up", primaryDate: "May 19, 2026", primaryRunoffDate: "Jun 16, 2026" },
  { stateCode: "ID", stateName: "Idaho", incumbent: "Jim Risch", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "May 19, 2026" },
  { stateCode: "IL", stateName: "Illinois", incumbent: "Dick Durbin", incumbentParty: "D", incumbentRetiring: true, rating: "Solid D", primaryDate: "Mar 17, 2026" },
  { stateCode: "IA", stateName: "Iowa", incumbent: "Joni Ernst", incumbentParty: "R", incumbentRetiring: true, rating: "Lean R", primaryDate: "Jun 2, 2026" },
  { stateCode: "KS", stateName: "Kansas", incumbent: "Roger Marshall", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Aug 4, 2026" },
  { stateCode: "KY", stateName: "Kentucky", incumbent: "Mitch McConnell", incumbentParty: "R", incumbentRetiring: true, rating: "Solid R", primaryDate: "May 19, 2026" },
  { stateCode: "LA", stateName: "Louisiana", incumbent: "Bill Cassidy", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "May 16, 2026", primaryRunoffDate: "Jun 27, 2026" },
  { stateCode: "ME", stateName: "Maine", incumbent: "Susan Collins", incumbentParty: "R", incumbentRetiring: false, rating: "Lean R", primaryDate: "Jun 9, 2026", notes: "Only R-held seat in Harris-won state" },
  { stateCode: "MA", stateName: "Massachusetts", incumbent: "Edward Markey", incumbentParty: "D", incumbentRetiring: false, rating: "Solid D", primaryDate: "Sep 1, 2026" },
  { stateCode: "MI", stateName: "Michigan", incumbent: "Gary Peters", incumbentParty: "D", incumbentRetiring: true, rating: "Toss-up", primaryDate: "Aug 4, 2026", notes: "Peters not seeking reelection; Trump won state by <3pts in 2024" },
  { stateCode: "MN", stateName: "Minnesota", incumbent: "Tina Smith", incumbentParty: "D", incumbentRetiring: true, rating: "Lean D", primaryDate: "Aug 11, 2026" },
  { stateCode: "MS", stateName: "Mississippi", incumbent: "Cindy Hyde-Smith", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Mar 10, 2026", primaryRunoffDate: "Apr 7, 2026" },
  { stateCode: "MT", stateName: "Montana", incumbent: "Steve Daines", incumbentParty: "R", incumbentRetiring: true, rating: "Lean R", primaryDate: "Jun 2, 2026" },
  { stateCode: "NE", stateName: "Nebraska", incumbent: "Pete Ricketts", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "May 12, 2026" },
  { stateCode: "NH", stateName: "New Hampshire", incumbent: "Jeanne Shaheen", incumbentParty: "D", incumbentRetiring: true, rating: "Lean D", primaryDate: "Sep 8, 2026" },
  { stateCode: "NJ", stateName: "New Jersey", incumbent: "Cory Booker", incumbentParty: "D", incumbentRetiring: false, rating: "Lean D", primaryDate: "Jun 2, 2026" },
  { stateCode: "NM", stateName: "New Mexico", incumbent: "Ben Ray Luján", incumbentParty: "D", incumbentRetiring: false, rating: "Lean D", primaryDate: "Jun 2, 2026" },
  { stateCode: "NC", stateName: "North Carolina", incumbent: "Thom Tillis", incumbentParty: "R", incumbentRetiring: true, rating: "Toss-up", primaryDate: "Mar 3, 2026", notes: "Tillis retiring; Trump won state by single digits in 2024" },
  { stateCode: "OK", stateName: "Oklahoma", incumbent: "Markwayne Mullin", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Jun 16, 2026", primaryRunoffDate: "Aug 25, 2026", notes: "Alan Armstrong (R) also retiring" },
  { stateCode: "OR", stateName: "Oregon", incumbent: "Jeff Merkley", incumbentParty: "D", incumbentRetiring: false, rating: "Solid D", primaryDate: "May 19, 2026" },
  { stateCode: "RI", stateName: "Rhode Island", incumbent: "Jack Reed", incumbentParty: "D", incumbentRetiring: false, rating: "Solid D", primaryDate: "Sep 8, 2026" },
  { stateCode: "SC", stateName: "South Carolina", incumbent: "Lindsey Graham", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Jun 9, 2026" },
  { stateCode: "SD", stateName: "South Dakota", incumbent: "Mike Rounds", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Jun 2, 2026", primaryRunoffDate: "Jul 28, 2026" },
  { stateCode: "TN", stateName: "Tennessee", incumbent: "Bill Hagerty", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "Aug 6, 2026" },
  { stateCode: "TX", stateName: "Texas", incumbent: "John Cornyn", incumbentParty: "R", incumbentRetiring: false, rating: "Lean R", primaryDate: "Mar 3, 2026", primaryRunoffDate: "May 26, 2026" },
  { stateCode: "VA", stateName: "Virginia", incumbent: "Mark Warner", incumbentParty: "D", incumbentRetiring: false, rating: "Lean D", primaryDate: "Aug 4, 2026" },
  { stateCode: "WV", stateName: "West Virginia", incumbent: "Shelley Moore Capito", incumbentParty: "R", incumbentRetiring: false, rating: "Solid R", primaryDate: "May 12, 2026" },
  { stateCode: "WY", stateName: "Wyoming", incumbent: "Cynthia Lummis", incumbentParty: "R", incumbentRetiring: true, rating: "Solid R", primaryDate: "Aug 18, 2026" },
  // Special Elections
  { stateCode: "FL", stateName: "Florida", isSpecial: true, specialNote: "Special election to fill Marco Rubio's seat (resigned to become Secretary of State)", incumbent: "Ashley Moody (appointed)", incumbentParty: "R", rating: "Lean R", primaryDate: "Aug 18, 2026", notes: "Fills remainder of Rubio's term through Jan 2029" },
  { stateCode: "OH", stateName: "Ohio", isSpecial: true, specialNote: "Special election to fill J.D. Vance's seat (resigned to become Vice President)", incumbent: "Jon Husted (appointed)", incumbentParty: "R", rating: "Lean R", primaryDate: "May 5, 2026", notes: "Fills remainder of Vance's term through Jan 2029" },
];

// ─── Redistricting States ─────────────────────────────────────────────────────
const redistrictingData = [
  { stateCode: "CA", stateName: "California", enacted: true, reason: "Voluntary redistricting", status: "Voters approved new map on Nov. 4, 2025", method: "Commission", delegationBefore: "43 D - 9 R", projectedImpact: "+5 D" },
  { stateCode: "MO", stateName: "Missouri", enacted: true, reason: "Voluntary redistricting", status: "Gov. Mike Kehoe (R) signed new map into law on Sept. 28, 2025", method: "Legislature-dominant", delegationBefore: "6 R - 2 D", projectedImpact: "+1 R" },
  { stateCode: "NC", stateName: "North Carolina", enacted: true, reason: "Voluntary redistricting", status: "Legislature passed new map into law on Oct. 22, 2025", method: "Legislature-dominant", delegationBefore: "10 R - 4 D", projectedImpact: "+1 R" },
  { stateCode: "OH", stateName: "Ohio", enacted: true, reason: "Required by law to redistrict", status: "Redistricting commission approved new map on Oct. 31, 2025", method: "Legislature-dominant", delegationBefore: "10 R - 5 D", projectedImpact: "+2 R" },
  { stateCode: "TX", stateName: "Texas", enacted: true, reason: "Voluntary redistricting", status: "U.S. Supreme Court ruled new Texas map can be used in 2026", method: "Legislature-dominant", delegationBefore: "25 R - 12 D (1 vacancy)", projectedImpact: "+5 R" },
  { stateCode: "UT", stateName: "Utah", enacted: true, reason: "Changed due to litigation", status: "Court approved new plaintiff-submitted map", method: "Legislature-dominant", delegationBefore: "4 R - 0 D", projectedImpact: "+1 D" },
  { stateCode: "FL", stateName: "Florida", enacted: false, reason: "Voluntary redistricting", status: "Special session to occur April 2026", method: "Legislature-dominant", delegationBefore: "20 R - 8 D", projectedImpact: "TBD" },
  { stateCode: "GA", stateName: "Georgia", enacted: false, reason: "Subject to change due to litigation", status: "Litigation ongoing", method: "Legislature-dominant", delegationBefore: "9 R - 5 D", projectedImpact: "TBD", litigationNotes: "Congressional map subject to change due to ongoing litigation" },
  { stateCode: "LA", stateName: "Louisiana", enacted: false, reason: "Subject to change due to litigation", status: "Litigation ongoing", method: "Legislature-dominant", delegationBefore: "4 R - 2 D", projectedImpact: "TBD", litigationNotes: "Congressional map subject to change due to ongoing litigation" },
  { stateCode: "MD", stateName: "Maryland", enacted: false, reason: "Voluntary redistricting", status: "House approved new map", method: "Legislature-dominant", delegationBefore: "7 D - 1 R", projectedImpact: "TBD" },
  { stateCode: "NY", stateName: "New York", enacted: false, reason: "Subject to change due to litigation", status: "Litigation ongoing", method: "Hybrid", delegationBefore: "19 D - 7 R", projectedImpact: "TBD", litigationNotes: "Congressional map subject to change due to ongoing litigation" },
  { stateCode: "VA", stateName: "Virginia", enacted: false, reason: "Voluntary redistricting", status: "Constitutional amendment pending voter approval (April 21, 2026 referendum)", method: "Hybrid", delegationBefore: "6 D - 5 R", projectedImpact: "TBD", litigationNotes: "Voters deciding April 21 whether to allow General Assembly to temporarily adopt new congressional districts" },
];

// ─── Virginia Referendum ──────────────────────────────────────────────────────
const referendumData = {
  stateCode: "VA",
  stateName: "Virginia",
  name: "Virginia Congressional Redistricting Amendment",
  description: "Should the Constitution of Virginia be amended to allow the General Assembly to temporarily adopt new congressional districts to replace those drawn by the Virginia Redistricting Commission, in response to congressional redistricting actions taken by other states?",
  yesLabel: "Yes — Allow General Assembly to redraw congressional districts",
  noLabel: "No — Keep current Redistricting Commission authority",
  electionDate: "April 21, 2026",
  status: "Scheduled",
  notes: "A YES vote allows the Democratic-controlled General Assembly to redraw congressional maps. A NO vote keeps the current independent commission process.",
};

// ─── House Races (all 435) ────────────────────────────────────────────────────
// State district counts based on 2020 apportionment
const stateDistricts = {
  AL: { name: "Alabama", districts: 7, primaryDate: "May 19, 2026" },
  AK: { name: "Alaska", districts: 1, primaryDate: "Aug 18, 2026", atLarge: true },
  AZ: { name: "Arizona", districts: 9, primaryDate: "Jul 21, 2026" },
  AR: { name: "Arkansas", districts: 4, primaryDate: "Mar 3, 2026" },
  CA: { name: "California", districts: 52, primaryDate: "Jun 2, 2026" },
  CO: { name: "Colorado", districts: 8, primaryDate: "Jun 30, 2026" },
  CT: { name: "Connecticut", districts: 5, primaryDate: "Aug 11, 2026" },
  DE: { name: "Delaware", districts: 1, primaryDate: "Sep 15, 2026", atLarge: true },
  FL: { name: "Florida", districts: 28, primaryDate: "Aug 18, 2026" },
  GA: { name: "Georgia", districts: 14, primaryDate: "May 19, 2026" },
  HI: { name: "Hawaii", districts: 2, primaryDate: "Aug 8, 2026" },
  ID: { name: "Idaho", districts: 2, primaryDate: "May 19, 2026" },
  IL: { name: "Illinois", districts: 17, primaryDate: "Mar 17, 2026" },
  IN: { name: "Indiana", districts: 9, primaryDate: "May 5, 2026" },
  IA: { name: "Iowa", districts: 4, primaryDate: "Jun 2, 2026" },
  KS: { name: "Kansas", districts: 4, primaryDate: "Aug 4, 2026" },
  KY: { name: "Kentucky", districts: 6, primaryDate: "May 19, 2026" },
  LA: { name: "Louisiana", districts: 6, primaryDate: "May 16, 2026" },
  ME: { name: "Maine", districts: 2, primaryDate: "Jun 9, 2026" },
  MD: { name: "Maryland", districts: 8, primaryDate: "Jun 23, 2026" },
  MA: { name: "Massachusetts", districts: 9, primaryDate: "Sep 1, 2026" },
  MI: { name: "Michigan", districts: 13, primaryDate: "Aug 4, 2026" },
  MN: { name: "Minnesota", districts: 8, primaryDate: "Aug 11, 2026" },
  MS: { name: "Mississippi", districts: 4, primaryDate: "Mar 10, 2026" },
  MO: { name: "Missouri", districts: 8, primaryDate: "Aug 4, 2026" },
  MT: { name: "Montana", districts: 2, primaryDate: "Jun 2, 2026" },
  NE: { name: "Nebraska", districts: 3, primaryDate: "May 12, 2026" },
  NV: { name: "Nevada", districts: 4, primaryDate: "Jun 9, 2026" },
  NH: { name: "New Hampshire", districts: 2, primaryDate: "Sep 8, 2026" },
  NJ: { name: "New Jersey", districts: 12, primaryDate: "Jun 2, 2026" },
  NM: { name: "New Mexico", districts: 3, primaryDate: "Jun 2, 2026" },
  NY: { name: "New York", districts: 26, primaryDate: "Jun 23, 2026" },
  NC: { name: "North Carolina", districts: 14, primaryDate: "Mar 3, 2026" },
  ND: { name: "North Dakota", districts: 1, primaryDate: "Jun 9, 2026", atLarge: true },
  OH: { name: "Ohio", districts: 15, primaryDate: "May 5, 2026" },
  OK: { name: "Oklahoma", districts: 5, primaryDate: "Jun 16, 2026" },
  OR: { name: "Oregon", districts: 6, primaryDate: "May 19, 2026" },
  PA: { name: "Pennsylvania", districts: 17, primaryDate: "May 19, 2026" },
  RI: { name: "Rhode Island", districts: 2, primaryDate: "Sep 8, 2026" },
  SC: { name: "South Carolina", districts: 7, primaryDate: "Jun 9, 2026" },
  SD: { name: "South Dakota", districts: 1, primaryDate: "Jun 2, 2026", atLarge: true },
  TN: { name: "Tennessee", districts: 9, primaryDate: "Aug 6, 2026" },
  TX: { name: "Texas", districts: 38, primaryDate: "Mar 3, 2026" },
  UT: { name: "Utah", districts: 4, primaryDate: "Jun 23, 2026" },
  VT: { name: "Vermont", districts: 1, primaryDate: "Aug 11, 2026", atLarge: true },
  VA: { name: "Virginia", districts: 11, primaryDate: "Aug 4, 2026" },
  WA: { name: "Washington", districts: 10, primaryDate: "Aug 4, 2026" },
  WV: { name: "West Virginia", districts: 2, primaryDate: "May 12, 2026" },
  WI: { name: "Wisconsin", districts: 8, primaryDate: "Aug 11, 2026" },
  WY: { name: "Wyoming", districts: 1, primaryDate: "Aug 18, 2026", atLarge: true },
};

// Incumbent data for notable/competitive House seats
// Party ratings based on current Cook Political / Sabato data
const houseIncumbents = {
  // Alabama
  "AL-1": { incumbent: "Barry Moore", party: "R", rating: "Solid R" },
  "AL-2": { incumbent: "Barry Moore (redistricted)", party: "R", rating: "Solid R" },
  "AL-3": { incumbent: "Mike Rogers", party: "R", rating: "Solid R" },
  "AL-4": { incumbent: "Robert Aderholt", party: "R", rating: "Solid R" },
  "AL-5": { incumbent: "Dale Strong", party: "R", rating: "Solid R" },
  "AL-6": { incumbent: "Gary Palmer", party: "R", rating: "Solid R" },
  "AL-7": { incumbent: "Terri Sewell", party: "D", rating: "Solid D" },
  // Alaska
  "AK-AL": { incumbent: "Mary Peltola", party: "D", rating: "Lean D" },
  // Arizona
  "AZ-1": { incumbent: "David Schweikert", party: "R", rating: "Toss-up" },
  "AZ-2": { incumbent: "Tom O'Halleran (open)", party: "D", rating: "Lean D" },
  "AZ-3": { incumbent: "Ruben Gallego (Senate)", party: "D", rating: "Solid D" },
  "AZ-4": { incumbent: "Greg Stanton", party: "D", rating: "Lean D" },
  "AZ-5": { incumbent: "Andy Biggs", party: "R", rating: "Solid R" },
  "AZ-6": { incumbent: "Juan Ciscomani", party: "R", rating: "Lean R" },
  "AZ-7": { incumbent: "Raúl Grijalva", party: "D", rating: "Solid D" },
  "AZ-8": { incumbent: "Debbie Lesko (retired)", party: "R", rating: "Solid R" },
  "AZ-9": { incumbent: "Paul Gosar", party: "R", rating: "Solid R" },
  // California (selected key seats)
  "CA-1": { incumbent: "Doug LaMalfa", party: "R", rating: "Solid R" },
  "CA-2": { incumbent: "Jared Huffman", party: "D", rating: "Solid D" },
  "CA-3": { incumbent: "Kevin Kiley", party: "R", rating: "Lean R" },
  "CA-4": { incumbent: "Mike Thompson", party: "D", rating: "Solid D" },
  "CA-5": { incumbent: "Tom McClintock", party: "R", rating: "Solid R" },
  "CA-6": { incumbent: "Ami Bera", party: "D", rating: "Solid D" },
  "CA-7": { incumbent: "Doris Matsui", party: "D", rating: "Solid D" },
  "CA-8": { incumbent: "John Garamendi", party: "D", rating: "Solid D" },
  "CA-9": { incumbent: "Josh Harder", party: "D", rating: "Lean D" },
  "CA-10": { incumbent: "Mark DeSaulnier", party: "D", rating: "Solid D" },
  "CA-13": { incumbent: "John Duarte", party: "R", rating: "Toss-up" },
  "CA-22": { incumbent: "David Valadao", party: "R", rating: "Lean R" },
  "CA-27": { incumbent: "Mike Garcia", party: "R", rating: "Lean R" },
  "CA-41": { incumbent: "Ken Calvert", party: "R", rating: "Lean R" },
  "CA-45": { incumbent: "Michelle Steel", party: "R", rating: "Lean R" },
  "CA-47": { incumbent: "Dave Min", party: "D", rating: "Lean D" },
  // Colorado
  "CO-3": { incumbent: "Jeff Hurd", party: "R", rating: "Lean R" },
  "CO-8": { incumbent: "Yadira Caraveo", party: "D", rating: "Toss-up" },
  // Georgia
  "GA-6": { incumbent: "Rich McCormick", party: "R", rating: "Lean R" },
  "GA-7": { incumbent: "Lucy McBath", party: "D", rating: "Lean D" },
  // Iowa
  "IA-1": { incumbent: "Mariannette Miller-Meeks", party: "R", rating: "Lean R" },
  "IA-3": { incumbent: "Zach Nunn", party: "R", rating: "Toss-up" },
  // Maine
  "ME-2": { incumbent: "Jared Golden", party: "D", rating: "Lean D" },
  // Michigan
  "MI-7": { incumbent: "Tom Barrett", party: "R", rating: "Lean R" },
  "MI-8": { incumbent: "Dan Kildee (retired)", party: "D", rating: "Lean D" },
  // Nevada
  "NV-1": { incumbent: "Dina Titus", party: "D", rating: "Solid D" },
  "NV-3": { incumbent: "Susie Lee", party: "D", rating: "Lean D" },
  "NV-4": { incumbent: "Steven Horsford", party: "D", rating: "Lean D" },
  // New Hampshire
  "NH-1": { incumbent: "Chris Pappas", party: "D", rating: "Lean D" },
  // New Mexico
  "NM-2": { incumbent: "Gabe Vasquez", party: "D", rating: "Lean D" },
  // New York
  "NY-1": { incumbent: "Nick LaLota", party: "R", rating: "Lean R" },
  "NY-3": { incumbent: "George Santos (expelled)", party: "R", rating: "Toss-up" },
  "NY-4": { incumbent: "Anthony D'Esposito", party: "R", rating: "Lean R" },
  "NY-17": { incumbent: "Mike Lawler", party: "R", rating: "Lean R" },
  "NY-18": { incumbent: "Pat Ryan", party: "D", rating: "Lean D" },
  "NY-22": { incumbent: "Brandon Williams", party: "R", rating: "Toss-up" },
  // North Carolina
  "NC-1": { incumbent: "Don Davis", party: "D", rating: "Toss-up" },
  "NC-6": { incumbent: "Jeff Jackson (AG)", party: "D", rating: "Lean D" },
  "NC-13": { incumbent: "Jeff Jackson (open)", party: "D", rating: "Lean D" },
  // Ohio
  "OH-1": { incumbent: "Greg Landsman", party: "D", rating: "Lean D" },
  "OH-9": { incumbent: "Marcy Kaptur", party: "D", rating: "Lean D" },
  "OH-13": { incumbent: "Emilia Sykes", party: "D", rating: "Lean D" },
  // Oregon
  "OR-5": { incumbent: "Lori Chavez-DeRemer (Cabinet)", party: "R", rating: "Toss-up" },
  "OR-6": { incumbent: "Andrea Salinas", party: "D", rating: "Lean D" },
  // Pennsylvania
  "PA-7": { incumbent: "Susan Wild", party: "D", rating: "Lean D" },
  "PA-8": { incumbent: "Matt Cartwright", party: "D", rating: "Lean D" },
  "PA-10": { incumbent: "Scott Perry", party: "R", rating: "Lean R" },
  "PA-17": { incumbent: "Chris Deluzio", party: "D", rating: "Lean D" },
  // Texas
  "TX-15": { incumbent: "Monica De La Cruz", party: "R", rating: "Lean R" },
  "TX-28": { incumbent: "Henry Cuellar", party: "D", rating: "Toss-up" },
  // Virginia
  "VA-2": { incumbent: "Jen Kiggans", party: "R", rating: "Lean R" },
  "VA-7": { incumbent: "Abigail Spanberger (Gov)", party: "D", rating: "Toss-up" },
  "VA-10": { incumbent: "Jennifer Wexton (retired)", party: "D", rating: "Lean D" },
  // Washington
  "WA-3": { incumbent: "Marie Gluesenkamp Perez", party: "D", rating: "Lean D" },
  "WA-8": { incumbent: "Kim Schrier", party: "D", rating: "Lean D" },
  // Wisconsin
  "WI-3": { incumbent: "Derrick Van Orden", party: "R", rating: "Lean R" },
};

// Default party/rating by state for unspecified districts
const stateDefaultParty = {
  AL: "R", AK: "D", AZ: "R", AR: "R", CA: "D", CO: "D", CT: "D", DE: "D",
  FL: "R", GA: "R", HI: "D", ID: "R", IL: "D", IN: "R", IA: "R", KS: "R",
  KY: "R", LA: "R", ME: "D", MD: "D", MA: "D", MI: "D", MN: "D", MS: "R",
  MO: "R", MT: "R", NE: "R", NV: "D", NH: "D", NJ: "D", NM: "D", NY: "D",
  NC: "R", ND: "R", OH: "R", OK: "R", OR: "D", PA: "R", RI: "D", SC: "R",
  SD: "R", TN: "R", TX: "R", UT: "R", VT: "D", VA: "D", WA: "D", WV: "R",
  WI: "R", WY: "R",
};

function getDefaultRating(party) {
  return party === "D" ? "Solid D" : "Solid R";
}

// Build all 435 house races
const houseRaces = [];
for (const [stateCode, info] of Object.entries(stateDistricts)) {
  for (let d = 1; d <= info.districts; d++) {
    const districtLabel = info.atLarge ? "AL" : String(d);
    const key = info.atLarge ? `${stateCode}-AL` : `${stateCode}-${d}`;
    const incumbentData = houseIncumbents[key];
    const defaultParty = stateDefaultParty[stateCode] || "R";
    
    houseRaces.push({
      stateCode,
      stateName: info.name,
      district: info.atLarge ? 0 : d,
      districtLabel,
      incumbent: incumbentData?.incumbent || null,
      incumbentParty: incumbentData?.party || defaultParty,
      incumbentRetiring: false,
      rating: incumbentData?.rating || getDefaultRating(incumbentData?.party || defaultParty),
      status: "Scheduled",
      primaryDate: info.primaryDate,
    });
  }
}

// ─── Execute inserts ──────────────────────────────────────────────────────────
console.log("Seeding Senate races...");
for (const race of senateRaces) {
  await connection.execute(
    `INSERT INTO senate_races (state_code, state_name, is_special, special_note, incumbent, incumbent_party, incumbent_retiring,
      candidate1_name, candidate1_party, candidate2_name, candidate2_party,
      rating, status, primary_date, primary_runoff_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      race.stateCode, race.stateName, race.isSpecial || false, race.specialNote || null,
      race.incumbent || null, race.incumbentParty || null, race.incumbentRetiring || false,
      race.candidate1Name || null, race.candidate1Party || null,
      race.candidate2Name || null, race.candidate2Party || null,
      race.rating || null, race.status || "Scheduled",
      race.primaryDate || null, race.primaryRunoffDate || null, race.notes || null,
    ]
  );
}
console.log(`✓ Inserted ${senateRaces.length} Senate races`);

console.log("Seeding redistricting states...");
for (const state of redistrictingData) {
  await connection.execute(
    `INSERT INTO redistricting_states (state_code, state_name, enacted, reason, status, method, delegation_before, projected_impact, litigation_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [state.stateCode, state.stateName, state.enacted, state.reason || null, state.status || null,
     state.method || null, state.delegationBefore || null, state.projectedImpact || null, state.litigationNotes || null]
  );
}
console.log(`✓ Inserted ${redistrictingData.length} redistricting states`);

console.log("Seeding Virginia referendum...");
await connection.execute(
  `INSERT INTO referendums (state_code, state_name, name, description, yes_label, no_label, election_date, status, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [referendumData.stateCode, referendumData.stateName, referendumData.name, referendumData.description,
   referendumData.yesLabel, referendumData.noLabel, referendumData.electionDate, referendumData.status, referendumData.notes]
);
console.log("✓ Inserted Virginia referendum");

console.log("Seeding House races...");
const batchSize = 50;
for (let i = 0; i < houseRaces.length; i += batchSize) {
  const batch = houseRaces.slice(i, i + batchSize);
  for (const race of batch) {
    await connection.execute(
      `INSERT INTO house_races (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, status, primary_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [race.stateCode, race.stateName, race.district, race.districtLabel,
       race.incumbent || null, race.incumbentParty || null, race.incumbentRetiring || false,
       race.rating || null, race.status || "Scheduled", race.primaryDate || null]
    );
  }
  console.log(`  Inserted ${Math.min(i + batchSize, houseRaces.length)}/${houseRaces.length} House races...`);
}
console.log(`✓ Inserted ${houseRaces.length} House races`);

await connection.end();
console.log("\n✅ Seed complete!");
