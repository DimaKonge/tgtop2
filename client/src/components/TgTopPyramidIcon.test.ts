import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("TgTopPyramidIcon", () => {
  it("renders the compact 1–2–4 pyramid shared with the TG TOP visual identity", () => {
    const source = readFileSync(new URL("./TgTopPyramidIcon.tsx", import.meta.url), "utf8");
    expect((source.match(/<rect /g) ?? [])).toHaveLength(7);
    expect(source).toContain("Compact 1–2–4 TG TOP pyramid");
  });
});
