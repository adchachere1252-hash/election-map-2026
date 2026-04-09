import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const fixes = [];

// ============================================================
// CRITICAL: MI-7 — Tom Barrett (R) is the incumbent, NOT Curtis Hertel (D)
// Barrett won MI-7 in 2024 defeating Hertel
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  incumbent = 'Tom Barrett',
  incumbent_party = 'R',
  candidate1_name = NULL,
  candidate1_party = NULL,
  candidate2_name = 'Tom Barrett',
  candidate2_party = 'R',
  rating = 'Lean R',
  notes = 'Tom Barrett (R) won MI-7 in 2024, defeating Curtis Hertel (D). Cook: Lean R (Apr 7, 2026).'
  WHERE state_code = 'MI' AND district = 7`));

// ============================================================
// NC-1 — Don Davis (D) is the incumbent, rating is Toss-up per Cook
// Cook shows it as competitive with Laurie Buckhout (R) challenger
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Toss-up',
  notes = 'Don Davis (D) incumbent. Laurie Buckhout (R) challenger. Cook: Toss-up (Apr 7, 2026). Competitive district.'
  WHERE state_code = 'NC' AND district = 1`));

// ============================================================
// CA-27 — George Whitesides (D) won in 2024, rating should be Lean D not Lean R
// Cook does NOT list CA-27 as competitive (not in their table)
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Lean D',
  notes = 'George Whitesides (D) won CA-27 in 2024. Cook does not list as competitive. Lean D.'
  WHERE state_code = 'CA' AND district = 27`));

// ============================================================
// PA-7 — Ryan Mackenzie (R) is the incumbent, rating should be Lean R not Lean D
// Mackenzie won PA-7 in 2024 (1.0% margin). Cook: Lean R.
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Lean R',
  candidate1_name = NULL,
  candidate1_party = NULL,
  candidate2_name = 'Ryan Mackenzie',
  candidate2_party = 'R',
  notes = 'Ryan Mackenzie (R) won PA-7 in 2024 by 1.0%. Cook: Lean R (Apr 7, 2026).'
  WHERE state_code = 'PA' AND district = 7`));

// ============================================================
// CA-45 — Derek Tran (D) won in 2024, rating should be Lean D not Lean R
// Cook shows CA-45 as competitive but with D lean (Tran won by 3.9%)
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Lean D',
  notes = 'Derek Tran (D) won CA-45 in 2024 by 3.9%. Cook: Lean D (Apr 7, 2026).'
  WHERE state_code = 'CA' AND district = 45`));

// ============================================================
// NY-4 — Laura Gillen (D) won in 2024, rating should be Lean D not Lean R
// Cook shows NY-4 as competitive (Gillen won by 2.3%)
// ============================================================
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Lean D',
  notes = 'Laura Gillen (D) won NY-4 in 2024 by 2.3%. Cook: Lean D (Apr 7, 2026).'
  WHERE state_code = 'NY' AND district = 4`));

// ============================================================
// ADD MISSING COMPETITIVE RACES from Cook Apr 7, 2026
// ============================================================

// CA-48: Darrell Issa (R) retiring
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('CA', 'California', 48, 'CA-48', 'Darrell Issa', 'R', 1, 'Likely R', NULL, NULL, NULL, NULL,
  'Open seat (Darrell Issa retiring). Cook: Likely R (Apr 7, 2026).')`));

// FL-23: Jared Moskowitz (D) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('FL', 'Florida', 23, 'FL-23', 'Jared Moskowitz', 'D', 0, 'Lean D', 'Jared Moskowitz', 'D', NULL, NULL,
  'Jared Moskowitz (D) won FL-23 in 2024 by 4.9%. Cook: Lean D (Apr 7, 2026).')`));

// IN-1: Frank Mrvan (D) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('IN', 'Indiana', 1, 'IN-1', 'Frank Mrvan', 'D', 0, 'Lean D', 'Frank Mrvan', 'D', NULL, NULL,
  'Frank Mrvan (D) won IN-1 in 2024 by 8.5%. Cook: Lean D (Apr 7, 2026). Trump won district by 0.3%.')`));

// MI-10: John James (R) retiring to run for governor
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('MI', 'Michigan', 10, 'MI-10', 'John James', 'R', 1, 'Lean R', NULL, NULL, NULL, NULL,
  'Open seat (John James retiring to run for governor). Cook: Lean R (Apr 7, 2026).')`));

// MO-5: Emanuel Cleaver (D) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('MO', 'Missouri', 5, 'MO-5', 'Emanuel Cleaver', 'D', 0, 'Lean D', 'Emanuel Cleaver', 'D', NULL, NULL,
  'Emanuel Cleaver (D) won MO-5 in 2024. Cook: Lean D (Apr 7, 2026). Trump won district by 18.3% but Cleaver has held since 2005.')`));

// NJ-7: Tom Kean (R) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('NJ', 'New Jersey', 7, 'NJ-7', 'Tom Kean', 'R', 0, 'Lean R', NULL, NULL, 'Tom Kean', 'R',
  'Tom Kean (R) won NJ-7 in 2024 by 5.4%. Cook: Lean R (Apr 7, 2026).')`));

// NJ-9: Nellie Pou (D) incumbent (won special election 2025)
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('NJ', 'New Jersey', 9, 'NJ-9', 'Nellie Pou', 'D', 0, 'Lean D', 'Nellie Pou', 'D', NULL, NULL,
  'Nellie Pou (D) won NJ-9 special election in 2025. Cook: Lean D (Apr 7, 2026).')`));

// NY-19: Josh Riley (D) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('NY', 'New York', 19, 'NY-19', 'Josh Riley', 'D', 0, 'Lean D', 'Josh Riley', 'D', NULL, NULL,
  'Josh Riley (D) won NY-19 in 2024 by 2.2%. Cook: Lean D (Apr 7, 2026).')`));

// PA-1: Brian Fitzpatrick (R) incumbent
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('PA', 'Pennsylvania', 1, 'PA-1', 'Brian Fitzpatrick', 'R', 0, 'Lean R', NULL, NULL, 'Brian Fitzpatrick', 'R',
  'Brian Fitzpatrick (R) won PA-1 in 2024 by 12.8%. Cook: Lean R (Apr 7, 2026). Trump won district by 0.3% — highly competitive.')`));

// UT-1: Blake Moore (R) competitive
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('UT', 'Utah', 1, 'UT-1', 'Blake Moore', 'R', 0, 'Lean R', NULL, NULL, 'Blake Moore', 'R',
  'Blake Moore (R) won UT-1 in 2024 by 23.6%. Cook: Lean R (Apr 7, 2026). Trump won district by 23.6%.')`));

// VA-1: Rob Wittman (R) competitive
fixes.push(conn.execute(`INSERT INTO house_races 
  (state_code, state_name, district, district_label, incumbent, incumbent_party, incumbent_retiring, rating, candidate1_name, candidate1_party, candidate2_name, candidate2_party, notes)
  VALUES ('VA', 'Virginia', 1, 'VA-1', 'Rob Wittman', 'R', 0, 'Lean R', NULL, NULL, 'Rob Wittman', 'R',
  'Rob Wittman (R) won VA-1 in 2024 by 12.8%. Cook: Lean R (Apr 7, 2026). Trump won district by 4.9%.')`));

// TX-28: Update rating — Cook shows as competitive
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Toss-up',
  notes = 'Henry Cuellar (D) incumbent. Tano Tijerina (R) challenger. Cook: Toss-up (Apr 7, 2026). Cuellar won by 10.3% in 2024 but faces strong challenge.'
  WHERE state_code = 'TX' AND district = 28`));

// OH-13: Update to Likely D per Cook Apr 7 change
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Likely D',
  notes = 'Emilia Strong Sykes (D) incumbent. Cook: Likely D (Apr 7, 2026, upgraded from Lean D).'
  WHERE state_code = 'OH' AND district = 13`));

// OH-1: Update to Lean D per Cook Apr 7 change
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Lean D',
  notes = 'Greg Landsman (D) incumbent. Cook: Lean D (Apr 7, 2026, upgraded from Toss-up).'
  WHERE state_code = 'OH' AND district = 1`));

// PA-8: Update to Toss-up per Cook Apr 7 change
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Toss-up',
  notes = 'Rob Bresnahan (R) won PA-8 in 2024 by 1.6%. Cook: Toss-up (Apr 7, 2026, downgraded from Lean R).'
  WHERE state_code = 'PA' AND district = 8`));

// NE-2: Don Bacon retiring — fix rating to Toss-up (open seat)
fixes.push(conn.execute(`UPDATE house_races SET 
  rating = 'Toss-up',
  candidate2_name = NULL,
  candidate2_party = NULL,
  notes = 'Open seat (Don Bacon not running for re-election). Bacon won by 1.9% in 2024. Toss-up without incumbent. Cook: Toss-up.'
  WHERE state_code = 'NE' AND district = 2`));

await Promise.all(fixes);
console.log('All', fixes.length, 'house corrections applied!');

// Verify key fixes
const [mi7] = await conn.execute("SELECT incumbent, incumbent_party, rating FROM house_races WHERE state_code='MI' AND district=7");
console.log('MI-7:', JSON.stringify(mi7[0]));
const [nc1] = await conn.execute("SELECT incumbent, rating FROM house_races WHERE state_code='NC' AND district=1");
console.log('NC-1:', JSON.stringify(nc1[0]));
const [pa7] = await conn.execute("SELECT incumbent, incumbent_party, rating FROM house_races WHERE state_code='PA' AND district=7");
console.log('PA-7:', JSON.stringify(pa7[0]));

await conn.end();
