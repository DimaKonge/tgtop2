import { describe, expect, it } from "vitest";
import { normalizeGroupListingOptions } from "./db";

describe("normalizeGroupListingOptions", () => {
  it("keeps a normal catalog listing free of sale and rental fields", () => {
    expect(normalizeGroupListingOptions({ listingType: "catalog", country: "UA" })).toEqual({
      listingType: "catalog",
      salePriceTon: null,
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
      country: "UA",
    });
  });

  it("retains both sale and rental terms for a combined marketplace listing", () => {
    expect(normalizeGroupListingOptions({
      listingType: "both",
      salePriceTon: "250",
      rentalPriceTon: "3.5",
      minRentalDays: 7,
      maxRentalDays: 30,
      country: "Global",
    })).toEqual({
      listingType: "both",
      salePriceTon: "250",
      rentalPriceTon: "3.5",
      minRentalDays: 7,
      maxRentalDays: 30,
      country: "Global",
    });
  });

  it("supports the legacy sale-price argument without retaining rental fields", () => {
    expect(normalizeGroupListingOptions("42.25")).toEqual({
      listingType: "sale",
      salePriceTon: "42.25",
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
      country: undefined,
    });
  });
});
