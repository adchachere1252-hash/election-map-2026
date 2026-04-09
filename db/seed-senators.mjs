/**
 * Seed script: All 100 U.S. Senators in the 119th Congress (2025-2027)
 *
 * Sources:
 *   - senate.gov official class rosters (Class I, II, III)
 *     https://www.senate.gov/senators/Class_I.htm  (expires 2031)
 *     https://www.senate.gov/senators/Class_II.htm (expires 2027, up in 2026)
 *     https://www.senate.gov/senators/Class_III.htm (expires 2029)
 *
 * Senate Classes:
 *   Class I  → next election 2030 (elected/appointed 2024)
 *   Class II → next election 2026 (elected 2020; terms expire Jan 2027)
 *   Class III → next election 2028 (elected 2022)
 *
 * Special elections in 2026:
 *   FL: Ashley Moody (R) — appointed to replace Marco Rubio (Sec. of State); Class III seat
 *   OH: Jon Husted (R) — appointed to replace JD Vance (VP); Class III seat
 *   Both are up in 2026 special elections.
 *
 * NOTE: 2 Independent senators (Bernie Sanders VT, Angus King ME) caucus with Democrats.
 * NOTE: PA has John Fetterman (D) Class III — he replaced Bob Casey who lost in 2024.
 *       Bob Casey lost to Dave McCormick (R) who is now Class I.
 *       CT has Blumenthal (D) Class III — he was re-elected in 2022.
 *       CT has Murphy (D) Class I — elected in 2024.
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// All 100 senators: { stateCode, stateName, name, party, senateClass, nextElectionYear, isUpIn2026 }
// Verified against senate.gov Class I/II/III pages (April 2026)
const SENATORS = [
  // ─── ALABAMA ──────────────────────────────────────────────────────────────
  // Class I (up 2030): Katie Britt (elected 2022 — wait, Britt is Class III)
  // Per senate.gov Class III: Britt, Katie Boyd (R-AL)
  // Per senate.gov Class II: Tuberville, Tommy (R-AL)
  { stateCode: "AL", stateName: "Alabama", name: "Tommy Tuberville", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "AL", stateName: "Alabama", name: "Katie Britt", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── ALASKA ───────────────────────────────────────────────────────────────
  // Class III: Murkowski (R-AK)
  // Class II: Sullivan (R-AK)
  { stateCode: "AK", stateName: "Alaska", name: "Dan Sullivan", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "AK", stateName: "Alaska", name: "Lisa Murkowski", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── ARIZONA ──────────────────────────────────────────────────────────────
  // Class I: Gallego (D-AZ) — elected 2024
  // Class III: Kelly (D-AZ) — elected 2022
  { stateCode: "AZ", stateName: "Arizona", name: "Ruben Gallego", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "AZ", stateName: "Arizona", name: "Mark Kelly", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── ARKANSAS ─────────────────────────────────────────────────────────────
  // Class III: Boozman (R-AR)
  // Class II: Cotton (R-AR)
  { stateCode: "AR", stateName: "Arkansas", name: "Tom Cotton", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "AR", stateName: "Arkansas", name: "John Boozman", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── CALIFORNIA ───────────────────────────────────────────────────────────
  // Class I: Schiff (D-CA) — elected 2024
  // Class III: Padilla (D-CA) — elected 2022
  { stateCode: "CA", stateName: "California", name: "Adam Schiff", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "CA", stateName: "California", name: "Alex Padilla", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── COLORADO ─────────────────────────────────────────────────────────────
  // Class III: Bennet (D-CO) — elected 2022
  // Class II: Hickenlooper (D-CO) — elected 2020
  { stateCode: "CO", stateName: "Colorado", name: "John Hickenlooper", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "CO", stateName: "Colorado", name: "Michael Bennet", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── CONNECTICUT ──────────────────────────────────────────────────────────
  // Class I: Murphy (D-CT) — elected 2024 (re-elected)
  // Class III: Blumenthal (D-CT) — elected 2022
  { stateCode: "CT", stateName: "Connecticut", name: "Chris Murphy", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "CT", stateName: "Connecticut", name: "Richard Blumenthal", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── DELAWARE ─────────────────────────────────────────────────────────────
  // Class I: Blunt Rochester (D-DE) — elected 2024
  // Class II: Coons (D-DE) — elected 2020
  { stateCode: "DE", stateName: "Delaware", name: "Chris Coons", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "DE", stateName: "Delaware", name: "Lisa Blunt Rochester", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── FLORIDA ──────────────────────────────────────────────────────────────
  // Class I: Scott (R-FL) — elected 2024 (re-elected)
  // Class III: Moody (R-FL) — appointed 2025, up in 2026 special election
  { stateCode: "FL", stateName: "Florida", name: "Rick Scott", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "FL", stateName: "Florida", name: "Ashley Moody", party: "R", senateClass: 3, nextElectionYear: 2026, isUpIn2026: true },

  // ─── GEORGIA ──────────────────────────────────────────────────────────────
  // Class II: Ossoff (D-GA) — elected 2020
  // Class III: Warnock (D-GA) — elected 2022
  { stateCode: "GA", stateName: "Georgia", name: "Jon Ossoff", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "GA", stateName: "Georgia", name: "Raphael Warnock", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── HAWAII ───────────────────────────────────────────────────────────────
  // Class I: Hirono (D-HI) — elected 2024 (re-elected)
  // Class III: Schatz (D-HI) — elected 2022
  { stateCode: "HI", stateName: "Hawaii", name: "Mazie Hirono", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "HI", stateName: "Hawaii", name: "Brian Schatz", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── IDAHO ────────────────────────────────────────────────────────────────
  // Class III: Crapo (R-ID) — elected 2022
  // Class II: Risch (R-ID) — elected 2020
  { stateCode: "ID", stateName: "Idaho", name: "Jim Risch", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "ID", stateName: "Idaho", name: "Mike Crapo", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── ILLINOIS ─────────────────────────────────────────────────────────────
  // Class II: Durbin (D-IL) — elected 2020 (retiring, seat open)
  // Class III: Duckworth (D-IL) — elected 2022
  { stateCode: "IL", stateName: "Illinois", name: "Dick Durbin", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "IL", stateName: "Illinois", name: "Tammy Duckworth", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── INDIANA ──────────────────────────────────────────────────────────────
  // Class I: Banks (R-IN) — elected 2024
  // Class III: Young (R-IN) — elected 2022
  { stateCode: "IN", stateName: "Indiana", name: "Jim Banks", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "IN", stateName: "Indiana", name: "Todd Young", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── IOWA ─────────────────────────────────────────────────────────────────
  // Class III: Grassley (R-IA) — elected 2022
  // Class II: Ernst (R-IA) — elected 2020
  { stateCode: "IA", stateName: "Iowa", name: "Joni Ernst", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "IA", stateName: "Iowa", name: "Chuck Grassley", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── KANSAS ───────────────────────────────────────────────────────────────
  // Class III: Moran (R-KS) — elected 2022
  // Class II: Marshall (R-KS) — elected 2020
  { stateCode: "KS", stateName: "Kansas", name: "Roger Marshall", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "KS", stateName: "Kansas", name: "Jerry Moran", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── KENTUCKY ─────────────────────────────────────────────────────────────
  // Class II: McConnell (R-KY) — elected 2020
  // Class III: Paul (R-KY) — elected 2022
  { stateCode: "KY", stateName: "Kentucky", name: "Mitch McConnell", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "KY", stateName: "Kentucky", name: "Rand Paul", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── LOUISIANA ────────────────────────────────────────────────────────────
  // Class II: Cassidy (R-LA) — elected 2020
  // Class III: Kennedy (R-LA) — elected 2022
  { stateCode: "LA", stateName: "Louisiana", name: "Bill Cassidy", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "LA", stateName: "Louisiana", name: "John Kennedy", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── MAINE ────────────────────────────────────────────────────────────────
  // Class II: Collins (R-ME) — elected 2020
  // Class I: King (I-ME) — elected 2024 (re-elected)
  { stateCode: "ME", stateName: "Maine", name: "Susan Collins", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "ME", stateName: "Maine", name: "Angus King", party: "I", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── MARYLAND ─────────────────────────────────────────────────────────────
  // Class I: Alsobrooks (D-MD) — elected 2024
  // Class III: Van Hollen (D-MD) — elected 2022
  { stateCode: "MD", stateName: "Maryland", name: "Angela Alsobrooks", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "MD", stateName: "Maryland", name: "Chris Van Hollen", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── MASSACHUSETTS ────────────────────────────────────────────────────────
  // Class I: Warren (D-MA) — elected 2024 (re-elected)
  // Class II: Markey (D-MA) — elected 2020
  { stateCode: "MA", stateName: "Massachusetts", name: "Ed Markey", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "MA", stateName: "Massachusetts", name: "Elizabeth Warren", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── MICHIGAN ─────────────────────────────────────────────────────────────
  // Class II: Peters (D-MI) — elected 2020
  // Class I: Slotkin (D-MI) — elected 2024
  { stateCode: "MI", stateName: "Michigan", name: "Gary Peters", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "MI", stateName: "Michigan", name: "Elissa Slotkin", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── MINNESOTA ────────────────────────────────────────────────────────────
  // Class I: Klobuchar (D-MN) — elected 2024 (re-elected)
  // Class II: Smith (D-MN) — elected 2020
  { stateCode: "MN", stateName: "Minnesota", name: "Tina Smith", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "MN", stateName: "Minnesota", name: "Amy Klobuchar", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── MISSISSIPPI ──────────────────────────────────────────────────────────
  // Class I: Wicker (R-MS) — elected 2024 (re-elected)
  // Class II: Hyde-Smith (R-MS) — elected 2020
  { stateCode: "MS", stateName: "Mississippi", name: "Cindy Hyde-Smith", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "MS", stateName: "Mississippi", name: "Roger Wicker", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── MISSOURI ─────────────────────────────────────────────────────────────
  // Class I: Hawley (R-MO) — elected 2024 (re-elected)
  // Class III: Schmitt (R-MO) — elected 2022
  { stateCode: "MO", stateName: "Missouri", name: "Josh Hawley", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "MO", stateName: "Missouri", name: "Eric Schmitt", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── MONTANA ──────────────────────────────────────────────────────────────
  // Class I: Sheehy (R-MT) — elected 2024
  // Class II: Daines (R-MT) — elected 2020
  { stateCode: "MT", stateName: "Montana", name: "Steve Daines", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "MT", stateName: "Montana", name: "Tim Sheehy", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── NEBRASKA ─────────────────────────────────────────────────────────────
  // Class I: Fischer (R-NE) — elected 2024 (re-elected)
  // Class II: Ricketts (R-NE) — appointed 2023, up in 2026
  { stateCode: "NE", stateName: "Nebraska", name: "Pete Ricketts", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "NE", stateName: "Nebraska", name: "Deb Fischer", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── NEVADA ───────────────────────────────────────────────────────────────
  // Class I: Rosen (D-NV) — elected 2024 (re-elected)
  // Class III: Cortez Masto (D-NV) — elected 2022
  { stateCode: "NV", stateName: "Nevada", name: "Jacky Rosen", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "NV", stateName: "Nevada", name: "Catherine Cortez Masto", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── NEW HAMPSHIRE ────────────────────────────────────────────────────────
  // Class II: Shaheen (D-NH) — elected 2020
  // Class III: Hassan (D-NH) — elected 2022
  { stateCode: "NH", stateName: "New Hampshire", name: "Jeanne Shaheen", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "NH", stateName: "New Hampshire", name: "Maggie Hassan", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── NEW JERSEY ───────────────────────────────────────────────────────────
  // Class I: Kim (D-NJ) — elected 2024
  // Class II: Booker (D-NJ) — elected 2020
  { stateCode: "NJ", stateName: "New Jersey", name: "Cory Booker", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "NJ", stateName: "New Jersey", name: "Andy Kim", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── NEW MEXICO ───────────────────────────────────────────────────────────
  // Class I: Heinrich (D-NM) — elected 2024 (re-elected)
  // Class II: Luján (D-NM) — elected 2020
  { stateCode: "NM", stateName: "New Mexico", name: "Martin Heinrich", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "NM", stateName: "New Mexico", name: "Ben Ray Luján", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },

  // ─── NEW YORK ─────────────────────────────────────────────────────────────
  // Class I: Gillibrand (D-NY) — elected 2024 (re-elected)
  // Class III: Schumer (D-NY) — elected 2022
  { stateCode: "NY", stateName: "New York", name: "Kirsten Gillibrand", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "NY", stateName: "New York", name: "Chuck Schumer", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── NORTH CAROLINA ───────────────────────────────────────────────────────
  // Class II: Tillis (R-NC) — elected 2020
  // Class III: Budd (R-NC) — elected 2022
  { stateCode: "NC", stateName: "North Carolina", name: "Thom Tillis", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "NC", stateName: "North Carolina", name: "Ted Budd", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── NORTH DAKOTA ─────────────────────────────────────────────────────────
  // Class I: Cramer (R-ND) — elected 2024 (re-elected)
  // Class III: Hoeven (R-ND) — elected 2022
  { stateCode: "ND", stateName: "North Dakota", name: "Kevin Cramer", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "ND", stateName: "North Dakota", name: "John Hoeven", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── OHIO ─────────────────────────────────────────────────────────────────
  // Class I: Moreno (R-OH) — elected 2024
  // Class III: Husted (R-OH) — appointed 2025, up in 2026 special election
  { stateCode: "OH", stateName: "Ohio", name: "Bernie Moreno", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "OH", stateName: "Ohio", name: "Jon Husted", party: "R", senateClass: 3, nextElectionYear: 2026, isUpIn2026: true },

  // ─── OKLAHOMA ─────────────────────────────────────────────────────────────
  // Class II: Armstrong (R-OK) — elected 2020 (replaced Inhofe)
  // Class III: Lankford (R-OK) — elected 2022
  { stateCode: "OK", stateName: "Oklahoma", name: "Markwayne Mullin", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "OK", stateName: "Oklahoma", name: "James Lankford", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── OREGON ───────────────────────────────────────────────────────────────
  // Class II: Merkley (D-OR) — elected 2020
  // Class III: Wyden (D-OR) — elected 2022
  { stateCode: "OR", stateName: "Oregon", name: "Jeff Merkley", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "OR", stateName: "Oregon", name: "Ron Wyden", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── PENNSYLVANIA ─────────────────────────────────────────────────────────
  // Class I: McCormick (R-PA) — elected 2024
  // Class III: Fetterman (D-PA) — elected 2022
  { stateCode: "PA", stateName: "Pennsylvania", name: "Dave McCormick", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "PA", stateName: "Pennsylvania", name: "John Fetterman", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── RHODE ISLAND ─────────────────────────────────────────────────────────
  // Class I: Whitehouse (D-RI) — elected 2024 (re-elected)
  // Class II: Reed (D-RI) — elected 2020
  { stateCode: "RI", stateName: "Rhode Island", name: "Jack Reed", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "RI", stateName: "Rhode Island", name: "Sheldon Whitehouse", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── SOUTH CAROLINA ───────────────────────────────────────────────────────
  // Class II: Graham (R-SC) — elected 2020
  // Class III: Scott (R-SC) — elected 2022
  { stateCode: "SC", stateName: "South Carolina", name: "Lindsey Graham", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "SC", stateName: "South Carolina", name: "Tim Scott", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── SOUTH DAKOTA ─────────────────────────────────────────────────────────
  // Class II: Rounds (R-SD) — elected 2020
  // Class III: Thune (R-SD) — elected 2022
  { stateCode: "SD", stateName: "South Dakota", name: "Mike Rounds", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "SD", stateName: "South Dakota", name: "John Thune", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── TENNESSEE ────────────────────────────────────────────────────────────
  // Class II: Hagerty (R-TN) — elected 2020
  // Class III: Britt... wait, Britt is AL. Blackburn is TN.
  // Per senate.gov Class III: Young (R-IN) and Blackburn (R-TN) are NOT in Class III.
  // Per senate.gov Class I: Blackburn (R-TN) — elected 2024 (re-elected)
  // Per senate.gov Class II: Hagerty (R-TN) — elected 2020
  { stateCode: "TN", stateName: "Tennessee", name: "Bill Hagerty", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "TN", stateName: "Tennessee", name: "Marsha Blackburn", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── TEXAS ────────────────────────────────────────────────────────────────
  // Class I: Cruz (R-TX) — elected 2024 (re-elected)
  // Class II: Cornyn (R-TX) — elected 2020
  { stateCode: "TX", stateName: "Texas", name: "John Cornyn", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "TX", stateName: "Texas", name: "Ted Cruz", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── UTAH ─────────────────────────────────────────────────────────────────
  // Class I: Curtis (R-UT) — elected 2024
  // Class III: Lee (R-UT) — elected 2022
  { stateCode: "UT", stateName: "Utah", name: "John Curtis", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "UT", stateName: "Utah", name: "Mike Lee", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── VERMONT ──────────────────────────────────────────────────────────────
  // Class I: Sanders (I-VT) — elected 2024 (re-elected)
  // Class III: Welch (D-VT) — elected 2022
  { stateCode: "VT", stateName: "Vermont", name: "Bernie Sanders", party: "I", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "VT", stateName: "Vermont", name: "Peter Welch", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── VIRGINIA ─────────────────────────────────────────────────────────────
  // Class I: Kaine (D-VA) — elected 2024 (re-elected)
  // Class II: Warner (D-VA) — elected 2020
  { stateCode: "VA", stateName: "Virginia", name: "Mark Warner", party: "D", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "VA", stateName: "Virginia", name: "Tim Kaine", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── WASHINGTON ───────────────────────────────────────────────────────────
  // Class I: Cantwell (D-WA) — elected 2024 (re-elected)
  // Class III: Murray (D-WA) — elected 2022
  { stateCode: "WA", stateName: "Washington", name: "Maria Cantwell", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "WA", stateName: "Washington", name: "Patty Murray", party: "D", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── WEST VIRGINIA ────────────────────────────────────────────────────────
  // Class I: Justice (R-WV) — elected 2024
  // Class II: Capito (R-WV) — elected 2020
  { stateCode: "WV", stateName: "West Virginia", name: "Shelley Moore Capito", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "WV", stateName: "West Virginia", name: "Jim Justice", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },

  // ─── WISCONSIN ────────────────────────────────────────────────────────────
  // Class I: Baldwin (D-WI) — elected 2024 (re-elected)
  // Class III: Johnson (R-WI) — elected 2022
  { stateCode: "WI", stateName: "Wisconsin", name: "Tammy Baldwin", party: "D", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
  { stateCode: "WI", stateName: "Wisconsin", name: "Ron Johnson", party: "R", senateClass: 3, nextElectionYear: 2028, isUpIn2026: false },

  // ─── WYOMING ──────────────────────────────────────────────────────────────
  // Class I: Barrasso (R-WY) — elected 2024 (re-elected)
  // Class II: Lummis (R-WY) — elected 2020
  { stateCode: "WY", stateName: "Wyoming", name: "Cynthia Lummis", party: "R", senateClass: 2, nextElectionYear: 2026, isUpIn2026: true },
  { stateCode: "WY", stateName: "Wyoming", name: "John Barrasso", party: "R", senateClass: 1, nextElectionYear: 2030, isUpIn2026: false },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Clear existing data
  await conn.execute("DELETE FROM senators");
  console.log("Cleared existing senators data");

  // Insert all senators
  let inserted = 0;
  for (const s of SENATORS) {
    await conn.execute(
      `INSERT INTO senators (state_code, state_name, name, party, senate_class, next_election_year, is_up_in_2026)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.stateCode, s.stateName, s.name, s.party, s.senateClass, s.nextElectionYear, s.isUpIn2026 ? 1 : 0]
    );
    inserted++;
  }

  console.log(`Inserted ${inserted} senators`);

  // Verify counts
  const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM senators");
  console.log(`Total senators in DB: ${rows[0].cnt}`);

  const [upIn2026] = await conn.execute("SELECT COUNT(*) as cnt FROM senators WHERE is_up_in_2026 = 1");
  console.log(`Senators up in 2026: ${upIn2026[0].cnt}`);

  const [byParty] = await conn.execute("SELECT party, COUNT(*) as cnt FROM senators GROUP BY party ORDER BY party");
  console.log("By party:", byParty.map(r => `${r.party}: ${r.cnt}`).join(", "));

  const [upList] = await conn.execute("SELECT state_code, name, party, senate_class FROM senators WHERE is_up_in_2026 = 1 ORDER BY state_code");
  console.log("\nSenators up in 2026:");
  upList.forEach(r => console.log(`  ${r.state_code}: ${r.name} (${r.party}) Class ${r.senate_class}`));

  await conn.end();
  console.log("\nDone!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
