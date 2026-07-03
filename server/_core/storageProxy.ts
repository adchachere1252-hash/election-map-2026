import type { Express } from "express";
import { ENV } from "./env";

/**
 * Storage proxy that fetches images server-side and pipes them to the client.
 * Uses a dual-CDN fallback strategy:
 *   1. Try presign/get (private CDN with signed URLs) - works for most files
 *   2. Fall back to downloadUrl (public CDN) - works for recently uploaded files
 * 
 * This avoids the 307 redirect approach which fails when CDN returns 403 to the client.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as any)[0] as string;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "") + "/";
    const headers = { Authorization: `Bearer ${ENV.forgeApiKey}` };

    try {
      // Strategy 1: Try presign/get (private CDN with signed URL)
      const presignUrl = new URL("v1/storage/presign/get", baseUrl);
      presignUrl.searchParams.set("path", key);
      const presignResp = await fetch(presignUrl, { headers });

      if (presignResp.ok) {
        const { url } = (await presignResp.json()) as { url: string };
        if (url) {
          const imgResp = await fetch(url);
          if (imgResp.ok && imgResp.body) {
            const contentType = imgResp.headers.get("content-type") || "image/jpeg";
            const contentLength = imgResp.headers.get("content-length");
            res.set("Content-Type", contentType);
            if (contentLength) res.set("Content-Length", contentLength);
            res.set("Cache-Control", "public, max-age=86400");
            // Pipe the response body
            const buffer = Buffer.from(await imgResp.arrayBuffer());
            res.send(buffer);
            return;
          }
        }
      }

      // Strategy 2: Fall back to downloadUrl (public CDN)
      const downloadUrl = new URL("v1/storage/downloadUrl", baseUrl);
      downloadUrl.searchParams.set("path", key);
      const downloadResp = await fetch(downloadUrl, { headers });

      if (downloadResp.ok) {
        const { url } = (await downloadResp.json()) as { url: string };
        if (url) {
          const imgResp = await fetch(url);
          if (imgResp.ok && imgResp.body) {
            const contentType = imgResp.headers.get("content-type") || "image/jpeg";
            const contentLength = imgResp.headers.get("content-length");
            res.set("Content-Type", contentType);
            if (contentLength) res.set("Content-Length", contentLength);
            res.set("Cache-Control", "public, max-age=86400");
            const buffer = Buffer.from(await imgResp.arrayBuffer());
            res.send(buffer);
            return;
          }
        }
      }

      // Both strategies failed
      console.error(`[StorageProxy] Both CDN strategies failed for key: ${key}`);
      res.status(502).send("Storage backend error - file not accessible on either CDN");
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
