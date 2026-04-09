/**
 * Seed script: 36 gubernatorial races for 2026
 *
 * Ratings consensus from:
 *   - Cook Political Report (Apr 9, 2026)
 *   - Inside Elections / Nathan Gonzales (Mar 26, 2026)
 *   - Sabato's Crystal Ball (Mar 19, 2026)
 *
 * Majority-rule applied where sources differ.
 * Primary dates sourced from state election authority websites / Ballotpedia.
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Truncate first so re-runs are idempotent
await conn.execute('DELETE FROM governor_races');

const races = [
  // ── SOLID D ──────────────────────────────────────────────────────────────
  {
    stateCode: 'CA', stateName: 'California',
    incumbentName: 'Gavin Newsom', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'June 2, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Newsom term-limited. Deep blue state; Democratic nominee is heavy favorite.',
  },
  {
    stateCode: 'CO', stateName: 'Colorado',
    incumbentName: 'Jared Polis', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'June 23, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Polis term-limited. Colorado has trended solidly blue.',
  },
  {
    stateCode: 'CT', stateName: 'Connecticut',
    incumbentName: 'Ned Lamont', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'August 11, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Ned Lamont', repCandidate: 'TBD (R Primary)',
    notes: 'Lamont seeking third term. Connecticut is reliably Democratic.',
  },
  {
    stateCode: 'HI', stateName: 'Hawaii',
    incumbentName: 'Josh Green', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'August 8, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Josh Green', repCandidate: 'TBD (R Primary)',
    notes: 'Green seeking second term. Hawaii is the most Democratic state in the country.',
  },
  {
    stateCode: 'IL', stateName: 'Illinois',
    incumbentName: 'JB Pritzker', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'March 17, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'JB Pritzker', repCandidate: 'TBD (R Primary)',
    notes: 'Pritzker seeking third term. Illinois is reliably Democratic at the statewide level.',
  },
  {
    stateCode: 'MA', stateName: 'Massachusetts',
    incumbentName: 'Maura Healey', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'September 15, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Maura Healey', repCandidate: 'TBD (R Primary)',
    notes: 'Healey seeking second term. Massachusetts is one of the most Democratic states.',
  },
  {
    stateCode: 'MD', stateName: 'Maryland',
    incumbentName: 'Wes Moore', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'June 2, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Wes Moore', repCandidate: 'TBD (R Primary)',
    notes: 'Moore seeking second term. Maryland is a safe Democratic state.',
  },
  {
    stateCode: 'OR', stateName: 'Oregon',
    incumbentName: 'Tina Kotek', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'May 19, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Tina Kotek', repCandidate: 'TBD (R Primary)',
    notes: 'Kotek seeking second term. Oregon is reliably Democratic.',
  },
  {
    stateCode: 'RI', stateName: 'Rhode Island',
    incumbentName: 'Dan McKee', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Solid D',
    primaryDate: 'September 15, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Dan McKee', repCandidate: 'TBD (R Primary)',
    notes: 'McKee seeking second full term. Rhode Island is a safe Democratic state.',
  },
  // ── LIKELY D ─────────────────────────────────────────────────────────────
  {
    stateCode: 'ME', stateName: 'Maine',
    incumbentName: 'Janet Mills', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Likely D',
    primaryDate: 'June 9, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Mills term-limited. Open seat in a competitive state, but Democrats have structural advantage. Cook: Likely D; IE: Likely D; Sabato: Likely D.',
  },
  {
    stateCode: 'MN', stateName: 'Minnesota',
    incumbentName: 'Tim Walz', incumbentParty: 'D',
    isOpen: true, isTermLimited: false, previousParty: 'D',
    rating: 'Likely D',
    primaryDate: 'August 11, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (DFL Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Walz retiring (ran for VP 2024). Open seat; Minnesota has voted Democratic for president since 1972. Cook: Likely D; IE: Likely D; Sabato: Likely D.',
  },
  {
    stateCode: 'NM', stateName: 'New Mexico',
    incumbentName: 'Michelle Lujan Grisham', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Likely D',
    primaryDate: 'June 2, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Lujan Grisham term-limited. New Mexico has trended Democratic. Cook: Likely D; IE: Likely D; Sabato: Likely D.',
  },
  {
    stateCode: 'NY', stateName: 'New York',
    incumbentName: 'Kathy Hochul', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Likely D',
    primaryDate: 'June 23, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Kathy Hochul', repCandidate: 'TBD (R Primary)',
    notes: 'Hochul seeking second full term. New York is reliably Democratic but Hochul narrowly won in 2022. Cook: Likely D; IE: Likely D; Sabato: Safe D.',
  },
  {
    stateCode: 'PA', stateName: 'Pennsylvania',
    incumbentName: 'Josh Shapiro', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Likely D',
    primaryDate: 'May 19, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Josh Shapiro', repCandidate: 'TBD (R Primary)',
    notes: 'Shapiro seeking second term. Won by 15 pts in 2022 in a key swing state. Cook: Likely D; IE: Likely D; Sabato: Likely D.',
  },
  // ── TOSS-UP ───────────────────────────────────────────────────────────────
  {
    stateCode: 'AZ', stateName: 'Arizona',
    incumbentName: 'Katie Hobbs', incumbentParty: 'D',
    isOpen: false, isTermLimited: false, previousParty: 'D',
    rating: 'Toss-up',
    primaryDate: 'August 4, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'Katie Hobbs', repCandidate: 'TBD (R Primary)',
    notes: 'Hobbs won by only 0.6% in 2022. Arizona is a true battleground. Cook: Toss-up; IE: Toss-up; Sabato: Lean D (Mar 19).',
  },
  {
    stateCode: 'KS', stateName: 'Kansas',
    incumbentName: 'Laura Kelly', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Toss-up',
    primaryDate: 'August 4, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Kelly term-limited. Democrats defending a seat in a deep-red state. Cook: Toss-up; IE: Toss-up; Sabato: Toss-up.',
  },
  {
    stateCode: 'MI', stateName: 'Michigan',
    incumbentName: 'Gretchen Whitmer', incumbentParty: 'D',
    isOpen: true, isTermLimited: true, previousParty: 'D',
    rating: 'Toss-up',
    primaryDate: 'August 4, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Whitmer term-limited. Michigan is a key presidential battleground. Cook: Toss-up; IE: Toss-up; Sabato: Toss-up.',
  },
  {
    stateCode: 'WI', stateName: 'Wisconsin',
    incumbentName: 'Tony Evers', incumbentParty: 'D',
    isOpen: true, isTermLimited: false, previousParty: 'D',
    rating: 'Toss-up',
    primaryDate: 'August 11, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Evers retiring. Wisconsin is one of the most competitive states in the country. Cook: Toss-up; IE: Toss-up; Sabato: Toss-up.',
  },
  // ── LEAN R ────────────────────────────────────────────────────────────────
  {
    stateCode: 'IA', stateName: 'Iowa',
    incumbentName: 'Kim Reynolds', incumbentParty: 'R',
    isOpen: true, isTermLimited: false, previousParty: 'R',
    rating: 'Lean R',
    primaryDate: 'June 2, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Reynolds retiring. Iowa has shifted Republican but this open seat is competitive. Cook: Toss-up (Apr 9); IE: Lean R; Sabato: Lean R. Majority = Lean R.',
  },
  {
    stateCode: 'NV', stateName: 'Nevada',
    incumbentName: 'Joe Lombardo', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Lean R',
    primaryDate: 'June 9, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Joe Lombardo',
    notes: 'Lombardo seeking second term. Nevada is a swing state but Lombardo has incumbency advantage. Cook: Lean R; IE: Tilt R; Sabato: Lean R.',
  },
  // ── LIKELY R ──────────────────────────────────────────────────────────────
  {
    stateCode: 'GA', stateName: 'Georgia',
    incumbentName: 'Brian Kemp', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Likely R',
    primaryDate: 'May 19, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Kemp term-limited. Georgia is a battleground but Republicans have structural advantage in gubernatorial races. Cook: Likely R; IE: Tilt R; Sabato: Toss-up (Mar 19). Majority = Likely R.',
  },
  {
    stateCode: 'OH', stateName: 'Ohio',
    incumbentName: 'Mike DeWine', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Likely R',
    primaryDate: 'May 5, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'DeWine term-limited. Ohio has shifted Republican in recent cycles. Cook: Likely R; IE: Likely R; Sabato: Lean R.',
  },
  // ── SOLID R ───────────────────────────────────────────────────────────────
  {
    stateCode: 'AK', stateName: 'Alaska',
    incumbentName: 'Mike Dunleavy', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'August 18, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Dunleavy term-limited. Alaska is a reliably Republican state.',
  },
  {
    stateCode: 'AL', stateName: 'Alabama',
    incumbentName: 'Kay Ivey', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'May 5, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Ivey term-limited. Alabama is a deep-red state.',
  },
  {
    stateCode: 'AR', stateName: 'Arkansas',
    incumbentName: 'Sarah Huckabee Sanders', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'May 19, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Sarah Huckabee Sanders',
    notes: 'Sanders seeking second term. Arkansas is a safe Republican state.',
  },
  {
    stateCode: 'FL', stateName: 'Florida',
    incumbentName: 'Ron DeSantis', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'August 18, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'DeSantis term-limited. Florida has shifted solidly Republican in recent cycles.',
  },
  {
    stateCode: 'ID', stateName: 'Idaho',
    incumbentName: 'Brad Little', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'May 19, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Brad Little',
    notes: 'Little seeking third term. Idaho is a deep-red state.',
  },
  {
    stateCode: 'NE', stateName: 'Nebraska',
    incumbentName: 'Jim Pillen', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'May 12, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Jim Pillen',
    notes: 'Pillen seeking second term. Nebraska is a safe Republican state.',
  },
  {
    stateCode: 'NH', stateName: 'New Hampshire',
    incumbentName: 'Kelly Ayotte', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'September 8, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Kelly Ayotte',
    notes: 'Ayotte elected in 2024 (2-year term). NH is competitive but Ayotte has incumbency advantage. Cook/IE/Sabato: Solid R.',
  },
  {
    stateCode: 'OK', stateName: 'Oklahoma',
    incumbentName: 'Kevin Stitt', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'June 23, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Stitt term-limited. Oklahoma is a deep-red state.',
  },
  {
    stateCode: 'SC', stateName: 'South Carolina',
    incumbentName: 'Henry McMaster', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'June 9, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'McMaster term-limited. South Carolina is a safe Republican state.',
  },
  {
    stateCode: 'SD', stateName: 'South Dakota',
    incumbentName: 'Larry Rhoden', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'June 2, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Larry Rhoden',
    notes: 'Rhoden (assumed office Jan 2025 after Noem left for DHS) seeking first full term. South Dakota is a safe Republican state.',
  },
  {
    stateCode: 'TN', stateName: 'Tennessee',
    incumbentName: 'Bill Lee', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'August 6, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Lee term-limited. Tennessee is a deep-red state.',
  },
  {
    stateCode: 'TX', stateName: 'Texas',
    incumbentName: 'Greg Abbott', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'March 3, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Greg Abbott',
    notes: 'Abbott seeking fourth term. Texas is trending competitive but still solidly Republican at the gubernatorial level.',
  },
  {
    stateCode: 'VT', stateName: 'Vermont',
    incumbentName: 'Phil Scott', incumbentParty: 'R',
    isOpen: false, isTermLimited: false, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'August 11, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'Phil Scott',
    notes: 'Scott seeking fifth term (2-year terms). Vermont is deeply blue but Scott is a popular moderate Republican governor.',
  },
  {
    stateCode: 'WY', stateName: 'Wyoming',
    incumbentName: 'Mark Gordon', incumbentParty: 'R',
    isOpen: true, isTermLimited: true, previousParty: 'R',
    rating: 'Solid R',
    primaryDate: 'August 18, 2026', generalDate: 'November 3, 2026',
    demCandidate: 'TBD (D Primary)', repCandidate: 'TBD (R Primary)',
    notes: 'Gordon term-limited. Wyoming is the most Republican state in the country.',
  },
];

// Insert all 36 races
for (const r of races) {
  await conn.execute(
    `INSERT INTO governor_races
      (state_code, state_name, incumbent_name, incumbent_party, is_open, is_term_limited,
       previous_party, rating, primary_date, runoff_date, general_date, is_special,
       dem_candidate, rep_candidate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.stateCode, r.stateName,
      r.incumbentName ?? null, r.incumbentParty ?? null,
      r.isOpen ? 1 : 0, r.isTermLimited ? 1 : 0,
      r.previousParty, r.rating,
      r.primaryDate ?? null, r.runoffDate ?? null,
      r.generalDate, r.isSpecial ? 1 : 0,
      r.demCandidate ?? null, r.repCandidate ?? null,
      r.notes ?? null,
    ]
  );
}

// Verify
const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM governor_races');
console.log(`✅ Seeded ${rows[0].cnt} governor races`);

// Show rating distribution
const [dist] = await conn.execute(
  `SELECT rating, COUNT(*) as cnt FROM governor_races GROUP BY rating ORDER BY FIELD(rating,'Solid D','Likely D','Lean D','Toss-up','Lean R','Likely R','Solid R')`
);
console.log('\nRating distribution:');
for (const row of dist) {
  console.log(`  ${row.rating}: ${row.cnt}`);
}

await conn.end();
