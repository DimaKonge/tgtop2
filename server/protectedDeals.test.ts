import { describe, expect, it } from "vitest";
import {
  GROUP_TRANSFER_WINDOW_MS,
  canBuyerCancel,
  canReleaseAfterTransfer,
  getTransferDeadline,
} from "./protectedDeals";

describe("protected group deal policy", () => {
  it("sets a twenty-one-day owner-transfer deadline after verified funding", () => {
    const fundedAt = new Date("2026-08-14T00:00:00.000Z");
    expect(getTransferDeadline(fundedAt).getTime()).toBe(fundedAt.getTime() + GROUP_TRANSFER_WINDOW_MS);
    expect(GROUP_TRANSFER_WINDOW_MS).toBe(21 * 24 * 60 * 60 * 1000);
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
});
