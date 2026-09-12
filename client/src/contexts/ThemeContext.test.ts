import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP theme preferences", () => {
  it("uses one persisted dark Telegram-style palette instead of light or system modes", () => {
    const source = readFileSync(new URL("./ThemeContext.tsx", import.meta.url), "utf8");
    expect(source).toContain('export type Appearance = "dark";');
    expect(source).toContain('export type ThemeBackground = (typeof THEME_BACKGROUND_OPTIONS)[number]["value"];');
    expect(source).toContain('BACKGROUND_STORAGE_KEY = "tg-top-background"');
    expect(source).toContain('stored as ThemeBackground : "black"');
    expect(source).toContain('document.documentElement.dataset.background = background;');
    expect(source).toContain('document.documentElement.style.setProperty("--tg-shell-bg", palette.color);');
    expect(source).toContain('document.documentElement.style.setProperty("--tg-accent", palette.accent);');
    expect(source).not.toContain('"system" | "dark" | "light"');
  });
});
