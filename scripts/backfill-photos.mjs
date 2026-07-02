/**
 * Backfill photos for 4 candidates with broken bioguide IDs.
 * Downloads from official sources and uploads to manus-storage via the forge API.
 */

import { createHash } from "crypto";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY env vars");
  process.exit(1);
}

const CANDIDATES = [
  {
    name: "garlin gilchrist",
    displayName: "Garlin Gilchrist",
    url: "https://www.michigan.gov/whitmer/-/media/Project/Websites/Whitmer/Images/Lt-Governor/Lt-Governor-Gilchrist-Official-Portrait.jpg",
  },
  {
    name: "la shawn ford",
    displayName: "La Shawn Ford",
    url: "https://ilga.gov/images/members/{A1B8E6A0-A0F5-4A9D-B8C1-E2B1E8C6E3D7}.jpg",
  },
  {
    name: "terri yarbrough green",
    displayName: "Terri Yarbrough Green",
    url: "https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/200/300/Terri-Yarbrough-Green.jpeg",
  },
  {
    name: "tom barrett",
    displayName: "Tom Barrett",
    url: "https://barrett.house.gov/sites/evo-subsites/barrett.house.gov/files/evo-media-image/Barrett%20Official%20Photo.jpg",
  },
];

async function downloadImage(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ElectionMap/1.0)" },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function uploadToStorage(key, buffer, contentType) {
  const url = `${FORGE_API_URL}/storage/upload`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FORGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      data: buffer.toString("base64"),
      contentType,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload failed ${resp.status}: ${text}`);
  }
  return await resp.json();
}

function generateKey(name) {
  const slug = name.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const hash = createHash("md5").update(name + "backfill40").digest("hex").slice(0, 8);
  return `${slug}_${hash}.jpg`;
}

async function main() {
  const results = [];

  for (const candidate of CANDIDATES) {
    try {
      console.log(`Downloading: ${candidate.displayName} from ${candidate.url}`);
      const buffer = await downloadImage(candidate.url);
      const key = generateKey(candidate.name);
      console.log(`  Size: ${buffer.length} bytes, uploading as: ${key}`);
      const result = await uploadToStorage(key, buffer, "image/jpeg");
      console.log(`  ✓ Uploaded: /manus-storage/${key}`);
      results.push({ ...candidate, storageKey: key, success: true });
    } catch (err) {
      console.error(`  ✗ Failed: ${candidate.displayName}: ${err.message}`);
      results.push({ ...candidate, success: false, error: err.message });
    }
  }

  console.log("\n=== Results ===");
  for (const r of results) {
    if (r.success) {
      console.log(`✓ "${r.name}": \`/manus-storage/${r.storageKey}\`,`);
    } else {
      console.log(`✗ ${r.displayName}: ${r.error}`);
    }
  }
}

main().catch(console.error);
