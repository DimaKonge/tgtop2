import { describe, expect, it } from "vitest";
import { canCancelNftRental, canConfirmNftRental, rentalTotalUnits, validateRentalDays } from "./nftRentalPolicy";

describe("NFT username rental safety policy", () => {
  it("validates the configured rental window", () => {
    expect(validateRentalDays(30, 7, 365)).toBe(true);
    expect(validateRentalDays(6, 7, 365)).toBe(false);
    expect(validateRentalDays(366, 7, 365)).toBe(false);
  });

  it("calculates the total in integer GRAM units", () => {
    expect(rentalTotalUnits(125, 30)).toBe(3750);
    expect(() => rentalTotalUnits(1.5, 30)).toThrow("Некорректная сумма");
  });

  it("allows cancellation only before activation and confirmation only after observed assignment", () => {
    expect(canCancelNftRental("open")).toBe(true);
    expect(canCancelNftRental("escrow_funded")).toBe(true);
    expect(canCancelNftRental("active")).toBe(false);
    expect(canConfirmNftRental("escrow_funded", false)).toBe(false);
    expect(canConfirmNftRental("active", false)).toBe(false);
    expect(canConfirmNftRental("active", true)).toBe(true);
  });
});
