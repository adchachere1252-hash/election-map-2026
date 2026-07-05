import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql.createConnection(dbUrl);
  
  // Get all senate race photos
  const [senateRows] = await conn.execute(
    'SELECT state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM senate_races WHERE candidate1_photo IS NOT NULL OR candidate2_photo IS NOT NULL'
  );
  
  // Get all governor race photos
  const [govRows] = await conn.execute(
    'SELECT state_code, dem_candidate, dem_photo, rep_candidate, rep_photo FROM governor_races WHERE dem_photo IS NOT NULL OR rep_photo IS NOT NULL'
  );
  
  console.log('=== SENATE CANDIDATE PHOTOS ===');
  for (const row of senateRows) {
    if (row.candidate1_photo) {
      console.log(`${row.state_code} | ${row.candidate1_name} | ${row.candidate1_photo}`);
    }
    if (row.candidate2_photo) {
      console.log(`${row.state_code} | ${row.candidate2_name} | ${row.candidate2_photo}`);
    }
  }
  
  console.log('\n=== GOVERNOR CANDIDATE PHOTOS ===');
  for (const row of govRows) {
    if (row.dem_photo) {
      console.log(`${row.state_code} | ${row.dem_candidate} | ${row.dem_photo}`);
    }
    if (row.rep_photo) {
      console.log(`${row.state_code} | ${row.rep_candidate} | ${row.rep_photo}`);
    }
  }
  
  await conn.end();
}
main().catch(console.error);
