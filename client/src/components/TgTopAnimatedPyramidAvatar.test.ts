import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("TgTopAnimatedPyramidAvatar", () => {
  const source = readFileSync(new URL("./TgTopAnimatedPyramidAvatar.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8");

  it("renders exactly seven cells in the TG TOP 1–2–4 silhouette", () => {
    expect((source.match(/<rect /g) ?? [])).toHaveLength(7);
    expect(source).toContain("TG TOP's exact 1–2–4 / seven-cell silhouette");
  });

  it("uses CSS motion and has a reduced-motion static fallback", () => {
    expect(source).not.toContain("<video");
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("tg-top-pyramid-glow");
  });
});
