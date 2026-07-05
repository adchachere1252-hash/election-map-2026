// Fix world_elections candidates JSON with correct ID mapping
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Based on the query output, the correct mapping is:
  // ID 60003: Japan - House of Representatives Election (2026-02-08) | Winner: Liberal Democratic Party (LDP)
  // ID 90001: Thailand - Constitutional Rewrite Referendum (2026-02-08) | Winner: YES (no candidates needed)
  // ID 60004: Thailand - House of Representatives Election (2026-02-08) | Winner: Bhumjaithai Party
  // ID 90002: Bangladesh - July National Charter Referendum (2026-02-12) | Winner: YES (no candidates needed)
  // ID 1: Bangladesh - General Election (2026-02-12) | Winner: Bangladesh Nationalist Party
  // ID 30001: Nepal - House of Representatives Election (2026-03-05) | Winner: Balen Shah
  // ID 2: Hungary - Parliamentary Elections (2026-04-12) | Winner: Péter Magyar
  // ID 60001: India - State Assembly Elections (2026-04-23) | Winner: BJP (skip for now - no photo)
  // ID 4: Ethiopia - General Election (2026-06-01) | Winner: Abiy Ahmed
  // ID 60002: South Korea - Nationwide Local Elections (2026-06-03) | Winner: Democratic Party of Korea
  // ID 30002: Peru - Presidential Election (Runoff) (2026-06-07) | Winner: Keiko Fujimori
  // ID 5: Armenia - Parliamentary Election (2026-06-07) | Winner: Nikol Pashinyan
  // ID 90004: Switzerland - Population Cap Initiative (2026-06-14) | Winner: NO (no candidates needed)
  // ID 3: Colombia - Presidential Election (Runoff) (2026-06-21) | Winner: Abelardo de la Espriella

  const candidateData = {
    // Japan - House of Representatives (Feb 8, 2026) - LDP supermajority
    60003: [
      { name: "Sanae Takaichi", party: "LDP", role: "Prime Minister", seats: 316, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/takaichi-japan-2026.jpg" },
      { name: "Yoshihiko Noda", party: "CDP", role: "Opposition Leader", seats: 98, pct: null, is_winner: false, photo: null }
    ],
    // Thailand - House of Representatives (Feb 8, 2026)
    60004: [
      { name: "Anutin Charnvirakul", party: "Bhumjaithai", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/anutin-thailand-2026.jpg" }
    ],
    // Bangladesh - General Election (Feb 12, 2026)
    1: [
      { name: "Tarique Rahman", party: "BNP", role: "Prime Minister-designate", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/tarique-rahman-bangladesh-2026.jpg" }
    ],
    // Nepal - House of Representatives (Mar 5, 2026) - RSP landslide
    30001: [
      { name: "Balen Shah", party: "RSP", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/balen-shah-nepal-2026.jpg" }
    ],
    // Hungary - Parliamentary (Apr 12, 2026) - TISZA landslide
    2: [
      { name: "Péter Magyar", party: "TISZA", role: "Prime Minister-elect", seats: 141, pct: 56.2, is_winner: true, photo: "/manus-storage/world-candidates/magyar-hungary-2026.jpg" },
      { name: "Viktor Orbán", party: "Fidesz", role: "Outgoing PM", seats: 44, pct: 26.8, is_winner: false, photo: "/manus-storage/world-candidates/orban-hungary-2026.jpg" }
    ],
    // Ethiopia - General Election (Jun 1, 2026)
    4: [
      { name: "Abiy Ahmed", party: "Prosperity Party", role: "Prime Minister", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/abiy-ahmed-ethiopia-2026.jpg" }
    ],
    // South Korea - Local Elections (Jun 3, 2026)
    60002: [
      { name: "Lee Jae-myung", party: "Democratic Party", role: "President / DPK Leader", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/lee-jaemyung-korea-2026.jpg" }
    ],
    // Peru - Presidential Runoff (Jun 7, 2026) - razor-thin margin
    30002: [
      { name: "Keiko Fujimori", party: "Fuerza Popular", role: "President-elect", seats: null, pct: 50.14, is_winner: true, photo: "/manus-storage/world-candidates/fujimori-peru-2026.jpg" },
      { name: "Roberto Sánchez", party: "Juntos por el Perú", role: "Candidate", seats: null, pct: 49.86, is_winner: false, photo: "/manus-storage/world-candidates/sanchez-peru-2026.jpg" }
    ],
    // Armenia - Parliamentary (Jun 7, 2026)
    5: [
      { name: "Nikol Pashinyan", party: "Civil Contract", role: "Prime Minister", seats: null, pct: 49.81, is_winner: true, photo: "/manus-storage/world-candidates/pashinyan-armenia-2026.jpg" }
    ],
    // Colombia - Presidential Runoff (Jun 21, 2026)
    3: [
      { name: "Abelardo de la Espriella", party: "Independent (Right)", role: "President-elect", seats: null, pct: null, is_winner: true, photo: "/manus-storage/world-candidates/espriella-colombia-2026.jpg" }
    ],
  };

  // Update each election
  for (const [id, candidates] of Object.entries(candidateData)) {
    const json = JSON.stringify(candidates);
    const [result] = await connection.execute(
      'UPDATE world_elections SET candidates = ? WHERE id = ?',
      [json, parseInt(id)]
    );
    console.log(`  Updated ID ${id} (${result.affectedRows} row affected) with ${candidates.length} candidate(s)`);
  }

  // Verify the updates
  console.log('\n=== VERIFICATION ===');
  const [rows] = await connection.execute(
    'SELECT id, country, election_name, candidates FROM world_elections WHERE status = ? AND candidates IS NOT NULL ORDER BY election_date',
    ['Completed']
  );
  for (const row of rows) {
    if (row.candidates) {
      const parsed = JSON.parse(row.candidates);
      const names = parsed.map(c => `${c.name} (${c.party}${c.is_winner ? ' ✓' : ''})`).join(' vs ');
      console.log(`  ID ${row.id}: ${row.country} - ${names}`);
    }
  }

  console.log('\nDone!');
  await connection.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
