import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

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
        const mockWs = `({
          readyState: 3,
          send: () => {},
          close: () => {},
          set onopen(fn) {},
          set onclose(fn) { setTimeout(() => fn && fn({ code: 1000 }), 0); },
          set onerror(fn) {},
          set onmessage(fn) {}
        })`;
        const patched = clientScript.code
          .replace(
            /createConnection:\s*\(\)\s*=>\s*new WebSocket\([^)]+\),/g,
            `createConnection: () => ${mockWs},`
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
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
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

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
