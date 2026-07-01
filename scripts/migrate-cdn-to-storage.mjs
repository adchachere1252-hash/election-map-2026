/**
 * Migration script: Download all CDN photos and re-upload to manus-storage.
 * Run with: node scripts/migrate-cdn-to-storage.mjs
 * 
 * This uses the same storagePut mechanism as the app server.
 */
import fs from "fs";
import path from "path";

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

// Read env vars
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const baseUrl = FORGE_API_URL.replace(/\/+$/, "");

async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key = relKey.replace(/^\/+/, "");
  const url = new URL("v1/storage/upload", baseUrl + "/");
  url.searchParams.set("path", key);
  
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);
  
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${msg}`);
  }
  const result = await response.json();
  return { key, url: result.url };
}

async function checkExists(filename) {
  const url = new URL("v1/storage/presign/get", baseUrl + "/");
  url.searchParams.set("path", filename);
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
  });
  return resp.ok;
}

// Read all CDN filenames
const filenames = fs.readFileSync("/tmp/cdn_files_all.txt", "utf-8")
  .split("\n")
  .filter(Boolean);

console.log(`Total CDN files to migrate: ${filenames.length}`);

const results = {};
const errors = [];
let alreadyExists = 0;
let migrated = 0;

// Process in batches of 5 to avoid overwhelming
const BATCH_SIZE = 5;

for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
  const batch = filenames.slice(i, i + BATCH_SIZE);
  
  const promises = batch.map(async (filename) => {
    // Check if already exists in storage
    const exists = await checkExists(filename);
    if (exists) {
      results[filename] = `/manus-storage/${filename}`;
      alreadyExists++;
      return;
    }
    
    // Download from CDN
    const cdnUrl = `${CDN_BASE}/${filename}`;
    const resp = await fetch(cdnUrl);
    if (!resp.ok) {
      errors.push({ file: filename, error: `CDN ${resp.status}` });
      return;
    }
    
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await resp.arrayBuffer());
    
    // Upload to storage
    try {
      await storagePut(filename, buffer, contentType);
      results[filename] = `/manus-storage/${filename}`;
      migrated++;
    } catch (err) {
      errors.push({ file: filename, error: err.message });
    }
  });
  
  await Promise.all(promises);
  
  if ((i + BATCH_SIZE) % 20 === 0 || i + BATCH_SIZE >= filenames.length) {
    const done = Math.min(i + BATCH_SIZE, filenames.length);
    console.log(`  [${done}/${filenames.length}] migrated=${migrated}, exists=${alreadyExists}, errors=${errors.length}`);
  }
  
  // Small delay between batches
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n=== MIGRATION COMPLETE ===`);
console.log(`Total: ${filenames.length}`);
console.log(`Already existed: ${alreadyExists}`);
console.log(`Newly migrated: ${migrated}`);
console.log(`Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log("\nFailed files:");
  errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}

// Save results
fs.writeFileSync("/tmp/cdn_migration_results.json", JSON.stringify({ results, errors, stats: { total: filenames.length, alreadyExists, migrated, errorCount: errors.length } }, null, 2));
console.log("\nResults saved to /tmp/cdn_migration_results.json");
