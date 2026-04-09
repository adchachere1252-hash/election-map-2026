import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const updates = [
  // 1. NC: Toss-up
  [`UPDATE senate_races SET rating = 'Toss-up', notes = 'Open seat (Tillis retiring). Roy Cooper (D) won D primary Mar 3. Michael Whatley (R) won R primary Mar 3 (64.6%). Inside Elections: Toss-up (Mar 2026). Cook: Toss-up.' WHERE state_code = 'NC'`, 'NC rating → Toss-up'],
  // 2. MN: Likely D + candidates
  [`UPDATE senate_races SET rating = 'Likely D', candidate1_name = 'Peggy Flanagan', candidate1_party = 'D', candidate2_name = 'Michele Tafoya', candidate2_party = 'R', notes = 'Open seat (Tina Smith retiring). Peggy Flanagan (D, Lt. Gov) leads D primary. Michele Tafoya (R, former NBC sportscaster) is R frontrunner. Primary: Aug 11, 2026. Inside Elections: Likely Democratic (Mar 2026).' WHERE state_code = 'MN'`, 'MN rating → Likely D + candidates'],
  // 3. ME: Toss-up
  [`UPDATE senate_races SET rating = 'Toss-up', notes = 'Susan Collins (R) seeking re-election. Sabato: Toss-up (Oct 2025). Inside Elections: Tilt Republican (Mar 2026). Collins faces competitive race in blue-trending state.' WHERE state_code = 'ME'`, 'ME rating → Toss-up'],
  // 4. MT: Likely R + not retiring
  [`UPDATE senate_races SET rating = 'Likely R', incumbent_retiring = 0, notes = 'Steve Daines (R) seeking re-election. Sabato: Likely Republican (Mar 4, 2026 change). Inside Elections: Likely Republican (Mar 2026).' WHERE state_code = 'MT'`, 'MT rating → Likely R, not retiring'],
  // 5. NH: Add candidates
  [`UPDATE senate_races SET candidate1_name = 'Chris Pappas', candidate1_party = 'D', candidate2_name = 'John Sununu', candidate2_party = 'R', notes = 'Open seat (Shaheen retiring). Chris Pappas (D, Rep. NH-1) and John Sununu (R, former Sen.) are frontrunners. Primary: Sep 8, 2026. Inside Elections: Tilt Democratic (Mar 2026). Sabato: Leans Democratic.' WHERE state_code = 'NH'`, 'NH add candidates Pappas vs Sununu'],
  // 6. OK: Armstrong incumbent, open seat
  [`UPDATE senate_races SET incumbent = 'Alan Armstrong (appointed)', incumbent_retiring = 1, notes = 'Alan Armstrong (R) appointed Mar 24, 2026 by Gov. Stitt to fill vacancy left by Markwayne Mullin (confirmed as Sec. of Homeland Security). Armstrong will NOT run in 2026. Open seat for Nov election. Solid R.' WHERE state_code = 'OK'`, 'OK incumbent → Armstrong (appointed), open seat'],
  // 7. OH: Toss-up (Brown leading polls)
  [`UPDATE senate_races SET rating = 'Toss-up', notes = 'Special election for JD Vance seat (became VP Jan 2025). Jon Husted (R) appointed. Sherrod Brown (D) running after losing his Class I seat in 2024. Polls show statistical tie. Sabato: Leans Republican. Inside Elections: Lean Republican. Competitive race.' WHERE state_code = 'OH'`, 'OH rating → Toss-up (Brown leading polls)'],
  // 8. FL: Update notes
  [`UPDATE senate_races SET notes = 'Special election. Ashley Moody (R) appointed by Gov. DeSantis to replace Marco Rubio (Sec of State). Sabato: Likely Republican (Jan 2026). Inside Elections: Solid Republican. Primary: Aug 18, 2026. Alex Vindman (D) is leading D candidate.' WHERE state_code = 'FL'`, 'FL update notes'],
  // 9. IL: Solid D
  [`UPDATE senate_races SET rating = 'Solid D', notes = 'Open seat (Durbin retiring). Juliana Stratton (D, Lt. Gov) vs Don Tracy (R). Inside Elections: Solid Democratic. Illinois is reliably Democratic.' WHERE state_code = 'IL'`, 'IL rating → Solid D'],
  // 10. NJ: Solid D
  [`UPDATE senate_races SET rating = 'Solid D', notes = 'Cory Booker (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). New Jersey is reliably Democratic.' WHERE state_code = 'NJ'`, 'NJ rating → Solid D'],
  // 11. NM: Solid D
  [`UPDATE senate_races SET rating = 'Solid D', notes = 'Ben Ray Lujan (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). New Mexico is reliably Democratic.' WHERE state_code = 'NM'`, 'NM rating → Solid D'],
  // 12. VA: Solid D
  [`UPDATE senate_races SET rating = 'Solid D', notes = 'Mark Warner (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). Virginia has trended strongly Democratic.' WHERE state_code = 'VA'`, 'VA rating → Solid D'],
  // 13. CO: Solid D
  [`UPDATE senate_races SET rating = 'Solid D', notes = 'John Hickenlooper (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). Colorado has trended strongly Democratic.' WHERE state_code = 'CO'`, 'CO rating → Solid D'],
  // 14. TX: Fix candidate2 name
  [`UPDATE senate_races SET candidate2_name = 'John Cornyn', candidate2_party = 'R', notes = 'John Cornyn (R) won R primary Mar 3, 2026. James Talarico (D) is D nominee. Rated Solid R. Cornyn is safe in Texas.' WHERE state_code = 'TX'`, 'TX fix candidate2 name'],
  // 15. GA: Update notes
  [`UPDATE senate_races SET notes = 'Jon Ossoff (D) seeking re-election. Sabato: Leans Democratic (Jan 2026 change). Inside Elections: Toss-up (Mar 2026). Cook: Toss-up. Most competitive D-held seat this cycle.' WHERE state_code = 'GA'`, 'GA update notes'],
  // 16. NC-1 House: Lean R
  [`UPDATE house_races SET rating = 'Lean R' WHERE state_name = 'North Carolina' AND district = 1`, 'NC-1 rating → Lean R'],
  // 17. NY-22 House: Solid D
  [`UPDATE house_races SET rating = 'Solid D' WHERE state_name = 'New York' AND district = 22`, 'NY-22 rating → Solid D'],
  // 18. VA-7 House: Likely D
  [`UPDATE house_races SET rating = 'Likely D' WHERE state_name = 'Virginia' AND district = 7`, 'VA-7 rating → Likely D'],
  // 19. TX-28 House: Lean D
  [`UPDATE house_races SET rating = 'Lean D' WHERE state_name = 'Texas' AND district = 28`, 'TX-28 rating → Lean D'],
  // 20. VA Republican districts: Solid R
  [`UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 1`, 'VA-1 rating → Solid R'],
  [`UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 5`, 'VA-5 rating → Solid R'],
  [`UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 6`, 'VA-6 rating → Solid R'],
  [`UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 9`, 'VA-9 rating → Solid R'],
];

let passed = 0;
let failed = 0;
for (const [sql, label] of updates) {
  try {
    const [result] = await conn.execute(sql);
    console.log(`✓ ${label} (${result.affectedRows} rows)`);
    passed++;
  } catch (err) {
    console.error(`✗ ${label}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${passed} passed, ${failed} failed`);
await conn.end();
