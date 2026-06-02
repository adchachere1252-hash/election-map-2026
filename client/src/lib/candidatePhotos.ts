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
  "julian beaudion":        `${CDN_BASE}/julian-beaudion_d87af6af.jpg`,  // SD D challenger
  "dave mccormick":         `${CDN_BASE}/dave-mccormick_5fb329d8.jpg`,  // PA R Senator
  // LA Senate runoff candidates
  "jamie davis":             `${CDN_BASE}/jamie-davis-sharp_1f4b2478.jpg`,  // LA D Senate runoff candidate
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
