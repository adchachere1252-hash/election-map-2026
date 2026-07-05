import mysql from 'mysql2/promise';
const dbUrl = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql.createConnection(dbUrl);
  const [rows] = await conn.execute(
    'SELECT state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM senate_races WHERE state_code = ?',
    ['TX']
  );
  console.log('Texas Senate:');
  for (const row of rows) {
    console.log(`  C1: ${row.candidate1_name} → ${row.candidate1_photo}`);
    console.log(`  C2: ${row.candidate2_name} → ${row.candidate2_photo}`);
  }
  await conn.end();
}
main().catch(console.error);
