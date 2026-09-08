import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP Global mobile featured board", () => {
  it("uses the requested square geometry for the 1→2→4 featured board", () => {
    const home = ["./Home.tsx", "./useHomeController.ts", "./home-helpers.ts", "./TopPage.tsx", "./CatalogPage.tsx", "./GiveawaysPage.tsx", "./MinePage.tsx", "./DetailsPage.tsx", "./OwnerPage.tsx", "./AdminPage.tsx", "./ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");
    const card = readFileSync(new URL("../components/TopRankingCard.tsx", import.meta.url), "utf8");

    expect(card).toContain('h-[300px] border-[#3f8cff]/35 bg-[#141c27] p-5');
    expect(card).toContain('h-[136px] border-white/10 bg-[#111720] p-3');
    expect(card).toContain('h-[88px] border-white/8 bg-[#111720] p-2');
    expect(home).toContain('className="ranking-slot-enter ranking-slot-lead w-full"');
    expect(home).toContain('className="grid w-full grid-cols-2 gap-2"');
    expect(home).toContain('className="grid w-full grid-cols-4 gap-2"');
    expect(home).toContain('!targetSlot && myGroupsSelectionMode');
    expect(home).toContain('else if (targetSlot) openStarsPayment(group);');
  });
});
