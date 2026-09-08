import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Google publication opt-in", () => {
  it("keeps search publication explicitly controlled by the community owner", () => {
    const source = ["Home.tsx", "useHomeController.ts", "home-helpers.ts", "TopPage.tsx", "CatalogPage.tsx", "GiveawaysPage.tsx", "MinePage.tsx", "DetailsPage.tsx", "OwnerPage.tsx", "AdminPage.tsx", "ProfilePage.tsx"].map(__p => fs.readFileSync(path.resolve(import.meta.dirname, __p), "utf8")).join("\n");
    expect(source).toContain('const [searchIndexable, setSearchIndexable] = useState(false);');
    expect(source).toContain('Показывать в Google');
    expect(source).toContain('searchIndexable,');
    expect(source).toContain('tgtop.me/c/{detail.group.username}');
  });
});
