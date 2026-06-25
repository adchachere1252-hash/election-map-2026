const { createConnection } = require('mysql2/promise');
const { writeFileSync } = require('fs');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) { console.error('Bad URL'); process.exit(1); }
  const [, user, password, host, port, database] = m;
  const conn = await createConnection({ host, port: Number(port), user, password, database, ssl: { rejectUnauthorized: false } });
  const photos = [];

  const [senateRows] = await conn.query('SELECT id, state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM senate_races');
  for (const r of senateRows) {
    if (r.candidate1_photo) photos.push({ table: 'senate', id: r.id, state: r.state_code, candidate: r.candidate1_name, field: 'candidate1_photo', url: r.candidate1_photo });
    if (r.candidate2_photo) photos.push({ table: 'senate', id: r.id, state: r.state_code, candidate: r.candidate2_name, field: 'candidate2_photo', url: r.candidate2_photo });
  }
  console.log('Senate:', photos.filter(p => p.table === 'senate').length);

  const [houseRows] = await conn.query('SELECT id, state_code, district, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM house_races');
  for (const r of houseRows) {
    if (r.candidate1_photo) photos.push({ table: 'house', id: r.id, state: r.state_code, district: r.district, candidate: r.candidate1_name, field: 'candidate1_photo', url: r.candidate1_photo });
    if (r.candidate2_photo) photos.push({ table: 'house', id: r.id, state: r.state_code, district: r.district, candidate: r.candidate2_name, field: 'candidate2_photo', url: r.candidate2_photo });
  }
  console.log('House:', photos.filter(p => p.table === 'house').length);

  const [govRows] = await conn.query('SELECT id, state_code, dem_candidate, dem_photo, rep_candidate, rep_photo FROM governor_races');
  for (const r of govRows) {
    if (r.dem_photo) photos.push({ table: 'governor', id: r.id, state: r.state_code, candidate: r.dem_candidate, field: 'dem_photo', url: r.dem_photo });
    if (r.rep_photo) photos.push({ table: 'governor', id: r.id, state: r.state_code, candidate: r.rep_candidate, field: 'rep_photo', url: r.rep_photo });
  }
  console.log('Governor:', photos.filter(p => p.table === 'governor').length);

  const [worldRows] = await conn.query('SELECT id, country, candidates FROM world_elections WHERE candidates IS NOT NULL');
  for (const r of worldRows) {
    try {
      const cands = JSON.parse(r.candidates);
      if (Array.isArray(cands)) {
        for (const c of cands) {
          if (c && c.photo) photos.push({ table: 'world', id: r.id, country: r.country, candidate: c.name || 'Unknown', field: 'candidates.photo', url: c.photo });
        }
      }
    } catch (e) {}
  }
  console.log('World:', photos.filter(p => p.table === 'world').length);
  console.log('TOTAL:', photos.length);

  writeFileSync('/tmp/all_photo_urls.json', JSON.stringify(photos, null, 2));
  writeFileSync('/tmp/photo_urls_only.txt', photos.map(p => p.url).join('\n'));
  console.log('Saved to /tmp/all_photo_urls.json');
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
