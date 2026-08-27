import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canCreateNftListing, canPublishNftListing } from "./nftOwnershipPublicationPolicy";

describe("NFT ownership truthfulness", () => {
  it("does not create or publicly show unverified on-chain listings", () => {
    expect(canCreateNftListing("offchain")).toBe(true);
    expect(canCreateNftListing("onchain")).toBe(false);
    expect(canPublishNftListing({ assetClass: "offchain", ownershipVerifiedAt: null })).toBe(true);
    expect(canPublishNftListing({ assetClass: "onchain", ownershipVerifiedAt: null })).toBe(false);
    expect(canPublishNftListing({ assetClass: "onchain", ownershipVerifiedAt: new Date() })).toBe(true);
  });

  it("does not retain an automatic off-chain ownership completion endpoint", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(dbSource).not.toContain("export async function completeOffchainNftTransfer(");
    expect(routerSource).not.toContain("completeOffchainNftTransfer: protectedProcedure");
    expect(homeSource).not.toContain("completeOffchainNftTransferMutation");
    expect(homeSource).toContain("Заявка на передачу");
    expect(homeSource).toContain("не передает NFT автоматически");
  });
});
