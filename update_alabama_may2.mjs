import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== May 2, 2026 Alabama & South Carolina Redistricting Update ===");
console.log("Sources: Democracy Docket, NYT, CNN, NBC News, Roll Call (May 1-2, 2026)");

// ─── 1. Add Alabama to redistricting_states ───────────────────────────────
const [alRows] = await db.execute(
  "SELECT id, state_name, status, litigation_notes FROM redistricting_states WHERE state_name = ?",
  ["Alabama"]
);

const alNotes = `Gov. Kay Ivey called special session May 1, 2026 — legislature convenes Monday May 4, expected to complete within 5 days. Alabama AG Steve Marshall filed emergency motions asking SCOTUS to lift federal court injunction barring redistricting until 2030. New map would eliminate AL-7 (Rep. Terri Sewell, majority-Black district) and potentially give GOP all 7 AL congressional seats (currently 5R-2D). Absentee ballots already mailed — voting rights advocates warn of 'prescription for chaos.' SCOTUS must act before any new map can take effect. Directly tied to Louisiana v. Callais ruling (Apr 29, 2026). Sources: Democracy Docket, NYT, CNN, NBC News (May 1, 2026).`;

if (alRows.length === 0) {
  await db.execute(
    "INSERT INTO redistricting_states (state_code, state_name, status, reason, method, delegation_before, projected_impact, litigation_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["AL", "Alabama", "Special Session Called — Awaiting SCOTUS Injunction Lift", "Post-Callais VRA gutting — eliminate majority-Black AL-7", "Legislative special session", "5R-2D", "+2R (7R-0D)", alNotes]
  );
  console.log("✅ Alabama added to redistricting tracker");
} else {
  await db.execute(
    "UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?",
    ["Special Session Called — Awaiting SCOTUS Injunction Lift", alNotes, "Alabama"]
  );
  console.log("✅ Alabama redistricting status updated");
}

// ─── 2. Update AL-7 (Terri Sewell) — at risk of elimination ──────────────
const [al7Rows] = await db.execute(
  "SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = ? AND district = ?",
  ["AL", 7]
);
console.log("Current AL-7:", JSON.stringify(al7Rows, null, 2));

if (al7Rows.length > 0) {
  await db.execute(
    "UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?",
    [
      "Lean D",
      "Majority-Black district targeted for elimination under new GOP gerrymander. Gov. Ivey called special session May 1 to redraw maps — if SCOTUS lifts injunction, district could be dismantled. Currently Solid D but at existential risk. Rep. Terri Sewell (D) would likely be drawn out of a winnable district. Sources: Democracy Docket, NYT (May 1, 2026).",
      "AL",
      7
    ]
  );
  console.log("✅ AL-7 (Terri Sewell) updated — rating moved to Lean D, at risk of elimination");
} else {
  console.log("⚠️ AL-7 not found in database");
}

// ─── 3. Add South Carolina to redistricting_states ───────────────────────
const [scRows] = await db.execute(
  "SELECT id, state_name, status, litigation_notes FROM redistricting_states WHERE state_name = ?",
  ["South Carolina"]
);

const scNotes = `South Carolina Republicans urged Gov. Henry McMaster to call a special session to eliminate SC-6 (Rep. James Clyburn, majority-Black district) following Louisiana v. Callais ruling. No special session called yet as of May 2, 2026. GOP lawmakers citing Callais as opening to redraw maps. Clyburn (D) is the highest-ranking Black member of Congress. Sources: Democracy Docket, Roll Call (May 1-2, 2026).`;

if (scRows.length === 0) {
  await db.execute(
    "INSERT INTO redistricting_states (state_code, state_name, status, reason, method, delegation_before, projected_impact, litigation_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["SC", "South Carolina", "Special Session Urged — No Call Yet", "Post-Callais VRA gutting — eliminate majority-Black SC-6", "Legislative special session (not yet called)", "6R-1D", "+1R (7R-0D)", scNotes]
  );
  console.log("✅ South Carolina added to redistricting tracker");
} else {
  await db.execute(
    "UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?",
    ["Special Session Urged — No Call Yet", scNotes, "South Carolina"]
  );
  console.log("✅ South Carolina redistricting status updated");
}

// ─── 4. Update SC-6 (James Clyburn) — at risk ────────────────────────────
const [sc6Rows] = await db.execute(
  "SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = ? AND district = ?",
  ["SC", 6]
);
console.log("Current SC-6:", JSON.stringify(sc6Rows, null, 2));

if (sc6Rows.length > 0) {
  await db.execute(
    "UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?",
    [
      "Lean D",
      "Majority-Black district. SC Republicans urged Gov. McMaster to call special session to eliminate district following Louisiana v. Callais ruling. Rep. James Clyburn (D), highest-ranking Black member of Congress, at risk if special session called. No session called yet as of May 2, 2026. Sources: Democracy Docket, Roll Call (May 1-2, 2026).",
      "SC",
      6
    ]
  );
  console.log("✅ SC-6 (James Clyburn) updated — rating moved to Lean D, at risk");
} else {
  console.log("⚠️ SC-6 not found in database");
}

// ─── 5. Update Tennessee special session status ──────────────────────────
const [tnRows] = await db.execute(
  "SELECT id, state_name, status FROM redistricting_states WHERE state_name = ?",
  ["Tennessee"]
);

if (tnRows.length > 0) {
  await db.execute(
    "UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?",
    [
      "Special Session Called — Legislature Convenes May 5",
      "Gov. Bill Lee called special session May 1, 2026 — legislature convenes May 5. Target: TN-9 (Rep. Steve Cohen, Memphis, majority-Black district). New map would give Republicans all 9 TN congressional seats (currently 7R-2D). Directly tied to Louisiana v. Callais ruling. Sources: CBS News, CNN, Roll Call (May 1, 2026).",
      "Tennessee"
    ]
  );
  console.log("✅ Tennessee special session status updated — convenes May 5");
} else {
  console.log("⚠️ Tennessee not found — inserting...");
  await db.execute(
    "INSERT INTO redistricting_states (state_code, state_name, status, reason, method, delegation_before, projected_impact, litigation_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "TN", "Tennessee",
      "Special Session Called — Legislature Convenes May 5",
      "Post-Callais VRA gutting — eliminate majority-Black TN-9",
      "Legislative special session",
      "7R-2D",
      "+2R (9R-0D)",
      "Gov. Bill Lee called special session May 1, 2026 — legislature convenes May 5. Target: TN-9 (Rep. Steve Cohen, Memphis, majority-Black district). New map would give Republicans all 9 TN congressional seats (currently 7R-2D). Directly tied to Louisiana v. Callais ruling. Sources: CBS News, CNN, Roll Call (May 1, 2026)."
    ]
  );
  console.log("✅ Tennessee added with updated special session status");
}

// ─── 6. Update TN-9 (Steve Cohen) ────────────────────────────────────────
const [tn9Rows] = await db.execute(
  "SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = ? AND district = ?",
  ["TN", 9]
);
console.log("Current TN-9:", JSON.stringify(tn9Rows, null, 2));

if (tn9Rows.length > 0) {
  await db.execute(
    "UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?",
    [
      "Solid R",
      "Majority-Black Memphis district targeted for elimination. Tennessee special session convenes May 5 — new map expected to eliminate TN-9 and give Republicans all 9 seats. Rep. Steve Cohen (D) would likely be drawn out of a winnable district. Sources: CBS News, CNN (May 1, 2026).",
      "TN",
      9
    ]
  );
  console.log("✅ TN-9 (Steve Cohen) updated — rating moved to Solid R (district being eliminated)");
} else {
  console.log("⚠️ TN-9 not found in database");
}

console.log("\n=== All May 2 Alabama/SC/Tennessee updates complete ===");
await db.end();
