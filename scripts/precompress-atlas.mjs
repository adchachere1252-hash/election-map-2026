/**
 * Pre-build and upload all 31 Congress atlas bundles to S3.
 * Processes one Congress at a time to manage memory.
 * Run: node scripts/precompress-atlas.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

const CONGRESS_START = 89;
const CONGRESS_END = 119;

// Parse the Lewis manifest from the .ts file (strip TypeScript syntax)
const manifestRaw = readFileSync(resolve(__dirname, '../shared/lewisManifest.ts'), 'utf-8');
let jsCode = manifestRaw
  .replace(/\/\/.*$/gm, '')  // Remove comments
  .replace(/export\s+const\s+\w+:\s*[^=]+=/, 'var LEWIS_MANIFEST =');
const fn = new Function(jsCode + '; return LEWIS_MANIFEST;');
const LEWIS_MANIFEST = fn();

// GitHub raw URL base for the Lewis GeoJSON files
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/JeffreyBLewis/congressional-district-boundaries/master/';

async function fetchGeoJson(filename) {
  const url = `${GITHUB_RAW_BASE}${filename}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt < 2) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        return null;
      }
      return await res.text();
    } catch (err) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
      console.error(`  Failed to fetch ${filename}: ${err.message}`);
      return null;
    }
  }
  return null;
}

async function uploadToS3(key, data) {
  const uploadUrl = new URL('v1/storage/upload', BASE_URL + '/');
  uploadUrl.searchParams.set('path', key);
  
  const blob = new Blob([data], { type: 'application/json' });
  const form = new FormData();
  form.append('file', blob, key.split('/').pop());
  
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  const { url } = await res.json();
  return url;
}

async function buildBundle(congress) {
  const US_STATES = Object.keys(LEWIS_MANIFEST);
  const filesToFetch = new Map();
  
  for (const state of US_STATES) {
    const entries = LEWIS_MANIFEST[state];
    const entry = entries.find(e => congress >= e.start && congress <= e.end);
    if (entry) {
      if (!filesToFetch.has(entry.name)) filesToFetch.set(entry.name, []);
      filesToFetch.get(entry.name).push(state);
    }
  }
  
  const fileNames = Array.from(filesToFetch.keys());
  
  // Fetch in batches of 5 to avoid overwhelming GitHub
  const fileDataArr = [];
  for (let i = 0; i < fileNames.length; i += 5) {
    const batch = fileNames.slice(i, i + 5);
    const results = await Promise.all(batch.map(fn => fetchGeoJson(fn)));
    fileDataArr.push(...results);
  }
  
  const bundle = {};
  for (let i = 0; i < fileNames.length; i++) {
    const raw = fileDataArr[i];
    if (!raw) continue;
    bundle[fileNames[i]] = raw;
  }
  
  return JSON.stringify(bundle);
}

async function main() {
  console.log(`Pre-compressing atlas bundles for Congresses ${CONGRESS_START}–${CONGRESS_END}...`);
  console.log(`S3 base: ${BASE_URL}`);
  
  const results = [];
  
  for (let congress = CONGRESS_START; congress <= CONGRESS_END; congress++) {
    const startTime = Date.now();
    process.stdout.write(`  Congress ${congress}/${CONGRESS_END}: building...`);
    
    try {
      const bundle = await buildBundle(congress);
      const sizeMB = (Buffer.byteLength(bundle) / 1024 / 1024).toFixed(1);
      process.stdout.write(` ${sizeMB}MB, uploading...`);
      
      const s3Key = `atlas-bundles/congress-${congress}.json`;
      const url = await uploadToS3(s3Key, bundle);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(` ✓ (${elapsed}s) → ${url.slice(0, 60)}...`);
      results.push({ congress, sizeMB, url, status: 'ok' });
    } catch (err) {
      console.log(` ✗ ERROR: ${err.message}`);
      results.push({ congress, status: 'error', error: err.message });
    }
    
    // Small delay between uploads to be nice to the APIs
    await new Promise(r => setTimeout(r, 500));
  }
  
  const ok = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'error').length;
  console.log(`\nDone: ${ok} uploaded, ${failed} failed.`);
  
  if (failed > 0) {
    console.log('Failed congresses:', results.filter(r => r.status === 'error').map(r => r.congress));
  }
  
  // Output the S3 URL pattern for the server to use
  if (ok > 0) {
    console.log(`\nS3 key pattern: atlas-bundles/congress-{N}.json`);
    console.log(`Example URL: ${results.find(r => r.status === 'ok')?.url}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
