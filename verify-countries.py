#!/usr/bin/env python3
"""Verify country centroids, flag emoji mappings, and short names."""

# Known correct approximate centroids (lon, lat) for countries with elections
# Source: CIA World Factbook geographic coordinates
CORRECT_CENTROIDS = {
    # European election countries
    "SE": {"lon": 18, "lat": 62, "name": "Sweden"},
    "CZ": {"lon": 15, "lat": 50, "name": "Czech Republic"},
    "BG": {"lon": 25, "lat": 43, "name": "Bulgaria"},
    "HU": {"lon": 20, "lat": 47, "name": "Hungary"},
    "SK": {"lon": 19.5, "lat": 48.7, "name": "Slovakia"},
    "IS": {"lon": -19, "lat": 65, "name": "Iceland"},
    "LV": {"lon": 25, "lat": 57, "name": "Latvia"},
    "BA": {"lon": 17.8, "lat": 44, "name": "Bosnia & Herzegovina"},
    "CH": {"lon": 8, "lat": 47, "name": "Switzerland"},
    "IT": {"lon": 12.5, "lat": 42.5, "name": "Italy"},
    "GB": {"lon": -2, "lat": 54, "name": "United Kingdom"},
    # Americas
    "US": {"lon": -98, "lat": 40, "name": "United States"},
    "CA": {"lon": -106, "lat": 56, "name": "Canada"},
    "MX": {"lon": -102, "lat": 23, "name": "Mexico"},
    "BR": {"lon": -51, "lat": -10, "name": "Brazil"},
    "AR": {"lon": -64, "lat": -34, "name": "Argentina"},
    "CO": {"lon": -72, "lat": 4, "name": "Colombia"},
    "CL": {"lon": -71, "lat": -30, "name": "Chile"},
    "PE": {"lon": -76, "lat": -10, "name": "Peru"},
    # Asia
    "JP": {"lon": 138, "lat": 36, "name": "Japan"},
    "KR": {"lon": 128, "lat": 36, "name": "South Korea"},
    "IN": {"lon": 79, "lat": 21, "name": "India"},
    "PH": {"lon": 122, "lat": 12, "name": "Philippines"},
    "ID": {"lon": 120, "lat": -5, "name": "Indonesia"},
    "AU": {"lon": 133, "lat": -25, "name": "Australia"},
    "TH": {"lon": 101, "lat": 15, "name": "Thailand"},
    "VN": {"lon": 108, "lat": 16, "name": "Vietnam"},
    "MY": {"lon": 110, "lat": 4, "name": "Malaysia"},
    "SG": {"lon": 104, "lat": 1.3, "name": "Singapore"},
    # Africa
    "NG": {"lon": 8, "lat": 10, "name": "Nigeria"},
    "ZA": {"lon": 25, "lat": -29, "name": "South Africa"},
    "EG": {"lon": 30, "lat": 27, "name": "Egypt"},
    "KE": {"lon": 38, "lat": 1, "name": "Kenya"},
    "ET": {"lon": 39, "lat": 9, "name": "Ethiopia"},
    "GH": {"lon": -2, "lat": 8, "name": "Ghana"},
    "TZ": {"lon": 35, "lat": -6, "name": "Tanzania"},
    "ZM": {"lon": 28, "lat": -15, "name": "Zambia"},
    # Middle East
    "SA": {"lon": 45, "lat": 24, "name": "Saudi Arabia"},
    "IR": {"lon": 53, "lat": 32, "name": "Iran"},
    "TR": {"lon": 35, "lat": 39, "name": "Turkey"},
    "IQ": {"lon": 44, "lat": 33, "name": "Iraq"},
    "IL": {"lon": 35, "lat": 31.5, "name": "Israel"},
    # Others
    "RU": {"lon": 100, "lat": 60, "name": "Russia"},
    "CN": {"lon": 105, "lat": 35, "name": "China"},
    "DE": {"lon": 10, "lat": 51, "name": "Germany"},
    "FR": {"lon": 3, "lat": 46, "name": "France"},
    "ES": {"lon": -4, "lat": 40, "name": "Spain"},
    "PL": {"lon": 20, "lat": 52, "name": "Poland"},
    "NL": {"lon": 5, "lat": 52, "name": "Netherlands"},
}

# Values from the code
CODE_CENTROIDS = {
    "SE": {"lon": 18, "lat": 62},
    "CZ": {"lon": 15, "lat": 50},
    "BG": {"lon": 25, "lat": 43},
    "HU": {"lon": 19, "lat": 47},
    "SK": {"lon": 19, "lat": 49},
    "IS": {"lon": -19, "lat": 65},
    "LV": {"lon": 25, "lat": 57},
    "BA": {"lon": 18, "lat": 44},
    "CH": {"lon": 8, "lat": 47},
    "IT": {"lon": 12, "lat": 43},
    "GB": {"lon": -2, "lat": 54},
    "US": {"lon": -98, "lat": 40},
    "CA": {"lon": -106, "lat": 56},
    "MX": {"lon": -102, "lat": 23},
    "BR": {"lon": -51, "lat": -10},
    "AR": {"lon": -64, "lat": -34},
    "CO": {"lon": -72, "lat": 4},
    "CL": {"lon": -71, "lat": -30},
    "PE": {"lon": -76, "lat": -10},
    "JP": {"lon": 138, "lat": 36},
    "KR": {"lon": 128, "lat": 36},
    "IN": {"lon": 79, "lat": 21},
    "PH": {"lon": 122, "lat": 12},
    "ID": {"lon": 120, "lat": -5},
    "AU": {"lon": 133, "lat": -25},
    "TH": {"lon": 101, "lat": 15},
    "VN": {"lon": 108, "lat": 16},
    "MY": {"lon": 110, "lat": 4},
    "SG": {"lon": 104, "lat": 1.3},
    "NG": {"lon": 8, "lat": 10},
    "ZA": {"lon": 25, "lat": -29},
    "EG": {"lon": 30, "lat": 27},
    "KE": {"lon": 38, "lat": 1},
    "ET": {"lon": 39, "lat": 9},
    "GH": {"lon": -2, "lat": 8},
    "TZ": {"lon": 35, "lat": -6},
    "ZM": {"lon": 28, "lat": -13},
    "SA": {"lon": 45, "lat": 24},
    "IR": {"lon": 53, "lat": 32},
    "TR": {"lon": 35, "lat": 39},
    "IQ": {"lon": 44, "lat": 33},
    "IL": {"lon": 35, "lat": 31},
    "RU": {"lon": 100, "lat": 60},
    "CN": {"lon": 105, "lat": 35},
    "DE": {"lon": 10, "lat": 51},
    "FR": {"lon": 3, "lat": 46},
    "ES": {"lon": -4, "lat": 40},
    "PL": {"lon": 20, "lat": 52},
    "NL": {"lon": 5, "lat": 52},
}

# Flag emoji verification - ISO 3166-1 alpha-2 to flag emoji
# Flags are generated from country code: each letter -> regional indicator symbol
def code_to_flag(code):
    return ''.join(chr(0x1F1E6 + ord(c) - ord('A')) for c in code.upper())

print("=" * 60)
print("COUNTRY CENTROID VERIFICATION")
print("=" * 60)
errors = []
for code, correct in CORRECT_CENTROIDS.items():
    if code in CODE_CENTROIDS:
        coded = CODE_CENTROIDS[code]
        lon_diff = abs(coded["lon"] - correct["lon"])
        lat_diff = abs(coded["lat"] - correct["lat"])
        if lon_diff > 5 or lat_diff > 5:
            errors.append(f"  {code} ({correct['name']}): Code has ({coded['lon']}, {coded['lat']}), should be ~({correct['lon']}, {correct['lat']}) [diff: lon={lon_diff}, lat={lat_diff}]")
        elif lon_diff > 3 or lat_diff > 3:
            print(f"  WARNING {code} ({correct['name']}): Minor offset ({coded['lon']}, {coded['lat']}) vs ({correct['lon']}, {correct['lat']})")
    else:
        errors.append(f"  {code} ({correct['name']}): MISSING from COUNTRY_CENTROIDS!")

if errors:
    print("\nERRORS FOUND:")
    for e in errors:
        print(e)
else:
    print("\nAll centroids verified within acceptable tolerance (±5°)")

print("\n" + "=" * 60)
print("FLAG EMOJI VERIFICATION")
print("=" * 60)
# Verify some key flags
test_flags = {
    "US": "🇺🇸", "GB": "🇬🇧", "FR": "🇫🇷", "DE": "🇩🇪", "JP": "🇯🇵",
    "BR": "🇧🇷", "AU": "🇦🇺", "CA": "🇨🇦", "IN": "🇮🇳", "IT": "🇮🇹",
    "SE": "🇸🇪", "CZ": "🇨🇿", "BG": "🇧🇬", "HU": "🇭🇺", "SK": "🇸🇰",
    "IS": "🇮🇸", "LV": "🇱🇻", "BA": "🇧🇦", "CH": "🇨🇭", "ZA": "🇿🇦",
    "NG": "🇳🇬", "EG": "🇪🇬", "KE": "🇰🇪", "ET": "🇪🇹", "GH": "🇬🇭",
    "MX": "🇲🇽", "AR": "🇦🇷", "CO": "🇨🇴", "CL": "🇨🇱", "PE": "🇵🇪",
}

flag_errors = []
for code, expected_flag in test_flags.items():
    generated = code_to_flag(code)
    if generated != expected_flag:
        flag_errors.append(f"  {code}: Generated {generated} but expected {expected_flag}")

if flag_errors:
    print("\nFLAG ERRORS:")
    for e in flag_errors:
        print(e)
else:
    print("\nAll flag emoji verified correct (ISO 3166-1 alpha-2 -> regional indicators)")

print("\n" + "=" * 60)
print("SHORT NAME VERIFICATION")
print("=" * 60)
# These are the short names that should be used on the globe
EXPECTED_SHORT_NAMES = {
    "US": "U.S.A.",
    "GB": "U.K.",
    "KR": "S. Korea",
    "ZA": "S. Africa",
    "SA": "S. Arabia",
    "CZ": "Czechia",
    "BA": "Bosnia",
    "CD": "D.R. Congo",
    "CF": "C.A.R.",
    "SS": "S. Sudan",
    "PG": "Papua N.G.",
    "AE": "U.A.E.",
}
print("Short names to verify in code (manual check):")
for code, name in EXPECTED_SHORT_NAMES.items():
    print(f"  {code} -> {name}")

print("\nDone! Check the output above for any errors.")
