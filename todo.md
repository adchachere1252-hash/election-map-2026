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
- [ ] Admin panel: "Election Night" tab visible alongside Senate/House/Primary/Redistricting tabs
- [ ] Election Night tab: race queue showing all General/Called races sorted by competitiveness (Toss-up first)
- [ ] Election Night tab: filter queue by chamber (All / Senate / House) and status (All / General / Called)
- [ ] Election Night tab: rapid entry form with large, keyboard-optimized fields per race
- [ ] Election Night tab: Candidate 1 vote % input + Candidate 2 vote % input (Tab to advance)
- [ ] Election Night tab: % Reporting input field
- [ ] Election Night tab: "Call Race" button with winner dropdown (Candidate 1 / Candidate 2 / TBD)
- [ ] Election Night tab: status auto-advances to "Called" when winner is set
- [ ] Election Night tab: keyboard shortcut — Enter submits current race and advances to next
- [ ] Election Night tab: keyboard shortcut — Escape clears current entry
- [ ] Election Night tab: live results feed sidebar showing recently updated races with timestamps
- [ ] Election Night tab: "Uncall" button to revert a called race back to General
- [ ] Election Night tab: visual called/uncalled state per race row (green border = called)
- [ ] Server: batchUpdateResults mutation for bulk vote % + called winner updates
- [ ] Vitest: election night batch update auth guard
- [ ] Full verification: all tests pass, zero TypeScript errors, zero console errors
- [ ] Full verification: visual QA of Election Night tab in Admin panel
