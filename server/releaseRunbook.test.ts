import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("VPS release runbook", () => {
  const script = readFileSync(new URL("../scripts/release-vps.sh", import.meta.url), "utf8");
  const runbook = readFileSync(new URL("../docs/RELEASE_RUNBOOK.md", import.meta.url), "utf8");

  it("builds dependencies on the VPS from the locked source release, then activates runtime atomically", () => {
    expect(script).toContain("pnpm vitest run --exclude server/tonPayoutWallet.credentials.test.ts --exclude server/tonApi.credentials.test.ts --pool=forks --poolOptions.forks.singleFork");
    expect(script).toContain('ITEMS=(dist node_modules package.json pnpm-lock.yaml scripts)');
    expect(script).toContain('dist package.json pnpm-lock.yaml patches/wouter@3.7.1.patch scripts');
    expect(script).toContain('install --frozen-lockfile --ignore-scripts');
    expect(script).toContain('node scripts/runtime-package-probe.mjs');
    expect(script).toContain('node "$STAGE/scripts/apply-entry-link-audit-migration.mjs"');
    expect(script).toContain('for item in "${ITEMS[@]}"; do mv "$BASE/$item" "$PREVIOUS/$item"; done');
    expect(script).toContain('tgtop-owner-dm-worker.service');
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

  it("fails safely before a release cannot make its backup and keeps bounded restore points", () => {
    expect(script).toContain('BACKUP_RETENTION="${TG_TOP_BACKUP_RETENTION:-5}"');
    expect(script).toContain('MIN_FREE_KB="${TG_TOP_RELEASE_MIN_FREE_KB:-786432}"');
    expect(script).toContain('STAGE_RETENTION_MINUTES="${TG_TOP_STAGE_RETENTION_MINUTES:-120}"');
    expect(script).toContain('SOURCE_RETENTION_MINUTES="${TG_TOP_SOURCE_RETENTION_MINUTES:-10080}"');
    expect(script).toContain('ensure_release_space');
    expect(script).toContain('Insufficient release space:');
    expect(script).toContain("prune_runtime_backups \"$((BACKUP_RETENTION - 1))\"");
    expect(script).toContain('prune_runtime_backups "$BACKUP_RETENTION"');
    expect(script).toContain('rm -rf -- "$PREVIOUS" "$STAGE"');
    expect(script).toContain('rm -f -- "$ARCHIVE"');
  });

  it("prevents overlapping releases and bounds stale staging artifacts", () => {
    expect(script).toContain('LOCK_FILE="$BASE/releases/.release.lock"');
    expect(script).toContain('flock -n 9 || { echo "Another TG TOP release is already running; refusing overlap" >&2; exit 1; }');
    expect(script).toContain('prune_release_artifacts');
    expect(script).toContain("-name 'stage-release-*' -o -name 'previous-release-*'");
    expect(script).toContain("-name 'release-*-source.tgz'");
  });
});
