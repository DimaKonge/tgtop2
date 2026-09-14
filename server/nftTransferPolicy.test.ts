import { describe, expect, it } from "vitest";
import { getNftTransferRequirements, normalizeTelegramRecipient } from "./nftTransferPolicy";

describe("NFT transfer recipient policy", () => {
  it("normalizes Telegram IDs to verified TG TOP open IDs", () => {
    expect(normalizeTelegramRecipient(" 123456789 ")).toEqual({
      kind: "openId",
      value: "telegram:123456789",
    });
    expect(normalizeTelegramRecipient("telegram:123456789")).toEqual({
      kind: "openId",
      value: "telegram:123456789",
    });
  });

  it("normalizes recipient usernames without preserving the @ sign", () => {
    expect(normalizeTelegramRecipient("@TgTop_User")).toEqual({
      kind: "username",
      value: "tgtop_user",
    });
  });

  it("rejects empty or malformed recipient input", () => {
    expect(() => normalizeTelegramRecipient(" ")).toThrow("Укажите @username или Telegram ID получателя");
    expect(() => normalizeTelegramRecipient("@not-valid!")).toThrow("Укажите корректный @username или Telegram ID получателя");
  });

  it("requires wallet proof only for on-chain transfers and charges no platform fee", () => {
    expect(getNftTransferRequirements("onchain")).toEqual({
      requiresWalletSignature: true,
      requiresVerifiedRecipientWallet: true,
      platformFeePercent: 0,
    });
    expect(getNftTransferRequirements("offchain")).toEqual({
      requiresWalletSignature: false,
      requiresVerifiedRecipientWallet: false,
      platformFeePercent: 0,
    });
  });
});
