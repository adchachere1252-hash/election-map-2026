import { readFileSync, writeFileSync } from 'fs';

const text = readFileSync('/tmp/olm-119.txt', 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Map full state names to abbreviations
const stateMap = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
  'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
  'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
  'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
  'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
  'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
  'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
  'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
  'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
  'WISCONSIN': 'WI', 'WYOMING': 'WY'
};

// At-large states (single district = district 1)
const atLargeStates = new Set(['AK', 'DE', 'MT', 'ND', 'SD', 'VT', 'WY']);

const reps = {};
let currentState = null;
let nextIsAtLarge = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check for state header (exact match)
  if (stateMap[line]) {
    currentState = stateMap[line];
    nextIsAtLarge = false;
    continue;
  }

  // Check for "AT LARGE" marker
  if (line === 'AT LARGE') {
    nextIsAtLarge = true;
    continue;
  }

  if (!currentState) continue;

  // Skip footnote lines, page numbers, and non-member lines
  if (/^Elected|^Vacancy|^Resigned|^Appointed|^\d+$|^Political|^Congress|^Years|^Democrats|^Republicans|^Number|^Senators|^SENATORS|^REPRESENTATIVES|^Name|^Date|^Successor|^OFFICIAL|^OF THE|^HOUSE|^AND THEIR|^ONE HUNDRED|^Compiled|^https|^Republicans in roman|^PUERTO RICO|^AMERICAN SAMOA|^DISTRICT OF COLUMBIA|^GUAM|^NORTHERN MARIANA|^VIRGIN ISLANDS|^RESIDENT COMMISSIONER|^DELEGATE|^DELEGATE$/.test(line)) {
    continue;
  }

  // Match numbered district: "1 Name .... City" or "1 Name   City"
  const districtMatch = line.match(/^(\d+)\s+([A-Z][A-Za-z\s"'.,\-]+?)(?:\s{2,}|\s*\.{2,})\s*\S/);
  if (districtMatch) {
    const district = parseInt(districtMatch[1]);
    let name = districtMatch[2].trim();
    // Remove trailing footnote numbers
    name = name.replace(/\d+$/, '').trim();
    // Remove trailing punctuation
    name = name.replace(/[,.]$/, '').trim();
    reps[`${currentState}-${district}`] = name;
    nextIsAtLarge = false;
    continue;
  }

  // Match at-large representative (name with dots/spaces after)
  if (nextIsAtLarge || atLargeStates.has(currentState)) {
    const atLargeMatch = line.match(/^([A-Z][A-Za-z\s"'.,\-]+?)(?:\s{2,}|\s*\.{2,})\s*\S/);
    if (atLargeMatch) {
      let name = atLargeMatch[1].trim();
      name = name.replace(/\d+$/, '').trim();
      name = name.replace(/[,.]$/, '').trim();
      reps[`${currentState}-1`] = name;
      nextIsAtLarge = false;
      continue;
    }
  }
}

// Manual overrides for known vacancies and special cases
// CA-1: Vacancy (Doug LaMalfa died Jan 6, 2026)
reps['CA-1'] = 'VACANT';
// GA-14: Vacancy (Marjorie Taylor Greene resigned Jan 5, 2026)
reps['GA-14'] = 'VACANT';
// NJ-11: Vacancy (Mikie Sherrill resigned Nov 20, 2025)
reps['NJ-11'] = 'VACANT';

// Manual entries for districts missed by parser due to special characters or formatting
reps['AZ-7'] = 'Adelita S. Grijalva';       // footnote superscript caused miss
reps['AR-1'] = 'Eric A. "Rick" Crawford';   // quoted nickname
reps['CA-38'] = 'Linda T. Sánchez';          // special character
reps['CA-44'] = 'Nanette Diaz Barragán';     // special character
reps['FL-6'] = 'Randy Fine';                 // footnote superscript
reps['GA-1'] = 'Earl L. "Buddy" Carter';    // quoted nickname
reps['GA-4'] = 'Henry C. "Hank" Johnson, Jr.'; // quoted nickname
reps['IL-4'] = 'Jesús G. "Chuy" García';    // special characters
reps['IN-7'] = 'André Carson';               // special character
reps['NY-7'] = 'Nydia M. Velázquez';         // special character
reps['TN-3'] = 'Charles J. "Chuck" Fleischmann'; // quoted nickname
reps['TN-7'] = 'Matt Van Epps';              // footnote superscript
reps['TX-18'] = 'Christian D. Menefee';      // footnote superscript
reps['VA-3'] = 'Robert C. "Bobby" Scott';   // quoted nickname
reps['VA-11'] = 'James R. Walkinshaw';       // footnote superscript

// Manual entries for at-large states that may have been missed
const atLargeManual = {
  'AK-1': 'Nicholas J. Begich III',
  'DE-1': 'Sarah McBride',
  'MT-1': 'Troy E. Downing',  // MT-1
  'MT-2': 'Ryan Zinke',       // MT-2 (Montana got 2 seats)
  'ND-1': 'Julie Fedorchak',
  'SD-1': 'Dusty Johnson',
  'VT-1': 'Becca Balint',
  'WY-1': 'Harriet M. Hageman',
};

for (const [key, name] of Object.entries(atLargeManual)) {
  if (!reps[key]) reps[key] = name;
}

const sorted = Object.keys(reps).sort((a, b) => {
  const [stA, dA] = a.split('-');
  const [stB, dB] = b.split('-');
  if (stA !== stB) return stA.localeCompare(stB);
  return parseInt(dA) - parseInt(dB);
});

console.log(`Total representatives parsed: ${sorted.length}`);

// Show any states with unexpected counts
const stateCounts = {};
for (const key of sorted) {
  const state = key.split('-')[0];
  stateCounts[state] = (stateCounts[state] || 0) + 1;
}

const expectedCounts = {
  AL:7, AK:1, AZ:9, AR:4, CA:52, CO:8, CT:5, DE:1, FL:28, GA:14, HI:2, ID:2,
  IL:17, IN:9, IA:4, KS:4, KY:6, LA:6, ME:2, MD:8, MA:9, MI:13, MN:8, MS:4,
  MO:8, MT:2, NE:3, NV:4, NH:2, NJ:12, NM:3, NY:26, NC:14, ND:1, OH:15, OK:5,
  OR:6, PA:17, RI:2, SC:7, SD:1, TN:9, TX:38, UT:4, VT:1, VA:11, WA:10, WV:2,
  WI:8, WY:1
};

let mismatches = [];
for (const [state, expected] of Object.entries(expectedCounts)) {
  const actual = stateCounts[state] || 0;
  if (actual !== expected) {
    mismatches.push(`${state}: expected ${expected}, got ${actual}`);
  }
}

if (mismatches.length > 0) {
  console.log('\nMismatches:');
  mismatches.forEach(m => console.log(' ', m));
} else {
  console.log('All state counts match!');
}

// Write the output as JSON
writeFileSync('/tmp/reps-parsed.json', JSON.stringify(reps, null, 2));
console.log('\nWritten to /tmp/reps-parsed.json');
