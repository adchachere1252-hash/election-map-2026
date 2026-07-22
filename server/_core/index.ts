import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { attachWebSocketServer } from "../ws";
import { handleScheduledApUpdate, handleScheduledApUpdateTrusted } from "../scheduledApUpdate";
import { registerScheduledRoutes } from "../scheduledRoutes";
import { getSchedulerHealth } from "../electionScheduler";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer({ maxHeaderSize: 65536 }, app); // 64KB header limit for large tRPC batch GET requests
  // Enable gzip compression for all responses (especially large GeoJSON files)
  app.use(compression());
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Scheduled task: AP election results auto-update (accessible by cron cookie)
  // NOTE: The Manus proxy blocks /api/scheduled/* but passes /api/scheduled-task/* through
  // Register multiple path variants to handle proxy routing
  // Proxy-trusted path: Manus proxy has already authenticated the cron cookie
  app.post("/api/scheduled-task/ap-update", handleScheduledApUpdateTrusted);
  app.post("/ap-update", handleScheduledApUpdate);
  app.post("/scheduled/ap-update", handleScheduledApUpdate);
  // Password-based scheduled routes (includes /api/scheduled/ap-update with body password)
  registerScheduledRoutes(app);

  // Health monitoring endpoint
  app.get("/api/health", async (_req, res) => {
    const startTime = Date.now();
    let dbStatus: "connected" | "disconnected" = "disconnected";
    let dbLatencyMs = 0;
    try {
      const db = await getDb();
      if (db) {
        const dbStart = Date.now();
        await db.execute("SELECT 1");
        dbLatencyMs = Date.now() - dbStart;
        dbStatus = "connected";
      }
    } catch {
      dbStatus = "disconnected";
    }
    const scheduler = getSchedulerHealth();
    const uptime = process.uptime();
    res.json({
      status: dbStatus === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      scheduler: {
        state: scheduler.state,
        lastApUpdate: scheduler.lastApRun,
        lastApUpdatedCount: scheduler.lastApOkCount,
        lastApErrorCount: scheduler.lastApErrorCount,
        lastApError: scheduler.lastApError,
        lastPromotionRun: scheduler.lastPromotionRun,
        lastWorldTrackerRun: scheduler.lastWorldTrackerRun,
      },
      responseTimeMs: Date.now() - startTime,
    });
  });

  // Storage proxy for uploaded candidate photos
  registerStorageProxy(app);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // GeoJSON proxy: fetch Lewis congressional district boundaries from GitHub
  // This bypasses CORS restrictions in the browser sandbox
  // Server-side in-memory cache: avoids re-fetching large files (e.g. NC 4.5MB) on every request
  // S3 write-through cache: files are uploaded to S3 after first GitHub fetch for reliability
  const geoJsonServerCache = new Map<string, string>();
  const geoJsonFetchInFlight = new Map<string, Promise<string | null>>();
  const geoJsonS3Uploaded = new Set<string>();

  // Background upload to S3 (fire-and-forget)
  async function uploadGeoJsonToS3(filename: string, data: string): Promise<void> {
    if (geoJsonS3Uploaded.has(filename)) return;
    try {
      const { storagePut } = await import("../storage");
      await storagePut(`atlas-geojson/${filename}`, data, "application/json");
      geoJsonS3Uploaded.add(filename);
    } catch (err) {
      // Non-critical: S3 upload failure doesn't affect functionality
    }
  }

  // Try fetching from S3 as fallback when GitHub is unavailable
  async function fetchGeoJsonFromS3(filename: string): Promise<string | null> {
    try {
      const { storageGet } = await import("../storage");
      const { url } = await storageGet(`atlas-geojson/${filename}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.text();
      if (data.length > 0 && data.startsWith('{')) {
        geoJsonServerCache.set(filename, data);
        geoJsonS3Uploaded.add(filename);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function fetchGeoJsonFromGitHub(filename: string): Promise<string | null> {
    // Deduplicate concurrent requests for the same file
    if (geoJsonFetchInFlight.has(filename)) return geoJsonFetchInFlight.get(filename)!;
    const promise = (async () => {
      const url = `https://raw.githubusercontent.com/JeffreyBLewis/congressional-district-boundaries/master/GeoJson/${filename}`;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.status === 404) return null; // File genuinely missing
          if (!response.ok) continue; // Retry on 5xx
          const data = await response.text();
          geoJsonServerCache.set(filename, data);
          // Write-through: upload to S3 in background for future reliability
          uploadGeoJsonToS3(filename, data);
          return data;
        } catch (err) {
          console.error(`[GeoJSON proxy] Attempt ${attempt + 1} failed for ${filename}:`, err);
        }
      }
      // GitHub failed after 3 attempts — try S3 fallback
      const s3Data = await fetchGeoJsonFromS3(filename);
      if (s3Data) {
        console.log(`[GeoJSON proxy] Served ${filename} from S3 fallback`);
        return s3Data;
      }
      return null;
    })();
    geoJsonFetchInFlight.set(filename, promise);
    promise.finally(() => geoJsonFetchInFlight.delete(filename));
    return promise;
  }

  app.get("/api/geojson/:filename", async (req, res) => {
    const { filename } = req.params;
    // Validate filename: allow letters, digits, spaces, underscores, hyphens + .geojson
    if (!/^[A-Za-z0-9_ \-]+\.geojson$/.test(filename)) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    // Serve from server-side cache if available
    if (geoJsonServerCache.has(filename)) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Cache", "HIT");
      return res.send(geoJsonServerCache.get(filename));
    }
    const data = await fetchGeoJsonFromGitHub(filename);
    if (data === null) {
      return res.status(404).json({ error: "Not found" });
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    return res.send(data);
  });
  // ─── Bundled congress endpoint: returns all states' GeoJSON + party data in one response ───
  // This eliminates 50+ round-trips per congress on the client side
  const bundleCache = new Map<string, string>(); // congress -> compressed JSON
  const bundleBuildInFlight = new Map<number, Promise<string | null>>();

  // Try to fetch pre-built bundle from S3 (instant cold start)
  async function fetchBundleFromS3(congress: number): Promise<string | null> {
    try {
      const { ENV } = await import("./env");
      const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
      const apiKey = ENV.forgeApiKey;
      if (!baseUrl || !apiKey) return null;
      const downloadUrl = new URL("v1/storage/downloadUrl", baseUrl + "/");
      downloadUrl.searchParams.set("path", `atlas-bundles/congress-${congress}.json`);
      const metaRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!metaRes.ok) return null;
      const { url } = await metaRes.json() as { url: string };
      if (!url) return null;
      const dataRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!dataRes.ok) return null;
      const text = await dataRes.text();
      // Reject empty/corrupt bundles (valid bundles are always > 100KB)
      if (!text || text.length < 1000) {
        console.log(`[Atlas] S3 bundle for congress ${congress} is empty/corrupt (${text.length} bytes), rebuilding from GitHub`);
        return null;
      }
      return text;
    } catch {
      return null;
    }
  }

  // Upload a freshly-built bundle to S3 for future cold starts (fire-and-forget)
  async function uploadBundleToS3(congress: number, data: string): Promise<void> {
    try {
      const { storagePut } = await import("../storage");
      await storagePut(`atlas-bundles/congress-${congress}.json`, data, "application/json");
      console.log(`[Atlas] Uploaded bundle for congress ${congress} to S3 (${(data.length / 1024 / 1024).toFixed(1)}MB)`);
    } catch (err) {
      // Non-critical: S3 upload failure doesn't affect functionality
    }
  }

  async function buildCongressBundle(congress: number): Promise<string | null> {
    const cacheKey = String(congress);
    if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey)!;
    if (bundleBuildInFlight.has(congress)) return bundleBuildInFlight.get(congress)!;
    const promise = (async () => {
      try {
        // 1. Try S3 pre-built bundle first (fast path for cold starts)
        const s3Bundle = await fetchBundleFromS3(congress);
        if (s3Bundle) {
          console.log(`[Atlas] Congress ${congress} loaded from S3 cache`);
          bundleCache.set(cacheKey, s3Bundle);
          return s3Bundle;
        }
        // 2. Fallback: build from GitHub (slower but always works)
        console.log(`[Atlas] Congress ${congress} building from GitHub (S3 miss)`);
        const { LEWIS_MANIFEST } = await import("../../shared/lewisManifest");
        const US_STATES = Object.keys(LEWIS_MANIFEST);
        // Determine which files are needed for this congress
        const filesToFetch = new Map<string, string[]>(); // filename -> [states]
        for (const state of US_STATES) {
          const entries = LEWIS_MANIFEST[state];
          const entry = entries.find((e: {start: number; end: number}) => congress >= e.start && congress <= e.end);
          if (entry) {
            if (!filesToFetch.has(entry.name)) filesToFetch.set(entry.name, []);
            filesToFetch.get(entry.name)!.push(state);
          }
        }
        // Fetch all unique files (many states share the same file)
        const fileNames = Array.from(filesToFetch.keys());
        const fileDataArr = await Promise.all(
          fileNames.map(async (fn) => {
            if (geoJsonServerCache.has(fn)) return geoJsonServerCache.get(fn)!;
            const data = await fetchGeoJsonFromGitHub(fn);
            return data;
          })
        );
        // Build the bundle: { features: [...all features with state/party metadata] }
        const bundle: Record<string, unknown> = {};
        for (let i = 0; i < fileNames.length; i++) {
          const raw = fileDataArr[i];
          if (!raw) continue;
          bundle[fileNames[i]] = raw; // Store raw JSON string to avoid double-parse
        }
        const result = JSON.stringify(bundle);
        // Only cache if the bundle actually has content
        if (Object.keys(bundle).length === 0) {
          console.warn(`[Atlas] Bundle for congress ${congress} built empty (no GeoJSON files found)`);
          bundleCache.set(cacheKey, result);
          return result;
        }
        bundleCache.set(cacheKey, result);
        // Upload to S3 in background for future cold starts
        uploadBundleToS3(congress, result);
        return result;
      } catch (err) {
        console.error(`[Atlas] Bundle build failed for congress ${congress}:`, err);
        return null;
      } finally {
        bundleBuildInFlight.delete(congress);
      }
    })();
    bundleBuildInFlight.set(congress, promise);
    return promise;
  }

  app.get("/api/atlas/bundle/:congress", async (req, res) => {
    const congress = parseInt(req.params.congress);
    if (isNaN(congress) || congress < 89 || congress > 119) {
      return res.status(400).json({ error: "Invalid congress number (89-119)" });
    }
    const bundle = await buildCongressBundle(congress);
    if (!bundle) {
      return res.status(503).json({ error: "Bundle unavailable" });
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    return res.send(bundle);
  });

  // Voteview party data proxy: fetch per-district party data for a given Congress
  // Returns { "AL-3": "R", "AL-7": "D", ... } keyed by stateAbbrev-districtCode
  const voteviewCache = new Map<string, Record<string, string>>();

  // RFC 4180 CSV parser (shared)
  function parseCSVLineSimple(line: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        cols.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  }

  // Fetch Voteview CSV with timeout + retry
  async function fetchVoteviewCSV(congress: number): Promise<string | null> {
    const padded = String(congress).padStart(3, "0");
    const url = `https://voteview.com/static/data/out/members/H${padded}_members.csv`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) return null;
        return await response.text();
      } catch (err) {
        console.error(`Voteview fetch attempt ${attempt + 1} failed for congress ${congress}:`, err);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    return null;
  }

  async function loadVoteviewParty(congress: number): Promise<Record<string, string>> {
    const cacheKey = String(congress);
    if (voteviewCache.has(cacheKey)) return voteviewCache.get(cacheKey)!;
    const csv = await fetchVoteviewCSV(congress);
    if (!csv) return {}; // Don't cache failures — allow retry
    const lines = csv.trim().split("\n");
    const headers = parseCSVLineSimple(lines[0]);
    const chamberIdx = headers.indexOf("chamber");
    const stateIdx = headers.indexOf("state_abbrev");
    const distIdx = headers.indexOf("district_code");
    const partyIdx = headers.indexOf("party_code");
    const result: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLineSimple(lines[i]);
      if (cols[chamberIdx] !== "House") continue;
      const state = cols[stateIdx];
      const dist = parseInt(cols[distIdx]);
      const party = parseInt(cols[partyIdx]);
      if (!state || isNaN(dist)) continue;
      result[`${state}-${dist}`] = party === 100 ? "D" : party === 200 ? "R" : "I";
    }
    // Only cache if we got actual data — don't cache empty results
    if (Object.keys(result).length > 0) {
      voteviewCache.set(cacheKey, result);
    } else {
      // Debug: log why result is empty
      console.error(`[Atlas] Congress ${congress}: parsed ${lines.length} lines, chamberIdx=${chamberIdx}, got 0 House rows. First data line: ${lines[1]?.slice(0, 80)}`);
    }
    return result;
  }

  app.get("/api/voteview/:congress", async (req, res) => {
    const congress = parseInt(req.params.congress);
    if (isNaN(congress) || congress < 89 || congress > 119) {
      return res.status(400).json({ error: "Invalid congress number" });
    }
    const result = await loadVoteviewParty(congress);
    // Always return 200 — client handles empty gracefully with retry logic
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    return res.json(result);
  });

  // Voteview full member data: returns { "AL-3": { name, party, bioguide } }
  const voteviewMembersCache = new Map<string, Record<string, { name: string; party: string; bioguide: string }>>();
  // RFC 4180 CSV parser that handles quoted fields with embedded commas
  // (reuse parseCSVLineSimple defined above)
  function parseCSVLine(line: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        cols.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  }
  async function loadVoteviewMembers(congress: number): Promise<Record<string, { name: string; party: string; bioguide: string }>> {
    const cacheKey = String(congress);
    if (voteviewMembersCache.has(cacheKey)) return voteviewMembersCache.get(cacheKey)!;
    const csv = await fetchVoteviewCSV(congress);
    if (!csv) return {};
    const lines = csv.trim().split("\n");
    const headers = parseCSVLine(lines[0]);
    const chamberIdx = headers.indexOf("chamber");
    const stateIdx = headers.indexOf("state_abbrev");
    const distIdx = headers.indexOf("district_code");
    const partyIdx = headers.indexOf("party_code");
    const bioIdx = headers.indexOf("bioname");
    const bioguideIdx = headers.indexOf("bioguide_id");
    const result: Record<string, { name: string; party: string; bioguide: string }> = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols[chamberIdx] !== "House") continue;
      const state = cols[stateIdx];
      const dist = parseInt(cols[distIdx]);
      const party = parseInt(cols[partyIdx]);
      const bioname = (cols[bioIdx] ?? "").trim();
      const bioguide = (cols[bioguideIdx] ?? "").trim();
      if (!state || isNaN(dist)) continue;
      let name = bioname;
      if (name.includes(",")) {
        const commaIdx = name.indexOf(",");
        const last = name.slice(0, commaIdx).trim();
        const first = name.slice(commaIdx + 1).trim();
        const titleCase = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        name = `${first} ${titleCase(last)}`.trim();
      }
      result[`${state}-${dist}`] = { name, party: party === 100 ? "D" : party === 200 ? "R" : "I", bioguide };
    }
    // Only cache if we got actual data
    if (Object.keys(result).length > 0) {
      voteviewMembersCache.set(cacheKey, result);
    }
    return result;
  }

  app.get("/api/voteview/members/:congress", async (req, res) => {
    const congress = parseInt(req.params.congress);
    if (isNaN(congress) || congress < 89 || congress > 119) {
      return res.status(400).json({ error: "Invalid congress number" });
    }
    const result = await loadVoteviewMembers(congress);
    if (Object.keys(result).length === 0) {
      return res.status(503).json({ error: "Voteview unavailable" });
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.json(result);
  });

  // Pre-warm ALL congress bundles on startup (background, non-blocking)
  // CRITICAL: Skip pre-warm during election windows to preserve resources for AP engine
  // Incident Jul 21 2026: pre-warm exhausted 512MB instance, causing AP engine DB failures
  setImmediate(async () => {
    const { getElectionWindowStatus } = await import("../electionDates");
    const windowStatus = getElectionWindowStatus();
    if (windowStatus.isActive) {
      console.log("[Atlas] ⚠️ SKIPPING bundle pre-warm — election window ACTIVE. Preserving resources for AP engine.");
      // Only pre-warm the 3 most recent congresses (minimal footprint)
      const recentCongresses = [119, 118, 117];
      for (const c of recentCongresses) {
        await Promise.allSettled([buildCongressBundle(c)]);
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`[Atlas] Minimal pre-warm complete (${bundleCache.size} cached). Full pre-warm deferred.`);
      return;
    }
    console.log("[Atlas] Pre-warming all congress bundles (119 down to 89)...");
    // Start from 119th (most commonly viewed) and work backward
    const congresses = Array.from({ length: 31 }, (_, i) => 119 - i);
    // Build bundles in batches of 3 for faster warmup
    const BATCH_SIZE = 3;
    for (let i = 0; i < congresses.length; i += BATCH_SIZE) {
      const batch = congresses.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(c => buildCongressBundle(c)));
      if (i + BATCH_SIZE < congresses.length) await new Promise(r => setTimeout(r, 100));
    }
    console.log(`[Atlas] All congress bundles pre-warmed (${bundleCache.size} cached).`);
  });

  // Pre-warm Voteview data on server startup (background, non-blocking)
  // CRITICAL: Skip during election windows to preserve resources for AP engine
  setImmediate(async () => {
    const { getElectionWindowStatus } = await import("../electionDates");
    const windowStatus = getElectionWindowStatus();
    if (windowStatus.isActive) {
      console.log("[Atlas] ⚠️ SKIPPING Voteview pre-warm — election window ACTIVE.");
      return;
    }
    console.log("[Atlas] Pre-warming Voteview party data for all congresses...");
    const congresses = Array.from({ length: 31 }, (_, i) => 119 - i); // 119 down to 89
    const BATCH_SIZE = 8;
    for (let i = 0; i < congresses.length; i += BATCH_SIZE) {
      const batch = congresses.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (c) => {
          try {
            await loadVoteviewParty(c);
            await loadVoteviewMembers(c);
          } catch (err) {
            console.error(`[Atlas] Pre-warm failed for congress ${c}:`, err);
          }
        })
      );
      if (i + BATCH_SIZE < congresses.length) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    console.log("[Atlas] Voteview pre-warm complete.");
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      allowMethodOverride: true, // allow POST for query procedures (needed when batch GET URL exceeds 414 limit)
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Attach WebSocket server for live election push
  attachWebSocketServer(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ── Election-aware scheduler ─────────────────────────────────────────────────
  // Smart scheduler that only polls AP and runs promotions during election windows
  // (7 PM – 7 AM ET on configured election dates). Idle otherwise.
  const { initElectionScheduler } = await import("../electionScheduler");
  await initElectionScheduler();
}

startServer().catch(console.error);
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Rebuild trigger: Wed May  6 04:01:31 UTC 2026
