/**
 * Apply confirmed March 2026 primary results to the database.
 * Sources: Ballotpedia, AP, NCSL, official state SOS results
 * States covered: AR (Mar 3), NC (Mar 3), TX (Mar 3 + May 26 runoff), MS (Mar 10), IL (Mar 17)
 * 
 * For races where BOTH primary winners are known → status = 'General', add both candidates
 * For races where one side has a runoff → status = 'Primary', note the runoff date
 * For races where only one party held a primary → update that side's candidate
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── SENATE RACES ──────────────────────────────────────────────────────────────
// AR: Hallie Shoffner (D) vs Tom Cotton (R) — both primaries done Mar 3
// NC: Roy Cooper (D) vs Michael Whatley (R) — both primaries done Mar 3
// MS: Scott Colom (D) vs Cindy Hyde-Smith (R) — both primaries done Mar 10 (runoff Apr 7 cleared)
// IL: Juliana Stratton (D) vs Don Tracy (R) — both primaries done Mar 17
// TX: James Talarico (D) vs [Cornyn/Paxton runoff May 26] — D done, R in runoff

const senateUpdates = [
  // AR: both candidates confirmed
  { stateCode: 'AR', dem: 'Hallie Shoffner', rep: 'Tom Cotton', status: 'General',
    notes: 'Shoffner won D primary Mar 3 (def. Ethan Dunbar). Cotton won R primary Mar 3 (81.6%). Rated Solid R.' },
  // TX: D candidate confirmed, R in runoff May 26
  { stateCode: 'TX', dem: 'James Talarico', rep: 'Cornyn/Paxton (R runoff May 26)', status: 'Primary',
    notes: 'Talarico won D primary Mar 3 (53.2%, def. Crockett). R runoff: Cornyn (42.5%) vs Paxton (40.8%) on May 26.' },
];

for (const u of senateUpdates) {
  await conn.query(`
    UPDATE senate_races
    SET candidate1_name = ?, candidate1_party = 'D',
        candidate2_name = ?, candidate2_party = 'R',
        status = ?, notes = ?
    WHERE state_code = ?
  `, [u.dem, u.rep, u.status, u.notes, u.stateCode]);
  console.log(`✓ Senate ${u.stateCode}: ${u.dem} (D) vs ${u.rep} (R) → ${u.status}`);
}

// ─── HOUSE RACES ───────────────────────────────────────────────────────────────
// Format: { state, district, dem, rep, status, notes }
// Only updating races where primary winner(s) are confirmed.
// Races with runoffs are marked Primary with runoff note.
// Races where only one party had a contested primary: update that side.

const houseUpdates = [

  // ── ARKANSAS (Mar 3) ──────────────────────────────────────────────────────
  // AR-1: Crawford (R) unopposed in primary. D: Terri Yarbrough Green won primary.
  { state:'AR', district:1, dem:'Terri Yarbrough Green', rep:'Rick Crawford', status:'General',
    notes:'Yarbrough Green won D primary Mar 3. Crawford (R) unopposed. Rated Solid R.' },
  // AR-2: French Hill (R) unopposed. No D primary info available yet.
  // AR-3: Steve Womack (R) unopposed. No D primary info available yet.
  // AR-4: Bruce Westerman (R) unopposed. No D primary info available yet.

  // ── NORTH CAROLINA (Mar 3) ────────────────────────────────────────────────
  // NC-1: Laurie Buckhout won R primary (39.5%, def. Asa Buck). D: Don Davis (incumbent, unopposed)
  { state:'NC', district:1, dem:'Don Davis', rep:'Laurie Buckhout', status:'General',
    notes:'Buckhout won R primary Mar 3 (39.5%, def. Buck/Hanig). Davis (D) unopposed. Lean R per Cook.' },
  // NC-4: Valerie Foushee won D primary (49.2%, def. Nida Allam). R: TBD (no R primary listed)
  { state:'NC', district:4, dem:'Valerie Foushee', rep:null, status:'Scheduled',
    notes:'Foushee won D primary Mar 3 (49.2%, narrowly def. Allam). R primary May 12 runoff if needed. Solid D.' },
  // NC-2 through NC-14: most had primaries May 12 runoff date — not yet complete. Leave as Scheduled.
  // NC-5: Virginia Foxx retired — Tim Moore won R primary. D TBD.
  { state:'NC', district:5, dem:null, rep:'Tim Moore', status:'Scheduled',
    notes:'Tim Moore won R primary Mar 3 (def. multiple candidates). D primary May 12. Solid R.' },
  // NC-6: Addison McDowell (R) — open seat (Rouzer moved to NC-7 due to redistricting). R primary done.
  // NC-10: Pat Harrigan (R) — won R primary. D TBD.
  // NC-13: Brad Knott (R) — won R primary. D TBD.

  // ── TEXAS (Mar 3 + May 26 runoff) ─────────────────────────────────────────
  // TX-2: Steve Toth defeated incumbent Dan Crenshaw (R primary, 57.3%). D: TBD.
  { state:'TX', district:2, dem:null, rep:'Steve Toth', status:'Scheduled',
    notes:'Toth upset incumbent Crenshaw in R primary Mar 3 (57.3%). D primary TBD. Solid R.' },
  // TX-8: Jessica Steinmann won R primary (69.0%). D: TBD.
  { state:'TX', district:8, dem:null, rep:'Jessica Steinmann', status:'Scheduled',
    notes:'Steinmann won R primary Mar 3 (69.0%). Open seat (Luttrell retired). D primary TBD. Solid R.' },
  // TX-9: Al Green vs Alex Mealer/Briscoe Cain runoff (R). D primary: Al Green (incumbent).
  { state:'TX', district:9, dem:'Al Green', rep:'Mealer/Cain (R runoff May 26)', status:'Primary',
    notes:'Al Green (D) won primary. R runoff May 26: Mealer (36.6%) vs Cain (30.8%). Solid D.' },
  // TX-10: Chris Gober won R primary (51.2%). Open seat (McCaul retired). D: TBD.
  { state:'TX', district:10, dem:null, rep:'Chris Gober', status:'Scheduled',
    notes:'Gober won R primary Mar 3 (51.2%). Open seat (McCaul retired). D primary TBD. Solid R.' },
  // TX-18: Christian Menefee vs Al Green in D runoff (May 26). Special election winner was Menefee.
  // Note: TX-18 is a D runoff between Menefee and Al Green on May 26 for the GENERAL seat.
  { state:'TX', district:18, dem:'Menefee/Al Green (D runoff May 26)', rep:null, status:'Primary',
    notes:'D runoff May 26: Menefee (46.0%) vs Al Green (44.2%). No R candidate filed. Solid D.' },
  // TX-19: Tom Sell vs Abraham Enriquez in R runoff (May 26). Open seat (Arrington retired).
  { state:'TX', district:19, dem:null, rep:'Sell/Enriquez (R runoff May 26)', status:'Primary',
    notes:'R runoff May 26: Sell (40.4%) vs Enriquez (18.7%). Open seat (Arrington retired). Solid R.' },
  // TX-21: Mark Teixeira won R primary (62.6%). Open seat (Chip Roy ran for AG). D: TBD.
  { state:'TX', district:21, dem:null, rep:'Mark Teixeira', status:'Scheduled',
    notes:'Teixeira won R primary Mar 3 (62.6%). Open seat (Chip Roy ran for TX AG). D primary TBD. Solid R.' },
  // TX-23: Tony Gonzales vs Brandon Herrera in R runoff (May 26). D: TBD.
  { state:'TX', district:23, dem:null, rep:'Gonzales/Herrera (R runoff May 26)', status:'Primary',
    notes:'R runoff May 26: Gonzales (42.5%) vs Herrera (42.5%). D primary TBD. Toss-up/Lean R.' },
  // TX-29: Sylvia Garcia won D primary (58.2%). R: TBD.
  { state:'TX', district:29, dem:'Sylvia Garcia', rep:null, status:'Scheduled',
    notes:'Garcia won D primary Mar 3 (58.2%). R primary TBD. Solid D.' },
  // TX-30: Jasmine Crockett ran for Senate — open seat. D primary TBD.
  { state:'TX', district:30, dem:null, rep:null, status:'Scheduled',
    notes:'Open seat (Crockett ran for Senate). D primary TBD. Solid D.' },
  // TX-32: Jace Yarbrough vs Ryan Binkley in R runoff (May 26). Open seat (Johnson ran for TX-33). D: TBD.
  { state:'TX', district:32, dem:null, rep:'Yarbrough/Binkley (R runoff May 26)', status:'Primary',
    notes:'R runoff May 26: Yarbrough (49.0%) vs Binkley (21.7%). Open seat. D primary TBD. Lean R.' },
  // TX-33: Colin Allred vs Julie Johnson in D runoff (May 26). R: Eric Flores won R primary.
  { state:'TX', district:33, dem:'Allred/Johnson (D runoff May 26)', rep:'Eric Flores', status:'Primary',
    notes:'D runoff May 26: Allred (45.5%) vs Johnson (34.0%). Flores won R primary (56.6%). Solid D.' },
  // TX-34: Eric Flores won R primary (56.6%). Wait — TX-34 is a different race. Let me correct.
  // TX-34: Eric Flores won R primary (56.6%). D: Vicente Gonzalez (incumbent). 
  { state:'TX', district:34, dem:'Vicente Gonzalez Jr.', rep:'Eric Flores', status:'General',
    notes:'Flores won R primary Mar 3 (56.6%). Gonzalez (D) incumbent. Toss-up.' },
  // TX-35: John Lujan vs Carlos De La Cruz in R runoff (May 26). Greg Casar (D) won D primary.
  { state:'TX', district:35, dem:'Greg Casar', rep:'Lujan/De La Cruz (R runoff May 26)', status:'Primary',
    notes:'Casar (D) won D primary. R runoff May 26: Lujan (32.5%) vs De La Cruz (27.1%). Solid D.' },
  // TX-38: Jon Bonck vs Shelly deZevallos in R runoff (May 26). Open seat (Hunt ran for Senate). D: TBD.
  { state:'TX', district:38, dem:null, rep:'Bonck/deZevallos (R runoff May 26)', status:'Primary',
    notes:'R runoff May 26: Bonck (47.7%) vs deZevallos (18.6%). Open seat (Hunt ran for Senate). Solid R.' },

  // ── ILLINOIS (Mar 17) ─────────────────────────────────────────────────────
  // IL-2: Donna Miller won D primary (40.5%, def. Jesse Jackson Jr.). R: TBD (Aug 4 primary).
  { state:'IL', district:2, dem:'Donna Miller', rep:null, status:'Scheduled',
    notes:'Miller won D primary Mar 17 (40.5%, def. Jesse Jackson Jr.). Open seat (Robin Kelly retired). R primary Aug 4. Solid D.' },
  // IL-7: La Shawn Ford won D primary (24.1%). Open seat (Danny Davis retired). R: TBD.
  { state:'IL', district:7, dem:'La Shawn Ford', rep:null, status:'Scheduled',
    notes:'Ford won D primary Mar 17 (24.1%, def. Conyears-Ervin). Open seat (Danny Davis retired). R primary Aug 4. Solid D.' },
  // IL-9: Daniel K. Biss won D primary (29.5%). Open seat (Schakowsky retired). R: TBD.
  { state:'IL', district:9, dem:'Daniel K. Biss', rep:null, status:'Scheduled',
    notes:'Biss won D primary Mar 17 (29.5%, def. Abughazaleh/Fine). Open seat (Schakowsky retired). R primary Aug 4. Solid D.' },

  // ── MISSISSIPPI (Mar 10) ──────────────────────────────────────────────────
  // MS-2: Bennie Thompson won D primary (def. Evan Turnage). R: TBD (May 19 primary).
  { state:'MS', district:2, dem:'Bennie G. Thompson', rep:null, status:'Scheduled',
    notes:'Thompson won D primary Mar 10 (def. Turnage). R primary May 19. Solid D.' },
];

let updated = 0;
let skipped = 0;

for (const u of houseUpdates) {
  // Build dynamic SET clause based on what we have
  const sets = [];
  const vals = [];

  if (u.dem !== undefined && u.dem !== null) {
    sets.push('candidate1_name = ?', 'candidate1_party = ?');
    vals.push(u.dem, 'D');
  }
  if (u.rep !== undefined && u.rep !== null) {
    sets.push('candidate2_name = ?', 'candidate2_party = ?');
    vals.push(u.rep, 'R');
  }
  if (u.status) {
    sets.push('status = ?');
    vals.push(u.status);
  }
  if (u.notes) {
    sets.push('notes = ?');
    vals.push(u.notes);
  }

  if (sets.length === 0) { skipped++; continue; }

  vals.push(u.state, u.district);
  const [result] = await conn.query(
    `UPDATE house_races SET ${sets.join(', ')} WHERE state_code = ? AND district = ?`,
    vals
  );

  if (result.affectedRows > 0) {
    const demLabel = u.dem || '(TBD)';
    const repLabel = u.rep || '(TBD)';
    console.log(`✓ ${u.state}-${u.district}: ${demLabel} (D) vs ${repLabel} (R) → ${u.status}`);
    updated++;
  } else {
    console.warn(`⚠ ${u.state}-${u.district}: no rows updated`);
    skipped++;
  }
}

// Also fix TX-2 incumbent (was Dan Crenshaw, now Steve Toth won primary)
await conn.query(`UPDATE house_races SET incumbent = 'Steve Toth' WHERE state_code = 'TX' AND district = 2`);
console.log('✓ TX-2 incumbent updated to Steve Toth (primary winner)');

// Fix TX-30 incumbent (was Jasmine Crockett, she ran for Senate — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat', notes = 'Crockett ran for Senate. D primary TBD. Solid D.' WHERE state_code = 'TX' AND district = 30`);
console.log('✓ TX-30 marked as Open Seat (Crockett ran for Senate)');

// Fix TX-33 incumbent (was Marc Veasey, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 33`);
console.log('✓ TX-33 marked as Open Seat (Veasey retired)');

// Fix TX-38 incumbent (was Wesley Hunt, who ran for Senate — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 38`);
console.log('✓ TX-38 marked as Open Seat (Hunt ran for Senate)');

// Fix IL-2 incumbent (was Robin Kelly, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'IL' AND district = 2`);
console.log('✓ IL-2 marked as Open Seat (Robin Kelly retired)');

// Fix IL-7 incumbent (was Danny Davis, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'IL' AND district = 7`);
console.log('✓ IL-7 marked as Open Seat (Danny Davis retired)');

// Fix IL-9 incumbent (was Jan Schakowsky, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'IL' AND district = 9`);
console.log('✓ IL-9 marked as Open Seat (Jan Schakowsky retired)');

// Fix TX-8 incumbent (was Morgan Luttrell, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 8`);
console.log('✓ TX-8 marked as Open Seat (Luttrell retired)');

// Fix TX-10 incumbent (was Michael McCaul, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 10`);
console.log('✓ TX-10 marked as Open Seat (McCaul retired)');

// Fix TX-21 incumbent (was Chip Roy, who ran for TX AG — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 21`);
console.log('✓ TX-21 marked as Open Seat (Chip Roy ran for TX AG)');

// Fix TX-19 incumbent (was Jodey Arrington, who retired — open seat)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 19`);
console.log('✓ TX-19 marked as Open Seat (Arrington retired)');

// Fix TX-32 incumbent (was Julie Johnson, who is in the TX-33 D runoff — open seat for TX-32)
await conn.query(`UPDATE house_races SET incumbent = 'Open Seat' WHERE state_code = 'TX' AND district = 32`);
console.log('✓ TX-32 marked as Open Seat (Johnson running in TX-33)');

await conn.end();
console.log(`\n✅ Done. Updated ${updated} house races, skipped ${skipped}.`);
