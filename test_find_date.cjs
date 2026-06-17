const ELECTION_DATES = [
  '2026-03-03','2026-05-06','2026-05-12','2026-05-19','2026-06-02','2026-06-09','2026-06-16','2026-06-23','2026-06-27','2026-06-30','2026-07-07','2026-08-04','2026-08-11','2026-08-18','2026-08-25','2026-09-08','2026-09-15','2026-11-03'
].sort((a, b) => b.localeCompare(a));

console.log('Sorted dates (first 8):', ELECTION_DATES.slice(0, 8));
console.log('');

const AP_BASE = 'https://interactives.apelections.org/election-results/data-live';
const headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Referer': 'https://apnews.com/',
  'Origin': 'https://apnews.com',
};

async function test() {
  for (const date of ELECTION_DATES) {
    const url = `${AP_BASE}/${date}/results/national/GA/metadata.json`;
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (resp.status !== 200) {
        console.log(date, '-> HTTP', resp.status);
        continue;
      }
      const text = await resp.text();
      if (text.length === 0) {
        console.log(date, '-> empty');
        continue;
      }
      const json = JSON.parse(text);
      const keys = Object.keys(json).length;
      console.log(date, '-> OK,', keys, 'races');
      if (keys > 0) {
        console.log('  ** WOULD RETURN THIS DATE:', date, '**');
        break;
      }
    } catch (e) {
      console.log(date, '-> ERROR:', e.message);
    }
  }
}
test();
