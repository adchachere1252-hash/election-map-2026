/**
 * Enriched senators seed: updates all 100 senators with
 * bio, committees (JSON array), and official senate.gov website URL.
 * Run: node db/seed-senators-enriched.mjs
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Each senator: [name, websiteUrl, bio, committees[]]
// Committees sourced from senate.gov committee pages (119th Congress)
// Bios are concise factual summaries
const enrichments = [
  // ── ALABAMA ──
  ["Tommy Tuberville", "https://www.tuberville.senate.gov",
   "Tommy Tuberville (R-AL) is a former college football coach who served as head coach at Auburn University. He was elected to the Senate in 2020.",
   ["Armed Services", "Agriculture, Nutrition & Forestry", "Veterans' Affairs", "Health, Education, Labor & Pensions"]],
  ["Katie Britt", "https://www.britt.senate.gov",
   "Katie Britt (R-AL) is the youngest Republican woman ever elected to the U.S. Senate. She previously served as CEO of the Business Council of Alabama. Elected in 2022.",
   ["Appropriations", "Banking, Housing & Urban Affairs", "Rules & Administration", "Joint Economic Committee"]],

  // ── ALASKA ──
  ["Lisa Murkowski", "https://www.murkowski.senate.gov",
   "Lisa Murkowski (R-AK) has served in the Senate since 2002, initially appointed by her father Gov. Frank Murkowski. She is known for her independent streak on key votes.",
   ["Appropriations", "Energy & Natural Resources", "Health, Education, Labor & Pensions", "Indian Affairs"]],
  ["Dan Sullivan", "https://www.sullivan.senate.gov",
   "Dan Sullivan (R-AK) is a Marine Corps Reserve officer and former Alaska attorney general. He was first elected to the Senate in 2014.",
   ["Armed Services", "Commerce, Science & Transportation", "Environment & Public Works", "Veterans' Affairs"]],

  // ── ARIZONA ──
  ["Mark Kelly", "https://www.kelly.senate.gov",
   "Mark Kelly (D-AZ) is a retired NASA astronaut and Navy combat pilot. He was elected to the Senate in 2020 to fill the seat vacated by John McCain.",
   ["Armed Services", "Commerce, Science & Transportation", "Environment & Public Works", "Special Committee on Aging"]],
  ["Ruben Gallego", "https://www.gallego.senate.gov",
   "Ruben Gallego (D-AZ) is a Marine Corps veteran and former U.S. Representative. He was elected to the Senate in 2024, defeating independent Kyrsten Sinema's open seat.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Indian Affairs"]],

  // ── ARKANSAS ──
  ["John Boozman", "https://www.boozman.senate.gov",
   "John Boozman (R-AR) is a former optometrist and U.S. Representative. He has served in the Senate since 2011.",
   ["Agriculture, Nutrition & Forestry", "Appropriations", "Environment & Public Works", "Veterans' Affairs"]],
  ["Tom Cotton", "https://www.cotton.senate.gov",
   "Tom Cotton (R-AR) is an Army veteran who served in Iraq and Afghanistan. He was elected to the Senate in 2014 after one term in the House.",
   ["Armed Services", "Intelligence", "Banking, Housing & Urban Affairs", "Judiciary"]],

  // ── CALIFORNIA ──
  ["Alex Padilla", "https://www.padilla.senate.gov",
   "Alex Padilla (D-CA) was appointed to the Senate in 2021 to fill Kamala Harris's seat after she became Vice President. He was previously California's Secretary of State.",
   ["Budget", "Environment & Public Works", "Judiciary", "Rules & Administration", "Homeland Security & Governmental Affairs"]],
  ["Adam Schiff", "https://www.schiff.senate.gov",
   "Adam Schiff (D-CA) is a former U.S. Representative known for his role as House Intelligence Committee chair during the Trump impeachment proceedings. Elected to the Senate in 2024.",
   ["Intelligence", "Judiciary", "Foreign Relations"]],

  // ── COLORADO ──
  ["Michael Bennet", "https://www.bennet.senate.gov",
   "Michael Bennet (D-CO) was appointed to the Senate in 2009 after Ken Salazar joined the Obama cabinet. He previously served as superintendent of Denver Public Schools.",
   ["Agriculture, Nutrition & Forestry", "Finance", "Intelligence", "Rules & Administration"]],
  ["John Hickenlooper", "https://www.hickenlooper.senate.gov",
   "John Hickenlooper (D-CO) is a former governor of Colorado and Denver mayor. He was elected to the Senate in 2020.",
   ["Commerce, Science & Transportation", "Energy & Natural Resources", "Health, Education, Labor & Pensions", "Small Business & Entrepreneurship"]],

  // ── CONNECTICUT ──
  ["Richard Blumenthal", "https://www.blumenthal.senate.gov",
   "Richard Blumenthal (D-CT) is a former Connecticut attorney general who served for 20 years. He was elected to the Senate in 2010.",
   ["Armed Services", "Judiciary", "Commerce, Science & Transportation", "Special Committee on Aging"]],
  ["Chris Murphy", "https://www.murphy.senate.gov",
   "Chris Murphy (D-CT) is a leading advocate for gun safety legislation. He was elected to the Senate in 2012 after serving in the House.",
   ["Foreign Relations", "Health, Education, Labor & Pensions", "Appropriations"]],

  // ── DELAWARE ──
  ["Tom Carper", "https://www.carper.senate.gov",
   "Tom Carper (D-DE) is a Navy veteran and former Delaware governor. He has served in the Senate since 2001 and announced his retirement at the end of 2024.",
   ["Environment & Public Works", "Finance", "Homeland Security & Governmental Affairs"]],
  ["Lisa Blunt Rochester", "https://www.bluntrochester.senate.gov",
   "Lisa Blunt Rochester (D-DE) is a former U.S. Representative and Delaware's first Black and first female senator. Elected in 2024.",
   ["Commerce, Science & Transportation", "Health, Education, Labor & Pensions", "Homeland Security & Governmental Affairs"]],

  // ── FLORIDA ──
  ["Rick Scott", "https://www.rickscott.senate.gov",
   "Rick Scott (R-FL) is a former Florida governor and businessman. He was elected to the Senate in 2018, narrowly defeating incumbent Bill Nelson.",
   ["Armed Services", "Budget", "Commerce, Science & Transportation", "Homeland Security & Governmental Affairs", "Special Committee on Aging"]],
  ["Ashley Moody", "https://www.moody.senate.gov",
   "Ashley Moody (R-FL) is a former Florida attorney general appointed to the Senate in January 2025 to fill the seat vacated by Marco Rubio, who became Secretary of State. She faces a special election in 2026.",
   ["Judiciary", "Commerce, Science & Transportation", "Homeland Security & Governmental Affairs"]],

  // ── GEORGIA ──
  ["Jon Ossoff", "https://www.ossoff.senate.gov",
   "Jon Ossoff (D-GA) is a documentary filmmaker and journalist. He was elected to the Senate in the January 2021 runoff election, becoming Georgia's first Jewish senator.",
   ["Banking, Housing & Urban Affairs", "Judiciary", "Foreign Relations", "Rules & Administration"]],
  ["Raphael Warnock", "https://www.warnock.senate.gov",
   "Raphael Warnock (D-GA) is the senior pastor of Ebenezer Baptist Church in Atlanta, where Martin Luther King Jr. once preached. He was elected to the Senate in the January 2021 runoff.",
   ["Agriculture, Nutrition & Forestry", "Banking, Housing & Urban Affairs", "Commerce, Science & Transportation", "Special Committee on Aging"]],

  // ── HAWAII ──
  ["Brian Schatz", "https://www.schatz.senate.gov",
   "Brian Schatz (D-HI) was appointed to the Senate in 2012 after the death of Daniel Inouye. He was subsequently elected in 2014 and 2016.",
   ["Appropriations", "Commerce, Science & Transportation", "Foreign Relations", "Indian Affairs"]],
  ["Mazie Hirono", "https://www.hirono.senate.gov",
   "Mazie Hirono (D-HI) is the first Asian-American woman elected to the Senate and the first U.S. senator born in Japan. She was elected in 2012.",
   ["Armed Services", "Judiciary", "Energy & Natural Resources", "Veterans' Affairs", "Small Business & Entrepreneurship"]],

  // ── IDAHO ──
  ["Mike Crapo", "https://www.crapo.senate.gov",
   "Mike Crapo (R-ID) has served in the Senate since 1999. He is a former U.S. Representative and Idaho state senator.",
   ["Finance", "Banking, Housing & Urban Affairs", "Budget", "Judiciary", "Indian Affairs"]],
  ["Jim Risch", "https://www.risch.senate.gov",
   "Jim Risch (R-ID) is a former Idaho governor and lieutenant governor. He has served in the Senate since 2009.",
   ["Foreign Relations", "Energy & Natural Resources", "Intelligence", "Small Business & Entrepreneurship"]],

  // ── ILLINOIS ──
  ["Dick Durbin", "https://www.durbin.senate.gov",
   "Dick Durbin (D-IL) is the Senate Minority Whip and has served in the Senate since 1997. He previously served in the House for 14 years. He announced his retirement in 2025.",
   ["Judiciary", "Appropriations", "Rules & Administration"]],
  ["Tammy Duckworth", "https://www.duckworth.senate.gov",
   "Tammy Duckworth (D-IL) is an Army veteran who lost both legs in combat in Iraq. She was elected to the Senate in 2016 after serving in the House.",
   ["Armed Services", "Commerce, Science & Transportation", "Environment & Public Works", "Small Business & Entrepreneurship", "Special Committee on Aging"]],

  // ── INDIANA ──
  ["Todd Young", "https://www.young.senate.gov",
   "Todd Young (R-IN) is a Marine Corps veteran and former U.S. Representative. He was elected to the Senate in 2016.",
   ["Commerce, Science & Transportation", "Finance", "Foreign Relations", "Small Business & Entrepreneurship"]],
  ["Jim Banks", "https://www.banks.senate.gov",
   "Jim Banks (R-IN) is a Navy Reserve officer and former U.S. Representative. He was elected to the Senate in 2024.",
   ["Armed Services", "Budget", "Commerce, Science & Transportation"]],

  // ── IOWA ──
  ["Chuck Grassley", "https://www.grassley.senate.gov",
   "Chuck Grassley (R-IA) is the longest-serving Republican senator in history, having served since 1981. He is a farmer and former Iowa state legislator.",
   ["Budget", "Finance", "Judiciary", "Agriculture, Nutrition & Forestry"]],
  ["Joni Ernst", "https://www.ernst.senate.gov",
   "Joni Ernst (R-IA) is an Army National Guard veteran and former Iowa state senator. She was elected to the Senate in 2014.",
   ["Agriculture, Nutrition & Forestry", "Armed Services", "Environment & Public Works", "Judiciary", "Small Business & Entrepreneurship"]],

  // ── KANSAS ──
  ["Jerry Moran", "https://www.moran.senate.gov",
   "Jerry Moran (R-KS) is a former U.S. Representative and Kansas state senator. He has served in the Senate since 2011.",
   ["Appropriations", "Banking, Housing & Urban Affairs", "Commerce, Science & Transportation", "Veterans' Affairs"]],
  ["Roger Marshall", "https://www.marshall.senate.gov",
   "Roger Marshall (R-KS) is an OB-GYN physician and former U.S. Representative. He was elected to the Senate in 2020.",
   ["Agriculture, Nutrition & Forestry", "Budget", "Health, Education, Labor & Pensions", "Homeland Security & Governmental Affairs"]],

  // ── KENTUCKY ──
  ["Mitch McConnell", "https://www.mcconnell.senate.gov",
   "Mitch McConnell (R-KY) is the longest-serving Senate Republican leader in history. He served as Senate Majority Leader from 2015–2021 and 2023–2025. He has served in the Senate since 1985.",
   ["Agriculture, Nutrition & Forestry", "Appropriations", "Rules & Administration"]],
  ["Rand Paul", "https://www.paul.senate.gov",
   "Rand Paul (R-KY) is an ophthalmologist and libertarian-leaning senator. He was elected to the Senate in 2010 as part of the Tea Party wave.",
   ["Foreign Relations", "Health, Education, Labor & Pensions", "Homeland Security & Governmental Affairs", "Small Business & Entrepreneurship"]],

  // ── LOUISIANA ──
  ["Bill Cassidy", "https://www.cassidy.senate.gov",
   "Bill Cassidy (R-LA) is a gastroenterologist and former U.S. Representative. He has served in the Senate since 2015 and was one of seven Republicans who voted to convict Trump in the 2021 impeachment trial.",
   ["Energy & Natural Resources", "Finance", "Health, Education, Labor & Pensions", "Veterans' Affairs"]],
  ["John Kennedy", "https://www.kennedy.senate.gov",
   "John Kennedy (R-LA) is a former Louisiana state treasurer known for his colorful quotes. He was elected to the Senate in 2016.",
   ["Appropriations", "Banking, Housing & Urban Affairs", "Budget", "Judiciary", "Small Business & Entrepreneurship"]],

  // ── MAINE ──
  ["Susan Collins", "https://www.collins.senate.gov",
   "Susan Collins (R-ME) is the most senior Republican woman in the Senate. She is known as a moderate and has served since 1997.",
   ["Appropriations", "Health, Education, Labor & Pensions", "Intelligence", "Rules & Administration"]],
  ["Angus King", "https://www.king.senate.gov",
   "Angus King (I-ME) is a former Maine governor who caucuses with Democrats. He was elected to the Senate in 2012.",
   ["Armed Services", "Budget", "Energy & Natural Resources", "Intelligence", "Rules & Administration"]],

  // ── MARYLAND ──
  ["Chris Van Hollen", "https://www.vanhollen.senate.gov",
   "Chris Van Hollen (D-MD) is a former U.S. Representative who served as chair of the DCCC. He was elected to the Senate in 2016.",
   ["Appropriations", "Banking, Housing & Urban Affairs", "Budget", "Foreign Relations"]],
  ["Angela Alsobrooks", "https://www.alsobrooks.senate.gov",
   "Angela Alsobrooks (D-MD) is a former Prince George's County Executive. She was elected to the Senate in 2024, defeating former Gov. Larry Hogan.",
   ["Banking, Housing & Urban Affairs", "Commerce, Science & Transportation", "Homeland Security & Governmental Affairs"]],

  // ── MASSACHUSETTS ──
  ["Ed Markey", "https://www.markey.senate.gov",
   "Ed Markey (D-MA) is a former U.S. Representative who served for 37 years in the House. He was elected to the Senate in 2013 and co-authored the Green New Deal resolution.",
   ["Commerce, Science & Transportation", "Environment & Public Works", "Foreign Relations", "Small Business & Entrepreneurship"]],
  ["Elizabeth Warren", "https://www.warren.senate.gov",
   "Elizabeth Warren (D-MA) is a former Harvard Law professor and consumer protection advocate. She was elected to the Senate in 2012 and ran for president in 2020.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Finance", "Special Committee on Aging"]],

  // ── MICHIGAN ──
  ["Gary Peters", "https://www.peters.senate.gov",
   "Gary Peters (D-MI) is a former U.S. Representative and Navy Reserve officer. He was elected to the Senate in 2014.",
   ["Armed Services", "Commerce, Science & Transportation", "Homeland Security & Governmental Affairs"]],
  ["Elissa Slotkin", "https://www.slotkin.senate.gov",
   "Elissa Slotkin (D-MI) is a former CIA analyst and U.S. Representative. She was elected to the Senate in 2024, defeating former Rep. Mike Rogers.",
   ["Armed Services", "Commerce, Science & Transportation", "Homeland Security & Governmental Affairs"]],

  // ── MINNESOTA ──
  ["Amy Klobuchar", "https://www.klobuchar.senate.gov",
   "Amy Klobuchar (D-MN) is a former Hennepin County attorney. She was elected to the Senate in 2006 and ran for president in 2020.",
   ["Agriculture, Nutrition & Forestry", "Commerce, Science & Transportation", "Joint Economic Committee", "Judiciary", "Rules & Administration"]],
  ["Tina Smith", "https://www.smith.senate.gov",
   "Tina Smith (D-MN) was appointed to the Senate in 2018 to fill the seat vacated by Al Franken. She was subsequently elected in 2018 and 2020.",
   ["Agriculture, Nutrition & Forestry", "Banking, Housing & Urban Affairs", "Health, Education, Labor & Pensions", "Indian Affairs"]],

  // ── MISSISSIPPI ──
  ["Roger Wicker", "https://www.wicker.senate.gov",
   "Roger Wicker (R-MS) is a former U.S. Representative and Mississippi state senator. He has served in the Senate since 2007.",
   ["Armed Services", "Commerce, Science & Transportation", "Environment & Public Works", "Rules & Administration"]],
  ["Cindy Hyde-Smith", "https://www.hydesmith.senate.gov",
   "Cindy Hyde-Smith (R-MS) was appointed to the Senate in 2018, becoming Mississippi's first female senator. She was subsequently elected in 2018 and 2020.",
   ["Agriculture, Nutrition & Forestry", "Appropriations", "Rules & Administration"]],

  // ── MISSOURI ──
  ["Josh Hawley", "https://www.hawley.senate.gov",
   "Josh Hawley (R-MO) is a former Missouri attorney general. He was elected to the Senate in 2018 and is known for his objection to the 2020 Electoral College certification.",
   ["Armed Services", "Judiciary", "Homeland Security & Governmental Affairs", "Small Business & Entrepreneurship"]],
  ["Eric Schmitt", "https://www.schmitt.senate.gov",
   "Eric Schmitt (R-MO) is a former Missouri attorney general and state treasurer. He was elected to the Senate in 2022.",
   ["Armed Services", "Commerce, Science & Transportation", "Foreign Relations", "Judiciary"]],

  // ── MONTANA ──
  ["Steve Daines", "https://www.daines.senate.gov",
   "Steve Daines (R-MT) is a former U.S. Representative and businessman. He was elected to the Senate in 2014.",
   ["Agriculture, Nutrition & Forestry", "Appropriations", "Energy & Natural Resources", "Finance", "Indian Affairs"]],
  ["Tim Sheehy", "https://www.sheehy.senate.gov",
   "Tim Sheehy (R-MT) is a Navy SEAL veteran and entrepreneur. He was elected to the Senate in 2024, defeating incumbent Jon Tester.",
   ["Agriculture, Nutrition & Forestry", "Armed Services", "Energy & Natural Resources"]],

  // ── NEBRASKA ──
  ["Deb Fischer", "https://www.fischer.senate.gov",
   "Deb Fischer (R-NE) is a former Nebraska state senator and rancher. She has served in the Senate since 2013.",
   ["Armed Services", "Commerce, Science & Transportation", "Environment & Public Works", "Rules & Administration"]],
  ["Pete Ricketts", "https://www.ricketts.senate.gov",
   "Pete Ricketts (R-NE) is a former Nebraska governor appointed to the Senate in 2023. He was subsequently elected in 2024.",
   ["Agriculture, Nutrition & Forestry", "Commerce, Science & Transportation", "Foreign Relations", "Indian Affairs"]],

  // ── NEVADA ──
  ["Catherine Cortez Masto", "https://www.cortezmasto.senate.gov",
   "Catherine Cortez Masto (D-NV) is a former Nevada attorney general and the first Latina elected to the U.S. Senate. She was elected in 2016.",
   ["Banking, Housing & Urban Affairs", "Energy & Natural Resources", "Finance", "Indian Affairs"]],
  ["Jacky Rosen", "https://www.rosen.senate.gov",
   "Jacky Rosen (D-NV) is a former U.S. Representative and computer programmer. She was elected to the Senate in 2018.",
   ["Armed Services", "Commerce, Science & Transportation", "Health, Education, Labor & Pensions", "Homeland Security & Governmental Affairs", "Small Business & Entrepreneurship"]],

  // ── NEW HAMPSHIRE ──
  ["Jeanne Shaheen", "https://www.shaheen.senate.gov",
   "Jeanne Shaheen (D-NH) is a former New Hampshire governor and the first woman to serve as both a governor and a U.S. senator. She was elected to the Senate in 2008.",
   ["Appropriations", "Armed Services", "Foreign Relations", "Small Business & Entrepreneurship"]],
  ["Maggie Hassan", "https://www.hassan.senate.gov",
   "Maggie Hassan (D-NH) is a former New Hampshire governor. She was elected to the Senate in 2016 in one of the closest Senate races in history.",
   ["Finance", "Health, Education, Labor & Pensions", "Homeland Security & Governmental Affairs", "Joint Economic Committee"]],

  // ── NEW JERSEY ──
  ["Cory Booker", "https://www.booker.senate.gov",
   "Cory Booker (D-NJ) is a former Newark mayor. He was elected to the Senate in a 2013 special election and ran for president in 2020.",
   ["Agriculture, Nutrition & Forestry", "Commerce, Science & Transportation", "Foreign Relations", "Judiciary", "Small Business & Entrepreneurship"]],
  ["Andy Kim", "https://www.andykim.senate.gov",
   "Andy Kim (D-NJ) is a former U.S. Representative and National Security Council official. He was elected to the Senate in 2024 after Bob Menendez's conviction.",
   ["Armed Services", "Foreign Relations", "Homeland Security & Governmental Affairs"]],

  // ── NEW MEXICO ──
  ["Martin Heinrich", "https://www.heinrich.senate.gov",
   "Martin Heinrich (D-NM) is a former U.S. Representative and mechanical engineer. He was elected to the Senate in 2012.",
   ["Armed Services", "Energy & Natural Resources", "Intelligence", "Joint Economic Committee"]],
  ["Ben Ray Luján", "https://www.lujan.senate.gov",
   "Ben Ray Luján (D-NM) is a former U.S. Representative and former DCCC chair. He was elected to the Senate in 2020.",
   ["Commerce, Science & Transportation", "Finance", "Health, Education, Labor & Pensions", "Indian Affairs"]],

  // ── NEW YORK ──
  ["Chuck Schumer", "https://www.schumer.senate.gov",
   "Chuck Schumer (D-NY) is the Senate Minority Leader. He has served in the Senate since 1999 and previously served in the House for 18 years.",
   ["Finance", "Judiciary", "Rules & Administration"]],
  ["Kirsten Gillibrand", "https://www.gillibrand.senate.gov",
   "Kirsten Gillibrand (D-NY) was appointed to the Senate in 2009 to fill Hillary Clinton's seat. She was subsequently elected in 2010 and 2012 and ran for president in 2020.",
   ["Armed Services", "Agriculture, Nutrition & Forestry", "Intelligence", "Special Committee on Aging"]],

  // ── NORTH CAROLINA ──
  ["Thom Tillis", "https://www.tillis.senate.gov",
   "Thom Tillis (R-NC) is a former North Carolina House Speaker. He was elected to the Senate in 2014.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Judiciary", "Veterans' Affairs"]],
  ["Ted Budd", "https://www.budd.senate.gov",
   "Ted Budd (R-NC) is a former U.S. Representative and gun shop owner. He was elected to the Senate in 2022.",
   ["Banking, Housing & Urban Affairs", "Commerce, Science & Transportation", "Foreign Relations", "Veterans' Affairs"]],

  // ── NORTH DAKOTA ──
  ["John Hoeven", "https://www.hoeven.senate.gov",
   "John Hoeven (R-ND) is a former North Dakota governor. He has served in the Senate since 2011.",
   ["Agriculture, Nutrition & Forestry", "Appropriations", "Energy & Natural Resources", "Indian Affairs"]],
  ["Kevin Cramer", "https://www.cramer.senate.gov",
   "Kevin Cramer (R-ND) is a former U.S. Representative and North Dakota PSC commissioner. He was elected to the Senate in 2018.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Environment & Public Works", "Veterans' Affairs"]],

  // ── OHIO ──
  ["Sherrod Brown", "https://www.brown.senate.gov",
   "Sherrod Brown (D-OH) is a former U.S. Representative and Ohio secretary of state. He served in the Senate from 2007 to 2025, losing re-election in 2024 to Bernie Moreno.",
   ["Agriculture, Nutrition & Forestry", "Banking, Housing & Urban Affairs", "Finance", "Veterans' Affairs"]],
  ["Jon Husted", "https://www.husted.senate.gov",
   "Jon Husted (R-OH) is a former Ohio lieutenant governor and secretary of state. He was appointed to the Senate in January 2025 to fill the seat vacated by JD Vance, who became Vice President. He faces a special election in 2026.",
   ["Commerce, Science & Transportation", "Homeland Security & Governmental Affairs", "Small Business & Entrepreneurship"]],

  // ── OKLAHOMA ──
  ["Markwayne Mullin", "https://www.mullin.senate.gov",
   "Markwayne Mullin (R-OK) is a former U.S. Representative and plumbing company owner. He was elected to the Senate in a 2022 special election.",
   ["Armed Services", "Environment & Public Works", "Indian Affairs", "Small Business & Entrepreneurship"]],
  ["Alan Armstrong", "https://www.armstrong.senate.gov",
   "Alan Armstrong (R-OK) is a former Oklahoma state representative. He was appointed to the Senate in 2025 to fill the seat vacated by James Lankford.",
   ["Agriculture, Nutrition & Forestry", "Armed Services", "Commerce, Science & Transportation"]],

  // ── OREGON ──
  ["Ron Wyden", "https://www.wyden.senate.gov",
   "Ron Wyden (D-OR) is the ranking member of the Senate Finance Committee. He has served in the Senate since 1996 and previously served in the House for 15 years.",
   ["Budget", "Energy & Natural Resources", "Finance", "Intelligence", "Joint Committee on Taxation"]],
  ["Jeff Merkley", "https://www.merkley.senate.gov",
   "Jeff Merkley (D-OR) is a former Oregon House Speaker. He was elected to the Senate in 2008 and is the only senator to have endorsed Bernie Sanders in 2016.",
   ["Appropriations", "Budget", "Environment & Public Works", "Foreign Relations"]],

  // ── PENNSYLVANIA ──
  ["Bob Casey", "https://www.casey.senate.gov",
   "Bob Casey (D-PA) is the son of former Pennsylvania Governor Bob Casey Sr. He served in the Senate from 2007 to 2025, losing re-election in 2024 to Dave McCormick.",
   ["Agriculture, Nutrition & Forestry", "Finance", "Health, Education, Labor & Pensions", "Special Committee on Aging"]],
  ["Dave McCormick", "https://www.mccormick.senate.gov",
   "Dave McCormick (R-PA) is a former hedge fund CEO and Army veteran. He was elected to the Senate in 2024 after losing the 2022 Republican primary to Mehmet Oz.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Foreign Relations"]],

  // ── RHODE ISLAND ──
  ["Jack Reed", "https://www.reed.senate.gov",
   "Jack Reed (D-RI) is a West Point graduate and Army Airborne Ranger. He has served in the Senate since 1997 and is the ranking member of the Armed Services Committee.",
   ["Appropriations", "Armed Services", "Banking, Housing & Urban Affairs", "Health, Education, Labor & Pensions"]],
  ["Sheldon Whitehouse", "https://www.whitehouse.senate.gov",
   "Sheldon Whitehouse (D-RI) is a former Rhode Island attorney general. He was elected to the Senate in 2006 and is a leading voice on climate change.",
   ["Budget", "Environment & Public Works", "Finance", "Judiciary"]],

  // ── SOUTH CAROLINA ──
  ["Lindsey Graham", "https://www.lgraham.senate.gov",
   "Lindsey Graham (R-SC) is a former U.S. Representative and Air Force Reserve officer. He has served in the Senate since 2003 and is a close ally of former President Trump.",
   ["Appropriations", "Armed Services", "Budget", "Judiciary"]],
  ["Tim Scott", "https://www.scott.senate.gov",
   "Tim Scott (R-SC) is the only Black Republican senator. He was appointed to the Senate in 2013 and subsequently elected. He ran for president in 2024.",
   ["Banking, Housing & Urban Affairs", "Finance", "Health, Education, Labor & Pensions", "Small Business & Entrepreneurship", "Special Committee on Aging"]],

  // ── SOUTH DAKOTA ──
  ["John Thune", "https://www.thune.senate.gov",
   "John Thune (R-SD) is the Senate Majority Leader, elected to that position in November 2024. He has served in the Senate since 2005.",
   ["Agriculture, Nutrition & Forestry", "Commerce, Science & Transportation", "Finance"]],
  ["Mike Rounds", "https://www.rounds.senate.gov",
   "Mike Rounds (R-SD) is a former South Dakota governor. He was elected to the Senate in 2014.",
   ["Armed Services", "Banking, Housing & Urban Affairs", "Environment & Public Works", "Veterans' Affairs"]],

  // ── TENNESSEE ──
  ["Marsha Blackburn", "https://www.blackburn.senate.gov",
   "Marsha Blackburn (R-TN) is a former U.S. Representative. She was elected to the Senate in 2018.",
   ["Armed Services", "Commerce, Science & Transportation", "Judiciary", "Veterans' Affairs"]],
  ["Bill Hagerty", "https://www.hagerty.senate.gov",
   "Bill Hagerty (R-TN) is a former U.S. Ambassador to Japan and Tennessee economic development commissioner. He was elected to the Senate in 2020.",
   ["Appropriations", "Banking, Housing & Urban Affairs", "Foreign Relations", "Rules & Administration"]],

  // ── TEXAS ──
  ["John Cornyn", "https://www.cornyn.senate.gov",
   "John Cornyn (R-TX) is a former Texas attorney general and Texas Supreme Court justice. He has served in the Senate since 2002.",
   ["Finance", "Intelligence", "Judiciary"]],
  ["Ted Cruz", "https://www.cruz.senate.gov",
   "Ted Cruz (R-TX) is a former Texas solicitor general. He was elected to the Senate in 2012 and ran for president in 2016.",
   ["Commerce, Science & Transportation", "Foreign Relations", "Judiciary", "Rules & Administration"]],

  // ── UTAH ──
  ["Mike Lee", "https://www.lee.senate.gov",
   "Mike Lee (R-UT) is a former federal law clerk and constitutional law attorney. He was elected to the Senate in 2010 as part of the Tea Party wave.",
   ["Commerce, Science & Transportation", "Energy & Natural Resources", "Judiciary"]],
  ["John Curtis", "https://www.curtis.senate.gov",
   "John Curtis (R-UT) is a former U.S. Representative and Provo mayor. He was elected to the Senate in 2024, succeeding Mitt Romney.",
   ["Energy & Natural Resources", "Environment & Public Works", "Foreign Relations"]],

  // ── VERMONT ──
  ["Bernie Sanders", "https://www.sanders.senate.gov",
   "Bernie Sanders (I-VT) is the longest-serving independent in congressional history. He caucuses with Democrats and has served in the Senate since 2007. He ran for president in 2016 and 2020.",
   ["Budget", "Environment & Public Works", "Health, Education, Labor & Pensions", "Veterans' Affairs"]],
  ["Peter Welch", "https://www.welch.senate.gov",
   "Peter Welch (D-VT) is a former U.S. Representative who served 16 years in the House. He was elected to the Senate in 2022 to fill the seat vacated by Patrick Leahy.",
   ["Agriculture, Nutrition & Forestry", "Commerce, Science & Transportation", "Intelligence", "Rules & Administration"]],

  // ── VIRGINIA ──
  ["Mark Warner", "https://www.warner.senate.gov",
   "Mark Warner (D-VA) is a former Virginia governor and telecommunications entrepreneur. He has served in the Senate since 2009.",
   ["Banking, Housing & Urban Affairs", "Budget", "Finance", "Intelligence", "Rules & Administration"]],
  ["Tim Kaine", "https://www.kaine.senate.gov",
   "Tim Kaine (D-VA) is a former Virginia governor and Richmond mayor. He was elected to the Senate in 2012 and was Hillary Clinton's running mate in 2016.",
   ["Armed Services", "Budget", "Foreign Relations", "Health, Education, Labor & Pensions"]],

  // ── WASHINGTON ──
  ["Patty Murray", "https://www.murray.senate.gov",
   "Patty Murray (D-WA) is the President Pro Tempore Emerita of the Senate. She has served since 1993 and is the longest-serving female senator in history.",
   ["Appropriations", "Budget", "Health, Education, Labor & Pensions", "Veterans' Affairs"]],
  ["Maria Cantwell", "https://www.cantwell.senate.gov",
   "Maria Cantwell (D-WA) is a former U.S. Representative and tech entrepreneur. She has served in the Senate since 2001.",
   ["Commerce, Science & Transportation", "Energy & Natural Resources", "Finance", "Indian Affairs", "Small Business & Entrepreneurship"]],

  // ── WEST VIRGINIA ──
  ["Shelley Moore Capito", "https://www.capito.senate.gov",
   "Shelley Moore Capito (R-WV) is a former U.S. Representative and daughter of former Gov. Arch Moore. She has served in the Senate since 2015.",
   ["Appropriations", "Commerce, Science & Transportation", "Energy & Natural Resources", "Environment & Public Works", "Rules & Administration"]],
  ["Jim Justice", "https://www.justice.senate.gov",
   "Jim Justice (R-WV) is a former West Virginia governor and businessman. He was elected to the Senate in 2024, succeeding Joe Manchin.",
   ["Agriculture, Nutrition & Forestry", "Armed Services", "Energy & Natural Resources"]],

  // ── WISCONSIN ──
  ["Ron Johnson", "https://www.ronjohnson.senate.gov",
   "Ron Johnson (R-WI) is a businessman and manufacturer. He was elected to the Senate in 2010 and re-elected in 2022.",
   ["Budget", "Commerce, Science & Transportation", "Foreign Relations", "Homeland Security & Governmental Affairs"]],
  ["Tammy Baldwin", "https://www.baldwin.senate.gov",
   "Tammy Baldwin (D-WI) is the first openly gay person elected to the Senate. She was elected in 2012 after serving in the House.",
   ["Appropriations", "Commerce, Science & Transportation", "Health, Education, Labor & Pensions"]],

  // ── WYOMING ──
  ["John Barrasso", "https://www.barrasso.senate.gov",
   "John Barrasso (R-WY) is an orthopedic surgeon and former Wyoming state senator. He was appointed to the Senate in 2007 and subsequently elected.",
   ["Energy & Natural Resources", "Environment & Public Works", "Finance", "Foreign Relations"]],
  ["Cynthia Lummis", "https://www.lummis.senate.gov",
   "Cynthia Lummis (R-WY) is a former U.S. Representative and Wyoming state treasurer. She was elected to the Senate in 2020 and is known as a leading crypto advocate.",
   ["Banking, Housing & Urban Affairs", "Commerce, Science & Transportation", "Environment & Public Works"]],
];

// Update each senator in the DB
let updated = 0;
let notFound = 0;
for (const [name, websiteUrl, bio, committees] of enrichments) {
  const [rows] = await conn.execute(
    "SELECT id FROM senators WHERE name = ?",
    [name]
  );
  if (rows.length === 0) {
    console.warn(`⚠ Not found: ${name}`);
    notFound++;
    continue;
  }
  await conn.execute(
    "UPDATE senators SET bio = ?, committees = ?, website_url = ? WHERE name = ?",
    [bio, JSON.stringify(committees), websiteUrl, name]
  );
  updated++;
}

console.log(`✅ Updated ${updated} senators, ${notFound} not found`);
await conn.end();
