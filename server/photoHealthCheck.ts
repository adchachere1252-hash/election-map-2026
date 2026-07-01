/**
 * Weekly Photo Health Check
 *
 * Scheduled via Heartbeat (project-level cron, §4a).
 * Runs every Monday at 06:00 UTC.
 *
 * Verifies that ALL candidate photos in manus-storage are still accessible
 * by calling the presign/get endpoint for each file. If any return non-200,
 * sends an owner notification with the list of broken photos.
 *
 * Endpoint: POST /api/scheduled/photo-health-check
 */
import { Request, Response } from "express";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import {
  getAllSenateRaces,
  getAllHouseRaces,
  getAllGovernorRaces,
} from "./db";
import { getCandidatePhoto, CANDIDATE_PHOTOS } from "./candidatePhotos";
import allClientPhotos from "./allCandidatePhotos.json";

const CLIENT_PHOTOS: Record<string, string> = allClientPhotos as Record<string, string>;
const PHOTO_BASE = "https://unitedstates.github.io/images/congress/225x275";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrokenPhoto {
  candidate: string;
  race: string;
  url: string;
  source: string;
  httpStatus: number | "timeout" | "error";
}

interface HealthCheckResult {
  timestamp: string;
  totalChecked: number;
  healthy: number;
  broken: BrokenPhoto[];
  elapsed_ms: number;
}

// ─── URL Verification ─────────────────────────────────────────────────────────

/**
 * Verify a manus-storage file exists by checking the presign/get API.
 * If presign/get returns 200, the file exists in the storage system and the
 * storage proxy will serve it correctly to browsers (regardless of which CDN
 * distribution the signed URL points to).
 *
 * We do NOT follow the signed URL because the storage system uses two CDN
 * distributions: one for public files (downloadUrl) and one for private files
 * (presign/get). The proxy handles routing correctly; we just need to confirm
 * the file is registered in the storage backend.
 *
 * Returns 200 if file exists, or the error status code / "timeout" / "error".
 */
async function verifyStorageFile(filename: string): Promise<number | "timeout" | "error"> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return "error";

  try {
    const url = new URL(
      "v1/storage/presign/get",
      ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
    );
    url.searchParams.set("path", filename);

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return resp.status;

    // If presign/get returns 200 with a URL, the file exists
    const { url: signedUrl } = (await resp.json()) as { url: string };
    return signedUrl ? 200 : 502;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") return "timeout";
    return "error";
  }
}

/**
 * Verify a bioguide photo URL is accessible.
 */
async function verifyBioguideUrl(url: string): Promise<number | "timeout" | "error"> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PhotoHealthCheck/1.0" },
    });
    return resp.status;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") return "timeout";
    return "error";
  }
}

// ─── Collect all unique photo URLs ────────────────────────────────────────────

interface PhotoEntry {
  candidate: string;
  race: string;
  url: string;
  source: "manus-storage" | "bioguide";
  storageKey?: string; // for manus-storage files
}

async function collectAllPhotos(): Promise<PhotoEntry[]> {
  const entries: PhotoEntry[] = [];
  const seen = new Set<string>();

  // 1. Server-side CANDIDATE_PHOTOS map
  for (const [name, url] of Object.entries(CANDIDATE_PHOTOS)) {
    if (url.startsWith("/manus-storage/")) {
      const key = url.replace("/manus-storage/", "");
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ candidate: name, race: "server-map", url, source: "manus-storage", storageKey: key });
      }
    }
  }

  // 2. Client-side photos (allCandidatePhotos.json)
  for (const [name, token] of Object.entries(CLIENT_PHOTOS)) {
    if (typeof token !== "string") continue;

    if (token.startsWith("cdn:")) {
      const filename = token.slice("cdn:".length);
      if (!seen.has(filename)) {
        seen.add(filename);
        entries.push({ candidate: name, race: "client-map", url: `/manus-storage/${filename}`, source: "manus-storage", storageKey: filename });
      }
    } else if (token.startsWith("manus:")) {
      const path = token.slice("manus:".length);
      const key = path.replace("/manus-storage/", "");
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ candidate: name, race: "client-map", url: path, source: "manus-storage", storageKey: key });
      }
    } else if (token.startsWith("bioguide:")) {
      const id = token.slice("bioguide:".length);
      const url = `${PHOTO_BASE}/${id}.jpg`;
      if (!seen.has(id)) {
        seen.add(id);
        entries.push({ candidate: name, race: "client-map", url, source: "bioguide" });
      }
    }
  }

  // 3. DB photos from races
  const [senateRaces, houseRaces, governorRaces] = await Promise.all([
    getAllSenateRaces(),
    getAllHouseRaces(),
    getAllGovernorRaces(),
  ]);

  for (const race of senateRaces) {
    for (const photo of [race.candidate1Photo, race.candidate2Photo]) {
      if (photo && photo.startsWith("/manus-storage/")) {
        const key = photo.replace("/manus-storage/", "");
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ candidate: race.candidate1Name || "Unknown", race: `${race.stateCode} Senate`, url: photo, source: "manus-storage", storageKey: key });
        }
      }
    }
  }

  for (const race of houseRaces) {
    for (const photo of [race.candidate1Photo, race.candidate2Photo]) {
      if (photo && photo.startsWith("/manus-storage/")) {
        const key = photo.replace("/manus-storage/", "");
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ candidate: race.candidate1Name || "Unknown", race: `${race.stateCode}-${race.district} House`, url: photo, source: "manus-storage", storageKey: key });
        }
      }
    }
  }

  for (const race of governorRaces) {
    for (const photo of [(race as any).demPhoto, (race as any).repPhoto]) {
      if (photo && photo.startsWith("/manus-storage/")) {
        const key = photo.replace("/manus-storage/", "");
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ candidate: (race as any).demCandidate || "Unknown", race: `${race.stateCode} Governor`, url: photo, source: "manus-storage", storageKey: key });
        }
      }
    }
  }

  return entries;
}

// ─── Main Health Check Logic ──────────────────────────────────────────────────

async function runHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const log = (msg: string) => console.log(`[PhotoHealthCheck] ${msg}`);

  log("Collecting all photo entries...");
  const allPhotos = await collectAllPhotos();
  log(`Found ${allPhotos.length} unique photo entries to verify`);

  const broken: BrokenPhoto[] = [];
  const BATCH_SIZE = 10;

  // Process in batches to avoid overwhelming the storage API
  for (let i = 0; i < allPhotos.length; i += BATCH_SIZE) {
    const batch = allPhotos.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (entry) => {
        let status: number | "timeout" | "error";

        if (entry.source === "manus-storage" && entry.storageKey) {
          status = await verifyStorageFile(entry.storageKey);
        } else if (entry.source === "bioguide") {
          status = await verifyBioguideUrl(entry.url);
        } else {
          status = "error";
        }

        return { entry, status };
      })
    );

    for (const { entry, status } of results) {
      if (status !== 200) {
        broken.push({
          candidate: entry.candidate,
          race: entry.race,
          url: entry.url,
          source: entry.source,
          httpStatus: status,
        });
      }
    }

    // Log progress every 50 entries
    if ((i + BATCH_SIZE) % 50 === 0) {
      log(`  Checked ${Math.min(i + BATCH_SIZE, allPhotos.length)}/${allPhotos.length}...`);
    }

    // Small delay between batches
    await new Promise(r => setTimeout(r, 50));
  }

  const elapsed = Date.now() - startTime;
  log(`Health check complete: ${allPhotos.length} checked, ${broken.length} broken, ${elapsed}ms`);

  return {
    timestamp: new Date().toISOString(),
    totalChecked: allPhotos.length,
    healthy: allPhotos.length - broken.length,
    broken,
    elapsed_ms: elapsed,
  };
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function handlePhotoHealthCheck(req: Request, res: Response): Promise<void> {
  const log = (msg: string) => console.log(`[PhotoHealthCheck] ${msg}`);

  try {
    log("Starting weekly photo health check...");
    const result = await runHealthCheck();

    // Separate truly broken (manus-storage) from expected (bioguide 404s for freshmen)
    const criticalBroken = result.broken.filter(b => b.source === "manus-storage");
    const bioguide404s = result.broken.filter(b => b.source === "bioguide" && b.httpStatus === 404);

    // Only notify if there are critical (manus-storage) broken photos
    // Bioguide 404s are expected for freshmen members and have fallback photos
    if (criticalBroken.length > 0) {
      const brokenList = criticalBroken
        .slice(0, 20) // Cap at 20 to avoid notification overflow
        .map(b => `• ${b.candidate} (${b.race}): ${b.url} → ${b.httpStatus}`)
        .join("\n");

      const moreText = criticalBroken.length > 20
        ? `\n\n...and ${criticalBroken.length - 20} more. Run full audit at /api/scheduled/photo-audit for details.`
        : "";

      const bioguideNote = bioguide404s.length > 0
        ? `\n\nNote: ${bioguide404s.length} bioguide photo(s) also returned 404 (expected for freshmen members with fallback photos).`
        : "";

      await notifyOwner({
        title: `⚠️ Photo Health Check: ${criticalBroken.length} broken storage URL${criticalBroken.length > 1 ? "s" : ""} detected`,
        content: `Weekly photo health check found ${criticalBroken.length} broken manus-storage photo(s) out of ${result.totalChecked} total.\n\nBroken photos:\n${brokenList}${moreText}${bioguideNote}\n\nRun the full photo audit or check the admin panel to fix these.`,
      });

      log(`Owner notified about ${criticalBroken.length} critical broken photos`);
    } else {
      if (bioguide404s.length > 0) {
        log(`All storage photos healthy. ${bioguide404s.length} bioguide 404s (expected for freshmen, fallback photos available).`);
      } else {
        log("All photos healthy — no notification needed");
      }
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Health check error: ${msg}`);
    res.status(500).json({
      success: false,
      error: msg,
      timestamp: new Date().toISOString(),
    });
  }
}
