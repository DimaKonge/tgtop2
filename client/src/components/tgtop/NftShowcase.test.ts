import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("NftShowcase", () => {
  it("keeps the shared owner showcase in its own presentational module", () => {
    const source = readFileSync(new URL("./NftShowcase.tsx", import.meta.url), "utf8");
    expect(source).toContain("export function NftShowcase");
    expect(source).toContain("NFT-витрина");
    expect(source).toContain("Selected by the owner");
    expect(source).toContain("nfts.map");
  });
});
