/**
 * Batch re-crop all world election candidate photos using smart center crop.
 * Ensures all photos are properly face-centered for circular avatar display.
 */
import mysql from "mysql2/promise";
import sharp from "sharp";

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_BASE = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "") + "/";
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const LOCAL_APP = "http://localhost:3000";

async function getDownloadUrl(key) {
  const url = new URL("v1/storage/downloadUrl", FORGE_BASE);
  url.searchParams.set("path", key);
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${FORGE_KEY}` },
  });
  if (!resp.ok) throw new Error(`downloadUrl failed: ${resp.status}`);
  const json = await resp.json();
  return json.url;
}

async function storagePut(relKey, data, contentType) {
  const url = new URL("v1/storage/upload", FORGE_BASE);
  url.searchParams.set("path", relKey);
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, relKey.split("/").pop());
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_KEY}` },
    body: form,
  });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  const json = await resp.json();
  return { url: json.url, key: relKey };
}

async function fetchImage(photoPath) {
  const key = photoPath.replace("/manus-storage/", "");
  
  // Try direct API first
  try {
    const downloadUrl = await getDownloadUrl(key);
    const resp = await fetch(downloadUrl);
    if (resp.ok) return Buffer.from(await resp.arrayBuffer());
  } catch (e) { /* fall through */ }
  
  // Fallback: fetch via local app proxy
  const resp = await fetch(LOCAL_APP + photoPath);
  if (!resp.ok) throw new Error(`Both API and proxy failed for ${key}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function smartCenterCrop(imageBuffer, size = 400, quality = 85) {
  return sharp(imageBuffer)
    .resize(size, size, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

async function needsRecrop(buffer) {
  const metadata = await sharp(buffer).metadata();
  const { width, height } = metadata;
  if (!width || !height) return { needs: true, reason: "no dimensions" };
  const aspectRatio = width / height;
  if (aspectRatio < 0.9 || aspectRatio > 1.1) return { needs: true, reason: `aspect ${aspectRatio.toFixed(2)}` };
  if (width < 350 || height < 350) return { needs: true, reason: `small ${width}x${height}` };
  return { needs: false, reason: `OK ${width}x${height}` };
}

async function main() {
  console.log("Connecting to database...");
  const conn = await mysql.createConnection(DATABASE_URL);
  const [rows] = await conn.execute(
    "SELECT id, country, candidates FROM world_elections WHERE candidates IS NOT NULL"
  );

  let processed = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const candidates = JSON.parse(row.candidates || "[]");
    let updated = false;

    for (const candidate of candidates) {
      if (!candidate.photo) continue;

      try {
        process.stdout.write(`${candidate.name} (${row.country})... `);
        const imageBuffer = await fetchImage(candidate.photo);
        
        const { needs, reason } = await needsRecrop(imageBuffer);
        if (!needs) {
          console.log(`✓ ${reason}`);
          skipped++;
          continue;
        }

        console.log(`↻ ${reason} → recropping`);
        const croppedBuffer = await smartCenterCrop(imageBuffer);
        
        const safeName = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);
        const suffix = Math.random().toString(36).slice(2, 8);
        const storageKey = `world-candidates/${safeName}_centered_${suffix}.jpg`;
        
        await storagePut(storageKey, croppedBuffer, "image/jpeg");
        candidate.photo = `/manus-storage/${storageKey}`;
        updated = true;
        processed++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        errors++;
      }
    }

    if (updated) {
      await conn.execute(
        "UPDATE world_elections SET candidates = ? WHERE id = ?",
        [JSON.stringify(candidates), row.id]
      );
    }
  }

  console.log(`\n=== Photo Centering Complete ===`);
  console.log(`Re-cropped: ${processed} | Already good: ${skipped} | Errors: ${errors}`);
  
  await conn.end();
  process.exit(0);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
