import { describe, expect, it } from "vitest";
import {
  GROUP_TRANSFER_WINDOW_MS,
  INSUFFICIENT_GRAM_BALANCE_MESSAGE,
  canBuyerCancel,
  canBuyerConfirmTransfer,
  canReleaseAfterTransfer,
  getTransferDeadline,
  hasSufficientGramBalance,
} from "./protectedDeals";

describe("protected group deal policy", () => {
  it("sets a twenty-one-day owner-transfer deadline after verified funding", () => {
    const fundedAt = new Date("2026-08-14T00:00:00.000Z");
    expect(getTransferDeadline(fundedAt).getTime()).toBe(fundedAt.getTime() + GROUP_TRANSFER_WINDOW_MS);
    expect(GROUP_TRANSFER_WINDOW_MS).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it("requires the complete GRAM sale price before a purchase offer can be created", () => {
    expect(hasSufficientGramBalance(0, 99_900)).toBe(false);
    expect(hasSufficientGramBalance(99_899, 99_900)).toBe(false);
    expect(hasSufficientGramBalance(99_900, 99_900)).toBe(true);
    expect(INSUFFICIENT_GRAM_BALANCE_MESSAGE).toBe("Недостаточно средств на балансе");
  });

  it("allows buyer cancellation only before ownership transfer is observed", () => {
    expect(canBuyerCancel("open")).toBe(true);
    expect(canBuyerCancel("escrow_funded")).toBe(true);
    expect(canBuyerCancel("active")).toBe(false);
    expect(canBuyerCancel("completed")).toBe(false);
  });

  it("permits release only after the bot-observed transfer state", () => {
    expect(canReleaseAfterTransfer("escrow_funded")).toBe(false);
    expect(canReleaseAfterTransfer("active")).toBe(true);
  });

  it("allows buyer acknowledgement only after the bot has observed owner-rights transfer", () => {
    expect(canBuyerConfirmTransfer("escrow_funded")).toBe(false);
    expect(canBuyerConfirmTransfer("active")).toBe(true);
    expect(canBuyerConfirmTransfer("completed")).toBe(false);
  });
});
