-- ============================================================
-- 2026 Election Center - Full Accuracy Corrections
-- Applied: April 2026
-- Sources: Inside Elections (Mar 25), Sabato Crystal Ball (Mar 5),
--          Ballotpedia, ABC News primary results, Wikipedia, NYT Polls
-- ============================================================

-- ============================================================
-- SENATE RACE CORRECTIONS
-- ============================================================

-- 1. NC: Rating should be Toss-up (not Lean R)
--    Source: Inside Elections Toss-up (Mar 2026). Roy Cooper (D) vs Michael Whatley (R) confirmed.
UPDATE senate_races
SET rating = 'Toss-up',
    notes = 'Open seat (Tillis retiring). Roy Cooper (D) won D primary Mar 3. Michael Whatley (R) won R primary Mar 3 (64.6%). Inside Elections: Toss-up (Mar 2026). Cook: Toss-up.'
WHERE state_code = 'NC';

-- 2. MN: Rating should be Likely D (not Lean D); add candidates
--    Source: Sabato Likely Democratic (Oct 23, 2025). Inside Elections: Likely Democratic.
--    Peggy Flanagan (D, Lt. Gov) vs Michele Tafoya (R, former NBC sportscaster)
UPDATE senate_races
SET rating = 'Likely D',
    candidate1_name = 'Peggy Flanagan',
    candidate1_party = 'D',
    candidate2_name = 'Michele Tafoya',
    candidate2_party = 'R',
    notes = 'Open seat (Tina Smith retiring). Peggy Flanagan (D, Lt. Gov) leads D primary vs Angie Craig. Michele Tafoya (R, former NBC sportscaster) is R frontrunner. Primary: Aug 11, 2026. Inside Elections: Likely Democratic (Mar 2026).'
WHERE state_code = 'MN';

-- 3. ME: Rating should be Toss-up (not Lean R)
--    Source: Sabato changed to Toss-up Oct 14, 2025. Inside Elections: Tilt Republican.
--    Collins is competitive in blue-trending Maine.
UPDATE senate_races
SET rating = 'Toss-up',
    notes = 'Susan Collins (R) seeking re-election. Sabato: Toss-up (Oct 2025). Inside Elections: Tilt Republican (Mar 2026). Collins faces competitive race in blue-trending state.'
WHERE state_code = 'ME';

-- 4. MT: Rating should be Likely R (not Lean R); Daines is NOT retiring
--    Source: Sabato Likely Republican (Mar 4, 2026). Inside Elections: Likely Republican.
UPDATE senate_races
SET rating = 'Likely R',
    incumbent_retiring = 0,
    notes = 'Steve Daines (R) seeking re-election. Sabato: Likely Republican (Mar 4, 2026 change). Inside Elections: Likely Republican (Mar 2026).'
WHERE state_code = 'MT';

-- 5. NH: Add frontrunner candidates (primary Sep 8, 2026)
--    Chris Pappas (D, Rep.) vs John Sununu (R, former Sen.) are frontrunners
UPDATE senate_races
SET candidate1_name = 'Chris Pappas',
    candidate1_party = 'D',
    candidate2_name = 'John Sununu',
    candidate2_party = 'R',
    notes = 'Open seat (Shaheen retiring). Chris Pappas (D, Rep. NH-1) and John Sununu (R, former Sen.) are frontrunners. Primary: Sep 8, 2026. Inside Elections: Tilt Democratic (Mar 2026). Sabato: Leans Democratic.'
WHERE state_code = 'NH';

-- 6. OK: Incumbent is now Alan Armstrong (R), not Markwayne Mullin
--    Mullin became Sec. of Homeland Security Mar 2026; Armstrong appointed Mar 24, 2026
--    Armstrong signed affidavit he will NOT run in 2026 - seat is effectively open
UPDATE senate_races
SET incumbent = 'Alan Armstrong (appointed)',
    incumbent_retiring = 1,
    notes = 'Alan Armstrong (R) appointed Mar 24, 2026 by Gov. Stitt to fill vacancy left by Markwayne Mullin (confirmed as Sec. of Homeland Security). Armstrong will NOT run in 2026. Open seat for Nov election. Solid R.'
WHERE state_code = 'OK';

-- 7. OH: Keep Sherrod Brown as D candidate (confirmed running in 2026 special)
--    Brown lost his Class I seat in 2024 but IS running for the 2026 Class III special
--    Multiple polls show Brown leading Husted - update rating to Toss-up
UPDATE senate_races
SET rating = 'Toss-up',
    notes = 'Special election for JD Vance seat (became VP Jan 2025). Jon Husted (R) appointed. Sherrod Brown (D) running after losing his Class I seat in 2024. Polls show statistical tie. Sabato: Leans Republican. Inside Elections: Lean Republican. Competitive race.'
WHERE state_code = 'OH';

-- 8. FL: Update notes to reflect Sabato Likely R rating
UPDATE senate_races
SET notes = 'Special election. Ashley Moody (R) appointed by Gov. DeSantis to replace Marco Rubio (Sec of State). Sabato: Likely Republican (Jan 2026). Inside Elections: Solid Republican. Primary: Aug 18, 2026. Alex Vindman (D) is leading D candidate.'
WHERE state_code = 'FL';

-- 9. IL: Rating should be Solid D (not Lean D)
--    Inside Elections: Solid Democratic. Illinois is reliably blue.
UPDATE senate_races
SET rating = 'Solid D',
    notes = 'Open seat (Durbin retiring). Juliana Stratton (D, Lt. Gov) vs Don Tracy (R). Inside Elections: Solid Democratic. Illinois is reliably Democratic.'
WHERE state_code = 'IL';

-- 10. NJ: Rating should be Solid D (not Lean D)
--     Inside Elections: Solid Democratic.
UPDATE senate_races
SET rating = 'Solid D',
    notes = 'Cory Booker (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). New Jersey is reliably Democratic.'
WHERE state_code = 'NJ';

-- 11. NM: Rating should be Solid D (not Lean D)
--     Inside Elections: Solid Democratic.
UPDATE senate_races
SET rating = 'Solid D',
    notes = 'Ben Ray Luján (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). New Mexico is reliably Democratic.'
WHERE state_code = 'NM';

-- 12. VA: Rating should be Solid D (not Lean D)
--     Inside Elections: Solid Democratic.
UPDATE senate_races
SET rating = 'Solid D',
    notes = 'Mark Warner (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). Virginia has trended strongly Democratic.'
WHERE state_code = 'VA';

-- 13. CO: Rating should be Solid D (not Lean D)
--     Inside Elections: Solid Democratic.
UPDATE senate_races
SET rating = 'Solid D',
    notes = 'John Hickenlooper (D) seeking re-election. Inside Elections: Solid Democratic (Mar 2026). Colorado has trended strongly Democratic.'
WHERE state_code = 'CO';

-- 14. TX: Fix candidate2 name (remove runoff language - Cornyn won outright)
UPDATE senate_races
SET candidate2_name = 'John Cornyn',
    candidate2_party = 'R',
    notes = 'John Cornyn (R) won R primary Mar 3, 2026. James Talarico (D) is D nominee. Rated Solid R. Cornyn is safe in Texas.'
WHERE state_code = 'TX';

-- 15. GA: Add note about Sabato vs Inside Elections rating difference
UPDATE senate_races
SET notes = 'Jon Ossoff (D) seeking re-election. Sabato: Leans Democratic (Jan 2026 change). Inside Elections: Toss-up (Mar 2026). Cook: Toss-up. Most competitive D-held seat this cycle.'
WHERE state_code = 'GA';

-- ============================================================
-- HOUSE RACE CORRECTIONS
-- ============================================================

-- 16. NC-1 Don Davis: Rating should be Lean R (not Toss-up)
--     Sabato changed to Leans Republican Dec 3, 2025
UPDATE house_races
SET rating = 'Lean R'
WHERE state_name = 'North Carolina' AND district = 1;

-- 17. NY-22 John Mannion: Rating should be Solid D (not Lean D or Likely D)
--     Sabato changed to Safe Democratic Mar 26, 2026
UPDATE house_races
SET rating = 'Solid D'
WHERE state_name = 'New York' AND district = 22;

-- 18. VA-7 Eugene Vindman: Rating should be Likely D (not Toss-up)
--     Sabato changed to Likely Democratic Nov 19, 2025
UPDATE house_races
SET rating = 'Likely D'
WHERE state_name = 'Virginia' AND district = 7;

-- 19. TX-28 Henry Cuellar: Rating should be Lean D (not Toss-up)
--     Sabato changed to Leans Democratic Dec 10, 2025
UPDATE house_races
SET rating = 'Lean D'
WHERE state_name = 'Texas' AND district = 28;

-- 20. VA Republican districts showing wrong rating (Solid D for R-held safe seats)
UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 1;
UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 5;
UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 6;
UPDATE house_races SET rating = 'Solid R' WHERE state_name = 'Virginia' AND district = 9;
