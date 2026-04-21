import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Mark FL-20 as vacant following Cherfilus-McCormick's resignation on April 21, 2026
// She resigned ahead of a House Ethics Committee expulsion vote while under federal indictment
const [result] = await conn.execute(`
  UPDATE house_races SET
    is_vacancy = 1,
    incumbent = 'VACANT',
    incumbent_party = 'D',
    incumbent_retiring = 0,
    candidate1_name = 'TBD (Special Election)',
    candidate1_party = 'D',
    candidate2_name = 'TBD (Special Election)',
    candidate2_party = 'R',
    status = 'Scheduled',
    rating = 'Solid D',
    notes = 'Seat vacated April 21, 2026. Rep. Sheila Cherfilus-McCormick (D) resigned ahead of a House Ethics Committee expulsion vote while under federal indictment for allegedly stealing $5M in COVID-19 disaster funds. Governor must call a special election. FL-20 is a heavily Democratic district (Biden +40).',
    updated_at = NOW()
  WHERE state_code = 'FL' AND district = 20
`);

console.log('Updated FL-20:', result.affectedRows, 'row(s) affected');

// Verify
const [rows] = await conn.execute(
  'SELECT state_code, district, incumbent, is_vacancy, status, rating, notes FROM house_races WHERE state_code = ? AND district = ?',
  ['FL', '20']
);
console.log('FL-20 record:', JSON.stringify(rows[0], null, 2));

await conn.end();
