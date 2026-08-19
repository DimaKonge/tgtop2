import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ranking placement persistence", () => {
  it("updates a higher bid in the same cell without resetting its occupancy time", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("const bidChanged = slot.bidAmount !== (source?.bidAmount ?? 0);");
    expect(source).toContain("updatedAt: groupChanged ? now : slot.updatedAt");
  });
});
