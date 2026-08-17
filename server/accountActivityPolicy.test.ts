import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("account activity policy", () => {
  it("unifies only persisted TG TOP records and labels recorded bids as distinct from paid Stars", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("export async function getAccountActivity");
    expect(source).toContain("starsRankingPaymentIntents");
    expect(source).toContain("rankingBidIntents");
    expect(source).toContain("getUserDeals(openId)");
    expect(source).toContain("getNftTransferHistory(openId)");
    expect(source).toContain('currency: "Stars"');
    expect(source).toContain('title: "ranking_bid"');
    expect(source).toContain('item.kind === "manual_bonus" ? "manual_bonus"');
    expect(source).toContain('if (group.category !== "Чаты") throw new Error("Автоочистка доступна только для чатов")');
    expect(source).toContain('if (listingOptions.anonymousListing && groups.some(group => group.category !== "Чаты"))');
    expect(source).toContain('Анонимное размещение доступно только для чатов');
    expect(source).toContain('city?: string');
    expect(source).toContain('export async function saveMyGroupsLayout(ownerOpenId: string, orderedGroupIds: number[], pinnedGroupIds: number[])');
    expect(source).toContain('orderBy(desc(groupsCatalog.ownerPinned), asc(groupsCatalog.ownerSortOrder), desc(groupsCatalog.createdAt))');
    expect(source).toContain('Порядок должен включать все ваши группы');
  });
});
