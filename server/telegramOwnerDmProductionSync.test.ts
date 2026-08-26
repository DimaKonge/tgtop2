import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("owner-DM production secret sync", () => {
  const source = readFileSync(new URL("../scripts/sync-manus-api-owner-dm-production.sh", import.meta.url), "utf8");

  it("uses a root-only dedicated environment file and a restartable separate worker", () => {
    expect(source).toContain("/etc/tgtop/manus-owner-dm.env");
    expect(source).toContain("install -m 0600");
    expect(source).toContain("tgtop-owner-dm-worker.service");
    expect(source).toContain("Restart=always");
  });

  it("does not print secrets or inspect the legacy runtime config", () => {
    expect(source).not.toContain("cat /etc/tgtop/runtime.conf");
    expect(source).not.toContain("echo \"$API_KEY");
    expect(source).toContain("rollback()");
  });
});
