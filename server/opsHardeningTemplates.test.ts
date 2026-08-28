import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("TG TOP staged hardening templates", () => {
  const nginxZones = readFileSync(new URL("../ops/nginx/tgtop-rate-zones.conf", import.meta.url), "utf8");
  const nginxEdge = readFileSync(new URL("../ops/nginx/tgtop-edge-server.conf", import.meta.url), "utf8");
  const systemd = readFileSync(new URL("../ops/systemd/tgtop-hardening.conf", import.meta.url), "utf8");
  const backupRunbook = readFileSync(new URL("../ops/backup/README.md", import.meta.url), "utf8");

  it("adds narrowly scoped media, login and CSP limits without weakening financial limits", () => {
    expect(nginxZones).toContain("zone=tgtop_media_per_ip:10m rate=4r/s");
    expect(nginxZones).toContain("zone=tgtop_login_per_ip:10m rate=12r/m");
    expect(nginxEdge).toContain('location ~ "^/api/telegram-avatar/-?[0-9]{1,32}$"');
    expect(nginxEdge).toContain("location ^~ /manus-storage/");
    expect(nginxEdge).toContain("location = /api/auth/telegram/login");
    expect(nginxEdge).toContain("location = /api/csp-report");
    expect(nginxEdge).toContain("zone=tgtop_finance_per_ip burst=2 nodelay");
    expect(nginxEdge).toContain("client_max_body_size 256k");
  });

  it("uses least-privilege service restrictions and leaves a tested recovery path", () => {
    expect(systemd).toContain("NoNewPrivileges=true");
    expect(systemd).toContain("ProtectSystem=full");
    expect(systemd).toContain("ProtectHome=true");
    expect(systemd).toContain("CapabilityBoundingSet=");
    expect(backupRunbook).toContain("fail-closed");
    expect(backupRunbook).toContain("off-host");
    expect(backupRunbook).toContain("new empty test database");
    expect(backupRunbook).toContain("mariadb-dump --single-transaction --quick --routines --events --triggers --databases");
  });
});
