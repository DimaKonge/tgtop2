import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerTelegramMediaRoutes } from "../telegramMedia";
import { registerTelegramLoginRoutes } from "../telegramLogin";
import { registerPublicCommunityPages } from "../publicCommunityPages";
import { getDb } from "../db";
import { serveStatic, setupVite } from "./vite";

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org https://manus-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://tgtop.me https://tgtop.xyz https://telegram.org https://*.telegram.org https://oauth.telegram.org https://tonapi.io https://*.tonapi.io https://bridge.tonapi.io https://manus-analytics.com",
  "frame-src 'self' https://telegram.org https://*.telegram.org https://app.tonkeeper.com",
  "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
  "report-uri /api/csp-report",
].join("; ");

const cspReportLogTimes = new Map<string, number>();

function toCspOrigin(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return "unknown";
  try {
    return new URL(value).origin;
  } catch {
    return value.slice(0, 80).replace(/[\r\n]/g, " ");
  }
}

function recordCspReport(payload: unknown) {
  const report = payload && typeof payload === "object" && "csp-report" in payload
    ? (payload as { "csp-report"?: Record<string, unknown> })["csp-report"]
    : undefined;
  if (!report) return;
  const directive = typeof report["effective-directive"] === "string"
    ? report["effective-directive"].slice(0, 80)
    : "unknown";
  const blockedOrigin = toCspOrigin(report["blocked-uri"]);
  const key = `${directive}:${blockedOrigin}`;
  const now = Date.now();
  const lastLoggedAt = cspReportLogTimes.get(key) ?? 0;
  if (now - lastLoggedAt < 60_000) return;
  cspReportLogTimes.set(key, now);
  if (cspReportLogTimes.size > 1_000) {
    for (const [reportKey, loggedAt] of Array.from(cspReportLogTimes.entries())) {
      if (now - loggedAt > 60_000) cspReportLogTimes.delete(reportKey);
    }
  }
  console.warn("[CSP Report-Only]", JSON.stringify({ directive, blockedOrigin }));
}

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

function applySecurityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

function createInMemoryRateLimit(windowMs: number, limit: number, maxTrackedClients = 20_000) {
  const requests = new Map<string, { count: number; resetAt: number }>();
  let nextPruneAt = 0;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    if (now >= nextPruneAt || requests.size >= maxTrackedClients) {
      for (const [trackedKey, tracked] of Array.from(requests.entries())) {
        if (tracked.resetAt <= now) requests.delete(trackedKey);
      }
      nextPruneAt = now + Math.min(windowMs, 15_000);
    }
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const previous = requests.get(key);
    if (!previous && requests.size >= maxTrackedClients) {
      res.status(429).json({ error: "Слишком много новых подключений. Повторите позже." });
      return;
    }
    const entry = !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : previous;
    entry.count += 1;
    requests.set(key, entry);
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > limit) {
      res.status(429).json({ error: "Слишком много запросов. Повторите через минуту." });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(applySecurityHeaders);
  const trpcRateLimit = createInMemoryRateLimit(60_000, 120);
  const cspReportRateLimit = createInMemoryRateLimit(60_000, 60, 1_000);
  app.get("/healthz", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("database_unavailable");
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "degraded" });
    }
  });
  app.post(
    "/api/csp-report",
    express.json({ type: ["application/csp-report", "application/json"], limit: "16kb" }),
    cspReportRateLimit,
    (req, res) => {
      recordCspReport(req.body);
      res.status(204).end();
    }
  );
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerTelegramMediaRoutes(app);
  registerTelegramLoginRoutes(app);
  registerPublicCommunityPages(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    trpcRateLimit,
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
