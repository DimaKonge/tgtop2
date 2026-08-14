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

    expect(source).toContain('type GroupCardVariant = "lead" | "secondary" | "compact" | "list"');
    expect(source).toContain('<GroupCard group={leadSlot.group} variant="lead"');
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('variant="compact"');
    expect(source).toContain('<GroupCard key={group.id} group={group} variant="list" onClick={() => openGroup(group.id)} />');
    expect(source).toContain('В TG TOP пока нет площадок');
    expect(source).toContain('https://t.me/i/userpic/320/${group.username}.jpg');
    expect(source).toContain('className="absolute inset-0 grid place-items-center"');
    expect(source).toContain('className="absolute inset-0 h-full w-full object-cover"');
  });
});
