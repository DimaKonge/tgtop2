import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP production bot links", () => {
  it("uses @TGTOP_robot for both channel and group admin onboarding", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("https://t.me/TGTOP_robot?");
    expect(source).toContain("startchannel=admin");
    expect(source).toContain("startgroup=admin");
    expect(source).not.toContain("GiftsLabBot");
  });

  it("uses the shared GroupCard component for ranked and general catalog placements", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('function GroupCard({ group, featured = false, onClick }');
    expect(source).toContain('<GroupCard group={featured.group} featured');
    expect(source).toContain('<GroupCard key={group.id} group={group} onClick={() => openGroup(group.id)} />');
    expect(source).toContain('В TG TOP пока нет площадок');
  });
});
