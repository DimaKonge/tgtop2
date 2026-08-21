import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("owner leaderboard data policy", () => {
  it("uses public owners with listed or connected communities and recorded audience totals", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain('export async function getOwnerLeaderboard');
    expect(source).toContain('inArray(groupsCatalog.status, ["listed", "pending"])');
    expect(source).toContain('eq(users.publicProfile, true)');
    expect(source).toContain('COALESCE(SUM(${groupsCatalog.membersCount}), 0)');
    expect(source).toContain('COUNT(${groupsCatalog.id})');
  });
});
