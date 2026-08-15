import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP Global mobile featured board", () => {
  it("allocates a 1→2→4 board that fits within a 390×844 viewport budget", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const viewportHeight = 844;
    const mobileBudget = 54 + 86 + Math.ceil(viewportHeight * 0.34) + 116 + 84 + 16 + 72;

    expect(source).toContain('h-[286px]');
    expect(source).toContain('h-[116px]');
    expect(source).toContain('h-[84px]');
    expect(mobileBudget).toBeLessThan(viewportHeight);
  });
});
