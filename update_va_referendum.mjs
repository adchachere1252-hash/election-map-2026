import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Official ballot title from Virginia Department of Elections / Ballotpedia
const officialBallotQuestion = `Should the Constitution of Virginia be amended to allow the General Assembly to temporarily adopt new congressional districts to restore fairness in the upcoming elections, while ensuring Virginia's standard redistricting process resumes for all future redistricting after the 2030 census?`;

// Full description with YES/NO explanations
const description = officialBallotQuestion;

const notes = `OFFICIAL BALLOT QUESTION (April 21, 2026 Special Election):
"${officialBallotQuestion}"

✅ YES — Allows the General Assembly to redraw Virginia's 11 congressional districts between Jan 1, 2025 and Oct 31, 2030, if another state redraws its districts for reasons other than decennial redistricting or a court order. If approved, House Bill 29 takes effect, shifting four Republican-held districts to be more Democratic based on the 2025 gubernatorial election results. The Virginia Redistricting Commission would resume its standard process for 2031.

❌ NO — The current congressional map adopted by the Virginia Redistricting Commission remains in place through 2030 unless changed by a court order.

Source: Virginia Department of Elections · Ballotpedia (April 2026)`;

await conn.execute(
  `UPDATE referendums SET description = ?, notes = ? WHERE state_code = 'VA'`,
  [description, notes]
);

console.log('✅ Virginia referendum updated with official ballot question text.');

const [rows] = await conn.execute('SELECT id, name, description, notes FROM referendums WHERE state_code = "VA"');
console.log('\nUpdated record:');
console.log('Name:', rows[0].name);
console.log('Description:', rows[0].description);
console.log('Notes:', rows[0].notes);

await conn.end();
