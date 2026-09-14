export const NFT_LISTING_MODES = ["sale", "auction", "installments", "rent", "collateral"] as const;

export type NftListingMode = (typeof NFT_LISTING_MODES)[number];

export type NftListingModeSelection = Partial<Record<NftListingMode, boolean>>;

export function normalizeNftListingModes(input: NftListingModeSelection): NftListingMode[] {
  return NFT_LISTING_MODES.filter(mode => input[mode] === true);
}

export function validateNftListingModes(input: NftListingModeSelection): NftListingMode[] {
  const enabled = normalizeNftListingModes(input);
  if (!enabled.length) throw new Error("Выберите хотя бы один режим сделки NFT");
  return enabled;
}

export function canOfferNftMode(enabledModes: readonly NftListingMode[], mode: NftListingMode): boolean {
  return enabledModes.includes(mode);
}
