import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP light theme", () => {
  it("keeps owner-management and listing surface contrast readable in light mode", () => {
    const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

    expect(css).toContain('html[data-theme="light"] .tg-shell .text-white');
    expect(css).toContain('html[data-theme="light"] .tg-shell .brand-mark-symbol');
    expect(css).toContain('color: #ffffff !important;');
    expect(css).toContain('.tg-shell .bg-white\\/5');
    expect(css).toContain('.tg-shell .text-\\[\\#a6c8ff\\]');
    expect(css).toContain('.tg-shell .bg-\\[\\#3f8cff\\]\\/10');
    expect(css).toContain('.tg-shell .border-\\[\\#3f8cff\\]\\/35');
    expect(css).toContain('.tg-shell .bg-\\[\\#101a2a\\]\\/95');
    expect(css).toContain('[data-slot="sheet-content"]');
    expect(css).toContain('[data-slot="sheet-content"] .bg-black\\/10');
    expect(css).toContain('[data-slot="sheet-content"] .text-slate-100');
    expect(css).toContain('[data-slot="sheet-content"] .border-white\\/10');
  });
});
