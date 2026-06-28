#!/usr/bin/env python3
"""Verify the scrolling results banner data."""
import json, subprocess

# Fetch the banner data from the tRPC endpoint
result = subprocess.run(
    ["curl", "-s", "http://localhost:3000/api/trpc/live.recentResults"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
results = data.get("result", {}).get("data", [])

print(f"Total banner items: {len(results)}")
print()

if not results:
    print("No results in the banner - this is expected if no races have been called yet.")
else:
    for r in results:
        chamber = r.get("chamber", "?").upper()[:3]
        state = r.get("stateCode", "?")
        dist = r.get("district")
        label = f"{state}-{dist}" if dist else state
        winner = r.get("calledWinner", "?")
        party = r.get("calledParty", "?")
        prev = r.get("previousParty", "")
        date = r.get("generalDate", "")
        special = " [SPECIAL]" if r.get("isSpecial") else ""
        flip = ""
        if prev and prev != party and prev not in ("I", "Open", "VACANT"):
            flip = f" FLIP({prev}->{party})"
        print(f"  {chamber} {label}: {winner} ({party}){special}{flip} | Date: {date}")

print("\n--- Verification Notes ---")
print("These are the races shown in the scrolling banner at the top of the page.")
print("Data comes from AP pipeline (Called/Certified status only).")
print("Each item shows: chamber tag, state/district, winner name, party, date.")
