import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("CSP Report-Only perimeter", () => {
  const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

  it("observes CSP violations without enforcing a policy during Telegram and wallet compatibility review", () => {
    expect(source).toContain('"Content-Security-Policy-Report-Only"');
    expect(source).toContain('"report-uri /api/csp-report"');
    expect(source).toContain("https://telegram.org");
    expect(source).toContain("https://bridge.tonapi.io");
    expect(source).toContain("https://config.ton.org");
    expect(source).not.toContain('setHeader("Content-Security-Policy", CSP_REPORT_ONLY)');
  });

  it("keeps reports bounded, sanitised and independent of business or financial flows", () => {
    expect(source).toContain('app.post(\n    "/api/csp-report"');
    expect(source).toContain('limit: "16kb"');
    expect(source).toContain("createInMemoryRateLimit(60_000, 60, 1_000)");
    expect(source).toContain("toCspOrigin");
    expect(source).toContain("[CSP Report-Only]");
  });
});
