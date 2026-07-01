/**
 * Rewrite candidatePhotos.ts files to replace CDN URLs with /manus-storage/ paths.
 * 
 * Server: `${BASE}/filename.jpg` -> `/manus-storage/filename.jpg`
 * Client: `${CDN_BASE}/filename.jpg` -> "/manus-storage/filename.jpg"
 */
import fs from "fs";

// === SERVER FILE ===
const serverPath = "server/candidatePhotos.ts";
let serverContent = fs.readFileSync(serverPath, "utf-8");

// Replace all `${BASE}/filename.jpg` with `/manus-storage/filename.jpg`
// Pattern: `${BASE}/some-file_hash.jpg`
const serverReplacements = [];
serverContent = serverContent.replace(/`\$\{BASE\}\/([^`]+)`/g, (match, filename) => {
  serverReplacements.push(filename);
  return `\`/manus-storage/${filename}\``;
});

// Remove the BASE constant (no longer needed)
serverContent = serverContent.replace(
  /const BASE = "https:\/\/d2xsxph8kpxj0f\.cloudfront\.net\/[^"]+";?\n\n/,
  ""
);

// Update the comment at the top
serverContent = serverContent.replace(
  /\/\*\*\n \* CDN URLs for candidate headshots[^*]*\*\//,
  `/**\n * Manus-storage paths for candidate headshots.\n * All photos served via /manus-storage/ proxy (S3-backed).\n * Keyed by candidate name (lowercase, normalized).\n */`
);

fs.writeFileSync(serverPath, serverContent);
console.log(`Server: Replaced ${serverReplacements.length} CDN URLs with /manus-storage/ paths`);

// === CLIENT FILE ===
const clientPath = "client/src/lib/candidatePhotos.ts";
let clientContent = fs.readFileSync(clientPath, "utf-8");

// Replace all `${CDN_BASE}/filename.jpg` with "/manus-storage/filename.jpg"
const clientReplacements = [];
clientContent = clientContent.replace(/`\$\{CDN_BASE\}\/([^`]+)`/g, (match, filename) => {
  clientReplacements.push(filename);
  return `"/manus-storage/${filename}"`;
});

// Remove the CDN_BASE constant
clientContent = clientContent.replace(
  /const CDN_BASE = "https:\/\/d2xsxph8kpxj0f\.cloudfront\.net\/[^"]+";?\n/,
  ""
);

// Also remove any empty line left behind
clientContent = clientContent.replace(/\n\n\n/g, "\n\n");

fs.writeFileSync(clientPath, clientContent);
console.log(`Client: Replaced ${clientReplacements.length} CDN URLs with /manus-storage/ paths`);

console.log(`\nTotal replacements: ${serverReplacements.length + clientReplacements.length}`);
console.log("Done! Both files now use unified /manus-storage/ paths.");
