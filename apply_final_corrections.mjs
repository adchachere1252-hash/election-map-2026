// Final batch of corrections from full House verification
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const corrections = [
  // TX-9: Al Green not running → Leticia Gutierrez (D) vs Roy Morales (R)
  // Rating stays Solid R (Cook/IE confirm: this district was redrawn to be R-leaning)
  {
    label: 'TX-9: Al Green not running → Gutierrez (D) vs Morales (R)',
    query: `UPDATE house_races SET 
      candidate1_name = 'Leticia Gutierrez',
      candidate1_party = 'D',
      candidate2_name = 'Roy Morales',
      candidate2_party = 'R',
      incumbent = NULL,
      incumbent_party = NULL,
      incumbent_retiring = 1,
      notes = 'Open seat. Al Green not running for re-election. Leticia Gutierrez (D) vs Roy Morales (R) in general. Cook/IE: Solid R.'
    WHERE state_code = 'TX' AND district = 9`
  },
  // TX-22: Troy Nehls retiring → Trever Nehls (R, son) vs Marquette Greene-Scott (D)
  {
    label: 'TX-22: Troy Nehls retiring → Trever Nehls (R) vs Greene-Scott (D)',
    query: `UPDATE house_races SET 
      candidate1_name = 'Marquette Greene-Scott',
      candidate1_party = 'D',
      candidate2_name = 'Trever Nehls',
      candidate2_party = 'R',
      incumbent = NULL,
      incumbent_party = NULL,
      incumbent_retiring = 1,
      notes = 'Open seat. Troy Nehls (R) not running for re-election. His son Trever Nehls won the March 3 R primary. D candidate: Marquette Greene-Scott.'
    WHERE state_code = 'TX' AND district = 22`
  },
  // NJ-11: Mikie Sherrill resigned after being elected Governor → open seat
  // D primary June 2 (Cresitello, Lewis, Mejia, Strickland), R primary June 2 (Hathaway)
  {
    label: 'NJ-11: Sherrill resigned → open seat, primaries Jun 2',
    query: `UPDATE house_races SET 
      candidate1_name = 'TBD — D Primary: Jun 2, 2026 (Cresitello, Lewis, Mejia, Strickland)',
      candidate1_party = 'D',
      candidate2_name = 'TBD — R Primary: Jun 2, 2026 (Hathaway)',
      candidate2_party = 'R',
      incumbent = NULL,
      incumbent_party = NULL,
      incumbent_retiring = 1,
      notes = 'Open seat. Mikie Sherrill (D) resigned after being elected NJ Governor. D primary Jun 2: Donald Cresitello, Joseph Lewis, Analilia Mejia, Justin Strickland. R primary Jun 2: Joe Hathaway. Rating: Solid D.'
    WHERE state_code = 'NJ' AND district = 11`
  },
  // MD-6: April McClain Delaney is the incumbent, not David Trone
  // D primary June 23 (McClain Delaney, Trone, 6 others), R: Moshe Landman
  {
    label: 'MD-6: McClain Delaney is incumbent, D primary Jun 23',
    query: `UPDATE house_races SET 
      candidate1_name = 'TBD — D Primary: Jun 23, 2026 (McClain Delaney, Trone, others)',
      candidate1_party = 'D',
      candidate2_name = 'Moshe Landman',
      candidate2_party = 'R',
      incumbent = 'April McClain Delaney',
      incumbent_party = 'D',
      incumbent_retiring = 0,
      notes = 'Incumbent April McClain Delaney (D) running for re-election. D primary Jun 23: McClain Delaney, David Trone (former rep 2019-2025), and 6 others. R: Moshe Landman. Rating: Solid D.'
    WHERE state_code = 'MD' AND district = 6`
  },
  // WA-4: Fix rating — was incorrectly "Solid D" for a R-held district
  {
    label: 'WA-4: Fix rating from Solid D to Solid R (was R-held open seat)',
    query: `UPDATE house_races SET 
      rating = 'Solid R'
    WHERE state_code = 'WA' AND district = 4`
  },
  // WA-5: Fix rating — was incorrectly "Solid D" for a R-held district
  {
    label: 'WA-5: Fix rating from Solid D to Solid R (Baumgartner R incumbent)',
    query: `UPDATE house_races SET 
      rating = 'Solid R'
    WHERE state_code = 'WA' AND district = 5`
  },
];

console.log('=== APPLYING FINAL CORRECTIONS ===');
let successCount = 0;
for (const c of corrections) {
  try {
    const [result] = await conn.execute(c.query);
    console.log(`✅ ${c.label} (${result.affectedRows} rows updated)`);
    successCount++;
  } catch (err) {
    console.error(`❌ ${c.label}: ${err.message}`);
  }
}

// Final verification check
const [finalCheck] = await conn.execute(`
  SELECT state_code, district, candidate1_name, candidate1_party, candidate2_name, candidate2_party, 
         incumbent_retiring, rating, incumbent
  FROM house_races 
  WHERE (state_code = 'TX' AND district IN (9, 22))
     OR (state_code = 'NJ' AND district = 11)
     OR (state_code = 'MD' AND district = 6)
     OR (state_code = 'WA' AND district IN (4, 5))
  ORDER BY state_code, district
`);

console.log('\n=== FINAL STATE ===');
finalCheck.forEach(r => {
  console.log(`${r.state_code}-${r.district}: incumbent="${r.incumbent}" | [${r.candidate1_party}] ${r.candidate1_name?.substring(0,40)} vs [${r.candidate2_party}] ${r.candidate2_name?.substring(0,40)} | retiring=${r.incumbent_retiring} | rating=${r.rating}`);
});

console.log(`\n✅ Applied ${successCount}/${corrections.length} corrections`);
await conn.end();
