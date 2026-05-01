import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

console.log('=== May 1, 2026 Louisiana Redistricting Update ===');
console.log('Sources: NBC News, CBS News, NPR, Democracy Docket (Apr 30 - May 1, 2026)');

// 1. Update Louisiana redistricting status
const [laRedist] = await conn.execute(
  `SELECT id, state_name, status, litigation_notes FROM redistricting_states WHERE state_name = 'Louisiana' LIMIT 3`
);
console.log('\nCurrent Louisiana redistricting record:', JSON.stringify(laRedist, null, 2));

if (laRedist.length > 0) {
  await conn.execute(
    `UPDATE redistricting_states SET
      status = ?,
      litigation_notes = ?
    WHERE state_name = 'Louisiana'`,
    [
      'House Primaries Suspended — New Map Being Drawn',
      'SCOTUS ruled Apr 29, 2026 (6-3, Alito majority) that the 2024 majority-Black LA-6 district was an unconstitutional racial gerrymander, severely limiting VRA Section 2. Gov. Jeff Landry signed executive order Apr 30 suspending May 16 House primaries. Secretary of State Nancy Landry certified emergency — House races suspended, Senate primary proceeds May 16 as scheduled. Legislature expected to draw new map eliminating LA-6 (Rep. Cleo Fields) and potentially LA-2 (Rep. Troy Carter, New Orleans). New map could result in 5R-1D or 6R-0D delegation (currently 5R-2D). Trump endorsed the move on Truth Social. New primary dates TBD. Sources: NBC News, CBS News, NPR, Democracy Docket (Apr 29-30, 2026).'
    ]
  );
  console.log('✅ Louisiana redistricting status updated');
}

// 2. Update LA-6 (Cleo Fields) — now effectively eliminated pending new map
const [la6] = await conn.execute(
  `SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = 'LA' AND district = 6 LIMIT 1`
);
console.log('\nCurrent LA-6:', JSON.stringify(la6, null, 2));

if (la6.length > 0) {
  await conn.execute(
    `UPDATE house_races SET
      rating = ?,
      notes = ?
    WHERE state_code = 'LA' AND district = 6`,
    [
      'Solid R',
      'DISTRICT BEING ELIMINATED: Rep. Cleo Fields (D) — LA-6 was the majority-Black district created under court order in 2024. SCOTUS struck it down Apr 29, 2026 as unconstitutional racial gerrymander (Louisiana v. Callais, 6-3). May 16 House primary suspended. Legislature drawing new map expected to eliminate this district. Fields likely loses his seat. Rating changed to Solid R reflecting new map direction. Source: NBC News, CBS News (Apr 29-30, 2026).'
    ]
  );
  console.log('✅ LA-6 (Cleo Fields) updated — district being eliminated, rating → Solid R');
}

// 3. Update LA-2 (Troy Carter, New Orleans) — at risk under new map
const [la2] = await conn.execute(
  `SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = 'LA' AND district = 2 LIMIT 1`
);
console.log('\nCurrent LA-2:', JSON.stringify(la2, null, 2));

if (la2.length > 0) {
  await conn.execute(
    `UPDATE house_races SET
      rating = ?,
      notes = ?
    WHERE state_code = 'LA' AND district = 2`,
    [
      'Lean R',
      'Rep. Troy Carter (D) — New Orleans and communities to its west. At risk under new redistricting map. Carter told CBS News: "We can realistically end up having six congressional districts with no African-American or Democratic representation." Legislature drawing new map post-Callais ruling. May 16 House primary suspended. New map could dilute Black voter population in New Orleans area. Rating moved from Solid D to Lean R pending new map. Source: CBS News, NBC News (Apr 29-30, 2026).'
    ]
  );
  console.log('✅ LA-2 (Troy Carter) updated — at risk under new map, rating → Lean R');
}

// 4. Update Tennessee redistricting status — new development
const [tnRedist] = await conn.execute(
  `SELECT id, state_name, status, litigation_notes FROM redistricting_states WHERE state_name = 'Tennessee' LIMIT 3`
);
console.log('\nCurrent Tennessee redistricting record:', JSON.stringify(tnRedist, null, 2));

if (tnRedist.length > 0) {
  await conn.execute(
    `UPDATE redistricting_states SET
      status = ?,
      litigation_notes = ?
    WHERE state_name = 'Tennessee'`,
    [
      'Redistricting Under Consideration',
      'Post-Callais: Sen. Marsha Blackburn (R) called for legislature to reconvene to redraw TN-9 (Memphis, Rep. Steve Cohen D). Blackburn proposed map would create 9R-0D delegation. Gov. Bill Lee told Trump he would "work hard" to correct what Trump called an "unconstitutional flaw" in TN maps. House Republican Whip Rep. Johnny Garrett supports redrawing. Congressional primaries scheduled Aug. 6, 2026 — qualifying deadline already passed in March. No special session called yet as of May 1, 2026. Source: CBS News, NBC News (Apr 30, 2026).'
    ]
  );
  console.log('✅ Tennessee redistricting status updated — under consideration post-Callais');
} else {
  console.log('Tennessee not found in redistricting_states — inserting new record...');
  await conn.execute(
    `INSERT INTO redistricting_states (state_name, state_code, status, litigation_notes) VALUES (?, ?, ?, ?)`,
    [
      'Tennessee',
      'TN',
      'Redistricting Under Consideration',
      'Post-Callais: Sen. Marsha Blackburn (R) called for legislature to reconvene to redraw TN-9 (Memphis, Rep. Steve Cohen D). Blackburn proposed map would create 9R-0D delegation. Gov. Bill Lee told Trump he would "work hard" to correct what Trump called an "unconstitutional flaw" in TN maps. House Republican Whip Rep. Johnny Garrett supports redrawing. Congressional primaries scheduled Aug. 6, 2026 — qualifying deadline already passed in March. No special session called yet as of May 1, 2026. Source: CBS News, NBC News (Apr 30, 2026).'
    ]
  );
  console.log('✅ Tennessee added to redistricting tracker');
}

// 5. Update TN-9 (Steve Cohen) — at risk
const [tn9] = await conn.execute(
  `SELECT id, state_code, district, incumbent, rating, notes FROM house_races WHERE state_code = 'TN' AND district = 9 LIMIT 1`
);
console.log('\nCurrent TN-9:', JSON.stringify(tn9, null, 2));

if (tn9.length > 0) {
  await conn.execute(
    `UPDATE house_races SET
      rating = ?,
      notes = ?
    WHERE state_code = 'TN' AND district = 9`,
    [
      'Lean D',
      'Rep. Steve Cohen (D) — Memphis. At risk post-Callais ruling. Sen. Blackburn proposed map would eliminate this district, creating 9R-0D TN delegation. Gov. Lee told Trump he would "work hard" to redraw maps. No special session called yet. Primaries Aug. 6, 2026. Rating moved from Solid D to Lean D pending redistricting decision. Source: CBS News (Apr 30, 2026).'
    ]
  );
  console.log('✅ TN-9 (Steve Cohen) updated — at risk, rating → Lean D');
}

await conn.end();
console.log('\n=== All May 1 Louisiana/Tennessee updates complete ===');
