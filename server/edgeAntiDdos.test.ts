import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Nginx edge anti-DDoS policy", () => {
  const zones = readFileSync(new URL("../deploy/nginx/tgtop-rate-zones.conf", import.meta.url), "utf8");
  const server = readFileSync(new URL("../deploy/nginx/tgtop-edge-server.conf", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/apply-edge-antiddos-vps.sh", import.meta.url), "utf8");

  it("limits API and finance mutations while leaving static routes outside request throttling", () => {
    expect(zones).toContain("rate=30r/s");
    expect(zones).toContain("rate=6r/m");
    expect(server).toContain("location = /api/trpc/wallet.createTonWithdrawal");
    expect(server).toContain("location ^~ /api/trpc/");
    expect(server).not.toContain("location ^~ /assets/");
    expect(server).toContain("limit_conn tgtop_connections_per_ip 40");
  });

  it("makes the proxy change reversible and validates Nginx before reload", () => {
    expect(script).toContain("rollback() {");
    expect(script).toContain("nginx -t");
    expect(script).toContain("systemctl reload nginx");
    expect(script).toContain("https://tgtop.me/healthz");
  });
});
