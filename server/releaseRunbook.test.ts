import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("VPS release runbook", () => {
  const script = readFileSync(new URL("../scripts/release-vps.sh", import.meta.url), "utf8");
  const runbook = readFileSync(new URL("../docs/RELEASE_RUNBOOK.md", import.meta.url), "utf8");

  it("builds dependencies on the VPS from the locked source release, then activates runtime atomically", () => {
    expect(script).toContain("pnpm vitest run --exclude server/tonPayoutWallet.credentials.test.ts --exclude server/tonApi.credentials.test.ts --pool=forks --poolOptions.forks.singleFork");
    expect(script).toContain('ITEMS=(dist node_modules package.json pnpm-lock.yaml)');
    expect(script).toContain('dist package.json pnpm-lock.yaml patches/wouter@3.7.1.patch scripts/runtime-package-probe.mjs scripts/apply-entry-link-audit-migration.mjs');
    expect(script).toContain('install --frozen-lockfile --ignore-scripts');
    expect(script).toContain('node scripts/runtime-package-probe.mjs');
    expect(script).toContain('node "$STAGE/scripts/apply-entry-link-audit-migration.mjs"');
    expect(script).toContain('for item in "${ITEMS[@]}"; do mv "$BASE/$item" "$PREVIOUS/$item"; done');
  });

  it("checks integrity and rolls back on a service or readiness failure", () => {
    expect(script).toContain('sha256sum "$ARCHIVE"');
    expect(script).toContain('rollback() {');
    expect(script).toContain('systemctl is-active --quiet "$unit" || { rollback; exit 1; }');
    expect(script).toContain('http://127.0.0.1:3000/healthz');
    expect(script).toContain('stage_health=ok');
    expect(runbook).toContain('Не выполняйте `git reset`');
    expect(runbook).toContain('не копируются с локальной машины');
    expect(runbook).toContain('узкая additive migration');
  });
});
