import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeGroupListingOptions } from "./db";

describe("normalizeGroupListingOptions", () => {
  it("keeps a normal catalog listing free of sale and rental fields", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "UA" })).toMatchObject({
      listingType: "catalog",
      salePriceTon: null,
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
      country: "UA",
    });
  });

  it("keeps group and channel listings limited to a sale or catalog", () => {
    expect(normalizeGroupListingOptions({
      listingType: "sale",
      salePriceTon: "250",
      country: "Global",
    })).toMatchObject({
      listingType: "sale",
      salePriceTon: "250",
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
      country: "Global",
    });
  });

  it("supports the legacy sale-price argument without retaining rental fields", () => {
    expect(normalizeGroupListingOptions("42.25")).toMatchObject({
      listingType: "sale",
      salePriceTon: "42.25",
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
      country: undefined,
    });
  });

  it("clears the sale state when the owner turns off the sale switch", () => {
    expect(normalizeGroupListingOptions({ salePriceTon: null })).toMatchObject({
      listingType: "catalog",
      salePriceTon: null,
    });
  });

  it("retains an optional card background override while null keeps the global palette fallback", () => {
    expect(normalizeGroupListingOptions({ cardBackgroundPreset: "pure_gold" })).toMatchObject({
      cardBackgroundPreset: "pure_gold",
    });
    expect(normalizeGroupListingOptions({ cardBackgroundPreset: null })).toMatchObject({
      cardBackgroundPreset: null,
    });
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    expect(router).toContain('cardBackgroundPreset: z.enum(CARD_BACKGROUND_PRESET_IDS).nullable().optional()');
    expect(schema).toContain('cardBackgroundPreset: varchar("cardBackgroundPreset", { length: 64 })');
  });

  it("retains the valid General subcategory used by migrated TG TOP listings", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global", subcategory: "General" })).toMatchObject({
      listingType: "catalog",
      country: "Global",
      subcategory: "General",
    });
  });

  it("retains monthly Stars entry settings for an eligible private channel listing", () => {
    expect(normalizeGroupListingOptions({
      listingType: "catalog",
      country: "Global",
      monthlyEntryEnabled: true,
      monthlyEntryStars: 11,
      monthlyEntryLinkName: "TG TOP monthly",
    })).toMatchObject({
      monthlyEntryEnabled: true,
      monthlyEntryStars: 11,
      monthlyEntryLinkName: "TG TOP monthly",
    });
  });

  it("retains anonymous-listing preference for the bulk chat-listing flow", () => {
    expect(normalizeGroupListingOptions({
      listingType: "catalog",
      country: "Global",
      anonymousListing: true,
    })).toMatchObject({
      anonymousListing: true,
    });
  });

  it("uses anonymous listing by default unless the owner explicitly reveals their listing", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global" })).toMatchObject({
      anonymousListing: true,
    });
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global", anonymousListing: false })).toMatchObject({
      anonymousListing: false,
    });
  });

  it("keeps the manager publicly visible by default and accepts an explicit hide preference", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global" })).toMatchObject({
      managerPublic: true,
    });
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global", managerPublic: false })).toMatchObject({
      managerPublic: false,
    });
  });

  it("retains internal-GRAM reward campaign settings for server-side validation", () => {
    expect(normalizeGroupListingOptions({
      rewardActive: true,
      rewardBudget: 500,
      rewardPerSubscription: 1,
      rewardPerInvite: 2,
      rewardPerManualAdd: 1,
    })).toMatchObject({
      rewardActive: true,
      rewardBudget: 500,
      rewardPerSubscription: 1,
      rewardPerInvite: 2,
      rewardPerManualAdd: 1,
    });
  });

  it("awaits animated media snapshot persistence after a successful listing", () => {
    const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("await Promise.all(groups.map(group => refreshListedGroupMediaSnapshot(group)))");
    expect(source).not.toContain("void Promise.all(groups.map(group => refreshListedGroupMediaSnapshot(group)))");
  });

  it("keeps listing balance validation inside the transaction that performs the debit", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const start = source.indexOf("export async function listGroupsWithCredits");
    const end = source.indexOf("export async function saveMonthlyEntryInviteLink", start);
    const listing = source.slice(start, end);

    expect(listing).toContain("const debitUnits = totalCost + reservedRewardBudget - releasedRewardBudget;");
    expect(listing).toContain("gte(users.bonusBalance, debitUnits)");
    expect(listing).toContain('if (!debit[0]?.affectedRows) throw new Error("Недостаточно бонусных GRAM")');
    expect(listing).not.toContain("const user = await getUserByOpenId(ownerOpenId);");
  });
});
