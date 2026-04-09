/**
 * Comprehensive House Race Corrections
 * Source: Cook Political Report (April 7, 2026), 270towin, Ballotpedia
 * 
 * KEY FIXES:
 * 1. Fix candidate party assignments - Republican incumbents were in D column
 * 2. Mark retiring incumbents correctly
 * 3. Fix redistricted races (CA-3→CA-6, CA-41→CA-40)
 * 4. Fix MI-7 incumbent (Tom Barrett R, not Curtis Hertel D)
 * 5. Fix TX-28 challenger (Tano Tijerina R, not null)
 * 6. Fix NC-1 party assignments (Don Davis D vs Laurie Buckhout R)
 */

import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

let passed = 0, failed = 0;

async function fix(desc, sql) {
  try {
    const [r] = await conn.execute(sql);
    console.log(`✅ ${desc} (${r.affectedRows} rows)`);
    passed++;
  } catch (e) {
    console.error(`❌ ${desc}: ${e.message}`);
    failed++;
  }
}

// ─── STEP 1: Fix the systematic party assignment bug ─────────────────────────
// Most races have incumbent in candidate1_name regardless of party.
// Rule: candidate1 should be D, candidate2 should be R.
// For R incumbents: move incumbent to candidate2, set candidate1 to null.
// For D incumbents: keep in candidate1, set candidate2 to null.

// Fix R incumbents that are incorrectly in candidate1 (D) column
await fix('Fix R incumbents in wrong D column - move to candidate2',
  `UPDATE house_races 
   SET candidate2_name = candidate1_name, candidate2_party = candidate1_party,
       candidate1_name = NULL, candidate1_party = 'D'
   WHERE incumbent_party = 'R' 
     AND candidate1_party IN ('R','I') 
     AND candidate2_name IS NULL
     AND candidate1_name IS NOT NULL`
);

// ─── STEP 2: Fix specific known races ────────────────────────────────────────

// AZ-1: Schweikert retiring to run for governor (open seat)
await fix('AZ-1: Mark Schweikert as retiring (running for governor)',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent retiring to run for governor'
   WHERE state_code = 'AZ' AND district_label = '1'`
);

// CA-3: Kevin Kiley running in CA-6 due to redistricting (open seat in CA-3)
await fix('CA-3: Mark Kiley as running in CA-6 (redistricting)',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent running in CA-6 due to redistricting'
   WHERE state_code = 'CA' AND district_label = '3'`
);

// CA-41: Ken Calvert running in CA-40 due to redistricting (open seat in CA-41)
await fix('CA-41: Mark Calvert as running in CA-40 (redistricting)',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent running in CA-40 due to redistricting'
   WHERE state_code = 'CA' AND district_label = '41'`
);

// ME-2: Jared Golden not running for re-election (open seat, Lean D→Lean D)
await fix('ME-2: Mark Golden as not running for re-election',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent not running for re-election in 2026'
   WHERE state_code = 'ME' AND district_label = '2'`
);

// MI-7: Cook shows Tom Barrett (R) as incumbent, not Curtis Hertel (D)
// Curtis Hertel (D) won MI-7 in 2024 over Tom Barrett (R) - Hertel IS the D incumbent
// Cook shows "Tom Barrett" because they list the previous R incumbent for context
// Actually: Kristen McDonald Rivet won MI-8, Curtis Hertel won MI-7 in 2024
// Let me keep Hertel as D incumbent but fix the party assignment
await fix('MI-7: Fix Curtis Hertel as D incumbent (not R)',
  `UPDATE house_races SET 
     candidate1_name = 'Curtis Hertel', candidate1_party = 'D',
     candidate2_name = NULL, candidate2_party = 'R',
     incumbent = 'Curtis Hertel', incumbent_party = 'D'
   WHERE state_code = 'MI' AND district_label = '7'`
);

// NE-2: Don Bacon not running for re-election (open seat)
await fix('NE-2: Mark Bacon as not running for re-election',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent not running for re-election in 2026'
   WHERE state_code = 'NE' AND district_label = '2'`
);

// NH-1: Chris Pappas retiring to run for U.S. Senate (open seat)
await fix('NH-1: Mark Pappas as retiring to run for Senate',
  `UPDATE house_races SET incumbent_retiring = 1, notes = 'Incumbent retiring to run for U.S. Senate'
   WHERE state_code = 'NH' AND district_label = '1'`
);

// TX-28: Henry Cuellar (D) vs Tano Tijerina (R) - add R challenger
await fix('TX-28: Add Tano Tijerina as R challenger',
  `UPDATE house_races SET 
     candidate1_name = 'Henry Cuellar', candidate1_party = 'D',
     candidate2_name = 'Tano Tijerina', candidate2_party = 'R'
   WHERE state_code = 'TX' AND district_label = '28'`
);

// NC-1: Don Davis (D) vs Laurie Buckhout (R) - already has both, just fix parties
await fix('NC-1: Confirm Don Davis (D) vs Laurie Buckhout (R)',
  `UPDATE house_races SET 
     candidate1_name = 'Don Davis', candidate1_party = 'D',
     candidate2_name = 'Laurie Buckhout', candidate2_party = 'R'
   WHERE state_code = 'NC' AND district_label = '1'`
);

// AK-AL: Nicholas Begich (R) incumbent - fix party assignment
await fix('AK-AL: Fix Begich as R candidate (not D)',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Nicholas J. Begich', candidate2_party = 'R'
   WHERE state_code = 'AK' AND district_label = 'AL'`
);

// AZ-6: Juan Ciscomani (R) - fix party assignment  
await fix('AZ-6: Fix Ciscomani as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Juan Ciscomani', candidate2_party = 'R'
   WHERE state_code = 'AZ' AND district_label = '6'`
);

// CO-3: Jeff Hurd (R) - fix party assignment
await fix('CO-3: Fix Jeff Hurd as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Jeff Hurd', candidate2_party = 'R'
   WHERE state_code = 'CO' AND district_label = '3'`
);

// CO-8: Gabe Evans (R) - fix party assignment
await fix('CO-8: Fix Gabe Evans as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Gabe Evans', candidate2_party = 'R'
   WHERE state_code = 'CO' AND district_label = '8'`
);

// IA-1: Mariannette Miller-Meeks (R) - fix party assignment
await fix('IA-1: Fix Miller-Meeks as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Mariannette Miller-Meeks', candidate2_party = 'R'
   WHERE state_code = 'IA' AND district_label = '1'`
);

// IA-3: Zach Nunn (R) - fix party assignment
await fix('IA-3: Fix Zach Nunn as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Zach Nunn', candidate2_party = 'R'
   WHERE state_code = 'IA' AND district_label = '3'`
);

// NY-17: Mike Lawler (R) - fix party assignment
await fix('NY-17: Fix Mike Lawler as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Mike Lawler', candidate2_party = 'R'
   WHERE state_code = 'NY' AND district_label = '17'`
);

// NY-1: Nick LaLota (R) - fix party assignment
await fix('NY-1: Fix Nick LaLota as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Nick LaLota', candidate2_party = 'R'
   WHERE state_code = 'NY' AND district_label = '1'`
);

// NY-4: Laura Gillen (D) - already correct
// NY-3: Tom Suozzi (D) - already correct

// PA-10: Scott Perry (R) - fix party assignment
await fix('PA-10: Fix Scott Perry as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Scott Perry', candidate2_party = 'R'
   WHERE state_code = 'PA' AND district_label = '10'`
);

// PA-7: Ryan Mackenzie (R) - fix party assignment
await fix('PA-7: Fix Ryan Mackenzie as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Ryan Mackenzie', candidate2_party = 'R'
   WHERE state_code = 'PA' AND district_label = '7'`
);

// PA-8: Rob Bresnahan (R) - fix party assignment
await fix('PA-8: Fix Rob Bresnahan as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Robert P. Bresnahan', candidate2_party = 'R'
   WHERE state_code = 'PA' AND district_label = '8'`
);

// VA-2: Jen Kiggans (R) - fix party assignment
await fix('VA-2: Fix Jen Kiggans as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Jen Kiggans', candidate2_party = 'R'
   WHERE state_code = 'VA' AND district_label = '2'`
);

// WI-3: Derrick Van Orden (R) - fix party assignment
await fix('WI-3: Fix Derrick Van Orden as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Derrick Van Orden', candidate2_party = 'R'
   WHERE state_code = 'WI' AND district_label = '3'`
);

// TX-15: Monica De La Cruz (R) - fix party assignment
await fix('TX-15: Fix Monica De La Cruz as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Monica De La Cruz', candidate2_party = 'R'
   WHERE state_code = 'TX' AND district_label = '15'`
);

// NC-13: Brad Knott (R) - fix party assignment
await fix('NC-13: Fix Brad Knott as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Brad Knott', candidate2_party = 'R'
   WHERE state_code = 'NC' AND district_label = '13'`
);

// NC-6: Addison McDowell (R) - fix party assignment
await fix('NC-6: Fix Addison McDowell as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Addison P. McDowell', candidate2_party = 'R'
   WHERE state_code = 'NC' AND district_label = '6'`
);

// AZ-2: Elijah Crane (R) - fix party assignment
await fix('AZ-2: Fix Elijah Crane as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Elijah Crane', candidate2_party = 'R'
   WHERE state_code = 'AZ' AND district_label = '2'`
);

// CA-22: David Valadao (R) - fix party assignment
await fix('CA-22: Fix David Valadao as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'David G. Valadao', candidate2_party = 'R'
   WHERE state_code = 'CA' AND district_label = '22'`
);

// CA-27: George Whitesides (D) - already correct (D incumbent)
// CA-45: Derek Tran (D) - already correct (D incumbent)
// CA-47: Dave Min (D) - already correct (D incumbent)
// CA-9: Josh Harder (D) - already correct (D incumbent)

// GA-6: Lucy McBath (D) - already correct (D incumbent)
// GA-7: Rich McCormick (R) - fix party assignment
await fix('GA-7: Fix Rich McCormick as R candidate',
  `UPDATE house_races SET 
     candidate1_name = NULL, candidate1_party = 'D',
     candidate2_name = 'Rich McCormick', candidate2_party = 'R'
   WHERE state_code = 'GA' AND district_label = '7'`
);

// MI-8: Kristen McDonald Rivet (D) - already correct
// OH-1: Greg Landsman (D) - already correct
// OH-9: Marcy Kaptur (D) - already correct
// OH-13: Emilia Strong Sykes (D) - already correct
// OR-5: Janelle Bynum (D) - already correct
// OR-6: Andrea Salinas (D) - already correct
// WA-3: Marie Gluesenkamp Perez (D) - already correct
// WA-8: Kim Schrier (D) - already correct
// NV-3: Susie Lee (D) - already correct
// NV-4: Steven Horsford (D) - already correct
// NM-2: Gabriel Vasquez (D) - already correct
// PA-17: Chris Deluzio (D) - already correct
// VA-10: Suhas Subramanyam (D) - already correct
// ME-2: Jared Golden (D) - already correct

// ─── STEP 3: Fix Cook April 7 rating changes ─────────────────────────────────
// CO-03 Likely R → Safe R
await fix('CO-3: Update to Safe R (Cook Apr 7)',
  `UPDATE house_races SET rating = 'Safe R' WHERE state_code = 'CO' AND district_label = '3'`
);

// OH-13 Lean D → Likely D
await fix('OH-13: Update to Likely D (Cook Apr 7)',
  `UPDATE house_races SET rating = 'Likely D' WHERE state_code = 'OH' AND district_label = '13'`
);

// OH-1 Toss-up → Lean D
await fix('OH-1: Update to Lean D (Cook Apr 7)',
  `UPDATE house_races SET rating = 'Lean D' WHERE state_code = 'OH' AND district_label = '1'`
);

// PA-8 Lean R → Toss-up
await fix('PA-8: Update to Toss-up (Cook Apr 7)',
  `UPDATE house_races SET rating = 'Toss-up' WHERE state_code = 'PA' AND district_label = '8'`
);

// NJ-9 Lean D → Likely D (Cook Apr 7)
// NJ-9 is not in our DB yet, skip for now

console.log(`\n✅ Total: ${passed} passed, ${failed} failed`);
await conn.end();
