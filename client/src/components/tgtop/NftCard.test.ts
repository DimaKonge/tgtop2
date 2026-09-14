import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("NftCard", () => {
  it("keeps sale/rent states and the rental callback contract", () => {
    const source = readFileSync(new URL("./NftCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("export function NftCard");
    expect(source).toContain("Request rental");
    expect(source).toContain("Запросить аренду");
    expect(source).toContain("onRent(nft)");
    expect(source).toContain('nft.listingType === "both"');
  });
});
