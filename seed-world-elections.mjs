import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const elections = [
  // ─── Completed Elections (2026) ─────────────────────────────────────────────
  {
    country: "Bangladesh", countryCode: "BD", electionType: "Parliamentary",
    electionName: "General Election", electionDate: "2026-02-12", status: "Completed",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Muhammad Yunus (interim)", incumbentParty: "Independent",
    systemType: "Parliamentary Republic", termLength: "5 years",
    candidates: JSON.stringify([
      { name: "Bangladesh Nationalist Party", party: "BNP" },
      { name: "Jamaat-e-Islami", party: "JI" },
      { name: "National Citizen Party", party: "NCP" }
    ]),
    winner: "Bangladesh Nationalist Party", winnerParty: "BNP",
    notes: "First competitive election in a decade after Hasina ouster in Aug 2024. Awami League barred from competing."
  },
  {
    country: "Hungary", countryCode: "HU", electionType: "Parliamentary",
    electionName: "Parliamentary Elections", electionDate: "2026-04-12", status: "Completed",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Viktor Orbán", incumbentParty: "Fidesz",
    systemType: "Parliamentary Republic", termLength: "4 years",
    candidates: JSON.stringify([
      { name: "Viktor Orbán", party: "Fidesz" },
      { name: "Péter Magyar", party: "Tisza (Respect and Freedom)" }
    ]),
    notes: "Key test of whether Orbán's 15-year rule would continue. Tisza Party led polls heading into election."
  },
  {
    country: "Colombia", countryCode: "CO", electionType: "Presidential",
    electionName: "Presidential Election (Runoff)", electionDate: "2026-06-21", status: "Completed",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Gustavo Petro", incumbentParty: "Historic Pact (Left)",
    systemType: "Presidential Republic", termLength: "4 years",
    candidates: JSON.stringify([
      { name: "Abelardo de la Espriella", party: "Independent/Right", votes: null, pct: "50.8" },
      { name: "Iván Cepeda", party: "Historic Pact (Left)", votes: null, pct: "49.2" }
    ]),
    winner: "Abelardo de la Espriella", winnerParty: "Independent/Right",
    notes: "Trump-backed far-right lawyer won narrow runoff. Cepeda alleges irregularities. First round May 31 had Fajardo (centrist) eliminated."
  },
  {
    country: "Ethiopia", countryCode: "ET", electionType: "Parliamentary",
    electionName: "General Election", electionDate: "2026-06-01", status: "Completed",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Abiy Ahmed", incumbentParty: "Prosperity Party",
    systemType: "Parliamentary Republic", termLength: "5 years",
    candidates: JSON.stringify([
      { name: "Prosperity Party", party: "PP" }
    ]),
    winner: "Prosperity Party", winnerParty: "Prosperity Party",
    notes: "Ruling party dominated amid ongoing regional conflicts in Amhara, Oromia, and Tigray."
  },
  // ─── Upcoming Elections (June 2026 onwards) ─────────────────────────────────
  {
    country: "Armenia", countryCode: "AM", electionType: "Referendum",
    electionName: "Constitutional Referendum", electionDate: "2026-06-30", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Nikol Pashinyan", incumbentParty: "Civil Contract",
    systemType: "Parliamentary Republic", termLength: "N/A",
    notes: "Date not confirmed. Referendum on constitutional amendments."
  },
  {
    country: "Algeria", countryCode: "DZ", electionType: "Parliamentary",
    electionName: "National People's Assembly", electionDate: "2026-07-02", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Abdelmadjid Tebboune", incumbentParty: "Independent",
    systemType: "Presidential Republic", termLength: "5 years",
    notes: "Legislative elections for the lower house of parliament."
  },
  {
    country: "Slovakia", countryCode: "SK", electionType: "Referendum",
    electionName: "National Referendum", electionDate: "2026-07-04", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Robert Fico", incumbentParty: "SMER-SD",
    systemType: "Parliamentary Republic", termLength: "N/A",
    notes: "Confirmed referendum."
  },
  {
    country: "São Tomé and Príncipe", countryCode: "ST", electionType: "Presidential",
    electionName: "Presidential Election", electionDate: "2026-07-19", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Carlos Vila Nova", incumbentParty: "ADI",
    systemType: "Semi-Presidential Republic", termLength: "5 years",
    notes: "Confirmed presidential election."
  },
  {
    country: "Cook Islands", countryCode: "CK", electionType: "Parliamentary",
    electionName: "Parliamentary Election", electionDate: "2026-08-02", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Mark Brown", incumbentParty: "Cook Islands Party",
    systemType: "Parliamentary Democracy", termLength: "4 years",
    notes: "Date not confirmed."
  },
  {
    country: "Zambia", countryCode: "ZM", electionType: "Presidential",
    electionName: "General Election", electionDate: "2026-08-13", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Hakainde Hichilema", incumbentParty: "UPND",
    systemType: "Presidential Republic", termLength: "5 years",
    notes: "Combined presidential and National Assembly elections. Date not confirmed."
  },
  {
    country: "Iceland", countryCode: "IS", electionType: "Referendum",
    electionName: "National Referendum", electionDate: "2026-08-29", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Bjarni Benediktsson", incumbentParty: "Independence Party",
    systemType: "Parliamentary Republic", termLength: "N/A",
    notes: "Date not confirmed."
  },
  {
    country: "Haiti", countryCode: "HT", electionType: "Presidential",
    electionName: "Presidential & Legislative Elections", electionDate: "2026-08-30", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Transitional Presidential Council", incumbentParty: "N/A",
    systemType: "Semi-Presidential Republic", termLength: "5 years",
    notes: "First elections since 2016. Date not confirmed. Country in severe political crisis."
  },
  {
    country: "Kazakhstan", countryCode: "KZ", electionType: "Parliamentary",
    electionName: "Mazhilis Election", electionDate: "2026-08-31", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Kassym-Jomart Tokayev", incumbentParty: "Amanat",
    systemType: "Presidential Republic", termLength: "5 years",
    notes: "Date not confirmed. Lower house elections."
  },
  {
    country: "Sweden", countryCode: "SE", electionType: "Parliamentary",
    electionName: "Riksdag Election", electionDate: "2026-09-13", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Ulf Kristersson", incumbentParty: "Moderate Party",
    systemType: "Parliamentary Monarchy", termLength: "4 years",
    notes: "Confirmed. Current center-right coalition government faces opposition from Social Democrats."
  },
  {
    country: "Morocco", countryCode: "MA", electionType: "Parliamentary",
    electionName: "Chamber of Representatives", electionDate: "2026-09-23", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Aziz Akhannouch", incumbentParty: "National Rally of Independents (RNI)",
    systemType: "Constitutional Monarchy", termLength: "5 years",
    notes: "Confirmed legislative elections."
  },
  {
    country: "Russia", countryCode: "RU", electionType: "Parliamentary",
    electionName: "State Duma Election", electionDate: "2026-09-30", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Vladimir Putin", incumbentParty: "United Russia",
    systemType: "Federal Semi-Presidential Republic", termLength: "5 years",
    notes: "Date not confirmed. United Russia expected to retain supermajority. Limited genuine opposition."
  },
  {
    country: "Latvia", countryCode: "LV", electionType: "Parliamentary",
    electionName: "Saeima Election", electionDate: "2026-10-03", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Evika Siliņa", incumbentParty: "New Unity",
    systemType: "Parliamentary Republic", termLength: "4 years",
    notes: "Confirmed parliamentary elections."
  },
  {
    country: "Brazil", countryCode: "BR", electionType: "Presidential",
    electionName: "General Election", electionDate: "2026-10-04", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Luiz Inácio Lula da Silva", incumbentParty: "Workers' Party (PT)",
    systemType: "Federal Presidential Republic", termLength: "4 years",
    notes: "Confirmed. Combined presidential, Senate, and Chamber of Deputies elections. Lula eligible for reelection."
  },
  {
    country: "Bosnia and Herzegovina", countryCode: "BA", electionType: "Presidential",
    electionName: "General Election", electionDate: "2026-10-04", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Rotating Presidency", incumbentParty: "Coalition",
    systemType: "Federal Parliamentary Republic", termLength: "4 years",
    notes: "Date not confirmed. Presidency and House of Representatives elections."
  },
  {
    country: "Czech Republic", countryCode: "CZ", electionType: "Parliamentary",
    electionName: "Senate Election", electionDate: "2026-10-09", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Petr Fiala", incumbentParty: "ODS (Civic Democratic Party)",
    systemType: "Parliamentary Republic", termLength: "6 years (1/3 renewal)",
    notes: "Confirmed. Partial Senate renewal (27 of 81 seats)."
  },
  {
    country: "United Kingdom", countryCode: "GB", electionType: "Parliamentary",
    electionName: "General Election (Snap)", electionDate: "2026-10-22", status: "Upcoming",
    isDateConfirmed: false, isSnap: true,
    incumbent: "Keir Starmer (resigning)", incumbentParty: "Labour",
    systemType: "Parliamentary Monarchy", termLength: "5 years",
    candidates: JSON.stringify([
      { name: "Reform UK", party: "Reform UK" },
      { name: "Labour", party: "Labour" },
      { name: "Conservative Party", party: "Conservative" }
    ]),
    notes: "Starmer resigned June 22, 2026. Snap election expected October. Reform UK leads polls at 27.8%. Labour leadership contest underway."
  },
  {
    country: "Israel", countryCode: "IL", electionType: "Parliamentary",
    electionName: "Knesset Election", electionDate: "2026-10-27", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Benjamin Netanyahu", incumbentParty: "Likud",
    systemType: "Parliamentary Republic", termLength: "4 years",
    notes: "Confirmed. Must be held by Oct 27 deadline. Key issues: Gaza, cost of living, judicial reform, ultra-Orthodox military exemptions."
  },
  {
    country: "Cabo Verde", countryCode: "CV", electionType: "Presidential",
    electionName: "Presidential Election", electionDate: "2026-10-31", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "José Maria Neves", incumbentParty: "PAICV",
    systemType: "Semi-Presidential Republic", termLength: "5 years",
    notes: "Date not confirmed."
  },
  {
    country: "United States", countryCode: "US", electionType: "Parliamentary",
    electionName: "Midterm Elections", electionDate: "2026-11-03", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Donald Trump", incumbentParty: "Republican",
    systemType: "Federal Presidential Republic", termLength: "2/6 years",
    notes: "Confirmed. All 435 House seats + 35 Senate seats. Republicans defending 7-seat House margin. Historical trend favors opposition party."
  },
  {
    country: "New Zealand", countryCode: "NZ", electionType: "Parliamentary",
    electionName: "General Election", electionDate: "2026-11-07", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Christopher Luxon", incumbentParty: "National Party",
    systemType: "Parliamentary Monarchy", termLength: "3 years",
    notes: "Confirmed. MMP electoral system."
  },
  {
    country: "Bahrain", countryCode: "BH", electionType: "Parliamentary",
    electionName: "Council of Representatives", electionDate: "2026-11-30", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "King Hamad bin Isa Al Khalifa", incumbentParty: "Royal Family",
    systemType: "Constitutional Monarchy", termLength: "4 years",
    notes: "Date not confirmed. Limited political opposition permitted."
  },
  {
    country: "Bulgaria", countryCode: "BG", electionType: "Presidential",
    electionName: "Presidential Election", electionDate: "2026-11-30", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Rumen Radev", incumbentParty: "Independent (BSP-backed)",
    systemType: "Parliamentary Republic", termLength: "5 years",
    notes: "Date not confirmed. Radev term-limited."
  },
  {
    country: "The Gambia", countryCode: "GM", electionType: "Presidential",
    electionName: "Presidential Election", electionDate: "2026-12-05", status: "Upcoming",
    isDateConfirmed: true, isSnap: false,
    incumbent: "Adama Barrow", incumbentParty: "NPP",
    systemType: "Presidential Republic", termLength: "5 years",
    notes: "Confirmed. Barrow seeking controversial third term despite earlier pledging term limits. Opposition divided."
  },
  {
    country: "South Sudan", countryCode: "SS", electionType: "Presidential",
    electionName: "General Election", electionDate: "2026-12-22", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Salva Kiir Mayardit", incumbentParty: "SPLM",
    systemType: "Presidential Republic", termLength: "5 years",
    notes: "Date not confirmed. Previously delayed multiple times. Ongoing internal conflict."
  },
  {
    country: "Somalia", countryCode: "SO", electionType: "Presidential",
    electionName: "Presidential & Parliamentary Election", electionDate: "2026-12-31", status: "Upcoming",
    isDateConfirmed: false, isSnap: false,
    incumbent: "Hassan Sheikh Mohamud", incumbentParty: "Union for Peace and Development",
    systemType: "Federal Parliamentary Republic", termLength: "4 years",
    notes: "Date not confirmed. Complex clan-based electoral system."
  }
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  console.log(`Seeding ${elections.length} world elections...`);
  
  for (const e of elections) {
    await conn.execute(
      `INSERT INTO world_elections (country, country_code, election_type, election_name, election_date, status, is_date_confirmed, is_snap, incumbent, incumbent_party, system_type, term_length, candidates, winner, winner_party, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.country, e.countryCode, e.electionType, e.electionName, e.electionDate,
        e.status, e.isDateConfirmed, e.isSnap,
        e.incumbent || null, e.incumbentParty || null, e.systemType || null, e.termLength || null,
        e.candidates || null, e.winner || null, e.winnerParty || null, e.notes || null
      ]
    );
  }
  
  console.log(`✅ Seeded ${elections.length} world elections successfully!`);
  await conn.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
