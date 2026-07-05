// Script to query and update world_elections candidates JSON
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // First, get all completed elections
  const [rows] = await connection.execute(
    'SELECT id, country, country_code, election_type, election_name, election_date, winner, winner_party, candidates FROM world_elections WHERE status = ? ORDER BY election_date',
    ['Completed']
  );
  
  console.log(`Found ${rows.length} completed elections:`);
  for (const row of rows) {
    console.log(`  ID ${row.id}: ${row.country} - ${row.election_name} (${row.election_date}) | Winner: ${row.winner} | Candidates: ${row.candidates ? 'HAS DATA' : 'EMPTY'}`);
  }

  // Now update each election with candidate data
  // Photo paths use /manus-storage/ prefix for the proxy route
  const candidateData = {
    // Japan - House of Representatives (Feb 8, 2026) - LDP supermajority
    1: [
      { name: "Sanae Takaichi", party: "LDP", role: "Prime Minister", seats: 316, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/takaichi-japan-2026.jpg" },
      { name: "Yoshihiko Noda", party: "CDP", role: "Opposition Leader", seats: 98, pct: null, is_winner: false, photo: null }
    ],
    // Hungary - Parliamentary (Apr 12, 2026) - TISZA landslide
    2: [
      { name: "Péter Magyar", party: "TISZA", role: "Prime Minister-elect", seats: 141, pct: 56.2, is_winner: true, photo: "/manus-storage/world-candidates/magyar-hungary-2026.jpg" },
      { name: "Viktor Orbán", party: "Fidesz", role: "Outgoing PM", seats: 44, pct: 26.8, is_winner: false, photo: "/manus-storage/world-candidates/orban-hungary-2026.jpg" }
    ],
    // Nepal - House of Representatives (Mar 5, 2026) - RSP landslide
    3: [
      { name: "Balen Shah", party: "RSP", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/balen-shah-nepal-2026.jpg" }
    ],
    // Peru - Presidential Runoff (Jun 7, 2026) - razor-thin margin
    4: [
      { name: "Keiko Fujimori", party: "Fuerza Popular", role: "President-elect", seats: null, pct: 50.14, is_winner: true, photo: "/manus-storage/world-candidates/fujimori-peru-2026.jpg" },
      { name: "Roberto Sánchez", party: "Juntos por el Perú", role: "Candidate", seats: null, pct: 49.86, is_winner: false, photo: "/manus-storage/world-candidates/sanchez-peru-2026.jpg" }
    ],
    // Colombia - Presidential Runoff (Jun 21, 2026)
    5: [
      { name: "Abelardo de la Espriella", party: "Independent (Right)", role: "President-elect", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/espriella-colombia-2026.jpg" }
    ],
    // Thailand - House of Representatives (Feb 8, 2026)
    60001: [
      { name: "Anutin Charnvirakul", party: "Bhumjaithai", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/anutin-thailand-2026.jpg" }
    ],
    // South Korea - Local Elections (Jun 3, 2026)
    60002: [
      { name: "Lee Jae-myung", party: "Democratic Party", role: "President / DPK Leader", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/lee-jaemyung-korea-2026.jpg" }
    ],
    // Armenia - Parliamentary (Jun 7, 2026)
    60003: [
      { name: "Nikol Pashinyan", party: "Civil Contract", role: "Prime Minister", seats: null, pct: 49.81, is_winner: true, photo: "/manus-storage/world-candidates/pashinyan-armenia-2026.jpg" }
    ],
    // Ethiopia - General Election (Jun 1, 2026)
    60004: [
      { name: "Abiy Ahmed", party: "Prosperity Party", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/abiy-ahmed-ethiopia-2026.jpg" }
    ],
    // Bangladesh - General Election (Feb 12, 2026)
    30001: [
      { name: "Tarique Rahman", party: "BNP", role: "Prime Minister-designate", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/tarique-rahman-bangladesh-2026.jpg" }
    ],
  };

  // Update each election
  for (const [id, candidates] of Object.entries(candidateData)) {
    const json = JSON.stringify(candidates);
    await connection.execute(
      'UPDATE world_elections SET candidates = ? WHERE id = ?',
      [json, parseInt(id)]
    );
    console.log(`  Updated ID ${id} with ${candidates.length} candidate(s)`);
  }

  console.log('\nDone! All candidate data updated.');
  await connection.end();
}

main().catch(console.error);
