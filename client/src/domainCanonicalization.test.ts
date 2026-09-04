import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = resolve(import.meta.dirname, "..");

describe("canonical tgtop.me domain metadata", () => {
  it("uses tgtop.me in index metadata, crawler settings, and owner-facing SEO copy", () => {
    const indexHtml = readFileSync(resolve(clientRoot, "index.html"), "utf8");
    const robots = readFileSync(resolve(clientRoot, "public/robots.txt"), "utf8");
    const home = ["src/pages/Home.tsx", "src/pages/useHomeController.ts", "src/pages/home-helpers.ts", "src/pages/TopPage.tsx", "src/pages/CatalogPage.tsx", "src/pages/GiveawaysPage.tsx", "src/pages/MinePage.tsx", "src/pages/DetailsPage.tsx", "src/pages/OwnerPage.tsx", "src/pages/AdminPage.tsx", "src/pages/ProfilePage.tsx"].map(__p => readFileSync(resolve(clientRoot, __p), "utf8")).join("\n");

    expect(indexHtml).toContain('rel="canonical" href="https://tgtop.me/"');
    expect(indexHtml).toContain('property="og:url" content="https://tgtop.me/"');
    expect(robots).toContain("Sitemap: https://tgtop.me/sitemap.xml");
    expect(home).toContain("tgtop.me/c/{detail.group.username}");
  });
});
