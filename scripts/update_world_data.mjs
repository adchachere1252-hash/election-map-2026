import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Update Algeria (ID 6) — Just voted Jul 2, update status and sources
await conn.execute(
  `UPDATE world_elections SET status = 'Voting Today', 
   sources = ?,
   notes = 'Voting held July 2, 2026. 407-seat National People\\'s Assembly. 269 candidates barred from running. Record-low turnout feared due to post-Hirak distrust and cost-of-living concerns.'
   WHERE id = 6`,
  [JSON.stringify([
    "https://www.france24.com/en/africa/20260702-algerians-vote-in-parliamentary-elections-overshadowed-by-candidate-bans",
    "https://www.aljazeera.com/news/2026/7/1/algeria-heads-to-legislative-polls-amid-record-low-turnout-fear",
    "https://apnews.com/article/algeria-algiers-parliamentary-elections-34653095427e8d0a4cae36ade1b2d5c1",
    "https://lansinginstitute.org/2026/06/08/algerias-parliamentary-elections-2026-stability-controlled-competition-and-the-future-of-the-tebboune-system/",
    "https://www.dw.com/en/algerias-parliamentary-vote-raises-questions-on-real-change/a-77787095"
  ])]
);
console.log("✓ Algeria updated (Voting Today + sources)");

// Update Slovakia (ID 7) — Referendum failed Jul 4
await conn.execute(
  `UPDATE world_elections SET status = 'Completed',
   winner = 'Referendum Failed (Low Turnout)',
   winner_party = 'N/A',
   notes = 'Referendum to cancel lifelong payments for PM Robert Fico failed due to turnout below 50% threshold. Fico\\'s Smer party opposed the referendum.',
   sources = ?
   WHERE id = 7`,
  [JSON.stringify([
    "https://apnews.com/article/slovakia-fico-referendum-corruption-60d7cb3ae150739a926056afae9dc2a8",
    "https://www.newgeopolitics.org/2026/07/05/prospects-for-early-parliamentary-elections-in-slovakia-and-their-possible-consequences-for-the-countrys-policy-toward-ukraine/"
  ])]
);
console.log("✓ Slovakia updated (Completed — referendum failed)");

// Update Brazil (ID 18) — Enhanced polling data and sources
await conn.execute(
  `UPDATE world_elections SET 
   polling_data = ?,
   sources = ?,
   candidates = ?,
   notes = 'First round October 4, 2026. Lula seeking unprecedented 4th term at age 80. Flávio Bolsonaro (son of jailed ex-president Jair) carries PL banner. Romeu Zema (NOVO) and Ronaldo Caiado (PSD) also running. Lula leads in most polls but race tightening.'
   WHERE id = 18`,
  [
    JSON.stringify({
      polls: [
        { source: "AtlasIntel/Bloomberg", date: "2026-07-01", lula: 35, bolsonaro: 28, zema: 8, caiado: 6, others: 23 },
        { source: "Datafolha", date: "2026-06-22", lula: 33, bolsonaro: 27, zema: 9, caiado: 7, others: 24 },
        { source: "Quaest", date: "2026-06-20", lula: 31, bolsonaro: 30, zema: 8, caiado: 6, others: 25 },
        { source: "MDA/CNT", date: "2026-06-16", lula: 49, bolsonaro: 33, note: "runoff scenario" }
      ],
      leader: "Lula (PT)",
      margin: 7,
      trend: "Lula leading but margin narrowing",
      lastUpdated: "2026-07-01"
    }),
    JSON.stringify([
      "https://www.as-coa.org/articles/poll-tracker-brazils-2026-presidential-election",
      "https://www.reuters.com/world/americas/brazils-president-lula-maintains-poll-lead-over-right-wing-senator-bolsonaro-2026-06-20/",
      "https://www.reuters.com/world/americas/brazils-lula-widens-lead-over-flavio-bolsonaro-ahead-presidential-vote-poll-2026-06-10/",
      "https://datafolha.folha.uol.com.br/eleicoes/2026/06/lula-pt-mantem-vantagem-no-1o-turno-e-2o-turno.shtml",
      "https://www.atlasintel.org/poll/brazil-national-2026-07-01",
      "https://www.aljazeera.com/news/2026/6/17/dont-meddle-lula-calls-on-trump-to-stay-out-of-brazils-elections"
    ]),
    JSON.stringify([
      { name: "Luiz Inácio Lula da Silva", party: "PT (Workers' Party)", role: "Incumbent President", photo: "https://manus.storage.googleapis.com/w2/lula_brazil.jpg", pct: 35, is_winner: false },
      { name: "Flávio Bolsonaro", party: "PL (Liberal Party)", role: "Senator", photo: "https://manus.storage.googleapis.com/w2/flavio_bolsonaro_brazil.jpg", pct: 28, is_winner: false },
      { name: "Romeu Zema", party: "NOVO", role: "Governor of Minas Gerais", pct: 8, is_winner: false },
      { name: "Ronaldo Caiado", party: "PSD (Social Democratic Party)", role: "Ex-Governor of Goiás", pct: 6, is_winner: false }
    ])
  ]
);
console.log("✓ Brazil updated (polling + sources + candidates)");

// Update Israel (ID 22) — Enhanced polling data and sources
await conn.execute(
  `UPDATE world_elections SET 
   polling_data = ?,
   sources = ?,
   candidates = ?,
   notes = 'Knesset election October 27, 2026. Neither Netanyahu coalition nor opposition projected to secure 61-seat majority. Bennett\\'s Together and Eisenkot\\'s Yashar competing for anti-Netanyahu vote. Likud remains largest single party but coalition weakened.'
   WHERE id = 22`,
  [
    JSON.stringify({
      polls: [
        { source: "Channel 12/Maariv", date: "2026-07-02", likud: 22, together: 21, yashar: 21, jointList: 8, shas: 8, utj: 7, laborMeretz: 5, others: 28 },
        { source: "Haaretz Tracker", date: "2026-06-29", rightBloc: 55, centerLeftBloc: 57, note: "Neither reaches 61" },
        { source: "Economist Tracker", date: "2026-07-05", note: "Likud probably largest party but coalition lost support" }
      ],
      leader: "Likud (Netanyahu) — largest party",
      margin: 1,
      trend: "Deadlock — neither bloc reaches 61 seats",
      lastUpdated: "2026-07-05"
    }),
    JSON.stringify([
      "https://www.haaretz.com/israel-news/elections/2026-06-29/ty-article-static/israel-2026-election-poll-tracker-the-latest-projections/",
      "https://www.britannica.com/event/2026-Israeli-Elections",
      "https://www.economist.com/interactive/2026-israel-election-tracker",
      "https://www.timesofisrael.com/in-1st-eisenkots-party-polls-even-with-bennetts-in-fight-to-be-netanyahu-election-rival/",
      "https://hornreview.org/2026/06/17/israels-2026-election-what-to-expect/",
      "https://www.aa.com.tr/en/middle-east/poll-points-to-israeli-political-deadlock-ahead-of-next-elections/3985279"
    ]),
    JSON.stringify([
      { name: "Benjamin Netanyahu", party: "Likud", role: "Current Prime Minister", photo: "https://manus.storage.googleapis.com/w2/netanyahu_israel.jpg", seats: 22, is_winner: false },
      { name: "Naftali Bennett", party: "Beyachad (Together)", role: "Former Prime Minister", photo: "https://manus.storage.googleapis.com/w2/bennett_israel.jpg", seats: 21, is_winner: false },
      { name: "Gadi Eisenkot", party: "Yashar", role: "Ex-IDF Chief of Staff", seats: 21, is_winner: false },
      { name: "Yair Lapid", party: "Beyachad (Together)", role: "Former Prime Minister", seats: 0, note: "Merged into Together", is_winner: false }
    ])
  ]
);
console.log("✓ Israel updated (polling + sources + candidates)");

// Update Sweden (ID 14) — Enhanced polling data and sources
await conn.execute(
  `UPDATE world_elections SET 
   polling_data = ?,
   sources = ?,
   candidates = ?,
   notes = 'Riksdag election September 13, 2026. Left bloc (Social Democrats + allies) has significant lead. Andersson favored to become PM again. Immigration, defense spending, and Saab state ownership are key issues.'
   WHERE id = 14`,
  [
    JSON.stringify({
      polls: [
        { source: "Novus/SVT", date: "2026-06-27", socialDemocrats: 32.5, swedenDemocrats: 19.2, moderates: 19.0, centerParty: 6, leftParty: 8, liberals: 4, greens: 5, christianDemocrats: 4 },
        { source: "elections.stats", date: "2026-06-27", sSeats: 118, sdSeats: 69, mSeats: 68, note: "Left bloc majority" }
      ],
      leader: "Social Democrats (Andersson)",
      margin: 13,
      trend: "Left bloc has commanding lead",
      lastUpdated: "2026-06-27"
    }),
    JSON.stringify([
      "https://val.se/english/future-elections/2026-elections---the-riksdag-and-regional-and-municipal-councils",
      "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Swedish_general_election",
      "https://breakingdefense.com/2026/06/swedish-opposition-party-ahead-in-polls-could-push-for-state-ownership-in-saab/",
      "https://www.thelocal.se/20260612/which-issues-look-set-to-decide-swedens-election"
    ]),
    JSON.stringify([
      { name: "Magdalena Andersson", party: "Social Democrats", role: "Opposition Leader, Former PM", photo: "https://manus.storage.googleapis.com/w2/andersson_sweden.jpg", pct: 32.5, seats: 118, is_winner: false },
      { name: "Ulf Kristersson", party: "Moderate Party", role: "Current Prime Minister", photo: "https://manus.storage.googleapis.com/w2/kristersson_sweden.jpg", pct: 19.0, seats: 68, is_winner: false },
      { name: "Jimmie Åkesson", party: "Sweden Democrats", role: "Party Leader", pct: 19.2, seats: 69, is_winner: false }
    ])
  ]
);
console.log("✓ Sweden updated (polling + sources + candidates)");

// Update New Zealand (ID 25) — Enhanced polling data and sources
await conn.execute(
  `UPDATE world_elections SET 
   polling_data = ?,
   sources = ?,
   candidates = ?,
   notes = 'General election November 7, 2026. Both major parties at 30-year low. Hipkins preferred PM but Labour dropped 5 points. Opportunity Party nearing 5% threshold. Coalition government clings to slim majority.'
   WHERE id = 25`,
  [
    JSON.stringify({
      polls: [
        { source: "1News Verian", date: "2026-06-23", labour: 32, national: 29, greens: 13, nzFirst: 11, act: 6, opportunity: 4.6, tePatiMaori: 2 },
        { source: "Taxpayers Union/Curia", date: "2026-06-12", note: "Coalition clings to majority" },
        { source: "Freshwater Strategy", date: "2026-06-15", preferredPM: { hipkins: 44, luxon: 21 } }
      ],
      leader: "Labour (Hipkins) — preferred PM",
      margin: 3,
      trend: "Both parties declining, minor parties rising",
      lastUpdated: "2026-06-23"
    }),
    JSON.stringify([
      "https://www.1news.co.nz/2026/06/23/poll-big-two-parties-at-30-year-low-opportunity-nears-5-threshold/",
      "https://www.rnz.co.nz/news/politics/598015/coalition-clings-to-majority-in-latest-taxpayers-union-poll",
      "https://thespinoff.co.nz/politics/06-07-2026/are-we-about-to-elect-our-least-popular-prime-minister-for-33-years",
      "https://www.nzherald.co.nz/nz/politics/"
    ]),
    JSON.stringify([
      { name: "Christopher Luxon", party: "National Party", role: "Current Prime Minister", pct: 29, is_winner: false },
      { name: "Chris Hipkins", party: "Labour Party", role: "Opposition Leader, Former PM", pct: 32, is_winner: false },
      { name: "Chlöe Swarbrick", party: "Green Party", role: "Co-leader", pct: 13, is_winner: false },
      { name: "Winston Peters", party: "NZ First", role: "Deputy PM", pct: 11, is_winner: false }
    ])
  ]
);
console.log("✓ New Zealand updated (polling + sources + candidates)");

// Update Zambia (ID 10) — Enhanced sources
await conn.execute(
  `UPDATE world_elections SET 
   sources = ?,
   notes = 'General election August 13, 2026. President Hichilema (UPND) seeking re-election among 14 contenders. Opposition suppression concerns. ISS Africa warns democratic success story \"beginning to fray.\" Economic pressure and rising opposition.'
   WHERE id = 10`,
  [JSON.stringify([
    "https://issafrica.org/iss-today/elections-2026-is-zambia-s-democratic-success-story-beginning-to-fray",
    "https://mg.co.za/thought-leader/2026-06-16-the-case-for-and-against-zambian-president-s-second-presidential-term/"
  ])]
);
console.log("✓ Zambia updated (sources + notes)");

// Update Bulgaria (ID 27) — Enhanced sources
await conn.execute(
  `UPDATE world_elections SET 
   sources = ?,
   notes = 'Presidential election by autumn 2026 (scheduled Nov 30). Incumbent Iliana Iotova (BSP) eligible for full term. GERB-SDS (Borissov) leads parliamentary polls. Change Continues (PP-DB) surprise winner in recent parliamentary elections.'
   WHERE id = 27`,
  [JSON.stringify([
    "https://en.wikipedia.org/wiki/2026_Bulgarian_presidential_election",
    "https://www.euractiv.com/news/change-continues-is-the-surprise-winner-of-bulgarian-elections/",
    "https://politpro.eu/en/bulgaria/opinion-polls/market-links-2026-06-21/parliamentary-election"
  ])]
);
console.log("✓ Bulgaria updated (sources + notes)");

await conn.end();
console.log("\n=== All updates complete ===");
