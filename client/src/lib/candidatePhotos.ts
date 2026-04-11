/**
 * Candidate photo utilities using the unitedstates/images public domain repository.
 * Source: https://github.com/unitedstates/images
 * Photos are official Congressional headshots, fully public domain.
 *
 * URL pattern: https://unitedstates.github.io/images/congress/225x275/{BIOGUIDE_ID}.jpg
 */

const PHOTO_BASE = "https://unitedstates.github.io/images/congress/225x275";

/**
 * Maps candidate display names to their Congressional Bioguide IDs.
 * Covers all 2026 Senate candidates, key House incumbents, and governors
 * who previously served in Congress.
 */
export const BIOGUIDE_MAP: Record<string, string> = {
  // ── 2026 Senate incumbents & candidates ──────────────────────────────────
  "Jon Ossoff": "O000174",
  "Susan Collins": "C001035",
  "Gary Peters": "P000595",
  "Thom Tillis": "T000476",
  "Jeanne Shaheen": "S001181",
  "Tina Smith": "S001203",
  "Amy Klobuchar": "K000367",
  "Dan Sullivan": "S001198",
  "Mary Peltola": "P000619",
  "Jon Husted": "H001104",
  "Sherrod Brown": "B000944",
  "John Cornyn": "C001056",
  "Pete Ricketts": "R000618",
  "Joni Ernst": "E000295",
  "John Hickenlooper": "H000273",
  "Chris Coons": "C001088",
  "Christopher A. Coons": "C001088",
  "Dick Durbin": "D000563",
  "Richard J. Durbin": "D000563",
  "Edward Markey": "M000133",
  "Ed Markey": "M000133",
  "Cory Booker": "B001288",
  "Ben Ray Luján": "L000570",
  "Ben Ray Lujan": "L000570",
  "Jeff Merkley": "M001176",
  "Jack Reed": "R000122",
  "Mark Warner": "W000805",
  "Tommy Tuberville": "T000278",
  "Tom Cotton": "C001095",
  "Jim Risch": "R000584",
  "James E. Risch": "R000584",
  "Roger Marshall": "M001198",
  "Mitch McConnell": "M000355",
  "Bill Cassidy": "C001075",
  "Cindy Hyde-Smith": "H001079",
  "Roger Wicker": "W000437",
  "Alan Armstrong": "A000383",
  "Lindsey Graham": "G000359",
  "Mike Rounds": "R000605",
  "Bill Hagerty": "H000601",
  "Shelley Moore Capito": "C001047",
  "Cynthia Lummis": "L000571",
  "Steve Daines": "D000618",

  // ── Other current senators ────────────────────────────────────────────────
  "Maria Cantwell": "C000127",
  "Patty Murray": "M001111",
  "Ron Wyden": "W000779",
  "Sheldon Whitehouse": "W000802",
  "Bernie Sanders": "S000033",
  "Bernard Sanders": "S000033",
  "Angus King": "K000383",
  "John Barrasso": "B001261",
  "Lisa Murkowski": "M001153",
  "John Thune": "T000250",
  "Kevin Cramer": "C001096",
  "John Hoeven": "H001061",
  "Deb Fischer": "F000463",
  "Chuck Grassley": "G000386",
  "Tammy Baldwin": "B001230",
  "Ron Johnson": "J000293",
  "Tammy Duckworth": "D000622",
  "Todd Young": "Y000064",
  "Mike Braun": "B001310",
  "Bob Casey": "C001070",
  "John Fetterman": "F000479",
  "Chris Van Hollen": "V000128",
  "Ben Cardin": "C000141",
  "Tim Kaine": "K000384",
  "Maggie Hassan": "H001076",
  "Elizabeth Warren": "W000817",
  "Chris Murphy": "M001169",
  "Richard Blumenthal": "B001277",
  "Kirsten Gillibrand": "G000555",
  "Chuck Schumer": "S000148",
  "Bob Menendez": "M000639",
  "Tom Carper": "C000174",
  "Martin Heinrich": "H001046",
  "Debbie Stabenow": "S000770",
  "Ted Budd": "B001305",
  "Tim Scott": "S001184",
  "Raphael Warnock": "W000790",
  "Marco Rubio": "R000595",
  "Rick Scott": "S001217",
  "Bill Nelson": "N000032",
  "Richard Shelby": "S000320",
  "Ted Cruz": "C001098",
  "Jerry Moran": "M000934",
  "Rand Paul": "P000603",
  "John Kennedy": "K000393",
  "Marsha Blackburn": "B001243",
  "John Boozman": "B001236",
  "Mike Crapo": "C000880",
  "Mike Lee": "L000577",
  "Mitt Romney": "R000615",
  "Jon Tester": "T000464",
  "Michael Bennet": "B001267",
  "Joe Manchin": "M001183",

  // ── Governor candidates who previously served in Congress ─────────────────
  "Greg Gianforte": "G000584",
  "Kristi Noem": "N000184",
  "Jared Polis": "P000598",
  "Tim Walz": "W000799",
  "Ron DeSantis": "D000621",
  "Michelle Lujan Grisham": "L000580",

  // ── Key House incumbents (competitive districts) ──────────────────────────
  "Adam Gray": "G000597",
  "David Valadao": "V000129",
  "Gabe Evans": "E000306",
  "Mariannette Miller-Meeks": "M001215",
  "Zach Nunn": "N000191",
  "Don Davis": "D000032",
  "Tom Suozzi": "S001201",
  "Eugene Vindman": "V000136",
  "Henry Cuellar": "C001063",
  "Nicholas J. Begich": "B001325",
  "Elijah Crane": "C001131",
  "Janelle S. Bynum": "B001329",
  "Don Bacon": "B001298",
  "Jared F. Golden": "G000592",
  "Ashley Hinson": "H001087",
  "John James": "J000308",
  "Chris Pappas": "P000614",
  "Darrell Issa": "I000056",
  "David Schweikert": "S001183",
  "Tony Gonzales": "G000589",
  "Greg Casar": "C001138",
};

/**
 * Returns the official Congressional headshot URL for a candidate,
 * or null if no bioguide ID is known for that name.
 */
export function getCandidatePhotoUrl(name: string | null | undefined): string | null {
  if (!name) return null;

  // Direct lookup
  const bioguide = BIOGUIDE_MAP[name.trim()];
  if (bioguide) {
    return `${PHOTO_BASE}/${bioguide}.jpg`;
  }

  // Try stripping common suffixes/prefixes
  const cleaned = name
    .trim()
    .replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "")
    .replace(/^(Rep\.|Sen\.|Gov\.)\s+/i, "");

  const bioguide2 = BIOGUIDE_MAP[cleaned];
  if (bioguide2) {
    return `${PHOTO_BASE}/${bioguide2}.jpg`;
  }

  return null;
}
