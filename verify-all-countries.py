#!/usr/bin/env python3
"""
Full verification of all country centroids in the Globe component.
Compares against authoritative geographic centroid data.
"""

# Our code's centroids (extracted from Globe.tsx)
CODE_CENTROIDS = {
    "CO": (-74, 4),
    "BR": (-51, -10),
    "AU": (134, -25),
    "DE": (10, 51),
    "FR": (3, 46),
    "GB": (-2, 54),
    "IN": (79, 22),
    "JP": (138, 36),
    "KR": (128, 36),
    "MX": (-102, 23),
    "CA": (-106, 56),
    "NG": (8, 10),
    "ZA": (25, -29),
    "EG": (30, 27),
    "SA": (45, 24),
    "TR": (35, 39),
    "PL": (20, 52),
    "NL": (5, 52),
    "CL": (-72, -36),
    "AR": (-64, -34),
    "PH": (122.8, 12),
    "ID": (113, -2),
    "TH": (101, 15),
    "VN": (106, 16),
    "MY": (102, 4),
    "SG": (104, 1),
    "NO": (9, 61),
    "SE": (16, 62),
    "DK": (10, 56),
    "FI": (26, 64),
    "PT": (-8, 40),
    "ES": (-4, 40),
    "IT": (12, 43),
    "GR": (22, 39),
    "RO": (25, 46),
    "CZ": (16, 50),
    "AT": (14, 47),
    "CH": (8, 47),
    "BE": (4, 51),
    "IE": (-8, 53),
    "NZ": (172, -42),
    "HU": (19, 47),
    "SK": (19, 49),
    "ST": (7, 1),
    "CK": (-160, -21),
    "IS": (-19, 65),
    "LV": (25, 57),
    "BA": (18, 44),
    "CV": (-24, 16),
    "BG": (25, 43),
    "GM": (-15.3, 13.5),
    "SS": (30, 8),
    "AM": (45, 40),
    "KE": (38, 1),
    "GH": (-2, 8),
    "TZ": (35, -6),
    "ET": (39, 9),
    "UG": (32, 1),
    "ZM": (28, -13),
    "MW": (34, -14),
    "HT": (-72, 19),
    "DO": (-70, 19),
    "JM": (-77, 18),
    "TT": (-61.5, 10.5),
    "PE": (-76, -10),
    "EC": (-78, -2),
    "BO": (-65, -17),
    "PY": (-58, -23),
    "UY": (-56, -33),
    "VE": (-66, 8),
    "CU": (-79, 22),
    "PA": (-80, 9),
    "CR": (-84, 10),
    "GT": (-90, 15),
    "HN": (-87, 15),
    "SV": (-89, 14),
    "NI": (-85, 13),
    "BZ": (-89, 17),
    "PK": (69, 30),
    "BD": (90, 24),
    "LK": (81, 8),
    "MM": (96, 20),
    "KH": (105, 13),
    "LA": (103, 18),
    "NP": (84, 28),
    "AF": (67, 33),
    "IQ": (44, 33),
    "IR": (53, 32),
    "SY": (38, 35),
    "JO": (36, 31),
    "LB": (36, 34),
    "IL": (35, 31),
    "AE": (54, 24),
    "QA": (51, 25),
    "KW": (48, 29),
    "BH": (51, 26),
    "OM": (57, 21),
    "YE": (48, 15),
    "UA": (32, 49),
    "RU": (105, 62),
    "CN": (105, 35),
    "MN": (104, 47),
    "KZ": (67, 48),
    "UZ": (64, 41),
    "TM": (59, 39),
    "KG": (75, 41),
    "TJ": (69, 39),
    "GE": (44, 42),
    "AZ": (48, 41),
    "LY": (17, 27),
    "TN": (9, 34),
    "DZ": (3, 30),
    "MA": (-7, 31),
    "SD": (30, 15),
    "CD": (24, -3),
    "AO": (18, -12),
    "MZ": (35, -18),
    "MG": (47, -19),
    "CM": (12, 6),
    "CI": (-5, 7),
    "SN": (-14, 14),
    "ML": (-4, 17),
    "BF": (-2, 12),
    "NE": (8, 17),
    "TD": (19, 15),
    "SO": (46, 6),
    "ER": (39, 15),
    "DJ": (43, 12),
    "RW": (30, -2),
    "BI": (30, -3),
    "TW": (121, 24),
    "HK": (114, 22),
    "US": (-98, 40),
    "AL": (20, 41),
    "AQ": (0, -82),
    "BJ": (2, 10),
    "BN": (115, 5),
    "BS": (-77.9, 25.8),
    "BT": (90, 27),
    "BW": (24, -22),
    "BY": (28, 53),
    "CF": (21, 7),
    "CG": (16, -1),
    "CY": (33, 35),
    "EE": (26, 59),
    "EH": (-13, 24),
    "FJ": (178, -18),
    "FK": (-59, -52),
    "GA": (12, -1),
    "GL": (-42, 72),
    "GN": (-10, 10),
    "GQ": (10, 2),
    "GW": (-15, 12),
    "GY": (-59, 5),
    "HR": (16.4, 44.9),
    "KP": (127, 40),
    "LR": (-10, 6),
    "LS": (29, -30),
    "LT": (24, 56),
    "LU": (6, 50),
    "MD": (29, 47),
    "ME": (19, 43),
    "MK": (22, 41),
    "MR": (-11, 20),
    "NA": (17, -22),
    "NC": (165, -22),
    "PG": (147, -6),
    "PR": (-66, 18),
    "PS": (35, 32),
    "RS": (21, 44),
    "SB": (160, -9),
    "SI": (15, 46),
    "SL": (-12, 9),
    "SR": (-56, 4),
    "SZ": (31, -27),
    "TF": (69, -49),
    "TG": (1, 8),
    "TL": (126, -9),
    "VU": (167, -16),
    "ZW": (30, -20),
}

# Authoritative centroids (from Natural Earth / CIA World Factbook / Wikipedia geographic coordinates)
# Format: (longitude, latitude)
REFERENCE_CENTROIDS = {
    "CO": (-73.08, 4.57),      # Colombia
    "BR": (-51.93, -14.24),    # Brazil
    "AU": (133.78, -25.27),    # Australia
    "DE": (10.45, 51.17),      # Germany
    "FR": (2.21, 46.23),       # France
    "GB": (-3.44, 55.38),      # United Kingdom
    "IN": (78.96, 20.59),      # India
    "JP": (138.25, 36.20),     # Japan
    "KR": (127.77, 35.91),     # South Korea
    "MX": (-102.55, 23.63),    # Mexico
    "CA": (-106.35, 56.13),    # Canada
    "NG": (8.68, 9.08),        # Nigeria
    "ZA": (25.08, -28.48),     # South Africa
    "EG": (30.80, 26.82),      # Egypt
    "SA": (45.08, 23.89),      # Saudi Arabia
    "TR": (35.24, 38.96),      # Turkey
    "PL": (19.15, 51.92),      # Poland
    "NL": (5.29, 52.13),       # Netherlands
    "CL": (-71.54, -35.68),    # Chile
    "AR": (-63.62, -38.42),    # Argentina
    "PH": (121.77, 12.88),     # Philippines
    "ID": (113.92, -0.79),     # Indonesia
    "TH": (100.99, 15.87),     # Thailand
    "VN": (108.28, 14.06),     # Vietnam
    "MY": (101.98, 4.21),      # Malaysia
    "SG": (103.82, 1.35),      # Singapore
    "NO": (8.47, 60.47),       # Norway
    "SE": (18.64, 60.13),      # Sweden
    "DK": (9.50, 56.26),       # Denmark
    "FI": (25.75, 61.92),      # Finland
    "PT": (-8.22, 39.40),      # Portugal
    "ES": (-3.75, 40.46),      # Spain
    "IT": (12.57, 41.87),      # Italy
    "GR": (21.82, 39.07),      # Greece
    "RO": (24.97, 45.94),      # Romania
    "CZ": (15.47, 49.82),      # Czech Republic
    "AT": (14.55, 47.52),      # Austria
    "CH": (8.23, 46.82),       # Switzerland
    "BE": (4.47, 50.50),       # Belgium
    "IE": (-8.24, 53.41),      # Ireland
    "NZ": (174.89, -40.90),    # New Zealand
    "HU": (19.50, 47.16),      # Hungary
    "SK": (19.70, 48.67),      # Slovakia
    "ST": (6.61, 0.19),        # Sao Tome & Principe
    "CK": (-159.78, -21.24),   # Cook Islands
    "IS": (-19.02, 64.96),     # Iceland
    "LV": (24.60, 56.88),      # Latvia
    "BA": (17.68, 43.92),      # Bosnia & Herzegovina
    "CV": (-24.01, 16.00),     # Cape Verde
    "BG": (25.49, 42.73),      # Bulgaria
    "GM": (-15.31, 13.44),     # Gambia
    "SS": (31.31, 6.88),       # South Sudan
    "AM": (44.93, 40.07),      # Armenia
    "KE": (37.91, -0.02),      # Kenya
    "GH": (-1.02, 7.95),       # Ghana
    "TZ": (34.89, -6.37),      # Tanzania
    "ET": (40.49, 9.15),       # Ethiopia
    "UG": (32.29, 1.37),       # Uganda
    "ZM": (27.85, -13.13),     # Zambia
    "MW": (34.30, -13.25),     # Malawi
    "HT": (-72.29, 18.97),     # Haiti
    "DO": (-70.16, 18.74),     # Dominican Republic
    "JM": (-77.30, 18.11),     # Jamaica
    "TT": (-61.22, 10.69),     # Trinidad & Tobago
    "PE": (-75.02, -9.19),     # Peru
    "EC": (-78.18, -1.83),     # Ecuador
    "BO": (-63.59, -16.29),    # Bolivia
    "PY": (-58.44, -23.44),    # Paraguay
    "UY": (-55.77, -32.52),    # Uruguay
    "VE": (-66.59, 6.42),      # Venezuela
    "CU": (-77.78, 21.52),     # Cuba
    "PA": (-80.78, 8.54),      # Panama
    "CR": (-83.75, 9.75),      # Costa Rica
    "GT": (-90.23, 15.78),     # Guatemala
    "HN": (-86.24, 15.20),     # Honduras
    "SV": (-88.90, 13.79),     # El Salvador
    "NI": (-85.21, 12.87),     # Nicaragua
    "BZ": (-88.50, 17.19),     # Belize
    "PK": (69.35, 30.38),      # Pakistan
    "BD": (90.36, 23.68),      # Bangladesh
    "LK": (80.77, 7.87),       # Sri Lanka
    "MM": (96.68, 21.91),      # Myanmar
    "KH": (104.99, 12.57),     # Cambodia
    "LA": (102.50, 19.86),     # Laos
    "NP": (84.12, 28.39),      # Nepal
    "AF": (67.71, 33.94),      # Afghanistan
    "IQ": (43.68, 33.22),      # Iraq
    "IR": (53.69, 32.43),      # Iran
    "SY": (38.99, 34.80),      # Syria
    "JO": (36.24, 30.59),      # Jordan
    "LB": (35.86, 33.87),      # Lebanon
    "IL": (34.85, 31.05),      # Israel
    "AE": (53.85, 23.42),      # UAE
    "QA": (51.18, 25.35),      # Qatar
    "KW": (47.48, 29.31),      # Kuwait
    "BH": (50.56, 26.07),      # Bahrain
    "OM": (55.92, 21.47),      # Oman
    "YE": (48.52, 15.55),      # Yemen
    "UA": (31.17, 48.38),      # Ukraine
    "RU": (105.32, 61.52),     # Russia
    "CN": (104.20, 35.86),     # China
    "MN": (103.85, 46.86),     # Mongolia
    "KZ": (66.92, 48.02),      # Kazakhstan
    "UZ": (64.59, 41.38),      # Uzbekistan
    "TM": (59.56, 38.97),      # Turkmenistan
    "KG": (74.77, 41.20),      # Kyrgyzstan
    "TJ": (71.28, 38.86),      # Tajikistan
    "GE": (43.36, 42.32),      # Georgia
    "AZ": (47.58, 40.14),      # Azerbaijan
    "LY": (17.23, 26.34),      # Libya
    "TN": (9.54, 33.89),       # Tunisia
    "DZ": (1.66, 28.03),       # Algeria
    "MA": (-7.09, 31.79),      # Morocco
    "SD": (30.22, 12.86),      # Sudan
    "CD": (21.76, -4.04),      # DR Congo
    "AO": (17.87, -11.20),     # Angola
    "MZ": (35.53, -18.67),     # Mozambique
    "MG": (46.87, -18.77),     # Madagascar
    "CM": (12.35, 7.37),       # Cameroon
    "CI": (-5.55, 7.54),       # Cote d'Ivoire
    "SN": (-14.45, 14.50),     # Senegal
    "ML": (-3.99, 17.57),      # Mali
    "BF": (-1.56, 12.24),      # Burkina Faso
    "NE": (8.08, 17.61),       # Niger
    "TD": (18.73, 15.45),      # Chad
    "SO": (46.20, 5.15),       # Somalia
    "ER": (39.78, 15.18),      # Eritrea
    "DJ": (42.59, 11.83),      # Djibouti
    "RW": (29.87, -1.94),      # Rwanda
    "BI": (29.92, -3.37),      # Burundi
    "TW": (120.96, 23.70),     # Taiwan
    "HK": (114.17, 22.40),     # Hong Kong
    "US": (-95.71, 37.09),     # United States
    "AL": (20.17, 41.15),      # Albania
    "AQ": (0, -82.86),         # Antarctica
    "BJ": (2.32, 9.31),        # Benin
    "BN": (114.73, 4.54),      # Brunei
    "BS": (-77.40, 25.03),     # Bahamas
    "BT": (90.43, 27.51),      # Bhutan
    "BW": (24.68, -22.33),     # Botswana
    "BY": (27.95, 53.71),      # Belarus
    "CF": (20.94, 6.61),       # Central African Republic
    "CG": (15.83, -0.23),      # Republic of Congo
    "CY": (33.43, 35.13),      # Cyprus
    "EE": (25.01, 58.60),      # Estonia
    "EH": (-12.89, 24.22),     # Western Sahara
    "FJ": (178.07, -17.71),    # Fiji
    "FK": (-59.35, -51.80),    # Falkland Islands
    "GA": (11.61, -0.80),      # Gabon
    "GL": (-42.60, 71.71),     # Greenland
    "GN": (-9.70, 9.95),       # Guinea
    "GQ": (10.27, 1.65),       # Equatorial Guinea
    "GW": (-15.18, 11.80),     # Guinea-Bissau
    "GY": (-58.93, 4.86),      # Guyana
    "HR": (15.42, 45.10),      # Croatia
    "KP": (127.51, 40.34),     # North Korea
    "LR": (-9.43, 6.43),       # Liberia
    "LS": (28.23, -29.61),     # Lesotho
    "LT": (23.88, 55.17),      # Lithuania
    "LU": (6.13, 49.82),       # Luxembourg
    "MD": (28.37, 47.41),      # Moldova
    "ME": (19.37, 42.71),      # Montenegro
    "MK": (21.75, 41.51),      # North Macedonia
    "MR": (-10.94, 21.01),     # Mauritania
    "NA": (18.49, -22.96),     # Namibia
    "NC": (165.62, -20.90),    # New Caledonia
    "PG": (143.96, -6.31),     # Papua New Guinea
    "PR": (-66.59, 18.22),     # Puerto Rico
    "PS": (35.23, 31.95),      # Palestine
    "RS": (21.01, 44.02),      # Serbia
    "SB": (160.16, -9.43),     # Solomon Islands
    "SI": (14.99, 46.15),      # Slovenia
    "SL": (-11.78, 8.46),      # Sierra Leone
    "SR": (-56.03, 3.92),      # Suriname
    "SZ": (31.47, -26.52),     # Eswatini
    "TF": (69.35, -49.28),     # French Southern Territories
    "TG": (0.82, 8.62),        # Togo
    "TL": (125.73, -8.87),     # Timor-Leste
    "VU": (166.96, -15.38),    # Vanuatu
    "ZW": (29.15, -19.02),     # Zimbabwe
}

# Run verification
TOLERANCE = 5.0  # degrees
errors = []
warnings = []
verified = 0

for code, (our_lon, our_lat) in CODE_CENTROIDS.items():
    if code not in REFERENCE_CENTROIDS:
        warnings.append(f"  {code}: No reference data available")
        continue
    
    ref_lon, ref_lat = REFERENCE_CENTROIDS[code]
    lon_diff = abs(our_lon - ref_lon)
    lat_diff = abs(our_lat - ref_lat)
    
    if lon_diff > TOLERANCE or lat_diff > TOLERANCE:
        errors.append(f"  ❌ {code}: Our ({our_lon}, {our_lat}) vs Reference ({ref_lon}, {ref_lat}) — Δlon={lon_diff:.1f}°, Δlat={lat_diff:.1f}°")
    elif lon_diff > 3.0 or lat_diff > 3.0:
        warnings.append(f"  ⚠️  {code}: Our ({our_lon}, {our_lat}) vs Reference ({ref_lon}, {ref_lat}) — Δlon={lon_diff:.1f}°, Δlat={lat_diff:.1f}°")
        verified += 1
    else:
        verified += 1

print("=" * 70)
print("FULL COUNTRY CENTROID VERIFICATION REPORT")
print("=" * 70)
print(f"\nTotal countries checked: {len(CODE_CENTROIDS)}")
print(f"Reference data available: {len(REFERENCE_CENTROIDS)}")
print(f"Tolerance: ±{TOLERANCE}°")
print(f"\n✅ Verified (within tolerance): {verified}")
print(f"❌ ERRORS (exceeding {TOLERANCE}° tolerance): {len(errors)}")
print(f"⚠️  Warnings (>3° but within tolerance): {len([w for w in warnings if '⚠️' in w])}")
print(f"ℹ️  No reference data: {len([w for w in warnings if 'No reference' in w])}")

if errors:
    print(f"\n{'─' * 70}")
    print("ERRORS — These countries need coordinate fixes:")
    print('─' * 70)
    for e in errors:
        print(e)

if [w for w in warnings if '⚠️' in w]:
    print(f"\n{'─' * 70}")
    print("WARNINGS — Slightly off but acceptable:")
    print('─' * 70)
    for w in warnings:
        if '⚠️' in w:
            print(w)

if [w for w in warnings if 'No reference' in w]:
    print(f"\n{'─' * 70}")
    print("INFO — No reference data (skipped):")
    print('─' * 70)
    for w in warnings:
        if 'No reference' in w:
            print(w)

print(f"\n{'=' * 70}")
if not errors:
    print("🎉 ALL COUNTRIES PASS VERIFICATION — No errors found!")
else:
    print(f"⚠️  {len(errors)} COUNTRIES NEED FIXES")
print("=" * 70)
