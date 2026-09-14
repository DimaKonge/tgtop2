import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP unified Telegram-style palette", () => {
  it("keeps the UI in one dark mode and drives branded accents from the selected background", () => {
    const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
    const context = readFileSync(new URL("./contexts/ThemeContext.tsx", import.meta.url), "utf8");

    expect(context).toContain('export type Appearance = "dark";');
    expect(context).toContain('document.documentElement.style.setProperty("--tg-accent", palette.accent);');
    expect(context).toContain('document.documentElement.style.setProperty("--tg-shell-bg", palette.color);');
    for (const shade of ["black", "onyx_black", "electric_purple", "burgundy", "pure_gold", "emerald", "turquoise", "navy_blue", "ivory_white"]) {
      expect(context).toContain(`value: "${shade}"`);
    }

    expect(css).toContain('One dark Telegram-style palette drives every branded surface and interaction.');
    expect(css).toContain('html[data-background] .tg-shell');
    expect(css).toContain('html[data-background] .tg-launch');
    expect(css).toContain('html[data-background] .tg-gram-balance-chart');
    expect(css).toContain('html[data-background] .tg-bottom-nav');
    expect(css).toContain('.tg-top-pyramid-avatar');
    expect(css).toContain('.tg-launch-progress span');
  });
});
