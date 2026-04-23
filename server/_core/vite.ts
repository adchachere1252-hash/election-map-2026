import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const OG_META = `
    <!-- Open Graph / Facebook / LinkedIn -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://electionmap-duqshn4d.manus.space" />
    <meta property="og:title" content="2026 U.S. Election Center \u2014 Live Congressional Tracker" />
    <meta property="og:description" content="Real-time 2026 U.S. congressional election tracker \u2014 Senate, House, Governor, and ballot referendums with live results and interactive maps." />
    <meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/og-image-1200x630_b394dbdf.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="2026 U.S. Election Center \u2014 Real-Time Congressional Tracker with interactive map" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="2026 U.S. Election Center \u2014 Live Congressional Tracker" />
    <meta name="twitter:description" content="Real-time 2026 U.S. congressional election tracker \u2014 Senate, House, Governor, and ballot referendums with live results and interactive maps." />
    <meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X/og-image-1200x630_b394dbdf.png" />`;

function injectOgMeta(html: string): string {
  // Remove any existing og/twitter meta tags from client/index.html to avoid duplicates
  const cleaned = html.replace(/\s*<!-- Open Graph[\s\S]*?-->\s*/g, '').replace(/\s*<!-- Twitter Card[\s\S]*?-->\s*/g, '');
  return cleaned.replace('</head>', `${OG_META}\n  </head>`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    // The Manus proxy only forwards WebSocket connections on the /election-ws path
    // (used by the app's own election push). Vite HMR requires the 'vite-hmr'
    // subprotocol which the proxy rejects. Disabling HMR here prevents the
    // 'failed to connect to websocket' error in the browser console.
    // HMR still works when accessing the server directly on localhost:3000.
    hmr: false,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Intercept @vite/client to strip the WebSocket HMR connection code.
  // The Manus proxy only forwards WebSocket connections on /election-ws (app's
  // own live push). Vite HMR uses a 'vite-hmr' subprotocol that the proxy
  // rejects, causing persistent console errors. We serve a patched version of
  // @vite/client that skips the WebSocket connection attempt.
  app.use("/@vite/client", async (req, res, next) => {
    try {
      // Let Vite transform the client script first
      const clientScript = await vite.transformRequest("/@vite/client");
      if (clientScript?.code) {
        // Replace the WebSocket connect call with a mock that never connects.
        // The mock satisfies the HMR client's interface (onopen/onclose/send)
        // but never fires onopen, so the client silently gives up after retries.
        // Full mock that satisfies every method Vite's HMR client calls.
        // IMPORTANT: addEventListener must NOT fire any events — if 'close' fires
        // before 'open', Vite throws "WebSocket closed without opened".
        // readyState=1 (OPEN) prevents the "closed without opened" rejection path.
        const mockWs = `({
          readyState: 1,
          send: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          set onopen(fn) {},
          set onclose(fn) {},
          set onerror(fn) {},
          set onmessage(fn) {}
        })`;
        const patched = clientScript.code
          // Patch the main HMR transport createConnection
          .replace(
            /createConnection:\s*\(\)\s*=>\s*new WebSocket\([^)]+\),/g,
            `createConnection: () => ${mockWs},`
          )
          // Patch the vite-ping WebSocket (used to check if server is alive after disconnect)
          // Replace it with a mock that immediately resolves as "not reachable" (false)
          .replace(
            /const socket = new WebSocket\(socketUrl, "vite-ping"\);/g,
            `const socket = ${mockWs}; if (false) /* vite-ping disabled */`
          );
        res.set("Content-Type", "application/javascript");
        res.set("Cache-Control", "no-cache");
        return res.send(patched);
      }
    } catch {
      // fall through to Vite middleware
    }
    next();
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    // Never serve HTML for API routes — let tRPC/Express handle them with JSON
    if (url.startsWith("/api/")) return next();

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(injectOgMeta(page));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist — inject OG meta tags for crawlers
  app.use("*", (req, res) => {
    // Never serve HTML for API routes
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ error: "API route not found" });
    }
    const indexPath = path.resolve(distPath, "index.html");
    fs.readFile(indexPath, "utf-8", (err, html) => {
      if (err) return res.status(500).send("Server error");
      res.set("Content-Type", "text/html").send(injectOgMeta(html));
    });
  });
}
