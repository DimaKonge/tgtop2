import type { NftAssetClass } from "./nftTransferPolicy";

export function canPublishNftListing(input: { assetClass: NftAssetClass; ownershipVerifiedAt: Date | null }) {
  return input.assetClass === "offchain" || input.ownershipVerifiedAt !== null;
}

export function canCreateNftListing(assetClass: NftAssetClass) {
  return assetClass === "offchain";
}
