import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { attachWebSocketServer } from "../ws";
import { handleScheduledApUpdate } from "../scheduledApUpdate";
import { registerScheduledRoutes } from "../scheduledRoutes";

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
  const server = createServer(app);
  // Enable gzip compression for all responses (especially large GeoJSON files)
  app.use(compression());
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Scheduled task: AP election results auto-update (accessible by cron cookie)
  // NOTE: The Manus proxy blocks /api/scheduled/* but passes /api/scheduled-task/* through
  // Register multiple path variants to handle proxy routing
  app.post("/api/scheduled-task/ap-update", handleScheduledApUpdate);
  app.post("/ap-update", handleScheduledApUpdate);
  app.post("/scheduled/ap-update", handleScheduledApUpdate);
  // Password-based scheduled routes (includes /api/scheduled/ap-update with body password)
  registerScheduledRoutes(app);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // GeoJSON proxy: fetch Lewis congressional district boundaries from GitHub
  // This bypasses CORS restrictions in the browser sandbox
  // Server-side in-memory cache: avoids re-fetching large files (e.g. NC 4.5MB) on every request
  const geoJsonServerCache = new Map<string, string>();
  const geoJsonFetchInFlight = new Map<string, Promise<string | null>>();

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
          return data;
        } catch (err) {
          console.error(`[GeoJSON proxy] Attempt ${attempt + 1} failed for ${filename}:`, err);
        }
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
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
    return res.send(data);
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
    res.setHeader("Cache-Control", "public, max-age=86400");
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

  // Pre-warm 89th Congress GeoJSON files on startup (background, non-blocking)
  // This ensures the large NC file (4.5MB) is cached before the first client request,
  // preventing NC from appearing missing at the start of the Historical Atlas.
  setImmediate(async () => {
    const CONGRESS_89_FILES = [
      "Alabama_089_to_089.geojson","Alaska_086_to_102.geojson","Arizona_088_to_089.geojson",
      "Arkansas_088_to_089.geojson","California_088_to_090.geojson","Colorado_089_to_092.geojson",
      "Connecticut_089_to_092.geojson","Delaware_001_to_097.geojson","Florida_088_to_089.geojson",
      "Georgia_089_to_092.geojson","Hawaii_086_to_091.geojson","Idaho_066_to_089.geojson",
      "Illinois_088_to_089.geojson","Indiana_078_to_089.geojson","Iowa_088_to_092.geojson",
      "Kansas_088_to_089.geojson","Kentucky_088_to_089.geojson","Louisiana_063_to_090.geojson",
      "Maine_088_to_097.geojson","Maryland_088_to_089.geojson","Massachusetts_088_to_090.geojson",
      "Michigan_089_to_092.geojson","Minnesota_088_to_092.geojson","Mississippi_088_to_089.geojson",
      "Missouri_088_to_089.geojson","Montana_051_to_117.geojson","Nebraska_088_to_090.geojson",
      "Nevada_042_to_097.geojson","New Hampshire_048_to_091.geojson","New Jersey_088_to_089.geojson",
      "New Mexico_062_to_090.geojson","New York_088_to_090.geojson","North Carolina_088_to_089.geojson",
      "North Dakota_051_to_119.geojson","Ohio_063_to_089.geojson","Oklahoma_083_to_090.geojson",
      "Oregon_078_to_089.geojson","Pennsylvania_088_to_089.geojson","Rhode Island_089_to_092.geojson",
      "South Carolina_089_to_089.geojson","South Dakota_051_to_119.geojson","Tennessee_083_to_089.geojson",
      "Texas_043_to_089.geojson","Utah_064_to_089.geojson","Vermont_013_to_119.geojson",
      "Virginia_083_to_089.geojson","Washington_087_to_090.geojson","West Virginia_088_to_090.geojson",
      "Wisconsin_089_to_092.geojson","Wyoming_051_to_119.geojson",
    ];
    console.log("[Atlas] Pre-warming 89th Congress GeoJSON files...");
    // Fetch in batches of 5 to avoid overwhelming GitHub CDN
    for (let i = 0; i < CONGRESS_89_FILES.length; i += 5) {
      const batch = CONGRESS_89_FILES.slice(i, i + 5);
      await Promise.allSettled(batch.map(f => fetchGeoJsonFromGitHub(f)));
      if (i + 5 < CONGRESS_89_FILES.length) await new Promise(r => setTimeout(r, 200));
    }
    console.log("[Atlas] 89th Congress GeoJSON pre-warm complete.");
  });

  // Pre-warm all 31 congresses on server startup (background, non-blocking)
  // Use batches of 5 with 500ms delay to avoid rate-limiting Voteview
  setImmediate(async () => {
    console.log("[Atlas] Pre-warming Voteview party data for all congresses (batched)...");
    const congresses = Array.from({ length: 31 }, (_, i) => 119 - i); // 119 down to 89
    const BATCH_SIZE = 5;
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
        await new Promise(r => setTimeout(r, 500));
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

  // ── Auto AP update: pull fresh results every 2 minutes ──────────────────────
  // This runs server-side so results flow in automatically without needing
  // an external heartbeat. Only runs when there are active election dates.
  const { scrapeAndPushResults } = await import("../scheduledApUpdate");
  const AUTO_UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  setInterval(async () => {
    try {
      const result = await scrapeAndPushResults();
      const okCount = result.updates.filter(u => u.status === "ok").length;
      const skipCount = result.updates.filter(u => u.status === "skip").length;
      const errCount = result.updates.filter(u => u.status === "error").length;
      console.log(`[AutoUpdate] Done — Updated: ${okCount} | Skipped: ${skipCount} | Errors: ${errCount}`);
    } catch (err) {
      console.error("[AutoUpdate] Error:", err instanceof Error ? err.message : String(err));
    }
  }, AUTO_UPDATE_INTERVAL_MS);
  console.log(`[AutoUpdate] AP results auto-update scheduled every ${AUTO_UPDATE_INTERVAL_MS / 1000}s`);
}

startServer().catch(console.error);
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Rebuild trigger: Wed May  6 04:01:31 UTC 2026
