/**
 * Candidate headshot photos sourced from the official U.S. Congress
 * Biographical Directory via the unitedstates open-data project.
 * Source: https://github.com/unitedstates/images
 * All photos are official government headshots in the public domain.
 *
 * URL pattern: https://unitedstates.github.io/images/congress/225x275/{BIOGUIDE_ID}.jpg
 *
 * Coverage: 426 named candidates across Senate, House, and Governor races.
 * Challengers who have never served in Congress show a party-colored initial avatar fallback.
 */
const PHOTO_BASE = "https://unitedstates.github.io/images/congress/225x275";

/**
 * Maps candidate display names to their Congressional Bioguide IDs.
 * Generated from the unitedstates/congress-legislators dataset (current + historical).
 */
export const BIOGUIDE_MAP: Record<string, string> = {
  "Aaron Bean": "B001314",
  "Abraham J. Hamadeh": "H001098",
  "Adam Gray": "G000605",
  "Adam Schiff": "S001150",
  "Adam Smith": "S000510",
  "Addison P. McDowell": "M001240",
  "Adelita S. Grijalva": "G000606",
  "Adrian Smith": "S001172",
  "Adriano Espaillat": "E000297",
  "Al Green": "G000553",
  "Alexandria Ocasio-Cortez": "O000172",
  "Alma S. Adams": "A000370",
  "Ami Bera": "B001287",
  "Andre D. Carson": "C001072",
  "André Carson": "C001072",
  "Andre Carson": "C001072",
  "Andrea Salinas": "S001226",
  "Andrew Clyde": "C001116",
  "Andrew R. Garbarino": "G000597",
  "Andy Barr": "B001282",
  "Andy Biggs": "B001302",
  "Andy Harris": "H001052",
  "Andy Ogles": "O000175",
  "Angie Craig": "C001119",
  "Ann Wagner": "W000812",
  "Anna Paulina Luna": "L000596",
  "Ashley Hinson": "H001091",
  "Ashley Moody": "M001244",
  "August Pfluger": "P000048",
  "Austin Scott": "S001189",
  "Ayanna Pressley": "P000617",
  "Barry Loudermilk": "L000583",
  "Barry Moore": "M001212",
  "Becca Balint": "B001318",
  "Ben Cline": "C001118",
  "Ben Ray Luján": "L000570",
  "Bennie G. Thompson": "T000193",
  "Bennie Thompson": "T000193",
  "Beth Van Duyne": "V000134",
  "Betty McCollum": "M001143",
  "Bill Cassidy": "C001075",
  "Bill Foster": "F000454",
  "Bill Hagerty": "H000601",
  "Bill Huizenga": "H001058",
  "Blake D. Moore": "M001213",
  "Bob Luetkemeyer": "L000569",
  "Bobby Scott": "S000185",
  "Bonnie Watson Coleman": "W000822",
  "Brad Finstad": "F000475",
  "Brad Knott": "K000405",
  "Brad Sherman": "S000344",
  "Bradley Scott Schneider": "S001190",
  "Bradley Schneider": "S001190",
  "Brandon Gill": "G000603",
  "Brendan F. Boyle": "B001296",
  "Brendan Boyle": "B001296",
  "Brett Guthrie": "G000558",
  "Brian Babin": "B001291",
  "Brian Jack": "J000311",
  "Brian K. Fitzpatrick": "F000466",
  "Brian Fitzpatrick": "F000466",
  "Brian Mast": "M001199",
  "Brittany Pettersen": "P000620",
  "Bruce Westerman": "W000821",
  "Bryan Steil": "S001213",
  "Buddy Carter": "C001103",
  "Burgess Owens": "O000086",
  "Byron Donalds": "D000032",
  "Carlos A. Gimenez": "G000593",
  "Carol D. Miller": "M001205",
  "Carol Miller": "M001205",
  "Celeste Maloy": "M001228",
  "Chellie Pingree": "P000597",
  "Chris Deluzio": "D000530",
  "Chris Pappas": "P000614",
  "Chrissy Houlahan": "H001085",
  // "Christian D. Menefee": "M001245",  // unitedstates.github.io 404 — using CDN photo instead
  // "Christian Menefee": "M001245",  // unitedstates.github.io 404 — using CDN photo instead
  "Christopher H. Smith": "S000522",
  "Chuck Edwards": "E000246",
  "Chuck Fleischmann": "F000459",
  "Cindy Hyde-Smith": "H001079",
  "Claudia Tenney": "T000478",
  "Clay Higgins": "H001077",
  "Cliff Bentz": "B000668",
  "Cori Bush": "B001224",
  "Cory Booker": "B001288",
  "Cory Mills": "M001216",
  "Craig A. Goldman": "G000601",
  "Dale W. Strong": "S001220",
  "Dan Crenshaw": "C001120",
  "Dan Goldman": "G000599",
  "Dan Newhouse": "N000189",
  "Dan Sullivan": "S001198",
  "Daniel Meuser": "M001204",
  "Daniel Webster": "W000806",
  "Darin LaHood": "L000585",
  "Darren Soto": "S001200",
  "Dave Min": "M001241",
  "David G. Valadao": "V000129",
  "David J. Taylor": "T000490",
  "David J. Trone": "T000483",
  "David Kustoff": "K000392",
  "David P. Joyce": "J000295",
  "David Rouzer": "R000603",
  "David Scott": "S001157",
  "Debbie Dingell": "D000624",
  "Debbie Wasserman Schultz": "W000797",
  "Deborah K. Ross": "R000305",
  "Delia C. Ramirez": "R000617",
  "Delia Ramirez": "R000617",
  "Derek Tran": "T000491",
  "Derrick Van Orden": "V000135",
  "Diana DeGette": "D000197",
  "Diana Harshbarger": "H001086",
  "Dina Titus": "T000468",
  "Don Beyer": "B001292",
  "Donald Norcross": "N000188",
  "Doris O. Matsui": "M001163",
  "Dusty Johnson": "J000301",
  "Dwight Evans": "E000296",
  "Ed Case": "C001055",
  "Ed Markey": "M000133",
  "Elijah Crane": "C001132",
  "Elise M. Stefanik": "S001196",
  "Emanuel Cleaver II": "C001061",
  "Emilia Strong Sykes": "S001223",
  "Emilia Sykes": "S001223",
  "Emily Randall": "R000621",
  "Eric Burlison": "B001316",
  "Eric Sorensen": "S001225",
  "Eric Swalwell": "S001193",
  "Erin Houchin": "H001093",
  "Eugene Vindman": "V000138",
  "Frank D. Lucas": "L000491",
  "Frank J. Mrvan": "M001214",
  "Frank Pallone Jr.": "P000034",
  "Frederica S. Wilson": "W000808",
  "Gabe Amo": "A000380",
  "Gabe Evans": "E000300",
  "Gabe Vasquez": "V000136",
  "Garlin Gilchrist": "G000181",
  "Garret Graves": "G000577",
  "Gary J. Palmer": "P000609",
  "George Latimer": "L000606",
  "George Whitesides": "W000830",
  "Gil Cisneros": "C001123",
  "Glenn F. Ivey": "I000058",
  "Glenn Grothman": "G000576",
  "Grace Meng": "M001188",
  "Greg Landsman": "L000601",
  "Greg Stanton": "S001211",
  "Gregory W. Meeks": "M001137",
  "Gus M. Bilirakis": "B001257",
  "Guy Reschenthaler": "R000610",
  "Gwen Moore": "M001160",
  "Hakeem Jeffries": "J000294",
  "Haley Stevens": "S001215",
  "Harriet Hageman": "H001096",
  "Harriet M. Hageman": "H001096",
  "Henry Cuellar": "C001063",
  "Herb Conaway Jr.": "C001136",
  "Hillary J. Scholten": "S001221",
  "Ilhan Omar": "O000173",
  "J. French Hill": "H001072",
  "Jack Bergman": "B001301",
  "Jack Reed": "R000122",
  "Jahana Hayes": "H001081",
  "Jake Auchincloss": "A000148",
  "Jake Ellzey": "E000071",
  "Jake LaTurner": "L000266",
  "James A. Himes": "H001047",
  "James Comer": "C001108",
  "James E. Clyburn": "C000537",
  "James Gallagher": "G000017",
  "James P. McGovern": "M000312",
  "James R. Walkinshaw": "W000831",
  "Jamie Raskin": "R000606",
  "Janelle S. Bynum": "B001326",
  "Janelle Bynum": "B001326",
  "Jared Huffman": "H001068",
  "Jared Moskowitz": "M001217",
  "Jasmine Crockett": "C001130",
  "Jason Crow": "C001121",
  "Jay Obernolte": "O000019",
  "Jeff Crank": "C001137",
  "Jeff Hurd": "H001100",
  "Jeff Merkley": "M001176",
  "Jeff Van Drew": "V000133",
  "Jefferson Shreve": "S001229",
  "Jennifer McClellan": "M001227",
  "Jerry Nadler": "N000002",
  "Jill Tokuda": "T000487",
  "Jim Costa": "C001059",
  "Jim Jordan": "J000289",
  "Jimmy Gomez": "G000585",
  "Jimmy Panetta": "P000613",
  "Jimmy Patronis": "P000622",
  "Joaquin Castro": "C001091",
  "Joe Courtney": "C001069",
  "Joe Neguse": "N000191",
  "Joe Wilson": "W000795",
  "John B. Larson": "L000557",
  "John Fleming": "F000456",
  "John Garamendi": "G000559",
  "John H. Rutherford": "R000609",
  "John Hickenlooper": "H000273",
  "John J. McGuire": "M001239",
  "John James": "J000307",
  "John Joyce": "J000302",
  "John Moolenaar": "M001194",
  "John R. Carter": "C001051",
  "John W. Mannion": "M001231",
  "John W. Rose": "R000612",
  // Jon Husted: photo not yet on unitedstates CDN — removed to avoid 404
  "Jon Ossoff": "O000174",
  "Jonathan L. Jackson": "J000309",
  "Joseph D. Morelle": "M001206",
  "Josh Brecheen": "B001317",
  "Josh Gottheimer": "G000583",
  "Josh Harder": "H001090",
  "Josh Riley": "R000622",
  "Joyce Beatty": "B001281",
  "Juan Ciscomani": "C001133",
  "Juan Vargas": "V000130",
  "Judy Chu": "C001080",
  "Julia Brownley": "B001285",
  "Julia Letlow": "L000595",
  // Juliana Stratton: NOT a Congress member (IL Lt. Governor) — bioguide S000994 returns 404. Photo is in CDN_PHOTOS below.
  // "Juliana Stratton": "S000994",
  "Julie Fedorchak": "F000482",
  "Julie Johnson": "J000310",
  "Kat Cammack": "C001039",
  "Katherine M. Clark": "C001101",
  "Kathy Castor": "C001066",
  "Keith Self": "S001224",
  "Kelly Morrison": "M001234",
  "Ken Calvert": "C000059",
  "Kevin Hern": "H001082",
  "Kevin Kiley": "K000395",
  "Kevin Mullin": "M001225",
  "Kim Schrier": "S001216",
  "Kristen McDonald Rivet": "M001237",
  "Kweisi Mfume": "M000687",
  "La Shawn Ford": "F000264",
  "LaMonica McIver": "M001229",
  "Lance Gooden": "G000589",
  "Lateefah Simon": "S001231",
  "Laura Friedman": "F000483",
  "Laura Gillen": "G000602",
  "Laurel Lee": "L000597",
  "Lauren Boebert": "B000825",
  "Lauren Underwood": "U000040",
  "Linda T. Sanchez": "S000030",
  "Lindsey Graham": "G000359",
  "Lisa McClain": "M001136",
  "Lizzie Fletcher": "F000468",
  "Lloyd Doggett": "D000399",
  "Lloyd Smucker": "S001199",
  "Lois Frankel": "F000462",
  "Lori Trahan": "T000482",
  "Lucy McBath": "M001208",
  "Luz M. Rivas": "R000620",
  "Madeleine Dean": "D000631",
  "Maggie Goodlander": "G000604",
  "Marcy Kaptur": "K000009",
  "Maria Elvira Salazar": "S000168",
  "Mariannette Miller-Meeks": "M001215",
  "Marie Gluesenkamp Perez": "G000600",
  "Marilyn Strickland": "S001159",
  "Mario Diaz-Balart": "D000600",
  "Mark DeSaulnier": "D000623",
  "Mark E. Alford": "A000379",
  "Mark E. Amodei": "A000369",
  "Mark Harris": "H001102",
  // Mark Messmer: photo not yet on unitedstates CDN — removed to avoid 404
  "Mark Pocan": "P000607",
  "Mark Takano": "T000472",
  "Mark Warner": "W000805",
  "Marlin A. Stutzman": "S001188",
  "Marlin Stutzman": "S001188",
  "Mary E. Miller": "M001211",
  "Mary Miller": "M001211",
  "Mary Gay Scanlon": "S001205",
  "Mary Peltola": "P000619",
  "Matt Van Epps": "V000139",
  "Max L. Miller": "M001222",
  "Max Miller": "M001222",
  "Maxine Dexter": "D000635",
  "Maxine Waters": "W000187",
  "Maxwell Frost": "F000476",
  "Melanie A. Stansbury": "S001218",
  "Michael A. Rulli": "R000619",
  "Michael Baumgartner": "B001322",
  "Michael Cloud": "C001115",
  "Michael Guest": "G000591",
  "Michael R. Turner": "T000463",
  "Mike Turner": "T000463",
  "Michael T. McCaul": "M001157",
  "Michelle Fischbach": "F000470",
  "Mike Bost": "B001295",
  "Mike Carey": "C001126",
  "Mike Collins": "C001129",
  "Mike D. Rogers": "R000575",
  "Mike Ezell": "E000235",
  "Mike Flood": "F000474",
  "Mike Haridopolos": "H001099",
  "Mike Johnson": "J000299",
  "Mike Kelly": "K000376",
  "Mike Kennedy": "K000403",
  "Mike Lawler": "L000599",
  "Mike Levin": "L000593",
  "Mike Quigley": "Q000023",
  "Mike Rogers": "R000575",
  "Mike Rounds": "R000605",
  "Mike Thompson": "T000460",
  "Monica De La Cruz": "D000594",
  "Morgan Luttrell": "L000603",
  "Morgan McGarvey": "M001220",
  "Nancy Mace": "M000194",
  "Nancy Pelosi": "P000197",
  "Nathaniel Moran": "M001224",
  "Neal P. Dunn": "D000628",
  "Nellie Pou": "P000621",
  "Nicholas J. Begich": "B001323",
  "Nick LaLota": "L000598",
  "Nicole Malliotakis": "M000317",
  "Nikema Williams": "W000788",
  "Nikki Budzinski": "B001315",
  "Norma J. Torres": "T000474",
  "Pat Fallon": "F000246",
  "Pat Harrigan": "H001101",
  "Patrick Ryan": "R000579",
  "Paul A. Gosar": "G000565",
  "Paul Tonko": "T000469",
  "Pete Aguilar": "A000371",
  "Pete Ricketts": "R000618",
  "Pete Sessions": "S000250",
  "Pete Stauber": "S001212",
  "Pramila Jayapal": "J000298",
  "Raja Krishnamoorthi": "K000391",
  "Ralph Norman": "N000190",
  "Randy Feenstra": "F000446",
  "Randy Fine": "F000484",
  "Randy K. Weber Sr.": "W000814",
  "Rashida Tlaib": "T000481",
  "Raul Ruiz": "R000599",
  "Rich McCormick": "M001218",
  "Richard E. Neal": "N000015",
  "Richard Hudson": "H001067",
  "Rick Crawford": "C001087",
  "Rick Larsen": "L000560",
  "Rick W. Allen": "A000372",
  "Riley Moore": "M001235",
  "Ritchie Torres": "T000486",
  "Ro Khanna": "K000389",
  "Rob Menendez": "M001226",
  "Robert B. Aderholt": "A000055",
  "Robert Garcia": "G000598",
  "Robert P. Bresnahan": "B001327",
  "Roger Marshall": "M001198",
  "Roger Wicker": "W000437",
  "Roger Williams": "W000816",
  "Ron Estes": "E000298",
  "Ronny Jackson": "J000304",
  "Rosa L. DeLauro": "D000216",
  // Roy Cooper: NOT a Congress member (NC Governor) — bioguide C000760 returns 404. Photo is in CDN_PHOTOS below.
  // "Roy Cooper": "C000760",
  "Rudy Yakym III": "Y000067",
  "Rudy Yakym": "Y000067",
  "Russ Fulcher": "F000469",
  "Russell Fry": "F000478",
  "Ryan K. Zinke": "Z000018",
  "Ryan Mackenzie": "M001230",
  "Salud O. Carbajal": "C001112",
  "Sam Graves": "G000546",
  "Sam T. Liccardo": "L000607",
  "Sanford D. Bishop Jr.": "B000490",
  "Sara Jacobs": "J000305",
  "Sarah Elfreth": "E000301",
  "Sarah McBride": "M001238",
  "Scott DesJarlais": "D000616",
  "Scott Franklin": "F000472",
  "Scott H. Peters": "P000608",
  "Scott L. Fitzgerald": "F000471",
  "Scott Perry": "P000605",
  "Sean Casten": "C001117",
  "Seth Magaziner": "M001223",
  "Seth Moulton": "M001196",
  "Sharice Davids": "D000629",
  "Sheila Cherfilus-McCormick": "C001127",
  "Shelley Moore Capito": "C001047",
  "Sheri Biggs": "B001325",
  "Sherrod Brown": "B000944",
  "Shomari Figures": "F000481",
  "Shontel M. Brown": "B001313",
  "Shontel Brown": "B001313",
  "Shri Thanedar": "T000488",
  "Steny H. Hoyer": "H000874",
  "Stephanie I. Bice": "B000740",
  "Stephen F. Lynch": "L000562",
  "Steve Cohen": "C001068",
  "Steve Scalise": "S001176",
  "Steve Womack": "W000809",
  "Steven Horsford": "H001066",
  "Suhas Subramanyam": "S001230",
  "Summer Lee": "L000602",
  "Susan Collins": "C001035",
  "Susie Lee": "L000590",
  "Suzan K. DelBene": "D000617",
  "Suzanne Bonamici": "B001278",
  "Sydney Kamlager-Dove": "K000400",
  "Sylvia Garcia": "G000587",
  "Ted Lieu": "L000582",
  "Teresa Leger Fernandez": "L000273",
  "Terri A. Sewell": "S001185",
  "Terri Yarbrough Green": "G000418",
  "Thomas Kean Jr.": "K000398",
  "Thomas Massie": "M001184",
  "Tim Burchett": "B001309",
  "Tim Moore": "M001236",
  "Tim Walberg": "W000798",
  "Timothy M. Kennedy": "K000402",
  "Tom Barrett": "B001321",
  "Tom Cole": "C001053",
  "Tom Cotton": "C001095",
  "Tom Emmer": "E000294",
  "Tom McClintock": "M001177",
  "Tony Wied": "W000829",
  "Tracey Mann": "M000871",
  "Trent Kelly": "K000388",
  "Troy A. Carter Sr.": "C001125",
  "Troy Balderson": "B001306",
  "Troy Downing": "D000634",
  "Troy E. Nehls": "N000026",
  "Val T. Hoyle": "H001094",
  "Val Hoyle": "H001094",
  "Valerie Foushee": "F000477",
  "Vern Buchanan": "B001260",
  "Veronica Escobar": "E000299",
  "Vicente Gonzalez Jr.": "G000581",
  "Victoria Spartz": "S000929",
  "Vince Fong": "F000480",
  "Virginia Foxx": "F000450",
  "Warren Davidson": "D000626",
  "William R. Keating": "K000375",
  "William R. Timmons IV": "T000480",
  // Yassamin Ansari: photo not yet on unitedstates CDN — removed to avoid 404
  "Young Kim": "K000397",
  "Yvette D. Clarke": "C001067",
  "Zoe Lofgren": "L000397",
  // Additional name variants and previously missing Congress members
  "Bob Latta": "L000566",
  "Robert E. Latta": "L000566",
  "Glenn Thompson": "T000467",
  "Glenn W. Thompson": "T000467",
  "Harold Rogers": "R000395",
  "Harold D. Rogers": "R000395",
  "Jim Risch": "R000584",
  "James E. Risch": "R000584",
  "Jim Baird": "B001307",
  "James R. Baird": "B001307",
  "Jason Smith": "S001195",
  "Jason T. Smith": "S001195",
  "Mike Simpson": "S001148",
  "Mike K. Simpson": "S001148",
  "Michael K. Simpson": "S001148",
  "Greg Steube": "S001214",
  "W. Gregory Steube": "S001214",
  "Tom Tiffany": "T000165",
  "Thomas P. Tiffany": "T000165",
  "Tom Suozzi": "S001201",
  "Thomas R. Suozzi": "S001201",
  "Jen Kiggans": "K000399",
  "Jennifer A. Kiggans": "K000399",
  "Rob Wittman": "W000804",
  "Robert J. Wittman": "W000804",
  "Robert E. Wittman": "W000804",
  "Lou Correa": "C001110",
  "J. Luis Correa": "C001110",
  "Nick Langworthy": "L000600",
  "Nicholas A. Langworthy": "L000600",
  "Nydia Velazquez": "V000081",
  "Nydia M. Velazquez": "V000081",
  "Nanette Barragan": "B001300",
  "Nanette Diaz Barragan": "B001300",
  "Chuy Garcia": "G000586",
  "Hank Johnson": "J000288",
  "Henry C. Johnson Jr.": "J000288",
  "Morgan Griffith": "G000568",
  "H. Morgan Griffith": "G000568",
  "Don Davis": "D000230",
  "Donald Davis": "D000230",
  "Donald G. Davis": "D000230",
  "Greg Murphy": "M001210",
  "Gregory F. Murphy": "M001210",
  "Zach Nunn": "N000193",
  "Zachary Nunn": "N000193",
  "Chris Coons": "C001088",
  "Christopher A. Coons": "C001088",
  "Dutch Ruppersberger": "R000576",
  "C. A. Dutch Ruppersberger": "R000576",
  // Batch add: House candidates missing photos (Jul 1 2026)
  "Dale Strong": "S001220",
  "David Valadao": "V000129",
  "Salud Carbajal": "C001112",
  "Luz Rivas": "R000620",
  "Norma Torres": "T000474",
  "Linda Sánchez": "S001156",
  "Scott Peters": "P000608",
  "Sanford Bishop": "B000490",
  "Henry Johnson": "J000288",
  "Mark Messmer": "M001233",
  "April McClain Delaney": "M001232",
  "Thomas Suozzi": "S001201",
  "Gregory Meeks": "M001137",
  "Yvette Clarke": "C001067",
  "Pat Ryan": "R000579",
  "Timothy Kennedy": "K000402",
  "Frank Lucas": "L000491",
  "Stephanie Bice": "B000740",
  "William Timmons": "T000480",
  "Greg Casar": "C001131",
  "Gary Palmer": "P000609",
  "Terri Sewell": "S001185",
};
/**
 * CDN photos for candidates who don't have bioguide IDs (non-Congress candidates).
 * Keyed by lowercase name. Sourced from the project's CloudFront CDN.
 */
const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";
const CDN_PHOTOS: Record<string, string> = {
  // Previously uploaded
  "juliana stratton":     `${CDN_BASE}/juliana-stratton_5e692d1c.jpg`,  // sharpened HD
  "laurie buckhout":      `${CDN_BASE}/laurie-buckhout_18f4c9b7.jpg`,
  "tina smith":           `${CDN_BASE}/tina-smith_853cdf1a.jpg`,
  "jeanne shaheen":       `${CDN_BASE}/jeanne-shaheen_9a7397d7.jpg`,
  // Note: gary-peters and dick-durbin removed — both retiring, not running in 2026
  // Senate challengers / non-Congress candidates (Round 2)
  "don tracy":            `${CDN_BASE}/don-tracy_00be914e.jpg`,  // sharpened HD
  "earl carter":          `${CDN_BASE}/earl-carter_cba92698.jpg`,
  // michael whatley updated below with better portrait
  "ron kincaid":          `${CDN_BASE}/ron-kincaid_7bc5aec9.jpg`,
  "graham platner":       `${CDN_BASE}/graham-platner_9f3a16bc.jpg`,  // sharpened HD
  "cindy burbank":        `${CDN_BASE}/cindy-burbank_96083831.jpg`,  // sharpened HD
  "james talarico":       `${CDN_BASE}/james-talarico_3cdf6d87.jpg`,  // sharpened HD
  "john cornyn":          `${CDN_BASE}/john-cornyn_6230288e.jpg`,
  "charles booker":       `${CDN_BASE}/charles-booker_a8c546aa.jpg`,  // sharpened HD
  "scott colom":          `${CDN_BASE}/scott-colom_f64015b6.jpg`,  // sharpened HD
  "rachel fetty anderson":`${CDN_BASE}/rachel-fetty-anderson_df3ac766.jpg`,  // sharpened HD
  "james w. byrd":        `${CDN_BASE}/james-byrd_0484d960.jpg`,  // sharpened HD
  "james byrd":           `${CDN_BASE}/james-byrd_0484d960.jpg`,  // sharpened HD
  "hallie shoffner":      `${CDN_BASE}/hallie-shoffner_f5291478.jpg`,  // sharpened HD
  "dakarai larriett":     `${CDN_BASE}/dakarai-larriett_eb9a26e2.jpg`,
  // Governor candidates (Round 3 — confirmed running in 2026)
  "wes moore":            `${CDN_BASE}/wes-moore_181f290a.jpg`,
  "kathy hochul":         `${CDN_BASE}/kathy-hochul_ad50280c.jpg`,
  "darren bailey":        `${CDN_BASE}/darren-bailey_a50797b3.jpg`,
  "rob sand":             `${CDN_BASE}/rob-sand_f46705e4.jpg`,
  "j.b. pritzker":        `${CDN_BASE}/jb-pritzker-hd_48b33ad9.jpg`,
  "jb pritzker":          `${CDN_BASE}/jb-pritzker-hd_48b33ad9.jpg`,
  "amy klobuchar":        `${CDN_BASE}/amy-klobuchar_4167e3f7.jpg`,
  // House competitive candidates (Round 3)
  "frank mrvan":          `${CDN_BASE}/frank-mrvan_edfce460.jpg`,
  "maggie goodlander":    `${CDN_BASE}/maggie-goodlander_031a7473.jpg`,
  "ammar campa-najjar":   `${CDN_BASE}/ammar-campa-najjar_97ded915.jpg`,
  "jim desmond":          `${CDN_BASE}/jim-desmond_8cace2ee.jpg`,
  "tano tijerina":        `${CDN_BASE}/tano-tijerina_a5173754.jpg`,
  // OH-9: Derek Merrin won primary (Josh Williams lost), faces Marcy Kaptur
  "derek merrin":         `${CDN_BASE}/derek-merrin_431549e8.jpg`,
  // Michael Whatley updated portrait (replaces old side-by-side crop)
  "michael whatley":      `${CDN_BASE}/michael-whatley_b8972d07.jpg`,  // sharpened HD
  // Governor candidates (Round 4 — incumbents + new challengers)
  "maura healey":         `${CDN_BASE}/maura-healey_38185e14.jpg`,
  "josh shapiro":         `${CDN_BASE}/josh-shapiro_4af6b942.jpg`,
  "katie hobbs":          `${CDN_BASE}/katie-hobbs_e47db872.jpg`,
  "amy acton":            `${CDN_BASE}/amy-acton_45ab5be5.jpg`,
  "vivek ramaswamy":      `${CDN_BASE}/vivek-ramaswamy_7c611a5f.jpg`,
  "kelly ayotte":         `${CDN_BASE}/kelly-ayotte_97b4f521.jpg`,
  "gina hinojosa":        `${CDN_BASE}/gina-hinojosa_cc08c1e9.jpg`,
  "lynne walz":           `${CDN_BASE}/lynne-walz_85f391cd.jpg`,
  "brad little":          `${CDN_BASE}/brad-little_bac763f9.jpg`,
  "daniel mckee":         `${CDN_BASE}/daniel-mckee_6a589d0b.jpg`,
  "tina kotek":           `${CDN_BASE}/tina-kotek_dc80abcd.jpg`,
  "josh green":           `${CDN_BASE}/josh-green_c33a5362.jpg`,
  // AR Governor (Round 5)
  "sarah huckabee sanders": `${CDN_BASE}/sarah-huckabee-sanders_916e3316.jpg`,
  // TX Governor (Round 5)
  "greg abbott":          `${CDN_BASE}/greg-abbott_a1c32b47.jpg`,
  // OH Senate (Round 6) — Jon Husted (appointed R incumbent)
  "jon husted":           `${CDN_BASE}/jon-husted_7cc5d67d.jpg`,  // sharpened HD
  // WV Senate (Round 6) — Jim Justice (R incumbent)
  "jim justice":          `${CDN_BASE}/jim-justice_9559bc9b.jpg`,
  // Governor photo audit (Round 7) — missing Governor candidates
  // Roy Cooper: bioguide C000760 returns 404 (never served in Congress), using CDN
  "roy cooper":           `${CDN_BASE}/roy-cooper_20ad9d0f.jpg`,  // sharpened HD
  "ned lamont":           `${CDN_BASE}/ned-lamont_24e0ecdd.jpg`,
  "joe lombardo":         `${CDN_BASE}/joe-lombardo_fb7e8617.jpg`,
  "larry rhoden":         `${CDN_BASE}/larry-rhoden_1ce6b32f.jpg`,
  // House General candidates (Round 8 — competitive races)
  "eric flores":           `${CDN_BASE}/eric-flores_e5208d5e.jpg`,
  "denise powell":         `${CDN_BASE}/denise-powell_d3928462.jpg`,
  "brinker harding":       `${CDN_BASE}/brinker-harding_690af229.jpg`,
  "barb regnitz":          `${CDN_BASE}/barb-regnitz_ce484ef4.jpg`,
  "kevin siembida":        `${CDN_BASE}/kevin-siembida_0f4e659b.jpg`,
  "jamie ager":            `${CDN_BASE}/jamie-ager_025de85b.jpg`,
  "bobby pulido":          `${CDN_BASE}/bobby-pulido_116cdf80.jpg`,
  // House Solid D/R candidates (Round 9 — IL + TX)
  // IL Solid D
  "donna miller":           `${CDN_BASE}/donna-miller-il2_227c6d2a.jpg`,
  "michael noack":          `${CDN_BASE}/michael-noack-il2_ebcf6ecb.jpg`,
  "angel oakley":           `${CDN_BASE}/angel-oakley-il3_cee94f74.jpg`,
  "patty garcia":           `${CDN_BASE}/patty-garcia-il4_577b08c2.jpg`,
  "lupe castillo":          `${CDN_BASE}/lupe-castillo-il4_8f6341ba.jpg`,
  "tommy hanson":           `${CDN_BASE}/tommy-hanson-il5_f9482a27.jpg`,
  "niki conforti":          `${CDN_BASE}/niki-conforti-il6_08f67ec0.jpg`,
  "chad koppie":            `${CDN_BASE}/chad-koppie-il7_31586452.jpg`,
  "melissa bean":           `${CDN_BASE}/melissa-bean-il8_3d5e2223.jpg`,
  "jennifer davis":         `${CDN_BASE}/jennifer-davis-il8_2a1ad061.jpg`,
  "daniel biss":            `${CDN_BASE}/daniel-biss-il9_6d4ce357.jpg`,
  "daniel k. biss":         `${CDN_BASE}/daniel-biss-il9_6d4ce357.jpg`,
  "john elleson":           `${CDN_BASE}/john-elleson-il9_c59d7fe7.jpg`,
  "carl lambrecht":         `${CDN_BASE}/carl-lambrecht-il10_d09fb682.jpg`,
  "jeff walter":            `${CDN_BASE}/jeff-walter-il11_5dde2f4d.jpg`,
  "julie fortier":          `${CDN_BASE}/julie-fortier-il12_71a75bae.jpg`,
  "jeff wilson":            `${CDN_BASE}/jeff-wilson-il13_b36f2cb2.jpg`,
  "james marter":           `${CDN_BASE}/james-marter-il14_6532905e.jpg`,
  "jennifer todd":          `${CDN_BASE}/jennifer-todd-il15_04eaf9be.jpg`,
  "paul nolley":            `${CDN_BASE}/paul-nolley-il16_dbc74854.jpg`,
  "dillan vancil":          `${CDN_BASE}/dillan-vancil-il17_61abca29.jpg`,
  // TX Solid D challengers
  "shaun finnie":           `${CDN_BASE}/shaun-finnie-tx2_0f45b323.jpg`,
  "evan hunt":              `${CDN_BASE}/evan-hunt-tx3_b0210e22.jpg`,
  "jason pearce":           `${CDN_BASE}/jason-pearce-tx4_c9ded027.jpg`,
  "danny minton":           `${CDN_BASE}/danny-minton-tx6_3d03635c.jpg`,
  "laura jones":            `${CDN_BASE}/laura-jones-tx8_3bb80bd5.jpg`,
  "jessica steinmann":      `${CDN_BASE}/jessica-steinmann-tx8_0289b96d.jpg`,
  "caitlin rourk":          `${CDN_BASE}/caitlin-rourk-tx10_c50606bb.jpg`,
  "chris gober":            `${CDN_BASE}/chris-gober-tx10_79064e79.jpg`,
  "claire reynolds":        `${CDN_BASE}/claire-reynolds-tx11_20e2cb7a.jpg`,
  "angel rodrigues-prillman": `${CDN_BASE}/angel-rodrigues-tx12_2c1e2bd0.jpg`,
  "mark nair":              `${CDN_BASE}/mark-nair-tx13_e30b0587.jpg`,
  "ronald whitfield":       `${CDN_BASE}/ronald-whitfield-tx18_9dba8f6a.jpg`,
  "christian menefee":      `${CDN_BASE}/christian-menefee-headshot_85e2ff9b.png`,
  "marquette greene-scott": `${CDN_BASE}/marquette-greene-scott-tx22_806026e0.jpg`,
  "trever nehls":           `${CDN_BASE}/trever-nehls-tx22_a4c8eb5b.jpg`,
  "tanya lloyd":            `${CDN_BASE}/tanya-lloyd-tx27_c793c82a.jpg`,
  "martha fierro":          `${CDN_BASE}/martha-fierro-tx29_eadceada.jpg`,
  "justin early":           `${CDN_BASE}/justin-early-tx31_b879849a.jpg`,
  "rhonda hart":            `${CDN_BASE}/rhonda-hart-tx36_1c42977d.jpg`,
  // Governor candidates — May 19 2026 primaries
  "tommy tuberville":       `${PHOTO_BASE}/T000278.jpg`,
  "doug jones":             `${CDN_BASE}/doug-jones_68b7351c.png`,  // bioguide J000300 returns 404
  "stacy garrity":          `${CDN_BASE}/stacy-garrity-sharp_ce3606db.jpg`,
  "keisha lance bottoms":   `${CDN_BASE}/keisha-lance-bottoms_ded16f80.jpg`,
  "christine drazan":       `${CDN_BASE}/christine-drazan-sharp_47c2d6f6.jpg`,
  "burt jones":             `${CDN_BASE}/burt-jones_08b2b196.jpg`,
  "rick jackson":           `${CDN_BASE}/rick-jackson_40d48fbc.jpg`,
  // ID + NE Governor candidates
  "terri pickens":          `${CDN_BASE}/terri-pickens_ca701396.jpg`,
  "jim pillen":             `${CDN_BASE}/jim-pillen-sharp_ffb6db90.jpg`,
  // VT Governor incumbent
  "phil scott":             `${CDN_BASE}/phil-scott_6f4482cf.jpg`,
  // AR Governor candidates
  "fred love":              `${CDN_BASE}/fred-love-sharp_3b39f47a.jpg`,
  // Senate audit (Round 10) — new candidates
  "ashley moody":           `${CDN_BASE}/ashley-moody_20ecb424.jpg`,  // FL R Senator
  "david roth":             `${CDN_BASE}/david-roth_1d92fd5c.jpg`,  // ID D challenger
  "david smith":            `${CDN_BASE}/david-smith-or_6682773f.jpg`,  // OR R challenger
  "david brock smith":      `${CDN_BASE}/david-smith-or_6682773f.jpg`,  // OR R challenger (full name)
  "aaron ford":              "/manus-storage/aaron_ford_c0b10092.jpg",  // NV D Governor
  "brandon herrera":         "/manus-storage/brandon_herrera_b2d95326.jpg",  // TX-23 R
  "yassamin ansari":         "/manus-storage/yassamin_ansari_91008f30.jpg",  // AZ-3 D
  "keith pilkington":        "/manus-storage/keith_pilkington_c525294a.jpg",  // AL-6 D
  "julian beaudion":        `${CDN_BASE}/julian-beaudion_d87af6af.jpg`,  // SD D challenger
  "dave mccormick":         `${CDN_BASE}/dave-mccormick_5fb329d8.jpg`,  // PA R Senator
  // LA Senate runoff candidates
  "jamie davis":             `${CDN_BASE}/jamie_davis_la_867d6b8d.jpg`,  // LA D Senate runoff candidate (farmer, Ballotpedia portrait)
  "ken paxton":              `${CDN_BASE}/ken-paxton-tx-senate_07ee6c8a.jpg`,  // TX R Senate nominee (won May 26 runoff)
  "kevin burge":             `${CDN_BASE}/kevin_burge_v4_ff96832d.jpg`,           // TX-24 D primary winner (May 26 runoff) — face-centered crop
  "casey shepard":           `${CDN_BASE}/casey_shepard_v5_67c25d2f.jpg`,           // TX-17 D primary winner (May 26 runoff) — head+shoulders padded square
  // TX May 26 runoff winners — photos added May 27 2026
  "yolanda prince":           `${CDN_BASE}/yolanda_prince_318e7f9d.jpg`,   // TX-1 D nominee
  "chelsey hockett":          `${CDN_BASE}/chelsey_hockett_356da4bd.jpg`,  // TX-5 D nominee
  "thurman bartie":           `${CDN_BASE}/thurman_bartie_69a0bf13.jpg`,   // TX-14 D nominee
  "tom sell":                 `${CDN_BASE}/tom_sell_75546d8b.jpg`,          // TX-19 R nominee
  "colin allred":             `${CDN_BASE}/colin_allred_14cb6e63.jpg`,      // TX-33 D nominee
  "johnny garcia":            `${CDN_BASE}/johnny_garcia_6c0010d6.jpg`,     // TX-35 D nominee
  "jon bonck":                `${CDN_BASE}/jon_bonck_b5b66743.jpg`,         // TX-38 R nominee
  "alex mealer":              `${CDN_BASE}/alex_mealer_c5a0dc89.jpg`,         // TX-9 R nominee (won May 26 runoff over Briscoe Cain)
  // Additional TX photos added May 27 2026
  "randy weber":               `${CDN_BASE}/randy_weber_68b46e5f.jpg`,          // TX-14 R incumbent
  "patrick david gillespie":   `${CDN_BASE}/patrick_gillespie_c208f7f7.jpg`,    // TX-32/33 R nominee (full name)
  "patrick gillespie":         `${CDN_BASE}/patrick_gillespie_c208f7f7.jpg`,    // TX-32 R nominee (short name)
  "leticia gutierrez":         `${CDN_BASE}/leticia_gutierrez_a85e0c99.jpg`,    // TX-9 D nominee
  "carlos de la cruz":         `${CDN_BASE}/carlos_de_la_cruz_995856b9.jpg`,    // TX-35 R nominee
  "dan barrios":               `${CDN_BASE}/dan_barrios_1c746312.jpg`,           // TX-32 D nominee
  "alexander hale":            `${CDN_BASE}/alexander_hale_68a89b9f.jpg`,        // TX-7 R nominee (won May 26 runoff over Tina Blum Cohen)
  // June 2 primary candidates — pre-sourced before tonight's results
  "jim carlin":                `${CDN_BASE}/jim_carlin_15369a31.jpg`,              // IA-R Senate primary candidate
  "zach wahls":                `${CDN_BASE}/zach_wahls_fdc6136d.jpg`,              // IA-D Senate primary candidate
  "josh turek":                `${CDN_BASE}/josh_turek_922f3d97.jpg`,              // IA-D Senate primary candidate
  "kurt alme":                 `${CDN_BASE}/kurt_alme_8e520b8c.jpg`,               // MT-R Senate primary candidate
  "alex zdan":                 `${CDN_BASE}/alex_zdan_4aaa9881.jpg`,               // NJ-R Senate primary candidate
  // June 2 confirmed nominees — photos added June 3 2026
  "alani bankhead":            `${CDN_BASE}/alani_bankhead_64fa939f.jpg`,           // MT-D Senate nominee (Montana Public Radio portrait)
  "justin murphy":             `${CDN_BASE}/justin_murphy_b4a44b43.jpg`,           // NJ-R Senate nominee (Ballotpedia portrait)
  // NJ-12 candidates (added June 3 2026)
  "adam hamawy":               `${CDN_BASE}/adam_hamawy_1769a586.jpg`,             // NJ-12 D nominee (NYT portrait, Jun 2 2026 primary winner)
  "greg mele":                 `${CDN_BASE}/greg_mele_350691f2.jpg`,               // NJ-12 R nominee (NJ Globe portrait)
  // CA D vs D races — CA-11 and CA-12 (added June 3 2026)
  "scott wiener":              `${CDN_BASE}/scott_wiener_61873c20.jpg`,             // CA-11 D (CA State Senator, official Senate portrait)
  "connie chan":               `${CDN_BASE}/connie_chan_11dcae1f.jpg`,              // CA-11 D (SF Supervisor, campaign photo — Source: conniechansf.com)
  "jamie joyce":               `${CDN_BASE}/jamie_joyce_e5b8b63a.jpg`,             // CA-12 D (Ballotpedia portrait)
  // June 3 2026 — full photo audit batch
  "mike mcguire":              `${CDN_BASE}/mike_mcguire_b4d06a7e.jpg`,            // CA-1 D (CA State Senator, Healdsburg Tribune portrait)
  "james gallagher":           `${CDN_BASE}/james_gallagher_0e653239.jpg`,         // CA-1 R (CA Assembly Speaker, official portrait)
  "kevin lincoln":             `${CDN_BASE}/kevin_lincoln_0994a1ab.jpg`,           // CA-13 R (Stockton Mayor, press portrait)
  "larry thompson":            `${CDN_BASE}/larry_thompson_5197132c.jpg`,          // CA-32 R (BallotReady official headshot)
  // jim desmond already in CDN_PHOTOS at line 561 (kept original)
  "joe mitchell":              `${CDN_BASE}/joe_mitchell_643e31b1.jpg`,            // IA-2 R (Ballotpedia official portrait)
  "sarah trone garriott":      `${CDN_BASE}/sarah_trone_garriott_0f2f52c7.jpg`,   // IA-3 D (JStreetPAC campaign headshot)
  "dave dawson":               `${CDN_BASE}/dave_dawson_a73bfbbc.jpg`,             // IA-4 D (Iowa Capital Dispatch headshot)
  "chris mcgowan":             `${CDN_BASE}/chris_mcgowan_5eebb45c.jpg`,           // IA-4 R (KCCI headshot)
  "sam forstag":               `${CDN_BASE}/sam_forstag_8a25a32b.jpg`,             // MT-1 D (Ballotpedia portrait)
  "aaron flint":               `${CDN_BASE}/aaron_flint_d5400e39.jpg`,             // MT-1 R (Montana Election Guide official portrait)
  "deb haaland":               `${CDN_BASE}/deb_haaland_70d42c34.jpg`,             // NM Governor D (MVSKOKE Media outdoor portrait)
  "gregg hull":                `${CDN_BASE}/gregg_hull_52308593.jpg`,              // NM Governor R (Ballotpedia official headshot)
  // rob sand already in CDN_PHOTOS at line 553 (kept original)
  "zach lahn":                 `${CDN_BASE}/zach_lahn_a30bee0e.jpg`,               // IA Governor R (Iowa Public Radio outdoor portrait)
  // June 3 batch 2 — full verification additions
  "dan ahlers":                `${CDN_BASE}/dan_ahlers_808ef1bf.jpg`,              // SD Governor D (Ballotpedia portrait)
  "brian miller":              `${CDN_BASE}/brian_miller_90583729.jpg`,            // MT-2 D (Montana Election Guide portrait)
  "zack mullock":              `${CDN_BASE}/zack_mullock_17ebd1af.jpg`,            // NJ-2 D (NJ Globe headshot)
  "michael mcguire":           `${CDN_BASE}/michael_mcguire_nj3_a7d50bd9.jpg`,    // NJ-3 R (NJ Globe portrait — Marine Corps veteran)
  "rachel peace":              `${CDN_BASE}/rachel_peace_a7d6f6d5.jpg`,            // NJ-4 D (WHYY beach campaign photo)
  "sean kirrane":              `${CDN_BASE}/sean_kirrane_bebbda68.jpg`,            // NJ-5 R (Ballotpedia portrait)
  "hillary herzig":            `${CDN_BASE}/hillary_herzig_048abfb2.jpg`,          // NJ-6 R (NJ Globe headshot)
  "rosie pino":                `${CDN_BASE}/rosie_pino_233de605.jpg`,              // NJ-9 R (NJ Globe campaign photo)
  "carmen bucco":              `${CDN_BASE}/carmen_bucco_3e3f9d95.jpg`,            // NJ-10 R (BallotReady portrait)
  "damon galdo":               `${CDN_BASE}/damon_galdo_6d559bce.jpg`,             // NJ-1 R (NJ Globe flag background portrait)
  // Louisiana Senate runoff — Gary Crockett (added June 4 2026)
  "gary crockett":             `${CDN_BASE}/gary_crockett_dee51265.jpg`,            // LA D Senate runoff candidate (Ballotpedia portrait)
  // CA-14 D vs D general election candidates (June 4 2026)
  "aisha wahab":               `${CDN_BASE}/aisha_wahab_a9faf4ce.jpg`,              // CA-14 D (CA State Senator SD-10)
  "melissa hernandez":         `${CDN_BASE}/melissa_hernandez_0309c12d.jpg`,        // CA-14 D (challenger)
  // CA photo audit completions (June 4 2026)
  "sam liccardo":              `${CDN_BASE}/sam_liccardo_e0db628c.jpg`,              // CA-16 D (former San Jose Mayor, House.gov portrait)
  "gil cisneros":              `${CDN_BASE}/gil_cisneros_e29e0c3b.jpg`,              // CA-31 D (returning challenger, House.gov portrait)
  "marni von wilpert":         `${CDN_BASE}/marni_von_wilpert_c2df38d6.jpg`,         // CA-48 D (Ballotpedia headshot)
  // CA Governor candidates (June 5 2026 — DDHQ projection)
  "xavier becerra":            "/manus-storage/xavier_becerra_2da8720c.jpg",              // CA Gov D (fmr HHS Secretary)
  "steve hilton":              "/manus-storage/steve_hilton_82e0a8db.jpg",                // CA Gov R (fmr Fox News host)
  // CA-6 incumbent (June 5 2026)
  "kevin kiley":               "/manus-storage/kevin_kiley_14f5b493_a4bbf90a.jpg",                 // CA-6 I (fmr R, now Independent — bioguide portrait)
  // CA House candidates (June 6 2026 — Friday ballot drop update)
  "richard pan":               "/manus-storage/richard_pan_78d0ad88.jpg",                 // CA-6 D (fmr state senator)
  "mai vang":                  "/manus-storage/mai_vang_5d9832eb.jpg",                    // CA-7 D (Sacramento City Council)
  "randy villegas":            "/manus-storage/randy_villegas_757a3f9b.jpg",              // CA-22 D (Visalia school board)

  // CA House candidates (June 6 2026 — 8-district fix batch)
  "robb tucker":               "/manus-storage/robb_tucker_c953b5ce_beb6dda4.jpg",                  // CA-3 R
  "kyle kirkland":             "/manus-storage/kyle_kirkland_ebc2143e_271dfc45.jpg",                // CA-21 R
  "jacqui irwin":              "/manus-storage/jacqui_irwin_e8a59ffe_f7e4eaa1.jpg",                 // CA-26 D
  "sam gallucci":              "/manus-storage/sam_gallucci_337fea91_efb8e9b1.png",                 // CA-26 R
  "jason gibbs":               "/manus-storage/jason_gibbs_078526d0_5de9b5e3.png",                  // CA-27 R
  "angela gonzales-torres":    "/manus-storage/angela_gonzales_torres_2d3b265f_a915b7d4.jpg",       // CA-34 D
  "hilda solis":               "/manus-storage/hilda_solis_f5703aa6_052dd572.jpg",                  // CA-38 D
  "pedro casas":               "/manus-storage/pedro_casas_85c21033_235baa32.png",                  // CA-38 R
  "mitch clemmons":            "/manus-storage/mitch_clemmons_73f354a6_b06d0c06.jpg",               // CA-41 R
  "chuong vo":                 "/manus-storage/chuong_vo_34629a70_20702ee4.jpg",                    // CA-45 R

  // NM & SD candidates (June 6 2026 — verification round 2)
  "ndidiamaka okpareke":       `/manus-storage/ndidiamaka_okpareke_1aa8335e.jpg`,        // NM-1 R
  "greg cunningham":           `/manus-storage/greg_cunningham_0127643c.jpg`,            // NM-2 R
  "martin ruben zamora":       `/manus-storage/martin_zamora_a2e1a9a3.jpg`,              // NM-3 R
  "nicole gronli":             `/manus-storage/nicole_gronli_9108f631.jpg`,              // SD-AL D

  // Called special election challengers (Round 37)
  "gay valimont":            `/manus-storage/gay_valimont_c26a8156.jpg`,        // FL-1 D (Ballotpedia)
  "josh weil":               `/manus-storage/josh_weil_efc19a96.jpg`,           // FL-6 D (Ballotpedia)
  "joshua weil":             `/manus-storage/josh_weil_efc19a96.jpg`,           // FL-6 D (alias)
  "daniel butierez":         `/manus-storage/daniel_butierez_9027eac7.jpg`,     // AZ-7 R (Ballotpedia)
  "arthur purves":           `/manus-storage/arthur_purves_c9aa41b6.jpg`,       // VA-11 R (Ballotpedia)
  "eugene douglass":         `/manus-storage/eugene_douglass_dc7c2086.jpg`,     // NC-2 R (Ballotpedia)
  "aftyn behn":              `/manus-storage/aftyn_behn_ada5dffa.png`,          // TN-7 D (Ballotpedia)
  "lewis mizrahi":           `/manus-storage/mizrahi-placeholder_fd2814f1.png`, // NY-8 R (party letter placeholder)

  // Colorado Primary winners (July 1 2026)
  "melat kiros":              `/manus-storage/melat_kiros_co_primary_a5db2427.jpg`,           // CO-1 D (upset winner over DeGette)
  "mark baisley":             `/manus-storage/mark_baisley_co_primary_5560975e.jpg`,         // CO Senate R nominee
  "phil weiser":              `/manus-storage/phil_weiser_co_primary_75363862.jpg`,           // CO Governor D nominee
  "christy peterson":         `/manus-storage/christy_peterson_co_primary_20648eba.jpg`,     // CO-1 R
  "kelley dennison":          `/manus-storage/kelley_dennison_co_primary_af972911.jpg`,      // CO-2 R
  "kelley anne dennison":     `/manus-storage/kelley_dennison_co_primary_af972911.jpg`,      // CO-2 R (alias)
  "dane romero":              `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D
  "dwayne romero":            `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D (alias)
  "dwayne l. romero":         `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D (alias)
  "eileen laubacher":         `/manus-storage/eileen_laubacher_co_primary_d2b7b7e3.jpg`,     // CO-4 D
  "jessica killin":           `/manus-storage/jessica_killin_co_primary_dabe99be.jpg`,       // CO-5 D
  "jason clark":              `/manus-storage/jason_clark_co6_7ce5bc07.png`,               // CO-6 R (replacement after Tewahade withdrawal)
  "tim bennett":              `/manus-storage/tim_bennett_co_primary_839518d7.jpg`,           // CO-7 R
  "manny rutinel":            `/manus-storage/manny_rutinel_co_primary_5a7f4e57.jpg`,        // CO-8 D

  // Additional missing candidates (July 1 2026 — photo audit)
  "scott bottoms":             `/manus-storage/scott_bottoms_8173762a.jpg`,          // CO Governor R
  "dan cox":                   `/manus-storage/dan_cox_327096e2.jpg`,                // MD Governor R
  "bruce blakeman":            `/manus-storage/bruce_blakeman_30439fb7.jpg`,         // NY Governor R
  "cyndi munson":              `/manus-storage/cyndi_munson_b11d44b3.jpg`,           // OK Governor D
  "t. shannon":                `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R
  "t.w. shannon":              `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R (alias)
  "tw shannon":                `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R (alias)
  "toby doeden":               `/manus-storage/toby_doeden_f912bfcc.jpg`,            // SD Governor R
  "everett wess":              `/manus-storage/everett_wess_f2ce4e6c.jpg`,           // AL Senate D
  "larry marker":              `/manus-storage/larry_marker_22eaf901.jpg`,           // NM Senate R
  "annie andrews":             `/manus-storage/annie_andrews_1cb42390.jpg`,          // SC Senate D
  // Name aliases for normalization misses
  "dan mckee":                 `${CDN_BASE}/daniel-mckee_6a589d0b.jpg`,              // RI Governor D (alias for daniel mckee)

  // Batch add: House challengers (Jul 1 2026 — bulk photo audit)
  "james russell":             "/manus-storage/james_russell_13ed68b1.jpg",          // AR-4 D
  "houston gaines":            "/manus-storage/houston_gaines_ee82266e.jpg",         // GA-10 R
  "christian maxwell":         "/manus-storage/christian_maxwell_abd62bd5.jpg",      // IL-1 R
  "christina bohannan":        "/manus-storage/christina_bohannan_6ee38fcc.jpg",     // IA-1 D
  "lindsay james":             "/manus-storage/lindsay_james_684446eb.jpg",          // IA-2 D
  "ron russell":               "/manus-storage/ron_russell_2c10d6cd.jpg",            // ME-1 R
  "adrian boafo":              "/manus-storage/adrian_boafo_f3a72c20.jpg",           // MD-5 D
  "cliff johnson":             "/manus-storage/cliff_johnson_883e04fd.jpg",          // MS-1 D
  "carrie buck":               "/manus-storage/carrie_buck_988501b1.jpg",            // NV-1 R
  "david flippo":              "/manus-storage/david_flippo_08d4dc25.jpg",           // NV-2 R
  "rebecca bennett":           "/manus-storage/rebecca_bennett_91cf9a42.jpg",        // NJ-7 D
  "christopher gallant":       "/manus-storage/christopher_gallant_27eb5a77.jpg",    // NY-1 D
  "kevin stocker":             "/manus-storage/kevin_stocker_1997da8d.jpg",          // NY-23 D
  "kimberly hardy":            "/manus-storage/kimberly_hardy_a7b3e797.jpg",         // NC-7 D
  "richard ojeda":             "/manus-storage/richard_ojeda_fdbd7d59.jpg",          // NC-9 D
  "lakesha womack":            "/manus-storage/lakesha_womack_f404e451.jpg",         // NC-14 D
  "trygve hammer":             "/manus-storage/trygve_hammer_4c98926b.jpg",          // ND-0 D
  "jen mazzuckelli":           "/manus-storage/jen_mazzuckelli_cc0a7d3a.jpg",        // OH-2 D
  "elizabeth kirtley":         "/manus-storage/elizabeth_kirtley_9cb329b8.jpg",      // OH-6 D
  "maria jukic":               "/manus-storage/maria_jukic_fe425e4e.jpg",            // OH-14 D
  "don leonard":               "/manus-storage/don_leonard_2eac546e.jpg",            // OH-15 D
  "brandon wade":              "/manus-storage/brandon_wade_f5d865b5.jpg",           // OK-2 D
  "suzie byrd":                "/manus-storage/suzie_byrd_b86997e0.jpg",             // OK-3 D
  "mitchell jacob":            "/manus-storage/mitchell_jacob_5c6f3bb8.jpg",         // OK-4 D
  "loran ayles":               "/manus-storage/loran_ayles_f55f537b.jpg",            // OR-3 R
  "monique despain":           "/manus-storage/monique_despain_145e01e6.jpg",        // OR-4 R
  "m. despain":                "/manus-storage/monique_despain_145e01e6.jpg",        // OR-4 R (alias)
  "david russ":                "/manus-storage/david_russ_31c3124b.jpg",             // OR-6 R
  "bob harvie":                "/manus-storage/bob_harvie_65d057ac.jpg",             // PA-1 D
  "bob brooks":                "/manus-storage/bob_brooks_2d02f9dd.jpg",             // PA-7 D
  "beth farnham":              "/manus-storage/beth_farnham_a66402c6.jpg",           // PA-13 D
  "alan bradstock":            "/manus-storage/alan_bradstock_4c3e4ea4.jpg",         // PA-14 D
  "ray bilger":                "/manus-storage/ray_bilger_13317b66.jpg",             // PA-15 D
  "wes climer":                "/manus-storage/wes_climer_be7586b0.jpg",             // SC-5 R
  "marty jackley":             "/manus-storage/marty_jackley_0a466c0c.jpg",          // SD-0 R
  "dione sims":                "/manus-storage/dione_sims_9bb71975.jpg",             // TX-25 D
  "lauren peña":               "/manus-storage/lauren_pe_a_9dbceea6.jpg",            // TX-37 R
  "lauren pena":               "/manus-storage/lauren_pe_a_9dbceea6.jpg",            // TX-37 R (alias)
  "melissa mcdonough":         "/manus-storage/melissa_mcdonough_c11d78cd.jpg",      // TX-38 D
  "teresa benitez-thompson":    "/manus-storage/teresa_benitez_thompson_01d48fe5.jpg", // NV-2 D
  "teresa benitez thompson":    "/manus-storage/teresa_benitez_thompson_01d48fe5.jpg", // NV-2 D (alias)
};

/**
 * Normalizes a candidate display name for bioguide lookup..
 * Handles common DB suffixes like "(incumbent)", "(appointed)", "(retiring)",
 * honorific prefixes, generational suffixes, and middle initials.
 */
function normalizeName(raw: string): string[] {
  const base = raw
    .trim()
    // Strip parenthetical notes: (incumbent), (appointed), (retiring), (D Primary), etc.
    .replace(/\s*\([^)]*\)/g, "")
    // Strip trailing punctuation/whitespace
    .trim()
    // Strip generational suffixes
    .replace(/,?\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "")
    // Strip honorific prefixes
    .replace(/^(Rep\.|Sen\.|Gov\.|Dr\.)\s+/i, "")
    .trim();

  const variants: string[] = [base];

  // Also try removing a middle initial: "Mike D. Rogers" → "Mike Rogers"
  const noMiddle = base.replace(/\s+[A-Z]\.[\s]/, " ");
  if (noMiddle !== base) variants.push(noMiddle);

  // Also try removing a middle name (two+ chars): "Mary Jo Kilroy" stays, but
  // "Addison P. McDowell" → already handled by middle initial above
  // Try last-name-only for very common names (not used — too ambiguous)

  return variants;
}

export function getCandidatePhotoUrl(name: string | null | undefined): string | null {
  if (!name) return null;

  // 1. Direct lookup first (fastest path)
  const direct = BIOGUIDE_MAP[name.trim()];
  if (direct) return `${PHOTO_BASE}/${direct}.jpg`;

  // 2. Try normalized variants
  for (const variant of normalizeName(name)) {
    const bioguide = BIOGUIDE_MAP[variant];
    if (bioguide) return `${PHOTO_BASE}/${bioguide}.jpg`;
  }

  // 3. Fallback to CDN photos for non-Congress candidates
  // Try raw name first, then normalized variants (handles "(incumbent)" suffix etc.)
  const cdnKey = name.toLowerCase().trim();
  if (CDN_PHOTOS[cdnKey]) return CDN_PHOTOS[cdnKey];
  for (const variant of normalizeName(name)) {
    const normalizedCdnKey = variant.toLowerCase().trim();
    if (CDN_PHOTOS[normalizedCdnKey]) return CDN_PHOTOS[normalizedCdnKey];
  }

  return null;
}
