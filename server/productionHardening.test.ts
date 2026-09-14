import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("production HTTP hardening", () => {
  const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

  it("removes technology disclosure and protects tRPC from request floods", () => {
    expect(source).toContain('app.disable("x-powered-by")');
    expect(source).toContain('app.use(applySecurityHeaders)');
    expect(source).toContain('const trpcRateLimit = createInMemoryRateLimit(60_000, 120)');
    expect(source).toContain('res.setHeader("X-Content-Type-Options", "nosniff")');
    expect(source).toContain('res.status(429).json({ error: "Слишком много запросов. Повторите через минуту." })');
    expect(source).toContain('"/api/trpc",');
  });

  it("keeps unauthenticated request bodies small before routing to application code", () => {
    expect(source).toContain('app.use(express.json({ limit: "256kb", strict: true }))');
    expect(source).toContain('app.use(express.urlencoded({ limit: "64kb", extended: false }))');
    expect(source).not.toContain('express.json({ limit: "50mb" })');
  });

  it("provides a database-backed readiness endpoint without exposing internals", () => {
    expect(source).toContain('app.get("/healthz", async (_req, res) => {');
    expect(source).toContain('await db.execute(sql`SELECT 1`)');
    expect(source).toContain('res.status(503).json({ status: "degraded" })');
  });
});
