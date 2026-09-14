import { describe, expect, it } from "vitest";
import { canOfferNftMode, normalizeNftListingModes, validateNftListingModes } from "./nftMarketplacePolicy";

describe("NFT marketplace listing modes", () => {
  it("allows a single NFT listing to expose several deal modes at once", () => {
    const modes = validateNftListingModes({ sale: true, auction: true, installments: true, rent: true });
    expect(modes).toEqual(["sale", "auction", "installments", "rent"]);
    expect(canOfferNftMode(modes, "auction")).toBe(true);
    expect(canOfferNftMode(modes, "collateral")).toBe(false);
  });

  it("does not create an empty listing", () => {
    expect(normalizeNftListingModes({})).toEqual([]);
    expect(() => validateNftListingModes({ collateral: false })).toThrow("Выберите хотя бы один режим сделки NFT");
  });
});
