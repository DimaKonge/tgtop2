import type { Express } from "express";
import { ENV } from "./env";
import { BoundedTtlCache, InFlightRequestCoalescer } from "../resourceCache";

const MAX_STORAGE_KEY_LENGTH = 512;
const STORAGE_PRESIGN_TTL_MS = 30_000;
const storagePresignCache = new BoundedTtlCache<string>(1_024);
const storagePresignRequests = new InFlightRequestCoalescer<string>();

export function isSafeStorageKey(key: string | undefined): key is string {
  if (!key || key.length > MAX_STORAGE_KEY_LENGTH || key.includes("\\") || key.startsWith("/")) return false;
  return key.split("/").every(segment => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment) && segment !== "." && segment !== "..");
}

async function getPresignedStorageUrl(key: string): Promise<string> {
  const cached = storagePresignCache.get(key);
  if (cached) return cached;
  return storagePresignRequests.run(key, async () => {
    const secondCached = storagePresignCache.get(key);
    if (secondCached) return secondCached;
    const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
    forgeUrl.searchParams.set("path", key);
    const forgeResp = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
    if (!forgeResp.ok) throw new Error(`Storage backend status ${forgeResp.status}`);
    const { url } = (await forgeResp.json()) as { url?: unknown };
    if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("Storage backend returned an invalid URL");
    storagePresignCache.set(key, url, STORAGE_PRESIGN_TTL_MS);
    return url;
  });
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*key", async (req, res) => {
    const keyParts = (req.params as { key?: string | string[] }).key;
    const key = Array.isArray(keyParts) ? keyParts.join("/") : keyParts;
    if (!isSafeStorageKey(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const url = await getPresignedStorageUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed", err instanceof Error ? err.message : "unknown error");
      res.status(502).send("Storage proxy error");
    }
  });
}
