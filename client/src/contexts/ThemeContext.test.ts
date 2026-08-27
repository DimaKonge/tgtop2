import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP theme preferences", () => {
  it("supports system, light and dark modes with persisted style and accent choices", () => {
    const source = readFileSync(new URL("./ThemeContext.tsx", import.meta.url), "utf8");
    expect(source).toContain('export type Appearance = "system" | "dark" | "light";');
    expect(source).toContain('export type ThemeStyle = "original" | "clean";');
    expect(source).toContain('export type ThemeAccent = "blue" | "purple" | "rose" | "gold" | "green" | "turquoise";');
    expect(source).toContain('localStorage.setItem(STYLE_STORAGE_KEY, style);');
    expect(source).toContain('localStorage.setItem(ACCENT_STORAGE_KEY, accent);');
    expect(source).toContain('document.documentElement.dataset.style = style;');
    expect(source).toContain('document.documentElement.dataset.accent = accent;');
  });
});
