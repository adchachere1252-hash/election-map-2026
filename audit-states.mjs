/**
 * Comprehensive 50-state audit for all 4 map views.
 * Checks data completeness via the live API.
 * 
 * 2026 Senate races = Class 2 seats (next regular election: Tuesday 3 November 2026)
 * Per The Green Papers (thegreenpapers.com/G26/SenateByClass.phtml, updated Apr 4 2026):
 * Class 2 states: AL, AK, AR, CO, DE, GA, ID, IL, IA, KS, KY, LA, ME, MA, MI, MN, MS, MT, NE, NH, NJ, NM, NC, OK, OR, RI, SC, SD, TN, TX, VA, WV, WY
 * Plus special elections: FL (Moody), OH (Husted)
 * Total: 35 races
 */

const BASE = 'http://localhost:3000';

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

// Class 2 Senate seats up in 2026 (regular + special elections)
// Source: The Green Papers, thegreenpapers.com/G26/SenateByClass.phtml (Apr 4 2026)
const SENATE_RACE_STATES_2026 = new Set([
  // Class 2 regular elections
  'AL','AK','AR','CO','DE','GA','ID','IL','IA','KS',
  'KY','LA','ME','MA','MI','MN','MS','MT','NE','NH',
  'NJ','NM','NC','OK','OR','RI','SC','SD','TN','TX',
  'VA','WV','WY',
  // Special elections (Class 3 seats vacated)
  'FL', // Ashley Moody (R) appointed after Rubio became SoS
  'OH'  // Jon Husted (R) appointed after JD Vance became VP
]);

// States with 2026 Governor races (36 races)
// States NOT having governor races in 2026: DE, IN, KY, LA, MS, MO, MT, NC, ND, NJ, UT, VA, WA, WV
// NJ had its governor race in November 2025 (Mikie Sherrill D won); next NJ gov race is 2029.
const GOV_RACE_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','FL','GA','HI',
  'ID','IL','IA','KS','ME','MD','MA','MI','MN','NE',
  'NV','NH','NM','NY','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','VT','WI','WY'
]);

async function fetchTRPC(procedure, input = null) {
  const params = new URLSearchParams({
    batch: '1',
    input: JSON.stringify({ '0': { json: input, meta: input === null ? { values: ['undefined'] } : undefined } })
  });
  const res = await fetch(`${BASE}/api/trpc/${procedure}?${params}`);
  const json = await res.json();
  return json[0]?.result?.data?.json;
}

async function main() {
  console.log('=== 2026 Election Center — Full 50-State Audit ===\n');

  // ── SENATE ──────────────────────────────────────────────────────────────
  console.log('📋 SENATE MAP AUDIT');
  const senateRaces = await fetchTRPC('senate.list');
  const senateByState = {};
  for (const r of senateRaces) senateByState[r.stateCode] = r;

  const senateIssues = [];
  for (const code of ALL_STATES) {
    const hasRace = SENATE_RACE_STATES_2026.has(code);
    const hasData = !!senateByState[code];
    if (hasRace && !hasData) senateIssues.push(`MISSING race data: ${code} (${STATE_NAMES[code]})`);
    if (!hasRace && hasData) senateIssues.push(`UNEXPECTED race data: ${code} (${STATE_NAMES[code]}) — not a 2026 race`);
  }
  
  // Check for data quality issues in existing races
  const noCandidates = [];
  for (const [code, race] of Object.entries(senateByState)) {
    if (!race.rating) senateIssues.push(`Missing rating: ${code}`);
    if (!race.stateName) senateIssues.push(`Missing stateName: ${code}`);
    if (!race.generalDate) senateIssues.push(`Missing generalDate: ${code}`);
    if (!race.candidate1Name && !race.candidate2Name) noCandidates.push(code);
  }

  if (senateIssues.length === 0) {
    console.log(`  ✅ All ${senateRaces.length} Senate races verified (35 expected)`);
  } else {
    console.log(`  ❌ ${senateIssues.length} structural issues found:`);
    senateIssues.forEach(i => console.log(`     - ${i}`));
  }
  
  if (noCandidates.length > 0) {
    console.log(`  ⚠️  ${noCandidates.length} races missing candidate names: ${noCandidates.join(', ')}`);
  }
  
  const noSenateRace = ALL_STATES.filter(c => !SENATE_RACE_STATES_2026.has(c));
  console.log(`  ℹ️  No 2026 Senate race (${noSenateRace.length} states): ${noSenateRace.join(', ')}`);
  console.log(`  ℹ️  Total races in DB: ${senateRaces.length}`);

  // ── HOUSE ───────────────────────────────────────────────────────────────
  console.log('\n📋 HOUSE MAP AUDIT');
  const houseRaces = await fetchTRPC('house.list');
  const houseByState = {};
  for (const r of houseRaces) {
    if (!houseByState[r.stateCode]) houseByState[r.stateCode] = [];
    houseByState[r.stateCode].push(r);
  }

  const houseIssues = [];
  for (const code of ALL_STATES) {
    if (!houseByState[code] || houseByState[code].length === 0) {
      houseIssues.push(`MISSING districts: ${code} (${STATE_NAMES[code]})`);
    }
  }
  
  // At-large states use district=0 by design (schema comment: "0 = at-large")
  // districtLabel field stores 'AL' for at-large display
  const districtIssues = []; // No issues expected — district=0 is correct for at-large states

  if (houseIssues.length === 0 && districtIssues.length === 0) {
    console.log(`  ✅ All 50 states have House district data (${houseRaces.length} total districts)`);
  } else {
    if (houseIssues.length > 0) {
      console.log(`  ❌ ${houseIssues.length} missing state(s):`);
      houseIssues.forEach(i => console.log(`     - ${i}`));
    }
    if (districtIssues.length > 0) {
      console.log(`  ⚠️  ${districtIssues.length} district number issue(s):`);
      districtIssues.forEach(i => console.log(`     - ${i}`));
    }
  }
  
  const districtCounts = Object.entries(houseByState)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([c, d]) => `${c}:${d.length}`)
    .join(', ');
  console.log(`  ℹ️  Top states by districts: ${districtCounts}`);
  console.log(`  ℹ️  Total districts in DB: ${houseRaces.length} (expected 435)`);

  // ── GOVERNOR ────────────────────────────────────────────────────────────
  console.log('\n📋 GOVERNOR MAP AUDIT');
  const govRaces = await fetchTRPC('governor.list');
  const govByState = {};
  for (const r of govRaces) govByState[r.stateCode] = r;

  const govIssues = [];
  for (const code of ALL_STATES) {
    const hasRace = GOV_RACE_STATES.has(code);
    const hasData = !!govByState[code];
    if (hasRace && !hasData) govIssues.push(`MISSING race data: ${code} (${STATE_NAMES[code]})`);
    if (!hasRace && hasData) govIssues.push(`UNEXPECTED race data: ${code} (${STATE_NAMES[code]}) — not a 2026 race`);
  }
  
  for (const [code, race] of Object.entries(govByState)) {
    if (!race.rating) govIssues.push(`Missing rating: ${code}`);
    if (!race.stateName) govIssues.push(`Missing stateName: ${code}`);
  }

  if (govIssues.length === 0) {
    console.log(`  ✅ All ${govRaces.length} Governor races verified`);
  } else {
    console.log(`  ❌ ${govIssues.length} issues found:`);
    govIssues.forEach(i => console.log(`     - ${i}`));
  }
  
  const noGovRace = ALL_STATES.filter(c => !GOV_RACE_STATES.has(c));
  console.log(`  ℹ️  No 2026 Governor race (${noGovRace.length} states): ${noGovRace.join(', ')}`);

  // ── REDISTRICTING ───────────────────────────────────────────────────────
  console.log('\n📋 REDISTRICTING MAP AUDIT');
  const redistStates = await fetchTRPC('redistricting.list');
  const redistByState = {};
  for (const r of redistStates) redistByState[r.stateCode] = r;

  const redistIssues = [];
  for (const [code, r] of Object.entries(redistByState)) {
    if (!r.status) redistIssues.push(`Missing status: ${code}`);
    if (!r.stateName) redistIssues.push(`Missing stateName: ${code}`);
  }

  if (redistIssues.length === 0) {
    console.log(`  ✅ ${redistStates.length} redistricting states with valid data`);
  } else {
    console.log(`  ❌ ${redistIssues.length} issues found:`);
    redistIssues.forEach(i => console.log(`     - ${i}`));
  }
  
  const redistCodes = redistStates.map(r => r.stateCode).sort().join(', ');
  console.log(`  ℹ️  States with redistricting data: ${redistCodes}`);

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  const totalIssues = senateIssues.length + houseIssues.length + districtIssues.length + govIssues.length + redistIssues.length;
  if (totalIssues === 0) {
    console.log('✅ All structural data checks passed across all 4 map views.');
    if (noCandidates.length > 0) {
      console.log(`⚠️  ${noCandidates.length} Senate races are missing candidate names (data quality, not structural).`);
    }
  } else {
    console.log(`❌ ${totalIssues} structural issues found. See above for details.`);
  }
  
  // ── DETAILED SENATE RACE LIST ────────────────────────────────────────────
  console.log('\n=== ALL SENATE RACES IN DB ===');
  const sorted = senateRaces.sort((a, b) => a.stateName.localeCompare(b.stateName));
  for (const r of sorted) {
    const issues = [];
    if (!r.candidate1Name && !r.candidate2Name) issues.push('⚠️ no candidates');
    const c1 = r.candidate1Name ? `${r.candidate1Name} (${r.candidate1Party})` : 'TBD (D)';
    const c2 = r.candidate2Name ? `${r.candidate2Name} (${r.candidate2Party})` : 'TBD (R)';
    console.log(`  ${r.stateCode} ${r.stateName.padEnd(20)} ${(r.rating||'').padEnd(12)} ${c1} vs ${c2} ${issues.join('')}`);
  }
  
  // ── DETAILED GOV RACE LIST ───────────────────────────────────────────────
  console.log('\n=== ALL GOVERNOR RACES IN DB ===');
  const govSorted = govRaces.sort((a, b) => a.stateName.localeCompare(b.stateName));
  for (const r of govSorted) {
    const c1 = r.candidate1Name || 'TBD';
    const c2 = r.candidate2Name || 'TBD';
    console.log(`  ${r.stateCode} ${r.stateName.padEnd(20)} ${(r.rating||'').padEnd(12)} ${c1} (D) vs ${c2} (R)`);
  }
}

main().catch(console.error);
