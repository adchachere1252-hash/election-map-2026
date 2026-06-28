# Europe Label Clustering Analysis

From the screenshot when viewing France/Europe on the globe:

## Current Issues:
1. The Europe region at the top of the visible globe shows many labels packed together
2. I can see "Spain", "France", and other labels clustered at the top edge
3. The labels with leader-lines (NL, BE, LU, CH, AT, DK, SI, HR, BA, etc.) are still overlapping because the offsets (3-5 degrees) are too small on a globe of this scale
4. The problem is especially bad because:
   - Many European countries are very small (NL, BE, LU, CH, AT, DK, SI, HR, BA, SK, CZ, HU, etc.)
   - They all have similar latitudes (43-56°N) and longitudes (0-25°E)
   - The 3-5 degree offsets barely separate them visually on a globe

## Solution Strategy:
1. **Increase callout offsets significantly** — from 3-5° to 8-15° for European countries
2. **Increase altitude multiplier** — from 1.09-1.12 to 1.15-1.25 to push labels further from surface
3. **Group labels by sub-region** and spread them in different directions:
   - Benelux (NL, BE, LU) → push northwest
   - Alpine (CH, AT) → push south
   - Balkans (BA, RS, ME, AL, MK, HR, SI) → push southeast
   - Baltic (LV, LT, EE) → push northeast
   - Central (CZ, SK, HU) → push east
4. **Reduce label count for non-election countries** — only show labels for countries WITH elections, hide tiny non-election European countries
5. **Consider a "Europe inset" approach** — but that's complex for a 3D globe

## Best approach: 
- For non-election European countries that are small (scale <= 0.04), HIDE the label entirely when zoomed out
- For election countries, increase offsets dramatically so they spread outward like spokes
- Make leader lines more visible (brighter, thicker)
