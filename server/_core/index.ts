import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
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
  app.get("/api/geojson/:filename", async (req, res) => {
    const { filename } = req.params;
    // Validate filename: only allow .geojson files with safe characters
    if (!/^[A-Za-z0-9_\-]+\.geojson$/.test(filename)) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    const url = `https://raw.githubusercontent.com/JeffreyBLewis/congressional-district-boundaries/master/GeoJson/${filename}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Not found" });
      }
      const data = await response.text();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
      return res.send(data);
    } catch (err) {
      console.error("GeoJSON proxy error:", err);
      return res.status(500).json({ error: "Proxy fetch failed" });
    }
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
}

startServer().catch(console.error);
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Redeploy trigger: 2026-05-06 04:24:53 UTC
// Rebuild trigger: Wed May  6 04:01:31 UTC 2026
