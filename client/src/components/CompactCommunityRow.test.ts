import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("CompactCommunityRow", () => {
  const source = readFileSync(new URL("./CompactCommunityRow.tsx", import.meta.url), "utf8");

  it("keeps compact rows lightweight, accessible and static by default", () => {
    expect(source).toContain('h-[68px]');
    expect(source).toContain('type="button"');
    expect(source).toContain("<CommunityAvatar group={group} compact />");
    expect(source).not.toContain("allowAnimatedMedia");
    expect(source).not.toContain("<video");
  });

  it("preserves reward, sale and empty-slot presentation", () => {
    expect(source).toContain("group?.rewardActive");
    expect(source).toContain("salePrice");
    expect(source).toContain("Добавить группу");
    expect(source).toContain("formatCatalogNumber(group.membersCount, language)");
  });
});
