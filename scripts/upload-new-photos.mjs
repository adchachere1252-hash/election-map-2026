/**
 * Process and upload new candidate photos for upcoming elections.
 * Smart-crops to 400x400 and uploads to S3 storage.
 */
import sharp from "sharp";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_BASE = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "") + "/";
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

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
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${await resp.text()}`);
  const json = await resp.json();
  return { url: json.url, key: relKey };
}

async function processAndUpload(localPath, storageKey) {
  const buffer = fs.readFileSync(localPath);
  const cropped = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: sharp.strategy.attention })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  
  const result = await storagePut(storageKey, cropped, "image/jpeg");
  console.log(`  ✓ Uploaded: ${storageKey} (${cropped.length} bytes)`);
  return `/manus-storage/${storageKey}`;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  const baseDir = "/home/ubuntu/webdev-static-assets/world-candidates-new";
  const suffix = Math.random().toString(36).slice(2, 6);

  // São Tomé - Carlos Vila Nova (ID 8)
  console.log("Processing São Tomé candidates...");
  const vilaNovaPhoto = await processAndUpload(
    `${baseDir}/vila_nova.jpg`,
    `world-candidates/vila_nova_stp_${suffix}.jpg`
  );
  const bomJesusPhoto = await processAndUpload(
    `${baseDir}/bom_jesus.jpg`,
    `world-candidates/bom_jesus_stp_${suffix}.jpg`
  );

  // Cook Islands - Mark Brown (ID 9)
  console.log("Processing Cook Islands candidates...");
  const markBrownPhoto = await processAndUpload(
    `${baseDir}/mark_brown.jpg`,
    `world-candidates/mark_brown_cook_${suffix}.jpg`
  );

  // Zambia - Miles Sampa (ID 10) - Hichilema already has photo
  console.log("Processing Zambia candidates...");
  const milesSampaPhoto = await processAndUpload(
    `${baseDir}/miles_sampa.jpg`,
    `world-candidates/miles_sampa_zambia_${suffix}.jpg`
  );

  // Update São Tomé candidates with photos
  const [stpRows] = await conn.execute("SELECT candidates FROM world_elections WHERE id = 8");
  const stpCandidates = JSON.parse(stpRows[0].candidates);
  stpCandidates[0].photo = vilaNovaPhoto; // Vila Nova
  stpCandidates[2].photo = bomJesusPhoto; // Bom Jesus
  await conn.execute("UPDATE world_elections SET candidates = ? WHERE id = 8", [JSON.stringify(stpCandidates)]);
  console.log("  ✓ São Tomé DB updated");

  // Update Cook Islands candidates with photos
  const [ciRows] = await conn.execute("SELECT candidates FROM world_elections WHERE id = 9");
  const ciCandidates = JSON.parse(ciRows[0].candidates);
  ciCandidates[0].photo = markBrownPhoto; // Mark Brown
  await conn.execute("UPDATE world_elections SET candidates = ? WHERE id = 9", [JSON.stringify(ciCandidates)]);
  console.log("  ✓ Cook Islands DB updated");

  // Update Zambia candidates with photos (Hichilema already has one)
  const [zmRows] = await conn.execute("SELECT candidates FROM world_elections WHERE id = 10");
  const zmCandidates = JSON.parse(zmRows[0].candidates);
  zmCandidates[1].photo = milesSampaPhoto; // Miles Sampa
  await conn.execute("UPDATE world_elections SET candidates = ? WHERE id = 10", [JSON.stringify(zmCandidates)]);
  console.log("  ✓ Zambia DB updated");

  console.log("\n=== Photo Upload Complete ===");
  await conn.end();
  process.exit(0);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
