import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Update Brazil candidates with real photo URLs
const brazilCandidates = JSON.stringify([
  { name: "Luiz Inácio Lula da Silva", party: "PT (Workers' Party)", role: "Incumbent President", photo: "/manus-storage/lula_brazil_b96d5139.webp", pct: 35, is_winner: false },
  { name: "Flávio Bolsonaro", party: "PL (Liberal Party)", role: "Senator", photo: "/manus-storage/flavio_bolsonaro_brazil_9faade59.jpg", pct: 28, is_winner: false },
  { name: "Romeu Zema", party: "NOVO", role: "Governor of Minas Gerais", pct: 8, is_winner: false },
  { name: "Ronaldo Caiado", party: "PSD (Social Democratic Party)", role: "Ex-Governor of Goiás", pct: 6, is_winner: false }
]);
await conn.execute(`UPDATE world_elections SET candidates = ? WHERE id = 18`, [brazilCandidates]);
console.log("✓ Brazil photos updated");

// Update Israel candidates with real photo URLs
const israelCandidates = JSON.stringify([
  { name: "Benjamin Netanyahu", party: "Likud", role: "Current Prime Minister", photo: "/manus-storage/netanyahu_israel_c654e886.jpg", seats: 22, is_winner: false },
  { name: "Naftali Bennett", party: "Beyachad (Together)", role: "Former Prime Minister", photo: "/manus-storage/bennett_israel_0184b65f.jpg", seats: 21, is_winner: false },
  { name: "Gadi Eisenkot", party: "Yashar", role: "Ex-IDF Chief of Staff", photo: "/manus-storage/eisenkot_israel_00e8f133.jpg", seats: 21, is_winner: false },
  { name: "Yair Lapid", party: "Beyachad (Together)", role: "Former Prime Minister", seats: 0, note: "Merged into Together", is_winner: false }
]);
await conn.execute(`UPDATE world_elections SET candidates = ? WHERE id = 22`, [israelCandidates]);
console.log("✓ Israel photos updated");

// Update Sweden candidates with real photo URLs
const swedenCandidates = JSON.stringify([
  { name: "Magdalena Andersson", party: "Social Democrats", role: "Opposition Leader, Former PM", photo: "/manus-storage/andersson_sweden_92f15c51.jpg", pct: 32.5, seats: 118, is_winner: false },
  { name: "Ulf Kristersson", party: "Moderate Party", role: "Current Prime Minister", photo: "/manus-storage/kristersson_sweden_29e521a4.jpg", pct: 19.0, seats: 68, is_winner: false },
  { name: "Jimmie Åkesson", party: "Sweden Democrats", role: "Party Leader", pct: 19.2, seats: 69, is_winner: false }
]);
await conn.execute(`UPDATE world_elections SET candidates = ? WHERE id = 14`, [swedenCandidates]);
console.log("✓ Sweden photos updated");

// Update New Zealand candidates with real photo URLs
const nzCandidates = JSON.stringify([
  { name: "Christopher Luxon", party: "National Party", role: "Current Prime Minister", photo: "/manus-storage/luxon_nz_b215b818.jpg", pct: 29, is_winner: false },
  { name: "Chris Hipkins", party: "Labour Party", role: "Opposition Leader, Former PM", photo: "/manus-storage/hipkins_nz_a1d673e7.jpg", pct: 32, is_winner: false },
  { name: "Chlöe Swarbrick", party: "Green Party", role: "Co-leader", pct: 13, is_winner: false },
  { name: "Winston Peters", party: "NZ First", role: "Deputy PM", pct: 11, is_winner: false }
]);
await conn.execute(`UPDATE world_elections SET candidates = ? WHERE id = 25`, [nzCandidates]);
console.log("✓ New Zealand photos updated");

await conn.end();
console.log("\n=== All photo updates complete ===");
