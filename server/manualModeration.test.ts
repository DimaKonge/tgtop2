import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("manual moderation API", () => {
  it("returns active listings newest first and sends a notification only after a manual removal", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(dbSource).toContain("export async function getActiveModerationListings()");
    expect(dbSource).toContain(".where(eq(groupsCatalog.status, \"listed\"))");
    expect(dbSource).toContain(".orderBy(desc(groupsCatalog.listedAt), desc(groupsCatalog.createdAt))");
    expect(routerSource).toContain("getActiveModerationListings: protectedProcedure");
    expect(routerSource).toContain("notifyCommunityRemovedFromTop");
    expect(routerSource).toContain('input.action !== "approve"');
  });

  it("keeps an approved active listing in the listed lifecycle while approving a review-held group returns it pending", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(dbSource).toContain("getModeratedGroupLifecycle(group.status, action)");
    expect(dbSource).toContain("listedAt: lifecycle.keepsListedAt ? group.listedAt : null");
  });
});
