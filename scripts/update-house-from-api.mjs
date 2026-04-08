/**
 * Update all 435 House districts with official representative names
 * from Congress.gov API data (119th Congress, current members as of April 2026).
 * 
 * Data source: https://api.congress.gov/v3/member?chamber=house&currentMember=true
 * 432 active members + 3 vacancies (CA-01, GA-14, NJ-11)
 * 
 * Key corrections from previous session's parsed data:
 * - TX-18: Christian D. Menefee (not Sheila Jackson Lee - she died July 2024)
 * - FL-01: Jimmy Patronis (not Matt Gaetz - Gaetz resigned Nov 2024, Patronis won special election)
 * - FL-06: Randy Fine (not Michael Waltz - Waltz became NSA, Fine won special election)
 * - CA-12: Lateefah Simon (not Barbara Lee - Lee ran for Senate)
 * - CA-20: Vince Fong (not Kevin McCarthy - McCarthy resigned Dec 2023)
 * - CA-27: George Whitesides (not Mike Garcia - Garcia lost 2024 election)
 * - CA-30: Laura Friedman (not Adam Schiff - Schiff won Senate race)
 * - CA-31: Gilbert Ray Cisneros (replacing Grace Napolitano who retired)
 * - CA-45: Derek Tran (not Michelle Steel - Tran won 2024 election)
 * - CO-08: Gabe Evans (not Yadira Caraveo - Evans won 2024 election)
 * - FL-08: Mike Haridopolos (not Bill Posey - Posey retired)
 * - NC-10: Pat Harrigan (not Patrick McHenry - McHenry retired)
 * - NC-13: Brad Knott (not Jeff Jackson - Jackson ran for AG)
 * - NY-04: Laura Gillen (not Anthony D'Esposito - Gillen won 2024 election)
 * - NY-19: Josh Riley (not Marc Molinaro - Riley won 2024 election)
 * - NY-22: John W. Mannion (not Brandon Williams - Mannion won 2024 election)
 * - OH-02: David J. Taylor (not Brad Wenstrup - Wenstrup retired)
 * - OR-01: Suzanne Bonamici (not Maxine Dexter - Dexter won OR-03)
 * - PA-07: Ryan Mackenzie (not Susan Wild - Mackenzie won 2024 election)
 * - PA-08: Robert P. Bresnahan (not Matt Cartwright - Bresnahan won 2024 election)
 * - PA-09: Daniel Meuser (not Amanda Cappelletti - redistricting)
 * - SC-03: Sheri Biggs (not Jeff Duncan - Duncan retired)
 * - TN-07: Matt Van Epps (not Mark Green - Green became DHS Secretary)
 * - TX-12: Craig A. Goldman (not Kay Granger - Granger retired)
 * - TX-26: Brandon Gill (not Michael Burgess - Burgess retired)
 * - TX-32: Julie Johnson (not Colin Allred - Allred ran for Senate)
 * - TX-35: Greg Casar (not Lloyd Doggett - redistricting)
 * - UT-01: Blake D. Moore (not Rob Bishop - Bishop retired in 2021)
 * - VA-05: John J. McGuire (not Bob Good - McGuire won primary)
 * - VA-07: Eugene Simon Vindman (not Abigail Spanberger - Spanberger ran for governor)
 * - VA-11: James R. Walkinshaw (not Gerry Connolly - Connolly retired)
 * - WA-05: Michael Baumgartner (not Cathy McMorris Rodgers - CMR retired)
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Official member data from Congress.gov API (119th Congress, April 2026)
// Format: "STATE-DISTRICT": { name, party }
// At-large districts use "STATE-AL" (district=0 in DB)
// Vacancies are marked with name="VACANT"
const HOUSE_MEMBERS = {
  "AK-AL": { name: "Nicholas J. Begich", party: "R" },
  "AL-01": { name: "Barry Moore", party: "R" },
  "AL-02": { name: "Shomari Figures", party: "D" },
  "AL-03": { name: "Mike D. Rogers", party: "R" },
  "AL-04": { name: "Robert B. Aderholt", party: "R" },
  "AL-05": { name: "Dale W. Strong", party: "R" },
  "AL-06": { name: "Gary J. Palmer", party: "R" },
  "AL-07": { name: "Terri A. Sewell", party: "D" },
  "AR-01": { name: "Eric A. Crawford", party: "R" },
  "AR-02": { name: "J. French Hill", party: "R" },
  "AR-03": { name: "Steve Womack", party: "R" },
  "AR-04": { name: "Bruce Westerman", party: "R" },
  "AZ-01": { name: "David Schweikert", party: "R" },
  "AZ-02": { name: "Elijah Crane", party: "R" },
  "AZ-03": { name: "Yassamin Ansari", party: "D" },
  "AZ-04": { name: "Greg Stanton", party: "D" },
  "AZ-05": { name: "Andy Biggs", party: "R" },
  "AZ-06": { name: "Juan Ciscomani", party: "R" },
  "AZ-07": { name: "Adelita S. Grijalva", party: "D" },
  "AZ-08": { name: "Abraham J. Hamadeh", party: "R" },
  "AZ-09": { name: "Paul A. Gosar", party: "R" },
  "CA-01": { name: "VACANT", party: "R" },  // Doug LaMalfa died Jan 6, 2026; special election pending
  "CA-02": { name: "Jared Huffman", party: "D" },
  "CA-03": { name: "Kevin Kiley", party: "R" },
  "CA-04": { name: "Mike Thompson", party: "D" },
  "CA-05": { name: "Tom McClintock", party: "R" },
  "CA-06": { name: "Ami Bera", party: "D" },
  "CA-07": { name: "Doris O. Matsui", party: "D" },
  "CA-08": { name: "John Garamendi", party: "D" },
  "CA-09": { name: "Josh Harder", party: "D" },
  "CA-10": { name: "Mark DeSaulnier", party: "D" },
  "CA-11": { name: "Nancy Pelosi", party: "D" },
  "CA-12": { name: "Lateefah Simon", party: "D" },
  "CA-13": { name: "Adam Gray", party: "D" },
  "CA-14": { name: "Eric Swalwell", party: "D" },
  "CA-15": { name: "Kevin Mullin", party: "D" },
  "CA-16": { name: "Sam T. Liccardo", party: "D" },
  "CA-17": { name: "Ro Khanna", party: "D" },
  "CA-18": { name: "Zoe Lofgren", party: "D" },
  "CA-19": { name: "Jimmy Panetta", party: "D" },
  "CA-20": { name: "Vince Fong", party: "R" },
  "CA-21": { name: "Jim Costa", party: "D" },
  "CA-22": { name: "David G. Valadao", party: "R" },
  "CA-23": { name: "Jay Obernolte", party: "R" },
  "CA-24": { name: "Salud O. Carbajal", party: "D" },
  "CA-25": { name: "Raul Ruiz", party: "D" },
  "CA-26": { name: "Julia Brownley", party: "D" },
  "CA-27": { name: "George Whitesides", party: "D" },
  "CA-28": { name: "Judy Chu", party: "D" },
  "CA-29": { name: "Luz M. Rivas", party: "D" },
  "CA-30": { name: "Laura Friedman", party: "D" },
  "CA-31": { name: "Gil Cisneros", party: "D" },
  "CA-32": { name: "Brad Sherman", party: "D" },
  "CA-33": { name: "Pete Aguilar", party: "D" },
  "CA-34": { name: "Jimmy Gomez", party: "D" },
  "CA-35": { name: "Norma J. Torres", party: "D" },
  "CA-36": { name: "Ted Lieu", party: "D" },
  "CA-37": { name: "Sydney Kamlager-Dove", party: "D" },
  "CA-38": { name: "Linda T. Sanchez", party: "D" },
  "CA-39": { name: "Mark Takano", party: "D" },
  "CA-40": { name: "Young Kim", party: "R" },
  "CA-41": { name: "Ken Calvert", party: "R" },
  "CA-42": { name: "Robert Garcia", party: "D" },
  "CA-43": { name: "Maxine Waters", party: "D" },
  "CA-44": { name: "Nanette Diaz Barragan", party: "D" },
  "CA-45": { name: "Derek Tran", party: "D" },
  "CA-46": { name: "Lou Correa", party: "D" },
  "CA-47": { name: "Dave Min", party: "D" },
  "CA-48": { name: "Darrell Issa", party: "R" },
  "CA-49": { name: "Mike Levin", party: "D" },
  "CA-50": { name: "Scott H. Peters", party: "D" },
  "CA-51": { name: "Sara Jacobs", party: "D" },
  "CA-52": { name: "Juan Vargas", party: "D" },
  "CO-01": { name: "Diana DeGette", party: "D" },
  "CO-02": { name: "Joe Neguse", party: "D" },
  "CO-03": { name: "Jeff Hurd", party: "R" },
  "CO-04": { name: "Lauren Boebert", party: "R" },
  "CO-05": { name: "Jeff Crank", party: "R" },
  "CO-06": { name: "Jason Crow", party: "D" },
  "CO-07": { name: "Brittany Pettersen", party: "D" },
  "CO-08": { name: "Gabe Evans", party: "R" },
  "CT-01": { name: "John B. Larson", party: "D" },
  "CT-02": { name: "Joe Courtney", party: "D" },
  "CT-03": { name: "Rosa L. DeLauro", party: "D" },
  "CT-04": { name: "James A. Himes", party: "D" },
  "CT-05": { name: "Jahana Hayes", party: "D" },
  "DE-AL": { name: "Sarah McBride", party: "D" },
  "FL-01": { name: "Jimmy Patronis", party: "R" },
  "FL-02": { name: "Neal P. Dunn", party: "R" },
  "FL-03": { name: "Kat Cammack", party: "R" },
  "FL-04": { name: "Aaron Bean", party: "R" },
  "FL-05": { name: "John H. Rutherford", party: "R" },
  "FL-06": { name: "Randy Fine", party: "R" },
  "FL-07": { name: "Cory Mills", party: "R" },
  "FL-08": { name: "Mike Haridopolos", party: "R" },
  "FL-09": { name: "Darren Soto", party: "D" },
  "FL-10": { name: "Maxwell Frost", party: "D" },
  "FL-11": { name: "Daniel Webster", party: "R" },
  "FL-12": { name: "Gus M. Bilirakis", party: "R" },
  "FL-13": { name: "Anna Paulina Luna", party: "R" },
  "FL-14": { name: "Kathy Castor", party: "D" },
  "FL-15": { name: "Laurel Lee", party: "R" },
  "FL-16": { name: "Vern Buchanan", party: "R" },
  "FL-17": { name: "Greg Steube", party: "R" },
  "FL-18": { name: "Scott Franklin", party: "R" },
  "FL-19": { name: "Byron Donalds", party: "R" },
  "FL-20": { name: "Sheila Cherfilus-McCormick", party: "D" },
  "FL-21": { name: "Brian Mast", party: "R" },
  "FL-22": { name: "Lois Frankel", party: "D" },
  "FL-23": { name: "Jared Moskowitz", party: "D" },
  "FL-24": { name: "Frederica S. Wilson", party: "D" },
  "FL-25": { name: "Mario Diaz-Balart", party: "R" },
  "FL-26": { name: "Carlos A. Gimenez", party: "R" },
  "FL-27": { name: "Maria Elvira Salazar", party: "R" },
  "FL-28": { name: "Debbie Wasserman Schultz", party: "D" },
  "GA-01": { name: "Buddy Carter", party: "R" },
  "GA-02": { name: "Sanford D. Bishop Jr.", party: "D" },
  "GA-03": { name: "Brian Jack", party: "R" },
  "GA-04": { name: "Henry C. Johnson Jr.", party: "D" },
  "GA-05": { name: "Nikema Williams", party: "D" },
  "GA-06": { name: "Lucy McBath", party: "D" },
  "GA-07": { name: "Rich McCormick", party: "R" },
  "GA-08": { name: "Austin Scott", party: "R" },
  "GA-09": { name: "Andrew Clyde", party: "R" },
  "GA-10": { name: "Mike Collins", party: "R" },
  "GA-11": { name: "Barry Loudermilk", party: "R" },
  "GA-12": { name: "Rick W. Allen", party: "R" },
  "GA-13": { name: "David Scott", party: "D" },
  "GA-14": { name: "VACANT", party: "R" },  // Marjorie Taylor Greene resigned Jan 5, 2026
  "HI-01": { name: "Ed Case", party: "D" },
  "HI-02": { name: "Jill Tokuda", party: "D" },
  "IA-01": { name: "Mariannette Miller-Meeks", party: "R" },
  "IA-02": { name: "Ashley Hinson", party: "R" },
  "IA-03": { name: "Zach Nunn", party: "R" },
  "IA-04": { name: "Randy Feenstra", party: "R" },
  "ID-01": { name: "Russ Fulcher", party: "R" },
  "ID-02": { name: "Mike K. Simpson", party: "R" },
  "IL-01": { name: "Jonathan L. Jackson", party: "D" },
  "IL-02": { name: "Robin L. Kelly", party: "D" },
  "IL-03": { name: "Delia C. Ramirez", party: "D" },
  "IL-04": { name: "Chuy Garcia", party: "D" },
  "IL-05": { name: "Mike Quigley", party: "D" },
  "IL-06": { name: "Sean Casten", party: "D" },
  "IL-07": { name: "Danny K. Davis", party: "D" },
  "IL-08": { name: "Raja Krishnamoorthi", party: "D" },
  "IL-09": { name: "Janice D. Schakowsky", party: "D" },
  "IL-10": { name: "Bradley Scott Schneider", party: "D" },
  "IL-11": { name: "Bill Foster", party: "D" },
  "IL-12": { name: "Mike Bost", party: "R" },
  "IL-13": { name: "Nikki Budzinski", party: "D" },
  "IL-14": { name: "Lauren Underwood", party: "D" },
  "IL-15": { name: "Mary E. Miller", party: "R" },
  "IL-16": { name: "Darin LaHood", party: "R" },
  "IL-17": { name: "Eric Sorensen", party: "D" },
  "IN-01": { name: "Frank J. Mrvan", party: "D" },
  "IN-02": { name: "Rudy Yakym III", party: "R" },
  "IN-03": { name: "Marlin A. Stutzman", party: "R" },
  "IN-04": { name: "Jim Baird", party: "R" },
  "IN-05": { name: "Victoria Spartz", party: "R" },
  "IN-06": { name: "Jefferson Shreve", party: "R" },
  "IN-07": { name: "Andre D. Carson", party: "D" },
  "IN-08": { name: "Mark Messmer", party: "R" },
  "IN-09": { name: "Erin Houchin", party: "R" },
  "KS-01": { name: "Tracey Mann", party: "R" },
  "KS-02": { name: "Jake LaTurner", party: "R" },
  "KS-03": { name: "Sharice Davids", party: "D" },
  "KS-04": { name: "Ron Estes", party: "R" },
  "KY-01": { name: "James Comer", party: "R" },
  "KY-02": { name: "Brett Guthrie", party: "R" },
  "KY-03": { name: "Morgan McGarvey", party: "D" },
  "KY-04": { name: "Thomas Massie", party: "R" },
  "KY-05": { name: "Harold D. Rogers", party: "R" },
  "KY-06": { name: "Andy Barr", party: "R" },
  "LA-01": { name: "Steve Scalise", party: "R" },
  "LA-02": { name: "Troy A. Carter Sr.", party: "D" },
  "LA-03": { name: "Clay Higgins", party: "R" },
  "LA-04": { name: "Mike Johnson", party: "R" },
  "LA-05": { name: "Julia Letlow", party: "R" },
  "LA-06": { name: "Garret Graves", party: "R" },
  "MA-01": { name: "Richard E. Neal", party: "D" },
  "MA-02": { name: "James P. McGovern", party: "D" },
  "MA-03": { name: "Lori Trahan", party: "D" },
  "MA-04": { name: "Jake Auchincloss", party: "D" },
  "MA-05": { name: "Katherine M. Clark", party: "D" },
  "MA-06": { name: "Seth Moulton", party: "D" },
  "MA-07": { name: "Ayanna Pressley", party: "D" },
  "MA-08": { name: "Stephen F. Lynch", party: "D" },
  "MA-09": { name: "William R. Keating", party: "D" },
  "MD-01": { name: "Andy Harris", party: "R" },
  "MD-02": { name: "Dutch Ruppersberger", party: "D" },
  "MD-03": { name: "Sarah Elfreth", party: "D" },
  "MD-04": { name: "Glenn F. Ivey", party: "D" },
  "MD-05": { name: "Steny H. Hoyer", party: "D" },
  "MD-06": { name: "David J. Trone", party: "D" },
  "MD-07": { name: "Kweisi Mfume", party: "D" },
  "MD-08": { name: "Jamie Raskin", party: "D" },
  "ME-01": { name: "Chellie Pingree", party: "D" },
  "ME-02": { name: "Jared F. Golden", party: "D" },
  "MI-01": { name: "Jack Bergman", party: "R" },
  "MI-02": { name: "John Moolenaar", party: "R" },
  "MI-03": { name: "Hillary J. Scholten", party: "D" },
  "MI-04": { name: "Bill Huizenga", party: "R" },
  "MI-05": { name: "Tim Walberg", party: "R" },
  "MI-06": { name: "Debbie Dingell", party: "D" },
  "MI-07": { name: "Curtis Hertel", party: "D" },
  "MI-08": { name: "Kristen McDonald Rivet", party: "D" },
  "MI-09": { name: "Lisa McClain", party: "R" },
  "MI-10": { name: "John James", party: "R" },
  "MI-11": { name: "Haley Stevens", party: "D" },
  "MI-12": { name: "Rashida Tlaib", party: "D" },
  "MI-13": { name: "Shri Thanedar", party: "D" },
  "MN-01": { name: "Brad Finstad", party: "R" },
  "MN-02": { name: "Angie Craig", party: "D" },
  "MN-03": { name: "Kelly Morrison", party: "D" },
  "MN-04": { name: "Betty McCollum", party: "D" },
  "MN-05": { name: "Ilhan Omar", party: "D" },
  "MN-06": { name: "Tom Emmer", party: "R" },
  "MN-07": { name: "Michelle Fischbach", party: "R" },
  "MN-08": { name: "Pete Stauber", party: "R" },
  "MO-01": { name: "Cori Bush", party: "D" },
  "MO-02": { name: "Ann Wagner", party: "R" },
  "MO-03": { name: "Bob Luetkemeyer", party: "R" },
  "MO-04": { name: "Mark E. Alford", party: "R" },
  "MO-05": { name: "Emanuel Cleaver II", party: "D" },
  "MO-06": { name: "Sam Graves", party: "R" },
  "MO-07": { name: "Eric Burlison", party: "R" },
  "MO-08": { name: "Jason T. Smith", party: "R" },
  "MS-01": { name: "Trent Kelly", party: "R" },
  "MS-02": { name: "Bennie G. Thompson", party: "D" },
  "MS-03": { name: "Michael Guest", party: "R" },
  "MS-04": { name: "Mike Ezell", party: "R" },
  "MT-01": { name: "Ryan K. Zinke", party: "R" },
  "MT-02": { name: "Troy Downing", party: "R" },
  "NC-01": { name: "Don Davis", party: "D" },
  "NC-02": { name: "Deborah K. Ross", party: "D" },
  "NC-03": { name: "Greg Murphy", party: "R" },
  "NC-04": { name: "Valerie P. Foushee", party: "D" },
  "NC-05": { name: "Virginia Foxx", party: "R" },
  "NC-06": { name: "Addison P. McDowell", party: "R" },
  "NC-07": { name: "David Rouzer", party: "R" },
  "NC-08": { name: "Mark Harris", party: "R" },
  "NC-09": { name: "Richard Hudson", party: "R" },
  "NC-10": { name: "Pat Harrigan", party: "R" },
  "NC-11": { name: "Chuck Edwards", party: "R" },
  "NC-12": { name: "Alma S. Adams", party: "D" },
  "NC-13": { name: "Brad Knott", party: "R" },
  "NC-14": { name: "Tim Moore", party: "R" },
  "ND-AL": { name: "Julie Fedorchak", party: "R" },
  "NE-01": { name: "Mike Flood", party: "R" },
  "NE-02": { name: "Don Bacon", party: "R" },
  "NE-03": { name: "Adrian Smith", party: "R" },
  "NH-01": { name: "Chris Pappas", party: "D" },
  "NH-02": { name: "Maggie Goodlander", party: "D" },
  "NJ-01": { name: "Donald Norcross", party: "D" },
  "NJ-02": { name: "Jeff Van Drew", party: "R" },
  "NJ-03": { name: "Herb Conaway Jr.", party: "D" },
  "NJ-04": { name: "Christopher H. Smith", party: "R" },
  "NJ-05": { name: "Josh Gottheimer", party: "D" },
  "NJ-06": { name: "Frank Pallone Jr.", party: "D" },
  "NJ-07": { name: "Thomas Kean Jr.", party: "R" },
  "NJ-08": { name: "Rob Menendez", party: "D" },
  "NJ-09": { name: "Nellie Pou", party: "D" },
  "NJ-10": { name: "LaMonica McIver", party: "D" },
  "NJ-11": { name: "VACANT", party: "D" },  // Mikie Sherrill resigned Nov 20, 2025
  "NJ-12": { name: "Bonnie Watson Coleman", party: "D" },
  "NM-01": { name: "Melanie A. Stansbury", party: "D" },
  "NM-02": { name: "Gabe Vasquez", party: "D" },
  "NM-03": { name: "Teresa Leger Fernandez", party: "D" },
  "NV-01": { name: "Dina Titus", party: "D" },
  "NV-02": { name: "Mark E. Amodei", party: "R" },
  "NV-03": { name: "Susie Lee", party: "D" },
  "NV-04": { name: "Steven Horsford", party: "D" },
  "NY-01": { name: "Nick LaLota", party: "R" },
  "NY-02": { name: "Andrew R. Garbarino", party: "R" },
  "NY-03": { name: "Tom Suozzi", party: "D" },
  "NY-04": { name: "Laura Gillen", party: "D" },
  "NY-05": { name: "Gregory W. Meeks", party: "D" },
  "NY-06": { name: "Grace Meng", party: "D" },
  "NY-07": { name: "Nydia M. Velazquez", party: "D" },
  "NY-08": { name: "Hakeem Jeffries", party: "D" },
  "NY-09": { name: "Yvette D. Clarke", party: "D" },
  "NY-10": { name: "Dan Goldman", party: "D" },
  "NY-11": { name: "Nicole Malliotakis", party: "R" },
  "NY-12": { name: "Jerry Nadler", party: "D" },
  "NY-13": { name: "Adriano Espaillat", party: "D" },
  "NY-14": { name: "Alexandria Ocasio-Cortez", party: "D" },
  "NY-15": { name: "Ritchie Torres", party: "D" },
  "NY-16": { name: "George Latimer", party: "D" },
  "NY-17": { name: "Mike Lawler", party: "R" },
  "NY-18": { name: "Patrick Ryan", party: "D" },
  "NY-19": { name: "Josh Riley", party: "D" },
  "NY-20": { name: "Paul Tonko", party: "D" },
  "NY-21": { name: "Elise M. Stefanik", party: "R" },
  "NY-22": { name: "John W. Mannion", party: "D" },
  "NY-23": { name: "Nick Langworthy", party: "R" },
  "NY-24": { name: "Claudia Tenney", party: "R" },
  "NY-25": { name: "Joseph D. Morelle", party: "D" },
  "NY-26": { name: "Timothy M. Kennedy", party: "D" },
  "OH-01": { name: "Greg Landsman", party: "D" },
  "OH-02": { name: "David J. Taylor", party: "R" },
  "OH-03": { name: "Joyce Beatty", party: "D" },
  "OH-04": { name: "Jim Jordan", party: "R" },
  "OH-05": { name: "Bob Latta", party: "R" },
  "OH-06": { name: "Michael A. Rulli", party: "R" },
  "OH-07": { name: "Max L. Miller", party: "R" },
  "OH-08": { name: "Warren Davidson", party: "R" },
  "OH-09": { name: "Marcy Kaptur", party: "D" },
  "OH-10": { name: "Michael R. Turner", party: "R" },
  "OH-11": { name: "Shontel M. Brown", party: "D" },
  "OH-12": { name: "Troy Balderson", party: "R" },
  "OH-13": { name: "Emilia Strong Sykes", party: "D" },
  "OH-14": { name: "David P. Joyce", party: "R" },
  "OH-15": { name: "Mike Carey", party: "R" },
  "OK-01": { name: "Kevin Hern", party: "R" },
  "OK-02": { name: "Josh Brecheen", party: "R" },
  "OK-03": { name: "Frank D. Lucas", party: "R" },
  "OK-04": { name: "Tom Cole", party: "R" },
  "OK-05": { name: "Stephanie I. Bice", party: "R" },
  "OR-01": { name: "Suzanne Bonamici", party: "D" },
  "OR-02": { name: "Cliff Bentz", party: "R" },
  "OR-03": { name: "Maxine Dexter", party: "D" },
  "OR-04": { name: "Val T. Hoyle", party: "D" },
  "OR-05": { name: "Janelle S. Bynum", party: "D" },
  "OR-06": { name: "Andrea Salinas", party: "D" },
  "PA-01": { name: "Brian K. Fitzpatrick", party: "R" },
  "PA-02": { name: "Brendan F. Boyle", party: "D" },
  "PA-03": { name: "Dwight Evans", party: "D" },
  "PA-04": { name: "Madeleine Dean", party: "D" },
  "PA-05": { name: "Mary Gay Scanlon", party: "D" },
  "PA-06": { name: "Chrissy Houlahan", party: "D" },
  "PA-07": { name: "Ryan Mackenzie", party: "R" },
  "PA-08": { name: "Robert P. Bresnahan", party: "R" },
  "PA-09": { name: "Daniel Meuser", party: "R" },
  "PA-10": { name: "Scott Perry", party: "R" },
  "PA-11": { name: "Lloyd Smucker", party: "R" },
  "PA-12": { name: "Summer Lee", party: "D" },
  "PA-13": { name: "John Joyce", party: "R" },
  "PA-14": { name: "Guy Reschenthaler", party: "R" },
  "PA-15": { name: "Glenn W. Thompson", party: "R" },
  "PA-16": { name: "Mike Kelly", party: "R" },
  "PA-17": { name: "Chris Deluzio", party: "D" },
  "RI-01": { name: "Gabe Amo", party: "D" },
  "RI-02": { name: "Seth Magaziner", party: "D" },
  "SC-01": { name: "Nancy Mace", party: "R" },
  "SC-02": { name: "Joe Wilson", party: "R" },
  "SC-03": { name: "Sheri Biggs", party: "R" },
  "SC-04": { name: "William R. Timmons IV", party: "R" },
  "SC-05": { name: "Ralph Norman", party: "R" },
  "SC-06": { name: "James E. Clyburn", party: "D" },
  "SC-07": { name: "Russell Fry", party: "R" },
  "SD-AL": { name: "Dusty Johnson", party: "R" },
  "TN-01": { name: "Diana Harshbarger", party: "R" },
  "TN-02": { name: "Tim Burchett", party: "R" },
  "TN-03": { name: "Chuck Fleischmann", party: "R" },
  "TN-04": { name: "Scott DesJarlais", party: "R" },
  "TN-05": { name: "Andy Ogles", party: "R" },
  "TN-06": { name: "John W. Rose", party: "R" },
  "TN-07": { name: "Matt Van Epps", party: "R" },
  "TN-08": { name: "David Kustoff", party: "R" },
  "TN-09": { name: "Steve Cohen", party: "D" },
  "TX-01": { name: "Nathaniel Moran", party: "R" },
  "TX-02": { name: "Dan Crenshaw", party: "R" },
  "TX-03": { name: "Keith Self", party: "R" },
  "TX-04": { name: "Pat Fallon", party: "R" },
  "TX-05": { name: "Lance Gooden", party: "R" },
  "TX-06": { name: "Jake Ellzey", party: "R" },
  "TX-07": { name: "Lizzie Fletcher", party: "D" },
  "TX-08": { name: "Morgan Luttrell", party: "R" },
  "TX-09": { name: "Al Green", party: "D" },
  "TX-10": { name: "Michael T. McCaul", party: "R" },
  "TX-11": { name: "August Pfluger", party: "R" },
  "TX-12": { name: "Craig A. Goldman", party: "R" },
  "TX-13": { name: "Ronny Jackson", party: "R" },
  "TX-14": { name: "Randy K. Weber Sr.", party: "R" },
  "TX-15": { name: "Monica De La Cruz", party: "R" },
  "TX-16": { name: "Veronica Escobar", party: "D" },
  "TX-17": { name: "Pete Sessions", party: "R" },
  "TX-18": { name: "Christian D. Menefee", party: "D" },
  "TX-19": { name: "Jodey C. Arrington", party: "R" },
  "TX-20": { name: "Joaquin Castro", party: "D" },
  "TX-21": { name: "Chip Roy", party: "R" },
  "TX-22": { name: "Troy E. Nehls", party: "R" },
  "TX-23": { name: "Tony Gonzales", party: "R" },
  "TX-24": { name: "Beth Van Duyne", party: "R" },
  "TX-25": { name: "Roger Williams", party: "R" },
  "TX-26": { name: "Brandon Gill", party: "R" },
  "TX-27": { name: "Michael Cloud", party: "R" },
  "TX-28": { name: "Henry Cuellar", party: "D" },
  "TX-29": { name: "Sylvia R. Garcia", party: "D" },
  "TX-30": { name: "Jasmine Crockett", party: "D" },
  "TX-31": { name: "John R. Carter", party: "R" },
  "TX-32": { name: "Julie Johnson", party: "D" },
  "TX-33": { name: "Marc A. Veasey", party: "D" },
  "TX-34": { name: "Vicente Gonzalez Jr.", party: "D" },
  "TX-35": { name: "Greg Casar", party: "D" },
  "TX-36": { name: "Brian Babin", party: "R" },
  "TX-37": { name: "Lloyd Doggett", party: "D" },
  "TX-38": { name: "Wesley Hunt", party: "R" },
  "UT-01": { name: "Blake D. Moore", party: "R" },
  "UT-02": { name: "Celeste Maloy", party: "R" },
  "UT-03": { name: "Mike Kennedy", party: "R" },
  "UT-04": { name: "Burgess Owens", party: "R" },
  "VA-01": { name: "Rob Wittman", party: "R" },
  "VA-02": { name: "Jen Kiggans", party: "R" },
  "VA-03": { name: "Bobby Scott", party: "D" },
  "VA-04": { name: "Jennifer McClellan", party: "D" },
  "VA-05": { name: "John J. McGuire", party: "R" },
  "VA-06": { name: "Ben Cline", party: "R" },
  "VA-07": { name: "Eugene Vindman", party: "D" },
  "VA-08": { name: "Don Beyer", party: "D" },
  "VA-09": { name: "Morgan Griffith", party: "R" },
  "VA-10": { name: "Suhas Subramanyam", party: "D" },
  "VA-11": { name: "James R. Walkinshaw", party: "D" },
  "VT-AL": { name: "Becca Balint", party: "D" },
  "WA-01": { name: "Suzan K. DelBene", party: "D" },
  "WA-02": { name: "Rick Larsen", party: "D" },
  "WA-03": { name: "Marie Gluesenkamp Perez", party: "D" },
  "WA-04": { name: "Dan Newhouse", party: "R" },
  "WA-05": { name: "Michael Baumgartner", party: "R" },
  "WA-06": { name: "Emily Randall", party: "D" },
  "WA-07": { name: "Pramila Jayapal", party: "D" },
  "WA-08": { name: "Kim Schrier", party: "D" },
  "WA-09": { name: "Adam Smith", party: "D" },
  "WA-10": { name: "Marilyn Strickland", party: "D" },
  "WI-01": { name: "Bryan Steil", party: "R" },
  "WI-02": { name: "Mark Pocan", party: "D" },
  "WI-03": { name: "Derrick Van Orden", party: "R" },
  "WI-04": { name: "Gwen Moore", party: "D" },
  "WI-05": { name: "Scott L. Fitzgerald", party: "R" },
  "WI-06": { name: "Glenn Grothman", party: "R" },
  "WI-07": { name: "Tom Tiffany", party: "R" },
  "WI-08": { name: "Tony Wied", party: "R" },
  "WV-01": { name: "Carol D. Miller", party: "R" },
  "WV-02": { name: "Riley Moore", party: "R" },
  "WY-AL": { name: "Harriet M. Hageman", party: "R" },
};

const conn = await mysql.createConnection(DATABASE_URL);
console.log('Connected to database');
console.log('=== Updating House district representative names (119th Congress) ===');
console.log(`Total entries to process: ${Object.keys(HOUSE_MEMBERS).length}`);

let updated = 0;
let notFound = 0;
let vacancies = 0;

for (const [key, member] of Object.entries(HOUSE_MEMBERS)) {
  const parts = key.split('-');
  const stateCode = parts[0];
  const districtStr = parts[1];
  
  // Convert district string to number
  let districtNum;
  if (districtStr === 'AL') {
    districtNum = 0;  // at-large
  } else {
    districtNum = parseInt(districtStr, 10);
  }
  
  // Get current record
  const [rows] = await conn.execute(
    'SELECT id, state_code, district, incumbent, incumbent_party FROM house_races WHERE state_code = ? AND district = ?',
    [stateCode, districtNum]
  );
  
  if (rows.length === 0) {
    notFound++;
    console.log(`  NOT FOUND: ${key} (stateCode=${stateCode}, district=${districtNum})`);
    continue;
  }
  
  const race = rows[0];
  
  if (member.name === 'VACANT') {
    vacancies++;
    await conn.execute(
      `UPDATE house_races SET 
        incumbent = 'VACANT', 
        candidate1_name = 'TBD',
        notes = 'Seat currently vacant — special election pending'
      WHERE id = ?`,
      [race.id]
    );
    console.log(`  VACANT: ${key}`);
  } else {
    // Map party string to enum value
    const partyEnum = member.party === 'D' ? 'D' : member.party === 'R' ? 'R' : 'I';
    
    await conn.execute(
      `UPDATE house_races SET 
        incumbent = ?,
        candidate1_name = ?,
        incumbent_party = ?,
        candidate1_party = ?
      WHERE id = ?`,
      [member.name, member.name, partyEnum, partyEnum, race.id]
    );
    updated++;
  }
}

console.log(`\nResults: ${updated} updated, ${vacancies} vacancies marked, ${notFound} not found in DB`);

await conn.end();
console.log('\n=== House representative update complete ===');
