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
