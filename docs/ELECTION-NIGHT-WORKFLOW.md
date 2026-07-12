# Election Night Update Workflow

This document describes the step-by-step process for updating the 2026 U.S. Election Center when primary or general election results come in.

---

## Overview

The system has three update mechanisms:

| Mechanism | Purpose | When to Use |
|-----------|---------|-------------|
| **AP Auto-Updater** | Fetches live vote counts from AP JSON feeds every 5 min | Election night (auto-runs 7 PM – 7 AM ET) |
| **Admin Panel** | Manual race edits, status changes, candidate updates | Pre-election setup, corrections |
| **Election Night Panel** | Rapid race-calling UI with keyboard shortcuts | Manual overrides on election night |

---

## Pre-Election Day Checklist (Do This the Morning Of)

### 1. Unpause the AP Scheduled Task

The AP auto-updater is currently **paused**. It must be unpaused before polls close.

**How:** Go to the Admin Panel → Settings, or use the Management UI → Settings → Schedules → find the AP Update job → click "Resume."

The AP engine polls every 5 minutes during the election window (7 PM – 7 AM ET). It automatically:
- Fetches state-level results from AP JSON feeds
- Updates vote counts and percentages
- Marks races as "Called" when AP calls them
- Broadcasts WebSocket events to all connected clients

### 2. Verify Race Statuses

All races being voted on today must be in **"Primary"** or **"General"** status (not "Scheduled"). The AP engine only processes races with active statuses.

**How:** Admin Panel → Primary Results tab → check that all today's races appear in the pending list.

### 3. Confirm Admin Access

Log in to the Admin Panel and verify your admin token is working. The Election Night Panel requires admin authentication.

---

## During Election Night

### Automatic Updates (AP Engine)

Once unpaused, the AP engine handles most updates automatically:
- Vote totals update every 5 minutes
- Race calls propagate immediately via WebSocket
- The live scoreboard and map update in real-time

### Manual Race Calls (Election Night Panel)

If you need to call a race before AP does (or override an AP call):

1. Open Admin Panel → Election Night tab
2. Races are sorted by competitiveness (Toss-up first)
3. Click "Call for D" or "Call for R" to mark a winner
4. The map and scoreboard update immediately

### Keyboard Shortcuts (Election Night Panel)

| Key | Action |
|-----|--------|
| `D` | Call race for Democrat |
| `R` | Call race for Republican |
| `↑/↓` | Navigate between races |
| `Enter` | Confirm selection |

---

## After Primary Elections — Promoting Winners

When a primary produces a winner, you need to promote them to the General election:

### Senate & House Races

1. Open Admin Panel → **Primary Results** tab
2. Find the race (sorted by state)
3. Enter the winner's name in the "Winner" field
4. Click **"Promote to General"**

This automatically:
- Updates the candidate name (replaces "TBD — D Primary: Aug 4" with the actual name)
- Changes race status from "Primary" → "General"
- Preserves all other race data (ratings, incumbent status, etc.)

### Governor Races

1. Open Admin Panel → **Primary Results** tab (governor section at bottom)
2. Find the governor race
3. Enter the winner's name and select the party slot (D or R)
4. Click **"Promote Governor"**

This updates the `dem_candidate` or `rep_candidate` field and advances the status.

---

## Adding Photos for New Nominees

After promoting a primary winner, they need a photo:

### Option A: Admin Panel Photo Upload (Recommended)

1. In the Primary Results tab, click the **camera icon** next to the promoted candidate
2. Paste a URL to their official portrait (JPEG, PNG, or WebP)
3. Click **"Upload & Crop"**

The system automatically:
- Validates the image (min 100×100px, max 10MB)
- Smart-crops to 400×400 (face-centered)
- Uploads to S3 storage
- Updates the `candidate_photos` table

### Option B: Via Manus Session

Ask Manus to source and upload a photo. Provide:
- Candidate name (exact spelling)
- Race (e.g., "KS Senate")
- A URL to their official portrait if you have one

---

## Upcoming Primary Schedule (All Times ET)

| Date | Races | Notes |
|------|-------|-------|
| **Jul 15** | LA-6 House | Single race |
| **Jul 21** | AZ House (8 races) | Arizona primary |
| **Aug 4** | KS Senate, MI Senate, VA Senate, MI-4 House + KS/MI/MO/VA/WA House | Major primary day |
| **Aug 6** | TN Senate D primary | Single race |
| **Aug 11** | MN Senate, SC Special Senate + AL/CT/MN/WI House | Second major day |
| **Aug 18** | AK Senate, FL Senate, WY Senate + AK/FL House | Third wave |
| **Aug 25** | OK Senate D runoff, SC Special R runoff (if needed) | Runoffs |
| **Sep 1** | MA Senate | Both primaries |
| **Sep 8** | NH Senate | Both primaries |
| **Sep 9** | DE Senate R, RI Senate R | Final primaries |

---

## Troubleshooting

### AP Engine Not Updating

1. Check if the scheduled task is paused (Settings → Schedules)
2. Verify the election window (7 PM – 7 AM ET) — AP only runs during this window
3. Check dev server logs: `tail -20 .manus-logs/devserver.log`
4. Manual trigger: Admin Panel → click "Trigger AP Sync"

### Photos Not Showing

1. Verify the photo exists: Admin Panel → search candidate name
2. Check for accent/spelling mismatches (the system normalizes names)
3. The photo lookup uses `normalized_name` (lowercase, trimmed) — ensure exact match

### Race Status Won't Change

1. Only valid transitions are allowed: Scheduled → Primary → General → Called
2. Governor races use: Scheduled → Voting → Called
3. Check if the race has already been called (cannot revert without admin override)

### WebSocket Not Broadcasting

1. Check that the WebSocket server is running on path `/election-ws`
2. Verify client connection in browser DevTools → Network → WS tab
3. Restart the dev server if needed

---

## Post-Election Cleanup

After all races are called:

1. **Pause the AP scheduled task** — no need to poll after results are final
2. **Verify all races are in "Called" status** — check for any stragglers
3. **Update the scoreboard** — ensure final seat counts are correct
4. **Archive** — the system preserves all historical data automatically

---

## Quick Reference: Admin Panel Tabs

| Tab | Purpose |
|-----|---------|
| **Races** | Edit individual race details (candidates, ratings, status) |
| **Primary Results** | Promote primary winners → General (Senate, House, Governor) |
| **Election Night** | Rapid race-calling interface with live updates |
| **Photos** | Upload candidate photos (paste URL → smart-crop → save) |
| **AP Sync** | Manual trigger for AP data fetch |
| **Settings** | Scheduled tasks, system configuration |
