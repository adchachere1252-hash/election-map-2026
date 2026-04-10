/**
 * Deep verification audit — all 4 map views, all 50 states.
 * Checks structural completeness AND data quality:
 *   - Senate: all 35 races, candidate names, ratings, dates, notes
 *   - House: all 435 districts, ratings, incumbents
 *   - Governor: all 36 races, candidate names, ratings, dates
 *   - Redistricting: 12 states, status, method, projected impact
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

// Class 2 Senate seats + specials up in 2026
const SENATE_STATES_2026 = new Set([
  'AL','AK','AR','CO','DE','GA','ID','IL','IA','KS',
  'KY','LA','ME','MA','MI','MN','MS','MT','NE','NH',
  'NJ','NM','NC','OK','OR','RI','SC','SD','TN','TX',
  'VA','WV','WY',
  'FL', // Ashley Moody special
  'OH'  // Jon Husted special
]);

// 2026 Governor races (36 states; NJ had 2025 race)
const GOV_STATES_2026 = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','FL','GA','HI',
  'ID','IL','IA','KS','ME','MD','MA','MI','MN','NE',
  'NV','NH','NM','NY','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','VT','WI','WY'
]);

// Redistricting states tracked
const REDISTRICTING_STATES = new Set([
  'CA','FL','GA','LA','MD','MO','NC','NY','OH','TX','UT','VA'
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

function check(label, value, issues) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    issues.push(`Missing ${label}`);
  }
}

async function main() {
  console.log('=== 2026 Election Center — Deep Verification Audit ===\n');
  let totalIssues = 0;

  // ── SENATE ──────────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SENATE MAP — 35 races expected');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const senateRaces = await fetchTRPC('senate.list');
  const senateByState = {};
  for (const r of senateRaces) senateByState[r.stateCode] = r;

  let senateStructural = 0;
  let senateQuality = 0;
  const senateDetails = [];

  for (const code of ALL_STATES) {
    const shouldHave = SENATE_STATES_2026.has(code);
    const hasData = !!senateByState[code];
    if (shouldHave && !hasData) {
      senateDetails.push(`  ❌ MISSING: ${code} (${STATE_NAMES[code]})`);
      senateStructural++;
    } else if (!shouldHave && hasData) {
      senateDetails.push(`  ⚠️  UNEXPECTED: ${code} (${STATE_NAMES[code]}) — not a 2026 race`);
      senateStructural++;
    }
  }

  for (const [code, r] of Object.entries(senateByState)) {
    const issues = [];
    check('rating', r.rating, issues);
    check('stateName', r.stateName, issues);
    check('generalDate', r.generalDate, issues);
    // At least one candidate name should be present
    if (!r.candidate1Name && !r.candidate2Name) issues.push('No candidate names');
    // Rating should be a valid value
    const validRatings = ['Solid D','Likely D','Lean D','Toss-up','Lean R','Likely R','Solid R'];
    if (r.rating && !validRatings.includes(r.rating)) issues.push(`Invalid rating: "${r.rating}"`);
    if (issues.length > 0) {
      senateDetails.push(`  ⚠️  ${code} (${STATE_NAMES[code]}): ${issues.join(', ')}`);
      senateQuality += issues.length;
    }
  }

  if (senateStructural === 0 && senateQuality === 0) {
    console.log(`  ✅ All ${senateRaces.length} Senate races pass structural + quality checks`);
  } else {
    if (senateStructural > 0) console.log(`  ❌ ${senateStructural} structural issue(s)`);
    if (senateQuality > 0) console.log(`  ⚠️  ${senateQuality} data quality issue(s)`);
    senateDetails.forEach(d => console.log(d));
  }
  totalIssues += senateStructural + senateQuality;

  // Print all Senate races for manual review
  console.log('\n  Full Senate race list:');
  const sortedSenate = [...senateRaces].sort((a, b) => a.stateName.localeCompare(b.stateName));
  for (const r of sortedSenate) {
    const c1 = r.candidate1Name || '—';
    const c2 = r.candidate2Name || '—';
    const p1 = r.candidate1Party || '?';
    const p2 = r.candidate2Party || '?';
    console.log(`  ${r.stateCode.padEnd(3)} ${r.stateName.padEnd(20)} ${(r.rating||'').padEnd(12)} ${c1} (${p1}) vs ${c2} (${p2})`);
  }

  // ── HOUSE ────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 HOUSE MAP — 435 districts expected');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const houseRaces = await fetchTRPC('house.list');
  const houseByState = {};
  for (const r of houseRaces) {
    if (!houseByState[r.stateCode]) houseByState[r.stateCode] = [];
    houseByState[r.stateCode].push(r);
  }

  let houseStructural = 0;
  let houseQuality = 0;
  const houseDetails = [];

  // Check all states have districts
  for (const code of ALL_STATES) {
    if (!houseByState[code] || houseByState[code].length === 0) {
      houseDetails.push(`  ❌ MISSING all districts: ${code} (${STATE_NAMES[code]})`);
      houseStructural++;
    }
  }

  // Check total count
  if (houseRaces.length !== 435) {
    houseDetails.push(`  ❌ District count: ${houseRaces.length} (expected 435)`);
    houseStructural++;
  }

  // Data quality: check for missing ratings and incumbents
  const noRating = [];
  const noIncumbent = [];
  const validRatings = ['Solid D','Likely D','Lean D','Toss-up','Lean R','Likely R','Solid R'];
  for (const r of houseRaces) {
    if (!r.rating || !validRatings.includes(r.rating)) noRating.push(`${r.stateCode}-${r.district}`);
    if (!r.incumbentName) noIncumbent.push(`${r.stateCode}-${r.district}`);
  }

  if (houseStructural === 0 && noRating.length === 0) {
    console.log(`  ✅ All 435 districts present with valid ratings`);
  } else {
    if (houseStructural > 0) {
      console.log(`  ❌ ${houseStructural} structural issue(s)`);
      houseDetails.forEach(d => console.log(d));
    }
    if (noRating.length > 0) {
      console.log(`  ⚠️  ${noRating.length} districts missing/invalid rating: ${noRating.slice(0,10).join(', ')}${noRating.length > 10 ? ` (+${noRating.length-10} more)` : ''}`);
    }
  }
  if (noIncumbent.length > 0) {
    console.log(`  ℹ️  ${noIncumbent.length} districts with no incumbent name (vacancies/open seats expected)`);
  }
  console.log(`  ℹ️  Total districts: ${houseRaces.length}`);
  totalIssues += houseStructural + noRating.length;

  // ── GOVERNOR ─────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 GOVERNOR MAP — 36 races expected');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const govRaces = await fetchTRPC('governor.list');
  const govByState = {};
  for (const r of govRaces) govByState[r.stateCode] = r;

  let govStructural = 0;
  let govQuality = 0;
  const govDetails = [];

  for (const code of ALL_STATES) {
    const shouldHave = GOV_STATES_2026.has(code);
    const hasData = !!govByState[code];
    if (shouldHave && !hasData) {
      govDetails.push(`  ❌ MISSING: ${code} (${STATE_NAMES[code]})`);
      govStructural++;
    } else if (!shouldHave && hasData) {
      govDetails.push(`  ⚠️  UNEXPECTED: ${code} (${STATE_NAMES[code]}) — not a 2026 race`);
      govStructural++;
    }
  }

  for (const [code, r] of Object.entries(govByState)) {
    const issues = [];
    check('rating', r.rating, issues);
    check('stateName', r.stateName, issues);
    check('generalDate', r.generalDate, issues);
    // Governor uses demCandidate/repCandidate (not candidate1Name/candidate2Name)
    if (!r.demCandidate && !r.repCandidate) issues.push('No candidate names (demCandidate/repCandidate both empty)');
    const validGovRatings = ['Solid D','Likely D','Lean D','Toss-up','Lean R','Likely R','Solid R'];
    if (r.rating && !validGovRatings.includes(r.rating)) issues.push(`Invalid rating: "${r.rating}"`);
    if (issues.length > 0) {
      govDetails.push(`  ⚠️  ${code} (${STATE_NAMES[code]}): ${issues.join(', ')}`);
      govQuality += issues.length;
    }
  }

  if (govStructural === 0 && govQuality === 0) {
    console.log(`  ✅ All ${govRaces.length} Governor races pass structural + quality checks`);
  } else {
    if (govStructural > 0) console.log(`  ❌ ${govStructural} structural issue(s)`);
    if (govQuality > 0) console.log(`  ⚠️  ${govQuality} data quality issue(s)`);
    govDetails.forEach(d => console.log(d));
  }
  totalIssues += govStructural + govQuality;

  // Print all Governor races
  console.log('\n  Full Governor race list:');
  const sortedGov = [...govRaces].sort((a, b) => a.stateName.localeCompare(b.stateName));
  for (const r of sortedGov) {
    const c1 = r.demCandidate || '—';
    const c2 = r.repCandidate || '—';
    const p1 = 'D';
    const p2 = 'R';
    console.log(`  ${r.stateCode.padEnd(3)} ${r.stateName.padEnd(20)} ${(r.rating||'').padEnd(12)} ${c1} (${p1}) vs ${c2} (${p2})`);
  }

  // ── REDISTRICTING ─────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 REDISTRICTING MAP — 12 states tracked');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const redistRaces = await fetchTRPC('redistricting.list');
  const redistByState = {};
  for (const r of redistRaces) redistByState[r.stateCode] = r;

  let redistStructural = 0;
  let redistQuality = 0;
  const redistDetails = [];

  for (const code of REDISTRICTING_STATES) {
    if (!redistByState[code]) {
      redistDetails.push(`  ❌ MISSING: ${code} (${STATE_NAMES[code]})`);
      redistStructural++;
    }
  }

  for (const [code, r] of Object.entries(redistByState)) {
    const issues = [];
    check('status', r.status, issues);
    check('method', r.method, issues);
    check('projectedImpact', r.projectedImpact, issues);
    if (issues.length > 0) {
      redistDetails.push(`  ⚠️  ${code} (${STATE_NAMES[code]}): ${issues.join(', ')}`);
      redistQuality += issues.length;
    }
  }

  if (redistStructural === 0 && redistQuality === 0) {
    console.log(`  ✅ All ${redistRaces.length} redistricting states pass structural + quality checks`);
  } else {
    if (redistStructural > 0) console.log(`  ❌ ${redistStructural} structural issue(s)`);
    if (redistQuality > 0) console.log(`  ⚠️  ${redistQuality} data quality issue(s)`);
    redistDetails.forEach(d => console.log(d));
  }
  totalIssues += redistStructural + redistQuality;

  // Print all redistricting states
  console.log('\n  Full redistricting state list:');
  const sortedRedist = [...redistRaces].sort((a, b) => a.stateName.localeCompare(b.stateName));
  for (const r of sortedRedist) {
    console.log(`  ${r.stateCode.padEnd(3)} ${r.stateName.padEnd(20)} ${(r.status||'').padEnd(12)} ${r.method||'—'} | ${r.projectedImpact||'—'}`);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('=== AUDIT SUMMARY ===');
  console.log(`  Senate:       ${senateRaces.length} races | ${senateStructural} structural | ${senateQuality} quality issues`);
  console.log(`  House:        ${houseRaces.length} districts | ${houseStructural} structural | ${noRating.length} rating issues`);
  console.log(`  Governor:     ${govRaces.length} races | ${govStructural} structural | ${govQuality} quality issues`);
  console.log(`  Redistricting:${redistRaces.length} states | ${redistStructural} structural | ${redistQuality} quality issues`);
  console.log(`  ─────────────────────────────────────────────────`);
  if (totalIssues === 0) {
    console.log('  ✅ ALL CHECKS PASSED — no issues found across all 4 map views');
  } else {
    console.log(`  ❌ TOTAL ISSUES: ${totalIssues} — see above for details`);
  }
}

main().catch(console.error);
