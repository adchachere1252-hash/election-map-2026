// Apply all corrections found during full House verification
// Uses correct column names: state_code, district
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// First check current state of flagged races
const [rows] = await conn.execute(`
  SELECT state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, 
         incumbent_retiring, rating, incumbent
  FROM house_races 
  WHERE (state_code = 'NY' AND district = 21)
     OR (state_code = 'WY' AND district = 0)
     OR (state_code = 'WI' AND district = 7)
     OR (state_code = 'WA' AND district = 4)
     OR (state_code = 'WA' AND district = 5)
     OR (state_code = 'TX' AND district = 2)
     OR (state_code = 'TX' AND district = 9)
     OR (state_code = 'TX' AND district = 22)
     OR (state_code = 'TX' AND district = 37)
     OR (state_code = 'MD' AND district = 6)
     OR (state_code = 'NJ' AND district = 11)
     OR (state_code = 'CA' AND district = 1)
  ORDER BY state_code, district
`);

console.log('=== CURRENT STATE ===');
rows.forEach(r => {
  console.log(`${r.state_code}-${r.district}: incumbent="${r.incumbent}" | [${r.candidate1_party}] ${r.candidate1_name} vs [${r.candidate2_party}] ${r.candidate2_name} | retiring=${r.incumbent_retiring} | rating=${r.rating}`);
});

// Apply corrections
const corrections = [
  // NY-21: Elise Stefanik resigned → open seat, both primaries June 23
  {
    label: 'NY-21: Stefanik resigned → open seat',
    state: 'NY', district: 21,
    sets: `candidate1_name = 'TBD — D Primary: Jun 23, 2026 (Metzgier, Schmidt)',
           candidate1_party = 'D',
           candidate2_name = 'TBD — R Primary: Jun 23, 2026 (Collins, Gendebien, Haller, Henson, Amoriell)',
           candidate2_party = 'R',
           incumbent = NULL,
           incumbent_party = NULL,
           incumbent_retiring = 1,
           notes = 'Open seat. Stefanik resigned Jan 2025 to become UN Ambassador. Both primaries Jun 23, 2026.'`
  },
  // WY-0: Hageman running for Senate → open seat
  {
    label: 'WY-0: Hageman running for Senate → open seat',
    state: 'WY', district: 0,
    sets: `candidate1_name = NULL,
           candidate1_party = 'D',
           candidate2_name = 'TBD — R Primary: Aug 18, 2026',
           candidate2_party = 'R',
           incumbent = NULL,
           incumbent_party = NULL,
           incumbent_retiring = 1,
           notes = 'Open seat. Harriet Hageman is running for U.S. Senate in 2026 (R primary Aug 18). R primary candidates TBD.'`
  },
  // WI-7: Tom Tiffany retiring → open seat
  {
    label: 'WI-7: Tiffany retiring → open seat',
    state: 'WI', district: 7,
    sets: `incumbent = NULL,
           incumbent_party = NULL,
           incumbent_retiring = 1,
           notes = 'Open seat. Tom Tiffany not running for re-election. D primary Aug 11 (Armstrong, Clark, Murray). R primary Aug 11 (Alfonso, Ebben, Hermening, Threlfall-Baum, Wassgren).'`
  },
  // WA-4: Dan Newhouse retiring → open seat
  {
    label: 'WA-4: Newhouse retiring → open seat',
    state: 'WA', district: 4,
    sets: `candidate2_name = 'TBD — Top-Two Primary: Aug 4, 2026',
           candidate2_party = 'R',
           incumbent = NULL,
           incumbent_party = NULL,
           incumbent_retiring = 1,
           notes = 'Open seat. Dan Newhouse not running for re-election. Top-two primary Aug 4, 2026.'`
  },
  // WA-5: Michael Baumgartner is the current R incumbent (won 2024, CMR retired)
  {
    label: 'WA-5: Baumgartner is the current R incumbent',
    state: 'WA', district: 5,
    sets: `candidate2_name = 'Michael Baumgartner',
           candidate2_party = 'R',
           incumbent = 'Michael Baumgartner',
           incumbent_party = 'R',
           incumbent_retiring = 0`
  },
  // TX-2: Daniel Crenshaw lost primary to Steve Toth (March 3, 2026)
  {
    label: 'TX-2: Crenshaw lost primary → Steve Toth is R nominee',
    state: 'TX', district: 2,
    sets: `candidate2_name = 'Steve Toth',
           candidate2_party = 'R',
           incumbent_retiring = 1,
           notes = 'Incumbent Daniel Crenshaw (R) lost March 3, 2026 primary to Steve Toth. Toth is the R nominee.'`
  },
  // TX-37: Greg Casar is the incumbent (not Lloyd Doggett)
  {
    label: 'TX-37: Greg Casar is the correct D incumbent',
    state: 'TX', district: 37,
    sets: `candidate1_name = 'Greg Casar',
           candidate1_party = 'D',
           incumbent = 'Greg Casar',
           incumbent_party = 'D',
           incumbent_retiring = 0,
           notes = 'Greg Casar (D) is the incumbent, elected in 2024 when TX-37 was redrawn. Lloyd Doggett moved to TX-33.'`
  },
  // CA-1: Doug LaMalfa is the R incumbent (James Gallagher is a primary challenger)
  {
    label: 'CA-1: Doug LaMalfa is the R incumbent (not Gallagher)',
    state: 'CA', district: 1,
    sets: `candidate2_name = 'Doug LaMalfa',
           candidate2_party = 'R',
           incumbent = 'Doug LaMalfa',
           incumbent_party = 'R',
           incumbent_retiring = 0,
           notes = 'Doug LaMalfa (R) is the incumbent. James Gallagher (R) is challenging in top-two primary (Jun 3). D candidates: Audrey Denney, Janice Karrman, Mike McGuire.'`
  },
];

console.log('\n=== APPLYING CORRECTIONS ===');
let successCount = 0;
for (const c of corrections) {
  const query = `UPDATE house_races SET ${c.sets} WHERE state_code = ? AND district = ?`;
  try {
    const [result] = await conn.execute(query, [c.state, c.district]);
    console.log(`✅ ${c.label} (${result.affectedRows} rows updated)`);
    successCount++;
  } catch (err) {
    console.error(`❌ ${c.label}: ${err.message}`);
  }
}

// Check TX-9, TX-22, MD-6, NJ-11 current state
const [check2] = await conn.execute(`
  SELECT state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, 
         incumbent_retiring, rating, incumbent
  FROM house_races 
  WHERE (state_code = 'TX' AND district IN (9, 22))
     OR (state_code = 'MD' AND district = 6)
     OR (state_code = 'NJ' AND district = 11)
  ORDER BY state_code, district
`);

console.log('\n=== ADDITIONAL RACES TO VERIFY ===');
check2.forEach(r => {
  console.log(`${r.state_code}-${r.district}: incumbent="${r.incumbent}" | [${r.candidate1_party}] ${r.candidate1_name} vs [${r.candidate2_party}] ${r.candidate2_name} | retiring=${r.incumbent_retiring} | rating=${r.rating}`);
});

console.log(`\n✅ Applied ${successCount}/${corrections.length} corrections`);
await conn.end();
