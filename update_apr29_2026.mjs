import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Applying April 29, 2026 updates: Louisiana v. Callais SCOTUS ruling + Florida redistricting...');

// 1. LOUISIANA — Callais ruling
await db.execute(
  `UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?`,
  [
    'Ruled on by SCOTUS',
    "SCOTUS ruled 6-3 on April 29, 2026 in Louisiana v. Callais that Louisiana's 2024 congressional map — which created a second majority-Black district (LA-6) — was an unconstitutional racial gerrymander under the Equal Protection Clause. The ruling struck down the 2024 map and bars its use in future elections. Louisiana must revert to its 2022 map with only one majority-Black district. Rep. Cleo Fields (D), elected in 2024 in the new LA-6, loses his seat under the reverted map. The ruling also severely limits Section 2 of the Voting Rights Act, making it much harder to require majority-minority districts. The decision was written by the conservative majority (6-3) and immediately triggered redistricting moves in Florida, Mississippi, and other states.",
    'Louisiana'
  ]
);
console.log('✓ Louisiana redistricting updated with Callais ruling');

// 2. MISSISSIPPI — Special session triggered
await db.execute(
  `UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?`,
  [
    'Special Session Triggered',
    "Gov. Tate Reeves called a special session to convene 21 days after the SCOTUS ruling in Louisiana v. Callais. With the ruling issued April 29, 2026, the special session is expected to begin around May 20, 2026. The session addresses judicial district maps (state Supreme Court and Court of Appeals), not congressional maps. Mississippi currently has 3 Republican and 1 Democratic congressional seat (MS-2, the majority-Black district held by Rep. Bennie Thompson). The Callais ruling may affect future challenges to MS-2.",
    'Mississippi'
  ]
);
console.log('✓ Mississippi special session trigger updated');

// 3. FLORIDA — DeSantis map passed legislature
await db.execute(
  `UPDATE redistricting_states SET status = ?, litigation_notes = ? WHERE state_name = ?`,
  [
    'Map Passed Legislature',
    "Florida Legislature passed DeSantis redistricting map on April 29, 2026 — House 83-28, Senate 21-17, both largely party-line. The map targets 4 Democratic incumbents: Rep. Darren Soto (FL-9, Orlando), Rep. Kathy Castor (FL-14, Tampa), Rep. Lois Frankel (FL-22, Miami), and Rep. Debbie Wasserman Schultz (FL-25, Miami). Under the new map, all 4 districts flip from D-leaning to R+9 to R+17, creating a projected 24R-4D delegation (from current 20R-8D). The map was drawn by DeSantis's office using partisan data. DeSantis argued the Callais ruling invalidated Florida's 2010 voter-approved Fair Districts anti-gerrymandering amendment. Awaiting DeSantis signature. Multiple Democratic groups (NDRC, FL Democratic Party) have promised immediate legal challenges. Florida primaries are in August 2026; courts may be reluctant to overturn maps so close to the election.",
    'Florida'
  ]
);
console.log('✓ Florida redistricting updated with new map passage');

// 4. FL-9 (Darren Soto) — R gain under new map
await db.execute(
  `UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?`,
  [
    'Solid R',
    "Under DeSantis redistricting map passed April 29, 2026: FL-9 redrawn from D-3.5% to R+17.7% under 2024 presidential results. Rep. Darren Soto (D-Orlando) is targeted — district now projects as Republican gain. Soto has not announced whether he will run in the new district or seek another office. Legal challenges pending.",
    'FL', 9
  ]
);
console.log('✓ FL-9 (Soto) updated to Solid R under new map');

// 5. FL-14 (Kathy Castor) — R gain under new map
await db.execute(
  `UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?`,
  [
    'Solid R',
    "Under DeSantis redistricting map passed April 29, 2026: FL-14 redrawn from D-7.6% to R+10.5% under 2024 presidential results. Rep. Kathy Castor (D-Tampa) is targeted — district now projects as Republican gain. Castor has represented Tampa since 2007. Legal challenges pending.",
    'FL', 14
  ]
);
console.log('✓ FL-14 (Castor) updated to Solid R under new map');

// 6. FL-22 (Lois Frankel) — R gain under new map
await db.execute(
  `UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?`,
  [
    'Solid R',
    "Under DeSantis redistricting map passed April 29, 2026: FL-22 redrawn from D-5.6% to R+10.5% under 2024 presidential results. Rep. Lois Frankel (D-West Palm Beach) is targeted — district now projects as Republican gain. Legal challenges pending.",
    'FL', 22
  ]
);
console.log('✓ FL-22 (Frankel) updated to Solid R under new map');

// 7. FL-25 (Debbie Wasserman Schultz) — R gain under new map
await db.execute(
  `UPDATE house_races SET rating = ?, notes = ? WHERE state_code = ? AND district = ?`,
  [
    'Solid R',
    "Under DeSantis redistricting map passed April 29, 2026: FL-25 redrawn from D-5.3% to R+9.1% under 2024 presidential results. Rep. Debbie Wasserman Schultz (D-Weston/Broward) is targeted — district now projects as Republican gain. Wasserman Schultz called the map a completely unconstitutional partisan gerrymander. Legal challenges pending.",
    'FL', 25
  ]
);
console.log('✓ FL-25 (Wasserman Schultz) updated to Solid R under new map');

// 8. FL-23 (Jared Moskowitz) — Dem hold, becomes safer
await db.execute(
  `UPDATE house_races SET notes = ? WHERE state_code = ? AND district = ?`,
  [
    "Under DeSantis redistricting map passed April 29, 2026: FL-23 redrawn to D-13.8% under 2024 presidential results — actually becomes safer for Rep. Jared Moskowitz (D). Moskowitz noted the map could backfire as a dummymander by concentrating Democratic voters. Legal challenges pending.",
    'FL', 23
  ]
);
console.log('✓ FL-23 (Moskowitz) notes updated');

// 9. GEORGIA — Callais impact on redistricting litigation
const [gaRows] = await db.execute(
  `SELECT litigation_notes FROM redistricting_states WHERE state_name = ?`,
  ['Georgia']
);
if (gaRows.length > 0) {
  const existingNotes = gaRows[0].litigation_notes || '';
  const appendText = ' | UPDATE April 29, 2026: SCOTUS ruling in Louisiana v. Callais severely limits Section 2 VRA challenges. Georgia redistricting litigation (which relied partly on VRA Section 2 arguments) may be significantly weakened by the Callais ruling. Legal teams reassessing impact on pending Georgia cases.';
  await db.execute(
    `UPDATE redistricting_states SET litigation_notes = ? WHERE state_name = ?`,
    [existingNotes + appendText, 'Georgia']
  );
  console.log('✓ Georgia redistricting notes updated with Callais impact');
}

// 10. ADD TIMELINE ENTRIES
const [tables] = await db.execute(`SHOW TABLES LIKE 'election_timeline'`);
if (tables.length > 0) {
  const [cols] = await db.execute(`DESCRIBE election_timeline`);
  const colNames = cols.map(c => c.Field);
  
  const entries = [
    {
      timestamp: new Date('2026-04-29T10:00:00Z'),
      title: 'SCOTUS Rules 6-3 in Louisiana v. Callais',
      description: "The Supreme Court ruled 6-3 that Louisiana's 2024 congressional map — which created a second majority-Black district (LA-6) — was an unconstitutional racial gerrymander. The ruling strikes down the 2024 map, forces Louisiana to revert to its 2022 map, and severely limits Section 2 of the Voting Rights Act. Rep. Cleo Fields (D), elected in 2024 in the new LA-6, loses his seat. The ruling immediately triggered redistricting moves in Florida, Mississippi, and other Republican-led states.",
      category: 'SCOTUS',
      importance: 'high'
    },
    {
      timestamp: new Date('2026-04-29T11:00:00Z'),
      title: 'Florida House Passes DeSantis Redistricting Map 83-28',
      description: "Just one hour after the Callais ruling, the Florida House voted 83-28 to approve Gov. DeSantis's new congressional map. The map targets 4 Democratic incumbents (Soto, Castor, Frankel, Wasserman Schultz) and would shift Florida's delegation from 20R-8D to a projected 24R-4D. DeSantis cited the Callais ruling as justification for overriding Florida's 2010 voter-approved Fair Districts anti-gerrymandering amendment.",
      category: 'Redistricting',
      importance: 'high'
    },
    {
      timestamp: new Date('2026-04-29T15:00:00Z'),
      title: 'Florida Senate Passes Redistricting Map 21-17',
      description: "The Florida Senate voted 21-17 to approve the DeSantis redistricting map, with 4 Republican senators joining all Democrats in opposition. The bill now goes to DeSantis for signature. Multiple Democratic groups including the NDRC and Florida Democratic Party have promised immediate legal challenges.",
      category: 'Redistricting',
      importance: 'high'
    },
    {
      timestamp: new Date('2026-04-29T16:00:00Z'),
      title: 'Mississippi Special Session Triggered (~May 20)',
      description: "With the SCOTUS ruling in Louisiana v. Callais issued April 29, Gov. Tate Reeves's previously announced special session is now triggered. The Legislature will convene approximately 21 days after the ruling — around May 20, 2026 — to address judicial district maps.",
      category: 'Redistricting',
      importance: 'medium'
    }
  ];

  for (const entry of entries) {
    if (colNames.includes('importance')) {
      await db.execute(
        `INSERT INTO election_timeline (timestamp, title, description, category, importance) VALUES (?, ?, ?, ?, ?)`,
        [entry.timestamp, entry.title, entry.description, entry.category, entry.importance]
      );
    } else {
      await db.execute(
        `INSERT INTO election_timeline (timestamp, title, description, category) VALUES (?, ?, ?, ?)`,
        [entry.timestamp, entry.title, entry.description, entry.category]
      );
    }
    console.log(`✓ Timeline entry: ${entry.title}`);
  }
} else {
  console.log('⚠ No election_timeline table — skipping timeline entries');
}

await db.end();
console.log('\n✅ All April 29, 2026 updates applied successfully!');
console.log('  - Louisiana: Callais ruling applied, 2024 map struck down, revert to 2022 map');
console.log('  - Mississippi: Special session triggered ~May 20');
console.log('  - Florida: New 24R-4D map passed legislature');
console.log('  - FL-9/14/22/25: Updated to Solid R under new map');
console.log('  - FL-23: Notes updated (safer Dem hold)');
console.log('  - Georgia: Callais impact noted');
console.log('  - 4 timeline entries added');
