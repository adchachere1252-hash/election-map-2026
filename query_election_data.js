require('dotenv').config({ path: '/home/ubuntu/election-map-2026/.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function query() {
  // Load DATABASE_URL from the project's environment
  const dbUrl = process.env.DATABASE_URL;
  const conn = await mysql.createConnection(dbUrl);

  // Called Senate races
  const [senate] = await conn.execute(`
    SELECT state_code, state_name, is_special, special_note, incumbent, incumbent_party,
           candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct,
           other_candidate_name, other_candidate_party, other_votes, other_vote_pct,
           called_winner, called_party, called_at, previous_party, rating, pct_reporting, notes
    FROM senate_races WHERE called_winner IS NOT NULL ORDER BY called_at
  `);

  // Called House races
  const [house] = await conn.execute(`
    SELECT state_code, state_name, district, district_label, incumbent, incumbent_party,
           candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct,
           other_candidate_name, other_candidate_party, other_votes, other_vote_pct,
           called_winner, called_party, called_at, previous_party, rating, pct_reporting
    FROM house_races WHERE called_winner IS NOT NULL ORDER BY called_at
  `);

  // All redistricting states with results
  const [redistricting] = await conn.execute(`
    SELECT state_code, state_name, current_seats_d, current_seats_r, current_seats_i,
           projected_seats_d, projected_seats_r, projected_seats_i,
           net_change_d, net_change_r, status, called_winner, called_at,
           candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct,
           notes, updated_at
    FROM redistricting_states ORDER BY called_at IS NULL, called_at
  `);

  // All referendums with results
  const [referendums] = await conn.execute(`
    SELECT state_code, state_name, title, description, yes_votes, no_votes,
           yes_pct, no_pct, called_result, called_at, pct_reporting, notes, updated_at
    FROM referendums ORDER BY called_at IS NULL, called_at
  `);

  // Called Governor races
  const [governors] = await conn.execute(`
    SELECT state_code, state_name, incumbent_name, incumbent_party,
           candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct,
           called_winner, called_party, called_at, previous_party, rating, pct_reporting, notes
    FROM governor_races WHERE called_winner IS NOT NULL ORDER BY called_at
  `);

  // All governor races (for context)
  const [allGovernors] = await conn.execute(`
    SELECT state_code, state_name, called_winner, called_party, previous_party, rating, pct_reporting
    FROM governor_races ORDER BY state_name
  `);

  // Senate composition
  const [senateAll] = await conn.execute(`
    SELECT state_code, state_name, called_winner, called_party, previous_party, rating, status, pct_reporting
    FROM senate_races ORDER BY state_name
  `);

  // House summary
  const [houseAll] = await conn.execute(`
    SELECT called_party, previous_party, COUNT(*) as cnt
    FROM house_races WHERE called_winner IS NOT NULL
    GROUP BY called_party, previous_party
  `);

  // House total called vs uncalled
  const [houseTotals] = await conn.execute(`
    SELECT 
      SUM(CASE WHEN called_winner IS NOT NULL THEN 1 ELSE 0 END) as called,
      SUM(CASE WHEN called_winner IS NULL THEN 1 ELSE 0 END) as uncalled,
      SUM(CASE WHEN called_party = 'D' THEN 1 ELSE 0 END) as d_wins,
      SUM(CASE WHEN called_party = 'R' THEN 1 ELSE 0 END) as r_wins
    FROM house_races
  `);

  await conn.end();

  const data = {
    senate_called: senate,
    house_called: house,
    redistricting: redistricting,
    referendums: referendums,
    governors_called: governors,
    all_governors: allGovernors,
    senate_all: senateAll,
    house_totals: houseTotals[0],
    house_party_summary: houseAll,
  };

  fs.writeFileSync('/home/ubuntu/election_data.json', JSON.stringify(data, null, 2));
  console.log('Data written to /home/ubuntu/election_data.json');
  console.log('Senate called:', senate.length);
  console.log('House called:', house.length);
  console.log('Redistricting states:', redistricting.length);
  console.log('Referendums:', referendums.length);
  console.log('Governors called:', governors.length);
}

query().catch(console.error);
