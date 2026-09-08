import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = resolve(import.meta.dirname, "..");

describe("canonical tgtop.me domain metadata", () => {
  it("uses tgtop.me in index metadata, crawler settings, and owner-facing SEO copy", () => {
    const indexHtml = readFileSync(resolve(clientRoot, "index.html"), "utf8");
    const robots = readFileSync(resolve(clientRoot, "public/robots.txt"), "utf8");
    const home = readFileSync(resolve(clientRoot, "src/pages/Home.tsx"), "utf8");

    expect(indexHtml).toContain('rel="canonical" href="https://tgtop.me/"');
    expect(indexHtml).toContain('property="og:url" content="https://tgtop.me/"');
    expect(robots).toContain("Sitemap: https://tgtop.me/sitemap.xml");
    expect(home).toContain("tgtop.me/c/{detail.group.username}");
  });
});
