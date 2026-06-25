# 2026 Election Center — Site-Wide Audit Report

**Date:** June 25, 2026  
**Scope:** All data tables (House, Senate, Governor, World Elections, Redistricting, Senators, Referendums)

---

## Executive Summary

| Dimension | Status | Score |
|-----------|--------|-------|
| House Races (435) | Strong with gaps | 79% |
| Senate Races (35) | Solid | 85% |
| Governor Races (36) | Moderate gaps | 72% |
| World Elections (39) | Excellent | 95% |
| Redistricting (16) | Complete | 100% |
| Senators (100) | Complete | 100% |
| Referendums (1) | Minimal | 10% |

---

## STRENGTHS

### 1. Ratings Coverage — Perfect (100%)
All 435 House races, 35 Senate races, and 36 Governor races have ratings assigned. Breakdown is well-distributed:
- **House:** Solid D (184), Solid R (184), Likely R (18), Toss-up (18), Lean D (12), Likely D (11), Lean R (8)
- **Senate:** Solid R (15), Solid D (9), Lean R (4), Toss-up (3), Lean D (3), Likely D (1)
- **Governor:** Solid R (13), Solid D (12), Toss-up (5), Lean R (2), Likely D (2), Lean D (1), Likely R (1)

### 2. World Elections — Fully Populated
- All 28 upcoming elections have polling data, key issues, and candidates
- 11 completed elections tracked with results
- Zero gaps in any upcoming election data field

### 3. Candidate Names — Near Complete
- **House:** 430/435 candidate 1 slots filled (99%), 311/435 candidate 2 slots filled (71%)
- **Senate:** 35/35 both slots filled (100%)
- **Governor:** 36/36 both slots filled (100%)
- Zero TBD candidates remaining in any race

### 4. Incumbent Tracking — Excellent
- 430/435 House races have incumbent info (99%)
- All Senate and Governor races have full incumbent data

### 5. Photo Centering Tool — Active and Working
- SmartCrop tool (sharp attention strategy) is operational
- 373 photos batch re-cropped to 400x400 face-centered squares
- All new photos processed through the centering pipeline

---

## WEAKNESSES

### 1. House Photos — 40 Races Still Missing (Critical)
**33 named candidates in slot 1** and **19 in slot 2** lack photos (52 total candidate photos missing across 40 races).

Key clusters:
- **Colorado (CO-1 through CO-8):** 8 races — likely pending June 30 primary results
- **Florida (FL-2, FL-11, FL-16, FL-19, FL-20):** 5 races
- **Wisconsin (WI-1, WI-3, WI-5, WI-6, WI-7, WI-8):** 6 races
- **Michigan (MI-4, MI-7, MI-10, MI-11):** 4 races
- **Missouri (MO-1, MO-3, MO-6):** 3 races
- Others: AK-AL, AL-1, AZ-1, AZ-5, KS-2, LA-5, MA-6, MN-2, NH-1, TN-6, TN-9, WA-4

### 2. Senate Photos — 14 Races Missing (High Priority)
14 of 35 Senate races have at least one candidate without a photo:
- AK, DE, FL, KS, LA, MA, MI, MN, NH, OK, RI, TN, VA, WY

### 3. Governor Photos — 18 Races Missing (High Priority)
18 of 36 Governor races have at least one candidate without a photo:
- AK, AZ, CO, CT, FL, HI, KS, MA, MI, MN, NH, OK, RI, SD, TN, VT, WI, WY

### 4. Candidate Bios — Nearly Empty (Major Gap)
- **House:** Only 10/870 bios filled (1.1%)
- **Senate:** Only 16/70 bios filled (23%)
- Bios are the weakest data dimension across the entire site

### 5. House Candidate 2 Slots — 124 Empty
124 House races have no candidate 2 named at all. These are likely:
- Uncontested races (safe seats with no challenger filed)
- Races where primaries haven't occurred yet (CO June 30)
- Races where minor-party candidates haven't been confirmed

### 6. Referendums — Only 1 Entry
The referendums table has just 1 entry. For a comprehensive election center, ballot measures from key states should be tracked.

---

## PRIORITY ACTION ITEMS

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| P1 | Source photos for 14 Senate races | High — most visible races | Medium |
| P2 | Source photos for 18 Governor races | High — prominent races | Medium |
| P3 | Source photos for 40 House races | Medium — completeness | High |
| P4 | Process CO primary results (June 30) | High — fills CO gaps | Low |
| P5 | Add candidate bios (at least for competitive races) | Medium — depth | High |
| P6 | Add ballot measures/referendums for key states | Low — completeness | Medium |
| P7 | Fill remaining 124 empty House candidate 2 slots | Low — many uncontested | Medium |

---

## DATA COMPLETENESS MATRIX

| Table | Records | Names | Photos | Ratings | Bios | Other |
|-------|---------|-------|--------|---------|------|-------|
| House Races | 435 | 99%/71% | 91%/67% | 100% | 1% | Incumbents 99% |
| Senate Races | 35 | 100%/100% | 71%/74% | 100% | 23% | — |
| Governor Races | 36 | 100%/100% | 69%/56% | 100% | — | — |
| World Elections | 39 | 100% | N/A | N/A | N/A | Polling 100%, Issues 100% |
| Senators | 100 | 100% | N/A | N/A | — | Committees, websites |
| Redistricting | 16 | 100% | N/A | N/A | N/A | Status tracked |
| Referendums | 1 | — | — | — | — | Needs expansion |

---

## PHOTO CENTERING STATUS

The smartCrop centering tool is fully operational and being used for all new photo uploads:
- **Strategy:** sharp attention-based face detection → 400x400 square crop
- **Pipeline:** Source image → smartCenterCrop() → S3 upload → DB URL update
- **Coverage:** 373 photos successfully re-cropped in latest batch
- **Failures:** 5 corrupted source images (now re-sourced and fixed)
- **All new photos** go through the centering pipeline before upload

---

## RECOMMENDATIONS

1. **Immediate (this week):** Source Senate and Governor photos — these are the most visible races and only need ~32 photos total
2. **June 30:** Process Colorado primary results — will resolve 8 House photo gaps and confirm nominees
3. **July target:** Add bios for all competitive races (Toss-up + Lean = ~50 races across all chambers)
4. **Ongoing:** As primaries resolve, fill remaining House candidate 2 slots and source their photos
5. **Future:** Expand referendums table with 2026 ballot measures from key states (CA, FL, OH, etc.)
