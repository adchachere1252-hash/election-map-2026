# 2026 U.S. Election Center — Project TODO

## Database Schema & Seeding
- [x] Create senate_races table (state, incumbent, party, rating, status, candidates, primary_date, special)
- [x] Create house_races table (state, district, incumbent, party, rating, status, candidates)
- [x] Create redistricting_states table (state, reason, status, method, delegation, projected_impact)
- [x] Create referendums table (state, name, description, yes_votes, no_votes, pct_reporting, status, date)
- [x] Seed all 35 Senate races (33 Class 2 + OH special + FL special)
- [x] Seed all 435 House districts with incumbent data
- [x] Seed all 12 redistricting states (CA, MO, NC, OH, TX, UT enacted; FL, GA, LA, MD, NY, VA pending)
- [x] Seed Virginia April 21 redistricting referendum

## tRPC API Layer
- [x] senate.list — fetch all Senate races
- [x] senate.update — admin: update race data (adminToken in body)
- [x] house.list — fetch all House races
- [x] house.update — admin: update race data (adminToken in body)
- [x] redistricting.list — fetch all redistricting states
- [x] redistricting.update — admin: update redistricting state
- [x] referendum.list — fetch all referendums
- [x] referendum.update — admin: update referendum tallies
- [x] scoreboard.get — aggregate D/R/Uncalled counts for both chambers
- [x] admin.login — password auth, returns 24h session token
- [x] admin.verify — validate token server-side
- [x] admin.logout — delete session token

## Interactive SVG Map
- [x] U.S. state-level SVG map component (D3 + TopoJSON)
- [x] Senate overlay: color states by competitive rating
- [x] House overlay: color states by dominant party (district-level grouped by state)
- [x] Redistricting overlay: enacted (green) vs pending (amber) state highlighting
- [x] Toggle bar: Senate / House / Redistricting view switcher
- [x] Map zoom and pan support
- [x] State/district hover highlight effect
- [x] Selected state white border highlight

## Pop-ups & Race Detail Panels
- [x] Clickable pop-up on Senate state: candidates, incumbent, party, status, rating, primary date
- [x] Clickable pop-up on House district: candidates, incumbent, party, status, rating
- [x] Redistricting state pop-up: status, method, delegation, projected impact, litigation notes
- [x] Virginia referendum pop-up: Yes/No tallies, progress bars, % reporting, date, called result
- [x] Race status badge: Scheduled / Primary / General / Called / Certified
- [x] Five-tier rating color scale: Solid D / Lean D / Toss-up / Lean R / Solid R

## Live Scoreboard
- [x] Senate scoreboard: D seats / R seats / Uncalled
- [x] House scoreboard: D seats / R seats / Uncalled
- [x] Auto-refresh scoreboard every 30 seconds from database
- [x] Visual seat count progress bars

## Admin Panel
- [x] Password-protected admin login (separate from Manus OAuth, 24h session token)
- [x] Session persistence via localStorage with server-side validation
- [x] Senate race editor: update candidates, winner, vote %, rating, status, dates, notes
- [x] House race editor: update candidates, winner, vote %, rating, status, dates, notes
- [x] Redistricting state editor: update enacted flag, status, projected impact, litigation notes
- [x] Referendum editor: update Yes/No votes, % reporting, status, called result, notes
- [x] Search/filter races by state, party, rating, status
- [x] All changes reflect instantly on public map — no code changes required
- [x] Logout button with server-side session deletion

## Design & Polish
- [x] Dark-themed AP-style design with deep navy background
- [x] OKLCH color palette for Tailwind 4 compatibility
- [x] Five-tier color scale: Solid D / Lean D / Toss-up / Lean R / Solid R
- [x] Redistricting legend: Enacted / Pending / No activity
- [x] Responsive layout (desktop-first)
- [x] Loading skeletons for scoreboard
- [x] Map hint tooltip
- [x] Special election badges (S) for OH and FL Senate specials
- [x] Retiring incumbent labels

## Testing
- [x] Vitest: senate router list
- [x] Vitest: house router list
- [x] Vitest: redistricting router list
- [x] Vitest: referendum router list
- [x] Vitest: scoreboard aggregation shape
- [x] Vitest: admin auth guard (wrong password, invalid token, all update mutations rejected)
- [x] All 13 tests passing

## New Features (Round 2)
- [x] Download congressional districts TopoJSON/GeoJSON for all 435 districts
- [x] Build district-level House SVG map rendering (color each district by rating/called party)
- [x] House map: click individual district to open race pop-up
- [x] House map: zoom into state to see individual districts
- [x] Admin panel: Primary Results workflow tab — mark primary winner, auto-promote to candidate1
- [x] Admin panel: Primary Results shows all races in Primary status
- [x] Election calendar sidebar component — upcoming primaries sorted by date
- [x] Election calendar: show next 30 days of scheduled races
- [x] Election calendar: distinguish Senate specials, Senate primaries, House primaries, referendums
- [x] Real-time global search bar — search by state name, candidate name, incumbent name
- [x] Search results overlay showing matching Senate and House races
- [x] Filter panel: filter by type and rating across all views
- [x] Search clears on result selection
- [x] Vitest: primary router auth guards (4 new tests — 17 total passing)

## New Features (Round 3)
- [x] Add previousParty field to senate_races and house_races schema for flip detection
- [x] Seed previousParty values for all 35 Senate races and 435 House districts
- [x] Add flip tracker API: count flips (D→R, R→D) per chamber
- [x] Build FlipTracker component with net gain/loss display per party
- [x] Integrate FlipTracker into Scoreboard
- [x] Mobile-responsive layout: collapsible left sidebar (race list + scoreboard)
- [x] Mobile-responsive layout: bottom-sheet pop-up for race details on mobile
- [x] Mobile-responsive layout: collapsible right calendar panel on mobile
- [x] Mobile-responsive layout: map fills full screen on mobile
- [x] Mobile-responsive layout: touch-friendly tap targets on map
- [x] Mobile-responsive layout: responsive header with hamburger menu
- [x] Full verification: 17 tests passing (2 test files)
- [x] Full verification: zero TypeScript errors
- [x] Full verification: visual QA Senate/House/Redistricting map views — all rendering correctly
- [x] Full verification: Admin panel login page loads, no console errors
- [x] Full verification: Global search and election calendar — all data populating
- [x] Full verification: mobile layout — hamburger, bottom sheets, responsive header confirmed

## New Features (Round 4)
- [x] Election night mode toggle (Results vs Ratings view) in header — yellow border when active
- [x] Map: in results mode, color called states/districts by winning party (solid D/R) vs uncalled (gray)
- [x] Map: in results mode, uncalled states shown in neutral dark gray
- [x] Map: results mode legend shows Called D / Called R / Uncalled
- [x] Race pop-up: animated vote percentage bars for candidate1 and candidate2
- [x] Race pop-up: pct_reporting display when > 0
- [x] Race pop-up: called winner ✓ Called badge
- [x] Enhanced live search: always-visible inline search bar in header
- [x] Enhanced live search: onQueryChange prop syncs query to map highlight Set in real time
- [x] Enhanced live search: filter map by candidate name, state name, state code, district number
- [x] Enhanced live search: map dims non-matching states/districts to 18% opacity
- [x] Enhanced live search: match count badge with clear button in legend bar
- [x] Enhanced live search: clear button resets map to full view
- [x] Enhanced live search: keyboard navigation (arrow keys, Enter, Escape)
- [x] Verification: 22 tests passing, zero TypeScript errors, zero console errors
- [x] Verification: election night mode visual QA — toggle works, map goes gray, legend updates
- [x] Verification: live search "Georgia" returns 16 results, dims all non-GA states on map

## New Features (Round 5 — Election Night Admin Tab)
- [x] Admin panel: "Election Night" tab (⚡ Night) visible alongside all other tabs
- [x] Election Night tab: full-width layout (left race list hidden, right panel expands)
- [x] Election Night tab: race queue showing all General/Called races sorted by Toss-up first
- [x] Election Night tab: filter queue by chamber (All / Senate / House)
- [x] Election Night tab: rapid entry form with keyboard-optimized vote % fields per race
- [x] Election Night tab: Candidate 1 vote % input + Candidate 2 vote % input (Tab to advance)
- [x] Election Night tab: % Reporting slider + input field
- [x] Election Night tab: one-click "Call for [Candidate]" buttons
- [x] Election Night tab: status auto-advances to "Called" when winner is set
- [x] Election Night tab: "Uncall" button to revert a called race back to General
- [x] Election Night tab: visual called state (green border + ✓ badge per race row)
- [x] Election Night tab: live results feed sidebar showing recently updated races with timestamps
- [x] Election Night tab: batch save — "Save All Changes" button updates all dirty races in one request
- [x] Server: electionNight.queue, electionNight.updateRace, electionNight.batchUpdate procedures
- [x] Vitest: 6 new Election Night tests (auth guards, queue filtering, batch update) — 28 total passing
- [x] Full verification: 28 tests passing, zero TypeScript errors, zero console errors
- [x] Full verification: visual QA — map renders correctly, all three views confirmed, admin login works

## Data Updates (Round 6)
- [x] Research all 435 current House representatives with actual names (Congress.gov API, 119th Congress)
- [x] Update all 435 House district records with representative names in database (432 active + 3 vacancies)
- [x] Research 2026 primary results: Illinois Senate (Stratton D vs Tracy R, Nov 3)
- [x] Research all other Senate/House primaries held before April 2026 (TX, NC, MS, AR, IL-09)
- [x] Update Illinois Senate race: Juliana Stratton (D) vs Don Tracy (R), Nov 3 2026
- [x] Update all other races with confirmed primary results and general election matchups
- [x] Verify all updated races display correctly in pop-ups and race list (28 tests passing, API verified)

## Scoreboard Improvements (Round 7)
- [x] Clarify Senate scoreboard: label "35 seats up in 2026" (not total 100)
- [x] Add "Current Composition" section to scoreboard showing full 100-seat Senate breakdown (D/R/I)
- [x] Add "Current Composition" section to scoreboard showing full 435-seat House breakdown (D/R/I)
- [x] Seed current_composition table (or constants) with April 2026 party breakdown for both chambers
- [x] Add scoreboard tooltip/note explaining tallies fill in on Election Night as races are called
- [x] Scoreboard: show "seats needed to control" threshold (51 Senate, 218 House) as a marker
- [x] Verify scoreboard renders correctly with new composition section (28 tests passing, zero TS errors)

## Special Election Integration & Composition Timestamp (Round 8)
- [x] Backend: extend scoreboard.get to return live composition (base constants adjusted by called special/house results)
- [x] Backend: compute liveComposition by starting from base 119th Congress numbers and applying called race winners
- [x] Backend: return lastUpdated timestamp (ISO string of most recently called race, or seed date if none called)
- [x] Frontend: Scoreboard CurrentComposition reads live composition from API instead of hardcoded constants
- [x] Frontend: display "Last Updated: [date/time]" in Current Composition panel
- [x] Frontend: auto-refresh composition every 30s alongside scoreboard
- [x] Verify NJ-11 special election (Jul 2026) will auto-update composition when called via Admin panel
- [x] All 28 tests still passing after backend changes (28/28 pass, zero TS errors)

## GA-14 Special Election & Full Verification (Round 9)
- [x] Research GA-14 special election result (April 8, 2026) — Clay Fuller (R) def. Shawn Harris (D) ~56-44%
- [x] Apply GA-14 result to database (mark Called, update composition → R 217→218, vacancies 3→2)
- [x] Wire NJ-11 special election as a trackable race (April 16 2026, Mejia D vs Hathaway R)
- [x] Verify auto-update mechanism works end-to-end (composition reflects called races)
- [x] Full pre-election data verification: 35 Senate races (0 issues), 435 House races (0 issues)
- [x] Verify scoreboard Last Updated timestamp updates when a race is called (shows Apr 8 2026 07:19 PM UTC)

## Full Special Election Verification (Round 10)
- [x] Research all 2025-2026 U.S. House special elections (completed and upcoming) — 9 House + 2 Senate
- [x] Verify FL-01 (Patronis), FL-06 (Fine), GA-14 (Fuller) are correctly marked Called in DB
- [x] Verify AZ-7 (Grijalva D), TN-7 (Van Epps R), TX-18 (Menefee D), VA-11 (Walkinshaw D) marked Called
- [x] Research CA-01 special election status — primary Jun 2, general Aug 4, 2026; candidate: James Gallagher (R)
- [x] Fix TX-18 previous_party (D not R) and is_vacancy flag
- [x] Fix NJ-11 incumbent name (Mikie Sherrill, not VACANT)
- [x] Fix CA-01 general_date to August 4, 2026 (was incorrectly Nov 3)
- [x] Final composition verified: R=218, D=215, I=1, vacancies=1 (only CA-01 remains unfilled)
- [x] 31 tests passing, zero TypeScript errors

## Primary Results Verification (Round 11 — as of April 8, 2026)
- [x] Research which states held 2026 primaries before April 8, 2026 — AR/NC/TX (Mar 3), MS (Mar 10), IL (Mar 17)
- [x] Verify all 35 Senate race matchups — AR, IL, MS, NC all General; TX Primary (R runoff May 26)
- [x] Verify key House races — 18 races with confirmed candidates, party assignments verified and corrected
- [x] Ensure no race shows election night results for November 3 general — all vote_pct fields NULL/0
- [x] Apply missing/incorrect candidate names: TX-2 (Toth), TX-8 (Steinmann), TX-10 (Gober), TX-21 (Teixeira), TX-34 (Flores), NC-1 (Buckhout), AR-1 (Yarbrough Green), IL-2/7/9 (primary winners), MS-2 (Thompson)
- [x] Fixed party assignment errors: TX-18/19/23/38 had swapped D/R slots — all corrected
- [x] Fixed open seat incumbents: TX-2/8/10/19/21/30/32/33/38, IL-2/7/9 all marked Open Seat
- [x] 31 tests passing, zero TypeScript errors

## Live Push & Fast Refresh (Round 12)
- [x] Reduce all polling intervals from 30s to 10s (Scoreboard, FlipTracker, ElectionNightPanel)
- [x] Add WebSocket server using the ws package on the Express backend (server/ws.ts)
- [x] Expose WebSocket on the same port as the HTTP server (path: /ws)
- [x] Broadcast a JSON event to all connected clients when any race is called/updated via Election Night
- [x] Broadcast event shape: { type: 'race_called', chamber, stateCode, district, calledParty, calledWinner }
- [x] Add useElectionSocket() custom hook on the frontend (client/src/hooks/useElectionSocket.ts)
- [x] Hook triggers instant tRPC cache invalidation for scoreboard, house.list, senate.list on race_called event
- [x] Show a live "● LIVE" indicator in the header when WebSocket is connected (green Radio icon)
- [x] Show a "⚡ Race called: [winner] wins" toast notification when a race is pushed
- [x] Graceful fallback: if WebSocket disconnects, polling at 10s continues uninterrupted (max 10 reconnect attempts)
- [x] Write vitest test for WebSocket broadcast logic (broadcastElectionEvent spy test)
- [x] 32 tests passing, zero TypeScript errors

## Viewer Count, Ticker & HMR Fix (Round 13)
- [x] Fix Vite HMR WebSocket error in vite.config.ts (set server.hmr.clientPort: 443)
- [x] Add tRPC live.viewerCount procedure returning getConnectedClientCount()
- [x] Add tRPC live.recentResults procedure returning up to 20 most recently called races
- [x] Add viewer count to LIVE indicator badge: "● LIVE · N watching" (shows when >0 viewers)
- [x] Viewer count auto-refreshes every 30s via polling
- [x] Build ResultsTicker component: smooth CSS marquee of recently called races
- [x] Ticker shows: party color dot, chamber tag (SEN/HSE), state/district, winner name, party badge
- [x] Ticker only visible when at least 1 race has been called (hidden before election night)
- [x] Ticker auto-updates via WebSocket push (refetch triggered on race_called event)
- [x] Ticker positioned at very top of screen, above the header
- [x] Ticker pauses on hover for easy reading
- [x] Verified: 7 called races appear in ticker (TX-18 D, GA-14 R, VA-11 D, AZ-7 D, FL-1 R, FL-6 R, TN-7 R)
- [x] Verified: live.viewerCount returns {count: 2} (2 WebSocket clients connected during test)
- [x] 32 tests passing, zero TypeScript errors

## HOR Label & Sound Effect (Round 14)
- [x] Change ticker chamber label from HSE to HOR (House of Representatives)
- [x] Add sound effect chime (two-tone C5→G4 broadcast bell) using Web Audio API — no external files
- [x] Add sound toggle button in the header (Volume2 icon ON / VolumeX icon OFF), persisted in localStorage
- [x] Sound plays only when toggle is ON and a race_called WebSocket event arrives
- [x] Default OFF so first-time visitors are not startled
- [x] Full verification: ticker shows HOR ✓, sound hook wired ✓, 7 called races in ticker ✓, 32 tests ✓, zero TS errors ✓

## Flip Indicator & Scroll Fix (Round 15)
- [x] Fix left sidebar scroll: unified single overflow-y-auto column (Scoreboard + RaceList scroll together)
- [x] Add flip indicator to ticker: yellow pulsing "⇄ FLIP D→R" or "⇄ FLIP R→D" badge when calledParty !== previousParty
- [x] Flip badge is visually distinct: yellow-300 text, yellow-500/20 bg, yellow-500/40 border, animate-pulse
- [x] Ticker flip data: live.recentResults now returns previousParty field for both senate and house
- [x] Verified: all 7 current called races are holds (prev=called) — FLIP badge correctly hidden
- [x] FLIP badge will appear automatically when any future race flips party on election night
- [x] 32 tests passing, zero TypeScript errors

## Flips Counter, Key Races & Timestamp Fix (Round 16)
- [x] Add flips counter to scoreboard backend: count races where calledParty !== previousParty
- [x] Display Flips counter in Scoreboard UI (Senate flips + House flips, yellow pulsing badge when > 0)
- [x] Build Key Races section on homepage: 8 Senate + 12 House most competitive contests (Toss-up + Lean)
- [x] Key Races section shows: state/district, incumbent, rating badge, D vs R candidates
- [x] Key Races section updates live via WebSocket push (refetch on race_called)
- [x] Fix Last Updated timestamp: shows actual current client time (not last called race time)
- [x] Last Updated timestamp auto-refreshes every 10 minutes via setInterval
- [x] Verified: 8 Senate key races (GA/MI Toss-up, CO/IL/MN Lean D, etc.) + 12 House key races
- [x] 32 tests passing, zero TypeScript errors

## Candidate Photos, Party Logos & Key Races Filter (Round 17)
- [x] Source official candidate headshots for all Key Races (Congress.gov, official campaign sites)
- [x] Source Democratic Party and Republican Party logos (official SVGs)
- [x] Upload all photos and logos to CDN via manus-upload-file --webdev
- [x] Add candidatePhotoUrl fields to senate_races and house_races schema (nullable text)
- [x] Seed photo URLs for all Key Races candidates
- [x] Update keyRaces.get procedure to return photo URLs
- [x] Update KeyRaces component: show circular candidate headshot next to name (fallback to party initial)
- [x] Add party logo/badge next to each candidate's party label in Key Races cards
- [x] Add dropdown filter to Key Races section: filter by Chamber (All/Senate/House), Rating (All/Toss-up/Lean D/Lean R), Party (All/D/R)
- [x] Add sort option: by competitiveness (default), by state alphabetical, by chamber
- [x] Full verification: photos load correctly, filter works, 32 tests still passing
