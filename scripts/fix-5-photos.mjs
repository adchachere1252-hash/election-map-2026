/**
 * Fix 5 corrupted photos by processing new source images through smartCrop
 * and uploading to S3, then updating the database.
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

// Photos to fix - using the best search result images
const photosToFix = [
  {
    district: "ID-2",
    candidate: "Mike Simpson",
    party: "rep",
    sourcePath: "/home/ubuntu/upload/search_images/9HyxSUKR9Uoq.jpg",
  },
  {
    district: "IL-14",
    candidate: "Lauren Underwood",
    party: "dem",
    sourcePath: "/home/ubuntu/upload/search_images/2nsumfRRHJL7.jpeg",
  },
  {
    district: "NC-4",
    candidate: "Valerie Foushee",
    party: "dem",
    sourcePath: "/home/ubuntu/upload/search_images/cwJTPVqtp1V6.jpeg",
  },
  {
    district: "OH-5",
    candidate: "Brian Shaver",
    party: "dem",
    sourcePath: "/home/ubuntu/upload/search_images/SInFRPREbAxY.jpg",
  },
  {
    district: "PA-6",
    candidate: "Chrissy Houlahan",
    party: "dem",
    sourcePath: "/home/ubuntu/upload/search_images/lSKPyXMcfzef.jpg",
  },
];

async function smartCenterCrop(imageBuffer, size = 400, quality = 85) {
  return sharp(imageBuffer)
    .resize(size, size, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, "");
  const url = new URL("v1/storage/upload", baseUrl + "/");
  url.searchParams.set("path", relKey);
  
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, relKey.split("/").pop());
  
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()).url;
}

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  
  for (const photo of photosToFix) {
    try {
      console.log(`\nProcessing ${photo.candidate} (${photo.district})...`);
      
      // Read source image
      const sourceBuffer = readFileSync(photo.sourcePath);
      console.log(`  Source: ${sourceBuffer.length} bytes`);
      
      // Smart crop
      const croppedBuffer = await smartCenterCrop(sourceBuffer);
      console.log(`  Cropped: ${croppedBuffer.length} bytes (400x400)`);
      
      // Upload to S3
      const suffix = Math.random().toString(36).substring(2, 8);
      const key = `candidates/${photo.district.toLowerCase()}-${photo.party}-${suffix}.jpg`;
      const uploadedUrl = await storagePut(key, croppedBuffer, "image/jpeg");
      console.log(`  Uploaded: ${uploadedUrl}`);
      
      // Update database
      const stateCode = photo.district.split("-")[0];
      const districtNum = parseInt(photo.district.split("-")[1]);
      const districtLabel = `${stateCode}-${districtNum}`;
      const photoCol = photo.party === "dem" ? "dem_photo" : "rep_photo";
      
      const [result] = await connection.execute(
        `UPDATE house_races SET ${photoCol} = ? WHERE district_label = ?`,
        [uploadedUrl, districtLabel]
      );
      console.log(`  DB updated: ${result.affectedRows} row(s) for ${districtLabel}`);
      
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }
  
  await connection.end();
  console.log("\nDone! All 5 photos re-sourced.");
}

main().catch(console.error);
