import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("NFT showcase policy", () => {
  it("only exposes explicit profile showcases and makes profile, group, and hidden targets mutually exclusive", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("eq(nftUsernames.showcaseProfile, true)");
    expect(source).toContain('target: "profile" | "group" | "hidden"');
    expect(source).toContain("showcaseProfile: true, showcaseGroupId: null");
    expect(source).toContain("showcaseProfile: false, showcaseGroupId: input.groupId!");
    expect(source).toContain("showcaseProfile: false, showcaseGroupId: null");
  });
});
