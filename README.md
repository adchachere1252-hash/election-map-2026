# 🗳️ 2026 U.S. Election Center

**A real-time, interactive congressional election tracking application built for live election night coverage.**

Live site: [electionmap-duqshn4d.manus.space](https://electionmap-duqshn4d.manus.space)

---

## Overview

The 2026 U.S. Election Center is a full-stack web application that tracks U.S. congressional races, gubernatorial elections, Senate contests, and ballot referendums in real time. Built and deployed during live election night coverage of the **2026 Virginia Congressional Redistricting Amendment**, the app tracked over 60 live vote updates from 5% reporting through 99% — including a dramatic tightening of the margin from 132,000 votes down to under 11,000 before Yes ultimately prevailed.

---

## Features

- **Interactive U.S. Map** — Click any state to view race details, candidate matchups, vote totals, and live results
- **Auto-Refreshing Data** — All race data refreshes automatically every 10 seconds with a live countdown timer
- **Live Results Ticker** — Scrolling ticker displaying called races across Senate (SEN), House (HOR), Governor (GOV), and Redistricting (RDT) categories
- **Referendum Tracking** — Full ballot measure support with Yes/No vote bars, percentage shares, live margin display, and called result status
- **Race Ratings** — Color-coded district ratings: Solid D, Likely D, Lean D, Toss-up, Lean R, Likely R, Solid R
- **Seat Scoreboard** — Live seat counts for Senate and House with majority threshold indicators
- **Special Election Support** — Tracks House and Senate special elections with full candidate and vote data
- **Vacancy Tracking** — Districts marked as vacant with notes (e.g., GA-13 following the passing of Rep. David Scott)
- **Search** — Full-text search across candidates, states, and districts
- **Calendar View** — Upcoming election dates across all race types
- **Dark Theme UI** — Clean, professional dark-mode design optimized for election night broadcast use

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Backend** | Node.js, Express 4, tRPC 11 |
| **Database** | MySQL (TiDB) via Drizzle ORM |
| **Auth** | Manus OAuth (JWT session cookies) |
| **Maps** | Google Maps JavaScript API (via Manus proxy) |
| **Build** | Vite 6, pnpm |
| **Deployment** | Manus cloud hosting |

---

## Project Structure

```
client/
  src/
    pages/          ← Home.tsx (main map + all views)
    components/     ← Map, RacePopup, ResultsTicker, BreakingNewsBanner, etc.
    contexts/       ← Auth context
    hooks/          ← Custom hooks
    lib/trpc.ts     ← tRPC client binding
drizzle/
  schema.ts         ← Database schema (senate_races, house_races, gov_races, referendums)
server/
  routers.ts        ← tRPC procedures (races, referendums, live ticker)
  db.ts             ← Query helpers
```

---

## Election Night Coverage — April 21, 2026

This application was used for live election night coverage of the **Virginia Congressional Redistricting Amendment** — a ballot measure asking voters whether the General Assembly should have authority to redraw congressional districts.

**Final Result (99% reporting):**

| | Votes | Share |
|---|---|---|
| **Yes — Passes ✅** | 1,575,331 | 51.5% |
| No | 1,486,239 | 48.5% |

**Key moments tracked:**
- 5% reporting: Yes +5,848 (52.0%) — first update of the night
- 43% reporting: Yes +132,431 (54.9%) — peak Yes lead
- 79% reporting: Yes +10,979 (50.2%) — narrowest margin of the night
- 99% reporting: Yes +89,092 (51.5%) — final certified result

Over **60 live data updates** were entered and tracked in real time throughout the night.

---

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm
- MySQL database

### Installation

```bash
git clone https://github.com/adchachere1252-hash/election-map-2026.git
cd election-map-2026
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```
DATABASE_URL=mysql://...
JWT_SECRET=...
VITE_APP_ID=...
```

### Development

```bash
pnpm dev
```

### Database Migration

```bash
pnpm drizzle-kit generate
# Then apply the generated SQL via your database client
```

---

## License

MIT

---

*Built with ❤️ for election night coverage. All data entered manually from official Virginia election results.*
