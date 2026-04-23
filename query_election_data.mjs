import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';

async function query() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('No DATABASE_URL'); process.exit(1); }
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

  // All Senate races (for context)
  const [senateAll] = await conn.execute(`
    SELECT state_code, state_name, is_special, called_winner, called_party, previous_party, rating, status, pct_reporting
    FROM senate_races ORDER BY state_name
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

  // House totals
  const [houseTotals] = await conn.execute(`
    SELECT 
      SUM(CASE WHEN called_winner IS NOT NULL THEN 1 ELSE 0 END) as called,
      SUM(CASE WHEN called_winner IS NULL THEN 1 ELSE 0 END) as uncalled,
      SUM(CASE WHEN called_party = 'D' THEN 1 ELSE 0 END) as d_wins,
      SUM(CASE WHEN called_party = 'R' THEN 1 ELSE 0 END) as r_wins
    FROM house_races
  `);

  // House flips
  const [houseFlips] = await conn.execute(`
    SELECT state_code, state_name, district, district_label, called_winner, called_party, previous_party, pct_reporting,
           candidate1_name, candidate1_party, candidate1_votes, candidate1_vote_pct,
           candidate2_name, candidate2_party, candidate2_votes, candidate2_vote_pct
    FROM house_races 
    WHERE called_winner IS NOT NULL AND called_party != previous_party
    ORDER BY called_at
  `);

  // Redistricting states
  const [redistricting] = await conn.execute(`
    SELECT state_code, state_name, enacted, reason, status, method,
           delegation_before, projected_impact, litigation_notes, updated_at
    FROM redistricting_states ORDER BY state_name
  `);

  // Referendums
  const [referendums] = await conn.execute(`
    SELECT state_code, state_name, name, description, yes_label, no_label,
           yes_votes, no_votes, pct_reporting, election_date, status, called_result, notes, updated_at
    FROM referendums ORDER BY (called_result IS NULL), state_name
  `);

  // Called Governor races
  const [governors] = await conn.execute(`
    SELECT state_code, state_name, incumbent_name, incumbent_party, is_open, is_term_limited,
           dem_candidate, rep_candidate, other_candidate_name, other_candidate_party,
           dem_votes, rep_votes, other_votes, other_vote_pct, pct_reporting,
           called_winner, called_party, called_at, previous_party, rating, notes
    FROM governor_races WHERE called_winner IS NOT NULL ORDER BY called_at
  `);

  // All governor races
  const [allGovernors] = await conn.execute(`
    SELECT state_code, state_name, called_winner, called_party, previous_party, rating, pct_reporting, status
    FROM governor_races ORDER BY state_name
  `);

  // Governor flips
  const [govFlips] = await conn.execute(`
    SELECT state_code, state_name, called_winner, called_party, previous_party,
           dem_candidate, rep_candidate, dem_votes, rep_votes, pct_reporting
    FROM governor_races
    WHERE called_winner IS NOT NULL AND called_party != previous_party
    ORDER BY called_at
  `);

  await conn.end();

  const data = {
    senate_called: senate,
    senate_all: senateAll,
    house_called: house,
    house_totals: houseTotals[0],
    house_flips: houseFlips,
    redistricting,
    referendums,
    governors_called: governors,
    all_governors: allGovernors,
    governor_flips: govFlips,
  };

  fs.writeFileSync('/home/ubuntu/election_data.json', JSON.stringify(data, null, 2));
  console.log('Done!');
  console.log('Senate called:', senate.length, '/ 35');
  console.log('House called:', house.length, '/ 435');
  console.log('House flips:', houseFlips.length);
  console.log('Redistricting states:', redistricting.length);
  console.log('Referendums:', referendums.length);
  console.log('Governors called:', governors.length);
  console.log('Governor flips:', govFlips.length);
  console.log('House totals:', houseTotals[0]);
}

query().catch(console.error);
