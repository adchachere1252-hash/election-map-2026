/**
 * Batch Re-Crop Script
 * 
 * Reads photo-audit-results.json and processes all photos that need re-cropping
 * through sharp's attention-based smart crop, then re-uploads to S3 and updates
 * the database with new URLs.
 * 
 * Usage: node scripts/batch-recrop.mjs
 */

import { createConnection } from 'mysql2/promise';
import sharp from 'sharp';

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://3000-i1c1h8n8frq6i9rd4jg8n-76ec2db5.us2.manus.computer';

if (!DATABASE_URL || !FORGE_API_URL || !FORGE_API_KEY) {
  console.error('Missing required env vars: DATABASE_URL, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
};

// Storage upload helper (mirrors server/storage.ts)
async function storagePut(relKey, data, contentType = 'image/jpeg') {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '') + '/';
  const uploadUrl = new URL('v1/storage/upload', baseUrl);
  uploadUrl.searchParams.set('path', relKey.replace(/^\/+/, ''));
  
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append('file', blob, relKey.split('/').pop());
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form
  });
  
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${msg}`);
  }
  return (await response.json()).url;
}

// Smart crop using sharp attention strategy
async function smartCrop(imageBuffer, size = 400) {
  return sharp(imageBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: sharp.strategy.attention
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

// Fetch image from URL or /manus-storage/ path
async function fetchImage(photoUrl) {
  const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${SITE_URL}${photoUrl}`;
  const response = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const fs = await import('fs');
  const auditResults = JSON.parse(fs.readFileSync('photo-audit-results.json', 'utf-8'));
  const needsRecrop = auditResults.needsRecrop;
  
  console.log(`\nBatch Re-Crop: ${needsRecrop.length} photos to process\n`);
  
  const conn = await createConnection(dbConfig);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const failures = [];
  
  // Process in batches of 5 to avoid overwhelming
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < needsRecrop.length; i += BATCH_SIZE) {
    const batch = needsRecrop.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(batch.map(async (item) => {
      const { label, url: photoUrl } = item;
      
      try {
        // 1. Fetch the original image
        const imageBuffer = await fetchImage(photoUrl);
        
        // 2. Smart crop to 400x400
        const croppedBuffer = await smartCrop(imageBuffer);
        
        // 3. Generate new filename with "recentered_" prefix
        const origFilename = photoUrl.split('/').pop().replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const newKey = `recentered_${origFilename}_${randomSuffix}.jpg`;
        
        // 4. Upload to S3
        const newUrl = await storagePut(newKey, croppedBuffer, 'image/jpeg');
        
        // 5. Update database
        // Parse label to determine table and column
        const newPath = `/manus-storage/${newKey}`;
        await updateDatabase(conn, label, photoUrl, newPath);
        
        return { label, oldUrl: photoUrl, newUrl: newPath, status: 'ok' };
      } catch (err) {
        return { label, oldUrl: photoUrl, status: 'error', reason: err.message };
      }
    }));
    
    for (const result of results) {
      processed++;
      if (result.status === 'fulfilled' && result.value.status === 'ok') {
        succeeded++;
      } else {
        failed++;
        const val = result.status === 'fulfilled' ? result.value : { label: 'unknown', reason: result.reason?.message };
        failures.push(val);
      }
    }
    
    process.stdout.write(`  Processed ${processed}/${needsRecrop.length} (${succeeded} ok, ${failed} failed)\r`);
  }
  
  console.log(`\n\n========== BATCH RE-CROP RESULTS ==========`);
  console.log(`✓ Successfully re-cropped: ${succeeded}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total: ${processed}`);
  
  if (failures.length > 0) {
    console.log(`\n--- FAILURES ---`);
    for (const f of failures.slice(0, 20)) {
      console.log(`  ${f.label}: ${f.reason}`);
    }
    if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
  }
  
  await conn.end();
}

async function updateDatabase(conn, label, oldUrl, newPath) {
  // Parse label: "House TX-5 Lance Gooden" or "Senate IL Juliana Stratton" or "Governor CA Xavier Becerra"
  const parts = label.split(' ');
  const chamber = parts[0]; // House, Senate, or Governor
  
  if (chamber === 'House') {
    // "House TX-5 Lance Gooden"
    const stateDistrict = parts[1]; // TX-5
    const [stateCode, districtLabel] = stateDistrict.split('-');
    
    // Determine which column has this photo
    const [rows] = await conn.execute(
      'SELECT id, candidate1_photo, candidate2_photo FROM house_races WHERE state_code = ? AND district_label = ?',
      [stateCode, districtLabel]
    );
    if (rows.length === 0) return;
    const row = rows[0];
    
    if (row.candidate1_photo === oldUrl) {
      await conn.execute('UPDATE house_races SET candidate1_photo = ? WHERE id = ?', [newPath, row.id]);
    } else if (row.candidate2_photo === oldUrl) {
      await conn.execute('UPDATE house_races SET candidate2_photo = ? WHERE id = ?', [newPath, row.id]);
    }
  } else if (chamber === 'Senate') {
    // "Senate IL Juliana Stratton"
    const stateCode = parts[1];
    
    const [rows] = await conn.execute(
      'SELECT id, candidate1_photo, candidate2_photo FROM senate_races WHERE state_code = ?',
      [stateCode]
    );
    if (rows.length === 0) return;
    
    // May have multiple senate races per state (regular + special)
    for (const row of rows) {
      if (row.candidate1_photo === oldUrl) {
        await conn.execute('UPDATE senate_races SET candidate1_photo = ? WHERE id = ?', [newPath, row.id]);
        return;
      } else if (row.candidate2_photo === oldUrl) {
        await conn.execute('UPDATE senate_races SET candidate2_photo = ? WHERE id = ?', [newPath, row.id]);
        return;
      }
    }
  } else if (chamber === 'Governor') {
    // "Governor CA Xavier Becerra"
    const stateCode = parts[1];
    
    const [rows] = await conn.execute(
      'SELECT id, dem_photo, rep_photo FROM governor_races WHERE state_code = ?',
      [stateCode]
    );
    if (rows.length === 0) return;
    const row = rows[0];
    
    if (row.dem_photo === oldUrl) {
      await conn.execute('UPDATE governor_races SET dem_photo = ? WHERE id = ?', [newPath, row.id]);
    } else if (row.rep_photo === oldUrl) {
      await conn.execute('UPDATE governor_races SET rep_photo = ? WHERE id = ?', [newPath, row.id]);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
