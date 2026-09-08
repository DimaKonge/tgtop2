import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP inline community picker", () => {
  it("opens a local multi-select from the plus beneath TOP instead of navigating to Workspace", () => {
    const source = ["./Home.tsx", "./useHomeController.ts", "./home-helpers.ts", "./TopPage.tsx", "./CatalogPage.tsx", "./GiveawaysPage.tsx", "./MinePage.tsx", "./DetailsPage.tsx", "./OwnerPage.tsx", "./AdminPage.tsx", "./ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");

    expect(source).toContain('const [topListingPickerOpen, setTopListingPickerOpen] = useState(false);');
    expect(source).toContain('const [topListingGroupIds, setTopListingGroupIds] = useState<number[]>([]);');
    expect(source).toContain('const openTopListingPicker = () => {');
    expect(source).toContain('onClick={openTopListingPicker}');
    expect(source).toContain('<Sheet open={topListingPickerOpen} onOpenChange={setTopListingPickerOpen}>');
    expect(source).toContain('Выберите свои группы');
    expect(source).toContain('toggleTopListingGroup(group.id)');
  });

  it("requires a deliberate next step before opening listing configuration and does not submit a placement from the picker", () => {
    const source = ["./Home.tsx", "./useHomeController.ts", "./home-helpers.ts", "./TopPage.tsx", "./CatalogPage.tsx", "./GiveawaysPage.tsx", "./MinePage.tsx", "./DetailsPage.tsx", "./OwnerPage.tsx", "./AdminPage.tsx", "./ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");

    expect(source).toContain('const continueTopListingPicker = () => {');
    expect(source).toContain('if (!topListingGroupIds.length) return;');
    expect(source).toContain('openListing(topListingGroupIds);');
    expect(source).toContain('сейчас ничего не публикуется и GRAM не списываются');
    expect(source).toContain('Продолжить · ${topListingGroupIds.length}');
  });
});
