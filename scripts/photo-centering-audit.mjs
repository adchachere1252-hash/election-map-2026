/**
 * Photo Centering Audit Script
 * 
 * Checks all candidate photos across House, Senate, and Governor races
 * to identify any that are not properly face-centered (non-square, too small,
 * or poorly framed).
 * 
 * Usage: node scripts/photo-centering-audit.mjs
 */

import { createConnection } from 'mysql2/promise';
import sharp from 'sharp';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
};

const SITE_URL = process.env.SITE_URL || 'https://3000-i1c1h8n8frq6i9rd4jg8n-76ec2db5.us2.manus.computer';

async function checkPhoto(photoUrl, label) {
  try {
    let fullUrl;
    if (photoUrl.startsWith('http')) {
      fullUrl = photoUrl;
    } else if (photoUrl.startsWith('/manus-storage/') || photoUrl.startsWith('/')) {
      fullUrl = `${SITE_URL}${photoUrl}`;
    } else {
      return { label, url: photoUrl, status: 'skip', reason: 'unknown path format' };
    }

    const response = await fetch(fullUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return { label, url: photoUrl, status: 'error', reason: `HTTP ${response.status}` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const { width, height, format } = metadata;

    if (!width || !height) {
      return { label, url: photoUrl, status: 'error', reason: 'Cannot determine dimensions' };
    }

    const aspectRatio = width / height;
    const issues = [];

    // Check if not square (within 10% tolerance)
    if (aspectRatio < 0.9 || aspectRatio > 1.1) {
      issues.push(`non-square (${width}x${height}, ratio=${aspectRatio.toFixed(2)})`);
    }

    // Check if too small
    if (width < 200 || height < 200) {
      issues.push(`too-small (${width}x${height})`);
    }

    // Check if very large (might not be cropped at all)
    if (width > 800 && height > 800 && aspectRatio < 0.85 || aspectRatio > 1.15) {
      issues.push(`uncropped-large (${width}x${height})`);
    }

    if (issues.length > 0) {
      return { label, url: photoUrl, status: 'needs-recrop', reason: issues.join(', '), width, height };
    }

    return { label, url: photoUrl, status: 'ok', width, height };
  } catch (err) {
    return { label, url: photoUrl, status: 'error', reason: err.message?.substring(0, 80) };
  }
}

async function main() {
  const conn = await createConnection(dbConfig);
  console.log('Connected to database\n');

  // Collect all photos to check
  const photosToCheck = [];

  // House races
  const [houseRows] = await conn.execute(
    'SELECT state_code, district_label, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM house_races'
  );
  for (const row of houseRows) {
    const label = `House ${row.state_code}-${row.district_label}`;
    if (row.candidate1_photo) {
      photosToCheck.push({ url: row.candidate1_photo, label: `${label} ${row.candidate1_name || 'C1'}` });
    }
    if (row.candidate2_photo) {
      photosToCheck.push({ url: row.candidate2_photo, label: `${label} ${row.candidate2_name || 'C2'}` });
    }
  }

  // Senate races
  const [senateRows] = await conn.execute(
    'SELECT state_code, candidate1_name, candidate1_photo, candidate2_name, candidate2_photo FROM senate_races'
  );
  for (const row of senateRows) {
    const label = `Senate ${row.state_code}`;
    if (row.candidate1_photo) {
      photosToCheck.push({ url: row.candidate1_photo, label: `${label} ${row.candidate1_name || 'C1'}` });
    }
    if (row.candidate2_photo) {
      photosToCheck.push({ url: row.candidate2_photo, label: `${label} ${row.candidate2_name || 'C2'}` });
    }
  }

  // Governor races
  const [govRows] = await conn.execute(
    'SELECT state_code, dem_candidate, dem_photo, rep_candidate, rep_photo FROM governor_races'
  );
  for (const row of govRows) {
    const label = `Governor ${row.state_code}`;
    if (row.dem_photo) {
      photosToCheck.push({ url: row.dem_photo, label: `${label} ${row.dem_candidate || 'D'}` });
    }
    if (row.rep_photo) {
      photosToCheck.push({ url: row.rep_photo, label: `${label} ${row.rep_candidate || 'R'}` });
    }
  }

  console.log(`Total photos to audit: ${photosToCheck.length}`);
  console.log(`  House: ${houseRows.length * 2} slots`);
  console.log(`  Senate: ${senateRows.length * 2} slots`);
  console.log(`  Governor: ${govRows.length * 2} slots\n`);

  // Process in batches of 20 to avoid overwhelming network
  const BATCH_SIZE = 20;
  const results = { ok: [], needsRecrop: [], errors: [], skipped: [] };
  let processed = 0;

  for (let i = 0; i < photosToCheck.length; i += BATCH_SIZE) {
    const batch = photosToCheck.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(p => checkPhoto(p.url, p.label))
    );

    for (const r of batchResults) {
      if (r.status === 'ok') results.ok.push(r);
      else if (r.status === 'needs-recrop') results.needsRecrop.push(r);
      else if (r.status === 'error') results.errors.push(r);
      else results.skipped.push(r);
    }

    processed += batch.length;
    if (processed % 100 === 0 || processed === photosToCheck.length) {
      process.stdout.write(`  Checked ${processed}/${photosToCheck.length}...\r`);
    }
  }

  console.log(`\n\n========== PHOTO CENTERING AUDIT RESULTS ==========\n`);
  console.log(`✓ Properly centered: ${results.ok.length}`);
  console.log(`⚠ Needs re-crop:     ${results.needsRecrop.length}`);
  console.log(`✗ Errors:            ${results.errors.length}`);
  console.log(`- Skipped:           ${results.skipped.length}`);
  console.log(`\nTotal checked: ${results.ok.length + results.needsRecrop.length + results.errors.length + results.skipped.length}`);

  if (results.needsRecrop.length > 0) {
    console.log(`\n\n--- PHOTOS NEEDING RE-CROP ---\n`);
    for (const r of results.needsRecrop) {
      console.log(`  ${r.label}`);
      console.log(`    URL: ${r.url.substring(0, 80)}...`);
      console.log(`    Issue: ${r.reason}`);
      console.log('');
    }
  }

  if (results.errors.length > 0) {
    console.log(`\n--- ERRORS (broken/inaccessible photos) ---\n`);
    for (const r of results.errors) {
      console.log(`  ${r.label}: ${r.reason}`);
      console.log(`    URL: ${r.url.substring(0, 80)}`);
      console.log('');
    }
  }

  await conn.end();
  
  // Write results to JSON for further processing
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: photosToCheck.length,
      ok: results.ok.length,
      needsRecrop: results.needsRecrop.length,
      errors: results.errors.length,
      skipped: results.skipped.length
    },
    needsRecrop: results.needsRecrop,
    errors: results.errors
  };
  
  const fs = await import('fs');
  fs.writeFileSync('/home/ubuntu/election-map-2026/photo-audit-results.json', JSON.stringify(report, null, 2));
  console.log('\nResults saved to photo-audit-results.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
