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
    const homeSource = ["../client/src/pages/Home.tsx", "../client/src/pages/useHomeController.ts", "../client/src/pages/home-helpers.ts", "../client/src/pages/TopPage.tsx", "../client/src/pages/CatalogPage.tsx", "../client/src/pages/GiveawaysPage.tsx", "../client/src/pages/MinePage.tsx", "../client/src/pages/DetailsPage.tsx", "../client/src/pages/OwnerPage.tsx", "../client/src/pages/AdminPage.tsx", "../client/src/pages/ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");
    expect(dbSource).not.toContain("export async function completeOffchainNftTransfer(");
    expect(routerSource).not.toContain("completeOffchainNftTransfer: protectedProcedure");
    expect(homeSource).not.toContain("completeOffchainNftTransferMutation");
    expect(homeSource).toContain("Заявка на передачу");
    expect(homeSource).toContain("не передает NFT автоматически");
  });
});
