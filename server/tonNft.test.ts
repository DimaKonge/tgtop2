import { describe, expect, it } from "vitest";
import { classifyWalletNft, isTonWalletAddress, normalizeWalletNft } from "./tonNft";

describe("wallet NFT classification", () => {
  it("sorts Telegram Gifts, usernames, anonymous numbers and everything else separately", () => {
    expect(classifyWalletNft({ metadata: { name: "Plush Pepe Gift" } })).toBe("gifts");
    expect(classifyWalletNft({ collection: { name: "Candy Canes" } })).toBe("gifts");
    expect(classifyWalletNft({ collection: { name: "Fragment Usernames" } })).toBe("usernames");
    expect(classifyWalletNft({ metadata: { name: "Anonymous Number +888" } })).toBe("anonymous_numbers");
    expect(classifyWalletNft({ metadata: { name: "tgtop.ton" } })).toBe("domains");
    expect(classifyWalletNft({ metadata: { name: "Cyber Cat" } })).toBe("other");
  });

  it("normalizes only complete wallet items and keeps public preview URLs", () => {
    expect(normalizeWalletNft({
      address: "0:abc",
      index: 7,
      metadata: { name: "Gift", image: "ipfs://not-rendered" },
      previews: [{ url: "https://cdn.example/gift.png" }],
      collection: { name: "Telegram Gifts", address: "0:collection" },
    })).toMatchObject({ name: "Gift", imageUrl: "https://cdn.example/gift.png", category: "gifts" });
    expect(normalizeWalletNft({ metadata: { name: "Missing address" } })).toBeNull();
  });

  it("accepts raw and friendly TON addresses but rejects arbitrary query values", () => {
    expect(isTonWalletAddress("UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ")).toBe(true);
    expect(isTonWalletAddress(`0:${"a".repeat(64)}`)).toBe(true);
    expect(isTonWalletAddress("wallet-address-from-user-input")).toBe(false);
  });
});
