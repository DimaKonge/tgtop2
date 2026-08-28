import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("TopRankingCard", () => {
  const source = readFileSync(new URL("./TopRankingCard.tsx", import.meta.url), "utf8");

  it("is intentionally scoped to the upper TOP grid and preserves all three cell variants", () => {
    expect(source).toContain('export type TopRankingCardVariant = "lead" | "secondary" | "compact"');
    expect(source).toContain('Presentation-only TOP card');
    expect(source).toContain('h-[300px]');
    expect(source).toContain('h-[136px]');
    expect(source).toContain('h-[88px]');
  });

  it("keeps lightweight media behaviour with a static fallback", () => {
    expect(source).toContain('preload="metadata"');
    expect(source).toContain('onError={() => setImageFailed(true)}');
    expect(source).toContain('group.title.slice(0, 1).toUpperCase()');
  });

  it("renders the TG TOP animated pyramid only after an explicit TOP identity opt-in", () => {
    expect(source).toContain("showTgTopPyramidAvatar = false");
    expect(source).toContain("showTgTopPyramidAvatar ? (");
    expect(source).toContain("<TgTopAnimatedPyramidAvatar");
  });
});
