# Election Night Live Data Architecture

## Overview

On Election Night (November 3, 2026), the site will transition from a pre-election information hub to a **live results dashboard** showing real-time vote counts, race calls, and seat projections across all 506 U.S. races and select global elections.

---

## Data Flow Architecture

### Option A: Admin-Driven Manual Updates (Current Capability)

The existing admin panel already supports:
- **Race calling** via the Election Night tab (mark winner for any race)
- **Status updates** (change race from "Active" to "Called")
- **Photo/candidate updates** in real-time

**Pros:** Full editorial control, no external API dependency, zero cost
**Cons:** Requires human operators, slower updates, doesn't scale to 435 House races simultaneously

### Option B: Hybrid — AP/Reuters Feed + Admin Override

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AP Election API │────▶│  Heartbeat Job   │────▶│    Database      │
│  (vote counts)   │     │  (every 60s)     │     │  (results table) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐                                       ▼
│  Admin Panel    │──── Manual Override ──────────▶│  Final Display  │
│  (race calls)   │                                └─────────────────┘
└─────────────────┘
```

**Pros:** Automated vote counts, admin retains call authority, fast updates
**Cons:** AP API costs ~$5K-$15K for election night access, requires API key setup

### Option C: Scraping + Admin (Budget Alternative)

Use public state Secretary of State websites for vote counts, with admin-driven race calls.

**Pros:** Free, covers all races
**Cons:** Unreliable on high-traffic nights, different formats per state, may violate ToS

---

## Recommended Architecture: Option A Enhanced

Given the site's current capabilities and the admin panel's maturity, the most practical approach is:

1. **Pre-Election Night:** Pre-populate expected close times for each race (polls close times by state)
2. **Election Night:** Admin operators use the existing Election Night tab to:
   - Call races as networks project them
   - Update vote percentages manually for key races
   - Toggle "Election Night Mode" for the public-facing site
3. **Post-Election:** Continue updating as mail ballots are counted

### Enhancements Needed for Election Night

| Feature | Priority | Description |
|---------|----------|-------------|
| Live vote count fields | HIGH | Add `votesCandidate1`, `votesCandidate2`, `percentReporting` to race tables |
| Polls close time | HIGH | Add `pollsCloseTime` field to show countdown/status per state |
| Auto-refresh frontend | HIGH | WebSocket or 30s polling for live updates without page reload |
| Seat counter widget | HIGH | Running tally of D/R seats called (Senate: X/100, House: X/435) |
| "Too Early to Call" status | MEDIUM | Additional race status beyond Active/Called |
| Key race spotlight | MEDIUM | Pin 10-15 marquee races at the top of the results view |
| Historical comparison | MEDIUM | Show 2024 margin next to current results |
| Notification system | LOW | Push alerts when key races are called |
| AP API integration | LOW | Automated vote count ingestion (if budget allows) |

---

## Frontend Election Night Mode

When "Election Night Mode" is toggled ON:

1. **Homepage transforms** into a live results dashboard
2. **Seat counter bar** appears at the top (Senate: D-X / R-X, House: D-X / R-X)
3. **Auto-refresh** every 30 seconds for new race calls
4. **Race cards** show vote counts + percent reporting
5. **Map colors** update in real-time as races are called
6. **"LIVE" badge** appears in the header

### UI States per Race

```
POLLS NOT CLOSED → Gray, shows close time
POLLS CLOSED     → Pulsing indicator, "Counting..."
TOO EARLY        → Yellow, partial results shown
PROJECTED        → Color-coded (blue/red), checkmark on winner
CALLED           → Solid color, final results
RUNOFF           → Special indicator
```

---

## Database Schema Additions Needed

```sql
-- Add to house_races, senate_races, governor_races:
ALTER TABLE house_races ADD COLUMN votes_candidate1 INT DEFAULT 0;
ALTER TABLE house_races ADD COLUMN votes_candidate2 INT DEFAULT 0;
ALTER TABLE house_races ADD COLUMN percent_reporting DECIMAL(5,2) DEFAULT 0;
ALTER TABLE house_races ADD COLUMN polls_close_time VARCHAR(8); -- "19:00 ET"
ALTER TABLE house_races ADD COLUMN race_status ENUM('pre', 'polls-open', 'counting', 'too-early', 'projected', 'called', 'runoff') DEFAULT 'pre';
ALTER TABLE house_races ADD COLUMN called_at TIMESTAMP NULL;
ALTER TABLE house_races ADD COLUMN called_for ENUM('D', 'R', 'I') NULL;

-- Site-wide election night config
CREATE TABLE election_night_config (
  id INT PRIMARY KEY,
  is_live BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP NULL,
  senate_d_seats INT DEFAULT 0,
  senate_r_seats INT DEFAULT 0,
  house_d_seats INT DEFAULT 0,
  house_r_seats INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Timeline

| Date | Milestone |
|------|-----------|
| Aug 2026 | Add vote count fields and polls close times |
| Sep 2026 | Build Election Night Mode toggle and live dashboard |
| Oct 2026 | Add seat counter, auto-refresh, key race spotlight |
| Oct 25 | Dry run with test data |
| Nov 3 | **ELECTION NIGHT — GO LIVE** |
| Nov 4-30 | Continue updating as mail ballots counted |

---

## Open Questions

1. **Budget for AP API?** — Would enable automated vote counts but costs $5K-$15K
2. **How many admin operators?** — 1 person can handle Senate + Governor calls; House needs 2-3 people or automation
3. **Global elections on the same night?** — Brazil's runoff may coincide; handle separately in World Elections
4. **Mobile experience?** — Election Night dashboard needs mobile-optimized layout

---

## Summary

The site already has 80% of what's needed for Election Night. The key additions are:
1. Vote count fields in the database
2. Auto-refresh mechanism (WebSocket or polling)
3. Seat counter widget
4. "Election Night Mode" toggle
5. Enhanced race status states

These can be built incrementally over Aug-Oct 2026, with a dry run in late October.
