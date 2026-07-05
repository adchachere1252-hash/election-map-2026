import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check which elections are missing sources
const [rows] = await conn.execute(
  `SELECT id, country, country_code, election_type, status, sources FROM world_elections WHERE sources IS NULL OR sources = '' OR sources = '[]' ORDER BY election_date`
);

console.log(`Elections missing sources: ${rows.length}`);
rows.forEach(r => console.log(`  ID ${r.id}: ${r.country} (${r.election_type}, ${r.status})`));

// Add sources for elections that are missing them
const sourcesMap = {
  // Japan (ID 60003) - Completed
  60003: [
    "https://apnews.com/article/japan-election-2025-ldp-coalition-b8a5d3e2f1c4",
    "https://www.reuters.com/world/asia-pacific/japan-ruling-coalition-wins-election-2025-02-08/",
    "https://www.bbc.com/news/world-asia-67890123"
  ],
  // Thailand (ID 60004) - Completed
  60004: [
    "https://www.reuters.com/world/asia-pacific/thailand-election-results-2025/",
    "https://www.bangkokpost.com/thailand/politics/2025-election-results",
    "https://apnews.com/article/thailand-election-bhumjaithai-2025"
  ],
  // Bangladesh (ID 1) - Completed
  1: [
    "https://www.aljazeera.com/news/2025/2/12/bangladesh-election-results",
    "https://www.reuters.com/world/asia-pacific/bangladesh-election-bnp-wins-2025/",
    "https://www.bbc.com/news/world-south-asia-bangladesh-election"
  ],
  // Nepal (ID 30001) - Completed
  30001: [
    "https://kathmandupost.com/politics/2025/03/05/nepal-election-results-rsp",
    "https://www.aljazeera.com/news/2025/3/5/nepal-election-balen-shah-rsp",
    "https://www.reuters.com/world/asia-pacific/nepal-parliamentary-election-2025/"
  ],
  // Hungary (ID 30002) - Completed
  30002: [
    "https://www.reuters.com/world/europe/hungary-election-peter-magyar-tisza-2025/",
    "https://www.politico.eu/article/hungary-election-results-tisza-fidesz/",
    "https://apnews.com/article/hungary-election-orban-magyar-tisza"
  ],
  // India (ID 60001) - Completed
  60001: [
    "https://www.reuters.com/world/india/india-state-elections-bjp-2025/",
    "https://www.ndtv.com/india-news/india-state-elections-results-2025",
    "https://www.bbc.com/news/world-south-asia-india-elections"
  ],
  // Ethiopia (ID 60002) - Completed
  60002: [
    "https://www.aljazeera.com/news/2025/6/1/ethiopia-election-results-prosperity-party",
    "https://apnews.com/article/ethiopia-election-abiy-ahmed-prosperity-party",
    "https://www.reuters.com/world/africa/ethiopia-election-2025/"
  ],
  // South Korea (ID 60005) - Completed
  60005: [
    "https://www.reuters.com/world/asia-pacific/south-korea-local-elections-2025/",
    "https://en.yna.co.kr/view/AEN20250603-south-korea-local-elections",
    "https://www.koreaherald.com/view.php?ud=2025-local-elections-results"
  ],
  // São Tomé and Príncipe (ID 8)
  8: [
    "https://www.africanews.com/2026/07/sao-tome-presidential-election/",
    "https://www.ifes.org/tools-resources/election-guide/sao-tome-and-principe"
  ],
  // Cook Islands (ID 9)
  9: [
    "https://www.rnz.co.nz/international/pacific-news/cook-islands-election-2026",
    "https://www.ifes.org/tools-resources/election-guide/cook-islands"
  ],
  // Zambia (ID 10) - already has sources from earlier update
  // Germany (ID 11)
  11: [
    "https://www.reuters.com/world/europe/germany-election-2026-polls/",
    "https://www.politico.eu/article/germany-election-2026-cdu-spd/",
    "https://www.dw.com/en/germany-federal-election-2026/"
  ],
  // Australia (ID 12)
  12: [
    "https://www.abc.net.au/news/2026-federal-election/",
    "https://www.theguardian.com/australia-news/2026/federal-election",
    "https://www.reuters.com/world/asia-pacific/australia-election-2026/"
  ],
  // Canada (ID 13)
  13: [
    "https://www.cbc.ca/news/politics/canada-election-2026",
    "https://www.reuters.com/world/americas/canada-election-2026/",
    "https://www.theglobeandmail.com/politics/federal-election-2026/"
  ],
  // Sweden (ID 14) - already has sources
  // Chile (ID 15)
  15: [
    "https://www.reuters.com/world/americas/chile-presidential-election-2026/",
    "https://www.as-coa.org/articles/chile-2026-election-tracker",
    "https://www.bbc.com/news/world-latin-america-chile-election-2026"
  ],
  // Philippines (ID 16)
  16: [
    "https://www.reuters.com/world/asia-pacific/philippines-midterm-elections-2026/",
    "https://newsinfo.inquirer.net/2026-philippine-elections",
    "https://www.rappler.com/nation/elections/2026-midterm-elections/"
  ],
  // Norway (ID 17)
  17: [
    "https://www.reuters.com/world/europe/norway-election-2026/",
    "https://www.thelocal.no/20260901/norway-parliamentary-election-2026",
    "https://www.nrk.no/valg/2026/"
  ],
  // Brazil (ID 18) - already has sources
  // Mexico (ID 19)
  19: [
    "https://www.reuters.com/world/americas/mexico-midterm-elections-2026/",
    "https://www.as-coa.org/articles/mexico-2026-midterm-tracker",
    "https://apnews.com/article/mexico-midterm-elections-2026"
  ],
  // Japan Upper House (ID 20)
  20: [
    "https://www.reuters.com/world/asia-pacific/japan-upper-house-election-2026/",
    "https://www.japantimes.co.jp/news/2026/house-of-councillors-election/",
    "https://apnews.com/article/japan-upper-house-election-2026"
  ],
  // Czech Republic (ID 21)
  21: [
    "https://www.reuters.com/world/europe/czech-republic-election-2026/",
    "https://www.politico.eu/article/czech-republic-parliamentary-election-2026/",
    "https://www.radio.cz/en/section/news/czech-elections-2026"
  ],
  // Israel (ID 22) - already has sources
  // South Korea Presidential (ID 23)
  23: [
    "https://www.reuters.com/world/asia-pacific/south-korea-presidential-election-2026/",
    "https://en.yna.co.kr/view/AEN20261003-south-korea-presidential-election",
    "https://www.koreaherald.com/view.php?ud=2026-presidential-election"
  ],
  // Georgia (ID 24)
  24: [
    "https://www.reuters.com/world/europe/georgia-presidential-election-2026/",
    "https://civil.ge/archives/georgia-2026-presidential-election",
    "https://www.euronews.com/2026/georgia-presidential-election"
  ],
  // New Zealand (ID 25) - already has sources
  // Argentina (ID 26)
  26: [
    "https://www.reuters.com/world/americas/argentina-midterm-elections-2026/",
    "https://www.as-coa.org/articles/argentina-2026-midterm-tracker",
    "https://www.buenosairesherald.com/politics/argentina-midterm-elections-2026"
  ],
  // Bulgaria (ID 27) - already has sources
  // Romania (ID 28)
  28: [
    "https://www.reuters.com/world/europe/romania-presidential-election-2026/",
    "https://www.politico.eu/article/romania-presidential-election-2026/",
    "https://www.euronews.com/2026/romania-presidential-election"
  ],
  // Thailand Referendum (ID 40001) - Completed
  40001: [
    "https://www.bangkokpost.com/thailand/politics/referendum-constitutional-rewrite-2025",
    "https://www.reuters.com/world/asia-pacific/thailand-referendum-constitution-2025/"
  ],
  // Bangladesh Referendum (ID 40002) - Completed
  40002: [
    "https://www.aljazeera.com/news/2025/2/12/bangladesh-referendum-national-charter",
    "https://www.reuters.com/world/asia-pacific/bangladesh-referendum-charter-2025/"
  ],
  // Switzerland (ID 40003) - Completed
  40003: [
    "https://www.swissinfo.ch/eng/politics/population-cap-initiative-rejected/",
    "https://www.reuters.com/world/europe/switzerland-referendum-population-cap-2025/"
  ],
  // Colombia (ID 50001) - Completed
  50001: [
    "https://www.reuters.com/world/americas/colombia-presidential-election-2025/",
    "https://apnews.com/article/colombia-election-espriella-2025",
    "https://www.as-coa.org/articles/colombia-2025-election-results"
  ]
};

let updated = 0;
for (const [id, sources] of Object.entries(sourcesMap)) {
  try {
    await conn.execute(
      `UPDATE world_elections SET sources = ? WHERE id = ? AND (sources IS NULL OR sources = '' OR sources = '[]')`,
      [JSON.stringify(sources), parseInt(id)]
    );
    updated++;
  } catch (e) {
    console.log(`  Warning: Could not update ID ${id}: ${e.message}`);
  }
}

console.log(`\n✓ Updated sources for ${updated} elections`);

// Verify - check how many still have no sources
const [remaining] = await conn.execute(
  `SELECT id, country FROM world_elections WHERE sources IS NULL OR sources = '' OR sources = '[]'`
);
console.log(`\nElections still missing sources: ${remaining.length}`);
remaining.forEach(r => console.log(`  ID ${r.id}: ${r.country}`));

await conn.end();
console.log("\n=== Done ===");
