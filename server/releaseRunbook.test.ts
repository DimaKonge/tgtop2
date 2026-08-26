import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("VPS release runbook", () => {
  const script = readFileSync(new URL("../scripts/release-vps.sh", import.meta.url), "utf8");
  const runbook = readFileSync(new URL("../docs/RELEASE_RUNBOOK.md", import.meta.url), "utf8");

  it("ships dist and runtime dependencies as one atomic release unit", () => {
    expect(script).toContain('ITEMS=(dist node_modules package.json pnpm-lock.yaml)');
    expect(script).toContain('tar -C "$PROJECT_DIR" -czf "$ARCHIVE" dist node_modules package.json pnpm-lock.yaml');
    expect(script).toContain('for item in "${ITEMS[@]}"; do mv "$BASE/$item" "$PREVIOUS/$item"; done');
  });

  it("checks integrity and rolls back on a service or readiness failure", () => {
    expect(script).toContain('sha256sum "$ARCHIVE"');
    expect(script).toContain('rollback() {');
    expect(script).toContain('systemctl is-active --quiet "$unit" || { rollback; exit 1; }');
    expect(script).toContain('http://127.0.0.1:3000/healthz');
    expect(runbook).toContain('Не выполняйте `git reset`');
  });
});
