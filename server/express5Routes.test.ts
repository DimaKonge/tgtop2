import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Express 5 route compatibility", () => {
  it("uses named wildcards for development and SPA fallbacks", () => {
    const vite = readFileSync(new URL("./_core/vite.ts", import.meta.url), "utf8");

    expect(vite).toContain('app.use("/{*splat}", async (req, res, next) => {');
    expect(vite).toContain('app.get("/{*splat}", (_req, res) => {');
    expect(vite).not.toContain('app.use("*"');
  });

  it("preserves nested storage keys through an Express 5 named wildcard", () => {
    const storage = readFileSync(new URL("./_core/storageProxy.ts", import.meta.url), "utf8");

    expect(storage).toContain('app.get("/manus-storage/*key", async (req, res) => {');
    expect(storage).toContain('Array.isArray(keyParts) ? keyParts.join("/") : keyParts');
  });
});
