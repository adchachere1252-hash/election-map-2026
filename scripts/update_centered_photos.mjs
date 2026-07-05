import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load env from dotenv files that the dev server uses
if (existsSync('.env')) dotenv.config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const conn = await mysql.createConnection(dbUrl);

const updates = [
  // Senate races
  ["UPDATE senate_races SET candidate2_photo = ? WHERE state_code = ?", ['/manus-storage/smith_or_centered_abce182e.jpg', 'OR']],
  ["UPDATE senate_races SET candidate1_photo = ? WHERE state_code = ?", ['/manus-storage/reed_ri_centered_87aca88c.jpg', 'RI']],
  ["UPDATE senate_races SET candidate1_photo = ? WHERE state_code = ?", ['/manus-storage/andrews_sc_centered_e04db644.jpg', 'SC']],
  // Governor races
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/becerra_ca_centered_594f6d09.jpg', 'CA']],
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/weiser_co_centered_edc98df4.jpg', 'CO']],
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/healey_ma_centered_33ed8f7a.jpg', 'MA']],
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/pickens_id_centered_032c8c66.jpg', 'ID']],
  ["UPDATE governor_races SET rep_photo = ? WHERE state_code = ?", ['/manus-storage/little_id_centered_b00cf989.jpg', 'ID']],
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/walz_ne_centered_285276b8.jpg', 'NE']],
  ["UPDATE governor_races SET dem_photo = ? WHERE state_code = ?", ['/manus-storage/munson_ok_centered_abba4f38.jpg', 'OK']],
  ["UPDATE governor_races SET rep_photo = ? WHERE state_code = ?", ['/manus-storage/doeden_sd_centered_aa914fd5.jpg', 'SD']],
  ["UPDATE governor_races SET rep_photo = ? WHERE state_code = ?", ['/manus-storage/blakeman_ny_centered_91609d17.jpg', 'NY']],
];

let success = 0;
for (const [sql, params] of updates) {
  try {
    const [result] = await conn.execute(sql, params);
    console.log(`✓ ${params[1]} (${params[0].split('/').pop()}): ${result.affectedRows} row(s)`);
    success++;
  } catch (e) {
    console.error(`✗ ${params[1]}: ${e.message}`);
  }
}

console.log(`\nDone: ${success}/${updates.length} updates successful`);
await conn.end();
