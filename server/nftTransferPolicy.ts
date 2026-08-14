export type NftAssetClass = "onchain" | "offchain";

export type NormalizedRecipient =
  | { kind: "openId"; value: string }
  | { kind: "username"; value: string };

export function normalizeTelegramRecipient(input: string): NormalizedRecipient {
  const value = input.trim();
  if (!value) throw new Error("Укажите @username или Telegram ID получателя");

  const numericId = value.replace(/^telegram:/i, "");
  if (/^\d{4,20}$/.test(numericId)) {
    return { kind: "openId", value: `telegram:${numericId}` };
  }

  const username = value.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{5,32}$/i.test(username)) {
    throw new Error("Укажите корректный @username или Telegram ID получателя");
  }
  return { kind: "username", value: username };
}

export function getNftTransferRequirements(assetClass: NftAssetClass) {
  return assetClass === "onchain"
    ? { requiresWalletSignature: true, requiresVerifiedRecipientWallet: true, platformFeePercent: 0 }
    : { requiresWalletSignature: false, requiresVerifiedRecipientWallet: false, platformFeePercent: 0 };
}

export function getNftTransferReference(): string {
  return `nft_${Date.now().toString(36)}`;
}
