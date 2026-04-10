/**
 * Fix Senate races missing candidate names by adding known incumbents.
 * Sources:
 * - Ballotpedia: ballotpedia.org/United_States_Senate_elections,_2026
 * - The Green Papers: thegreenpapers.com/G26/SenateByClass.phtml
 * - Cook Political Report / 270toWin
 * 
 * For races where the incumbent is retiring or the seat is open,
 * we add the most prominent announced candidate where known.
 * For races where primaries haven't happened yet, we add the incumbent
 * as candidate1 (D or R per their party).
 */

const BASE = 'http://localhost:3000';

// Known Senate race data for states with TBD candidates
// Source: Ballotpedia (Apr 2026), The Green Papers (Apr 4 2026)
const UPDATES = [
  // Alabama: Tommy Tuberville (R) retiring to run for governor. Open seat.
  // Primary May 19, 2026. No major announced D candidate yet.
  { stateCode: 'AL', candidate2Name: 'Open Seat (R Primary)', candidate2Party: 'R', notes: 'Tommy Tuberville (R) is not seeking re-election; running for governor instead. Republican primary May 19, 2026.' },
  
  // Colorado: John Hickenlooper (D) incumbent, seeking re-election.
  { stateCode: 'CO', candidate1Name: 'John Hickenlooper', candidate1Party: 'D', notes: 'Incumbent John Hickenlooper (D) seeking re-election. Primary June 30, 2026.' },
  
  // Delaware: Chris Coons (D) incumbent, seeking re-election.
  { stateCode: 'DE', candidate1Name: 'Chris Coons', candidate1Party: 'D', notes: 'Incumbent Chris Coons (D) seeking re-election. Primary September 15, 2026.' },
  
  // Idaho: Jim Risch (R) incumbent, seeking re-election.
  { stateCode: 'ID', candidate2Name: 'Jim Risch', candidate2Party: 'R', notes: 'Incumbent Jim Risch (R) seeking re-election. Primary May 19, 2026.' },
  
  // Kansas: Roger Marshall (R) incumbent, seeking re-election.
  { stateCode: 'KS', candidate2Name: 'Roger Marshall', candidate2Party: 'R', notes: 'Incumbent Roger Marshall (R) seeking re-election. Primary August 4, 2026.' },
  
  // Louisiana: Bill Cassidy (R) incumbent, seeking re-election.
  { stateCode: 'LA', candidate2Name: 'Bill Cassidy', candidate2Party: 'R', notes: 'Incumbent Bill Cassidy (R) seeking re-election. Louisiana jungle primary May 16, 2026.' },
  
  // Massachusetts: Ed Markey (D) incumbent, seeking re-election.
  { stateCode: 'MA', candidate1Name: 'Ed Markey', candidate1Party: 'D', notes: 'Incumbent Ed Markey (D) seeking re-election. Primary September 1, 2026.' },
  
  // Nebraska: Pete Ricketts (R) incumbent, seeking re-election.
  { stateCode: 'NE', candidate2Name: 'Pete Ricketts', candidate2Party: 'R', notes: 'Incumbent Pete Ricketts (R) seeking re-election. Primary May 12, 2026.' },
  
  // New Jersey: Cory Booker (D) incumbent, seeking re-election.
  { stateCode: 'NJ', candidate1Name: 'Cory Booker', candidate1Party: 'D', notes: 'Incumbent Cory Booker (D) seeking re-election. Primary June 2, 2026.' },
  
  // New Mexico: Ben Ray Luján (D) incumbent, seeking re-election.
  { stateCode: 'NM', candidate1Name: 'Ben Ray Luján', candidate1Party: 'D', notes: 'Incumbent Ben Ray Luján (D) seeking re-election. Primary June 2, 2026.' },
  
  // Oregon: Jeff Merkley (D) incumbent, seeking re-election.
  { stateCode: 'OR', candidate1Name: 'Jeff Merkley', candidate1Party: 'D', notes: 'Incumbent Jeff Merkley (D) seeking re-election. Primary May 19, 2026.' },
  
  // Rhode Island: Jack Reed (D) incumbent, seeking re-election.
  { stateCode: 'RI', candidate1Name: 'Jack Reed', candidate1Party: 'D', notes: 'Incumbent Jack Reed (D) seeking re-election. Primary September 8, 2026.' },
  
  // South Carolina: Lindsey Graham (R) incumbent, seeking re-election.
  { stateCode: 'SC', candidate2Name: 'Lindsey Graham', candidate2Party: 'R', notes: 'Incumbent Lindsey Graham (R) seeking re-election. Primary June 9, 2026.' },
  
  // South Dakota: Mike Rounds (R) incumbent, seeking re-election.
  { stateCode: 'SD', candidate2Name: 'Mike Rounds', candidate2Party: 'R', notes: 'Incumbent Mike Rounds (R) seeking re-election. Primary June 2, 2026.' },
  
  // Tennessee: Bill Hagerty (R) incumbent, seeking re-election.
  { stateCode: 'TN', candidate2Name: 'Bill Hagerty', candidate2Party: 'R', notes: 'Incumbent Bill Hagerty (R) seeking re-election. Primary August 6, 2026.' },
  
  // Virginia: Mark Warner (D) incumbent, seeking re-election.
  { stateCode: 'VA', candidate1Name: 'Mark Warner', candidate1Party: 'D', notes: 'Incumbent Mark Warner (D) seeking re-election. Primary August 4, 2026.' },
  
  // West Virginia: Shelley Moore Capito (R) incumbent, seeking re-election.
  { stateCode: 'WV', candidate2Name: 'Shelley Moore Capito', candidate2Party: 'R', notes: 'Incumbent Shelley Moore Capito (R) seeking re-election. Primary May 12, 2026.' },
];

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
  console.log('Fetching all Senate races...');
  const races = await fetchTRPC('senate.list');
  const byState = {};
  for (const r of races) byState[r.stateCode] = r;
  
  console.log(`Found ${races.length} Senate races.\n`);
  
  // Get admin session token by logging in
  const adminPassword = process.env.ADMIN_PASSWORD || 'Steelerswinsuperbowl2026!';
  const loginRes = await fetch(`${BASE}/api/trpc/admin.login?batch=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ '0': { json: { password: adminPassword } } }),
  });
  const loginJson = await loginRes.json();
  const adminToken = loginJson[0]?.result?.data?.json?.token;
  if (!adminToken) {
    console.error('Failed to get admin token:', JSON.stringify(loginJson));
    process.exit(1);
  }
  console.log(`Got admin session token: ${adminToken.substring(0, 10)}...`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const update of UPDATES) {
    const race = byState[update.stateCode];
    if (!race) {
      console.log(`  ⚠️  ${update.stateCode}: Race not found in DB, skipping`);
      skipped++;
      continue;
    }
    
    // Build the update payload
    const payload = {
      id: race.id,
      adminToken,
    };
    
    if (update.candidate1Name !== undefined) payload.candidate1Name = update.candidate1Name;
    if (update.candidate1Party !== undefined) payload.candidate1Party = update.candidate1Party;
    if (update.candidate2Name !== undefined) payload.candidate2Name = update.candidate2Name;
    if (update.candidate2Party !== undefined) payload.candidate2Party = update.candidate2Party;
    if (update.notes !== undefined) payload.notes = update.notes;
    
    // Call the senate.update procedure
    const res = await fetch(`${BASE}/api/trpc/senate.update?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ '0': { json: payload } }),
    });
    const json = await res.json();
    
    if (res.ok && json[0]?.result?.data?.json?.success) {
      console.log(`  ✅ ${update.stateCode}: Updated`);
      updated++;
    } else {
      console.log(`  ❌ ${update.stateCode}: Failed — ${JSON.stringify(json[0]?.error?.json?.message || json)}`);
      skipped++;
    }
  }
  
  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
}

main().catch(console.error);
