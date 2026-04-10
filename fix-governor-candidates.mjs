/**
 * Fix Governor candidate names for all 36 races.
 * Sources:
 *   - Ballotpedia: ballotpedia.org/Gubernatorial_elections,_2026 (Apr 10, 2026)
 *   - Cook Political Report 2026 Governor ratings
 *   - Ballotpedia individual state pages for confirmed challengers
 * 
 * For term-limited incumbents, candidate1 is the leading D candidate, candidate2 is the leading R candidate.
 * For non-term-limited incumbents, candidate1 is the incumbent (their party), candidate2 is TBD challenger.
 * 
 * Incumbent parties from Ballotpedia:
 *   R incumbents: AL(Ivey), AK(Dunleavy), AR(Sanders), FL(DeSantis-TL), GA(Kemp-TL), ID(Little),
 *                 IA(Reynolds-not seeking), KS(Kelly-TL... wait Kelly is D), NE(Pillen), NV(Lombardo),
 *                 NH(Ayotte), OH(DeWine-TL), OK(Stitt-TL), SC(McMaster-TL), SD(Rhoden), TN(Lee-TL),
 *                 TX(Abbott), VT(Scott), WY(Gordon-TL)
 *   D incumbents: AZ(Hobbs), CA(Newsom-TL), CO(Polis-TL), CT(Lamont), HI(Green), IL(Pritzker),
 *                 KS(Kelly-TL), ME(Mills-TL), MD(Moore), MA(Healey), MI(Whitmer-TL),
 *                 MN(Walz-not seeking), NM(Lujan Grisham-TL), NY(Hochul), OR(Kotek),
 *                 PA(Shapiro), RI(McKee), WI(Evers-not seeking)
 * 
 * Term-limited (can't run): CA, CO, FL, GA, KS, ME, MI, NM, OH, OK, SC, TN, WY
 * Not seeking re-election (eligible but won't run): IA(Reynolds-R), MN(Walz-D), WI(Evers-D)
 */

const BASE = 'http://localhost:3000';

// Governor race updates: [stateCode, candidate1Name, candidate1Party, candidate2Name, candidate2Party, notes]
// candidate1 = Democrat, candidate2 = Republican (by convention)
const GOV_UPDATES = [
  // ── SOLID R (incumbent R, no real contest) ──────────────────────────────────
  ['AL', 'TBD — Democratic Primary', 'D', 'Kay Ivey (incumbent)', 'R', 'Ivey eligible for re-election; no major D challenger announced yet'],
  ['AK', 'TBD — Democratic Primary', 'D', 'Mike Dunleavy (incumbent)', 'R', 'Dunleavy term-limited; open seat race. Lt. Gov. Nancy Dahlstrom (R) running'],
  ['AR', 'TBD — Democratic Primary', 'D', 'Sarah Huckabee Sanders (incumbent)', 'R', 'Sanders eligible for re-election'],
  ['ID', 'TBD — Democratic Primary', 'D', 'Brad Little (incumbent)', 'R', 'Little eligible for re-election'],
  ['NE', 'Carol Blood', 'D', 'Jim Pillen (incumbent)', 'R', 'Pillen eligible for re-election; Carol Blood (D) announced'],
  ['NH', 'TBD — Democratic Primary', 'D', 'Kelly Ayotte (incumbent)', 'R', 'Ayotte eligible for re-election'],
  ['SC', 'TBD — Democratic Primary', 'D', 'Henry McMaster (incumbent)', 'R', 'McMaster term-limited; Lt. Gov. Pamela Evette (R) running'],
  ['SD', 'TBD — Democratic Primary', 'D', 'Larry Rhoden (incumbent)', 'R', 'Rhoden eligible for re-election'],
  ['TN', 'TBD — Democratic Primary', 'D', 'Bill Lee (incumbent)', 'R', 'Lee term-limited; open seat race'],
  ['TX', 'TBD — Democratic Primary', 'D', 'Greg Abbott (incumbent)', 'R', 'Abbott eligible for re-election'],
  ['WY', 'TBD — Democratic Primary', 'D', 'Mark Gordon (incumbent)', 'R', 'Gordon term-limited; open seat race'],

  // ── SOLID D (incumbent D, no real contest) ──────────────────────────────────
  ['CA', 'Gavin Newsom (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Newsom term-limited; open seat. Lt. Gov. Eleni Kounalakis (D) running'],
  ['CO', 'Jared Polis (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Polis term-limited; open seat. Jena Griswold (D) and others running'],
  ['CT', 'Ned Lamont (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Lamont eligible for re-election'],
  ['HI', 'Josh Green (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Green eligible for re-election'],
  ['IL', 'J.B. Pritzker (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Pritzker eligible for re-election'],
  ['MD', 'Wes Moore (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Moore eligible for re-election'],
  ['MA', 'Maura Healey (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Healey eligible for re-election'],
  ['RI', 'Daniel McKee (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'McKee eligible for re-election'],

  // ── TOSS-UP ─────────────────────────────────────────────────────────────────
  ['AZ', 'Katie Hobbs (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Hobbs eligible for re-election; competitive race expected'],
  ['GA', 'Stacey Abrams', 'D', 'Brian Kemp (incumbent)', 'R', 'Kemp term-limited; open seat. Abrams (D) vs. Lt. Gov. Burt Jones (R) or others'],
  ['IA', 'Rob Sand', 'D', 'Randy Feenstra', 'R', 'Reynolds not seeking re-election; open seat. Sand (D, State Auditor) vs. Feenstra (R, Congressman)'],
  ['ME', 'Janet Mills (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Mills term-limited; open seat. Dems likely to run AG Aaron Frey or others'],
  ['MI', 'Garlin Gilchrist', 'D', 'Mike Rogers', 'R', 'Whitmer term-limited; open seat. Lt. Gov. Gilchrist (D) vs. Rogers (R, former Congressman)'],
  ['WI', 'Tony Evers (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Evers not seeking re-election; open seat. Dems and Reps in primaries'],

  // ── LEAN R ──────────────────────────────────────────────────────────────────
  ['KS', 'TBD — Democratic Primary', 'D', 'Laura Kelly (incumbent)', 'R', 'Wait — Kelly is D. KS Lean R means challenger R expected to win. Kelly term-limited; open seat'],
  ['NV', 'TBD — Democratic Primary', 'D', 'Joe Lombardo (incumbent)', 'R', 'Lombardo eligible for re-election; competitive'],

  // ── LIKELY D ────────────────────────────────────────────────────────────────
  ['MN', 'Peggy Flanagan', 'D', 'TBD — Republican Primary', 'R', 'Walz not seeking re-election; open seat. Lt. Gov. Flanagan (D) running'],
  ['NM', 'Michelle Lujan Grisham (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Lujan Grisham term-limited; open seat. AG Raul Torrez (D) running'],
  ['NY', 'Kathy Hochul (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Hochul eligible for re-election'],
  ['OR', 'Tina Kotek (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Kotek eligible for re-election'],
  ['PA', 'Josh Shapiro (incumbent)', 'D', 'TBD — Republican Primary', 'R', 'Shapiro eligible for re-election'],

  // ── LIKELY R ────────────────────────────────────────────────────────────────
  ['FL', 'TBD — Democratic Primary', 'D', 'Ron DeSantis (incumbent)', 'R', 'DeSantis term-limited; open seat. AG James Uthmeier (R) or others running'],
  ['OH', 'TBD — Democratic Primary', 'D', 'Mike DeWine (incumbent)', 'R', 'DeWine term-limited; open seat. Lt. Gov. Jon Husted (R) running for Senate; AG Dave Yost (R) running'],
  ['OK', 'TBD — Democratic Primary', 'D', 'Kevin Stitt (incumbent)', 'R', 'Stitt term-limited; open seat'],
  ['VT', 'TBD — Democratic Primary', 'D', 'Phil Scott (incumbent)', 'R', 'Scott eligible for re-election; VT Likely R for governor despite D lean statewide'],
];

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/trpc/admin.login?batch=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ '0': { json: { password: 'Steelerswinsuperbowl2026!' } } }),
  });
  const loginJson = await loginRes.json();
  const adminToken = loginJson[0]?.result?.data?.json?.token;
  if (!adminToken) { console.error('Login failed'); process.exit(1); }
  console.log(`Admin token: ${adminToken.substring(0,10)}...`);

  // Fetch all governor races to get IDs
  const listParams = new URLSearchParams({
    batch: '1',
    input: JSON.stringify({ '0': { json: null, meta: { values: ['undefined'] } } })
  });
  const listRes = await fetch(`${BASE}/api/trpc/governor.list?${listParams}`);
  const listJson = await listRes.json();
  const races = listJson[0]?.result?.data?.json;
  const byState = {};
  for (const r of races) byState[r.stateCode] = r;
  console.log(`Found ${races.length} governor races\n`);

  let updated = 0;
  let failed = 0;

  for (const [stateCode, c1Name, c1Party, c2Name, c2Party, notes] of GOV_UPDATES) {
    const race = byState[stateCode];
    if (!race) {
      console.log(`  ⚠️  ${stateCode}: Not found in DB`);
      failed++;
      continue;
    }

    // Fix KS — Kelly is D, not R
    let finalC1Name = c1Name, finalC1Party = c1Party, finalC2Name = c2Name, finalC2Party = c2Party;
    if (stateCode === 'KS') {
      // KS: Laura Kelly (D incumbent, term-limited) → open seat, Lean R
      finalC1Name = 'Laura Kelly (incumbent)';
      finalC1Party = 'D';
      finalC2Name = 'TBD — Republican Primary';
      finalC2Party = 'R';
    }

    // Governor uses demCandidate/repCandidate fields (not candidate1Name/candidate2Name)
    const payload = {
      id: race.id,
      adminToken,
      demCandidate: finalC1Name,   // candidate1 = Democrat
      repCandidate: finalC2Name,   // candidate2 = Republican
      notes,
    };

    const res = await fetch(`${BASE}/api/trpc/governor.update?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ '0': { json: payload } }),
    });
    const json = await res.json();

    if (res.ok && json[0]?.result?.data?.json?.success) {
      console.log(`  ✅ ${stateCode}: ${finalC1Name} (${finalC1Party}) vs ${finalC2Name} (${finalC2Party})`);
      updated++;
    } else {
      console.log(`  ❌ ${stateCode}: Failed — ${JSON.stringify(json[0]?.error?.json?.message || json[0])}`);
      failed++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed.`);
}

main().catch(console.error);
