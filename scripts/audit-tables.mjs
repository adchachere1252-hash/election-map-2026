import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all tables
  const [tables] = await conn.query("SHOW TABLES");
  console.log('ALL TABLES:');
  tables.forEach(t => console.log(' ', Object.values(t)[0]));
  
  // Count rows in each table
  console.log('\nROW COUNTS:');
  for (const t of tables) {
    const tname = Object.values(t)[0];
    const [cnt] = await conn.query('SELECT COUNT(*) as c FROM `' + tname + '`');
    console.log(' ', tname + ':', cnt[0].c);
  }
  
  // Check world elections polling data format
  const [worldPolling] = await conn.query("SELECT country, LEFT(polling_data, 50) as poll_preview FROM world_elections WHERE polling_data IS NOT NULL LIMIT 5");
  console.log('\nWorld polling samples:');
  worldPolling.forEach(r => console.log(' ', r.country, ':', r.poll_preview));
  
  // Check Palestine and Guinea-Bissau candidates
  const [palCand] = await conn.query("SELECT country, LEFT(candidates, 100) as cand_preview FROM world_elections WHERE country IN ('Palestine', 'Guinea-Bissau')");
  console.log('\nProblem candidates:');
  palCand.forEach(r => console.log(' ', r.country, ':', r.cand_preview));
  
  await conn.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
