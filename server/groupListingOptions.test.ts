import { describe, expect, it } from "vitest";
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

  it("retains the valid General subcategory used by migrated TG TOP listings", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "Global", subcategory: "General" })).toMatchObject({
      listingType: "catalog",
      country: "Global",
      subcategory: "General",
    });
  });
});
