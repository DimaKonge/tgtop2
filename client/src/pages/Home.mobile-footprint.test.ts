import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP Global mobile featured board", () => {
  it("uses the requested square geometry for the 1→2→4 featured board", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('h-[252px] border-[#3f8cff]/35 bg-[#141c27] p-5');
    expect(source).toContain('h-[104px] border-white/10 bg-[#111720] p-3');
    expect(source).toContain('h-[68px] border-white/8 bg-[#111720] p-2');
    expect(source).toContain('className="ranking-slot-enter ranking-slot-lead w-full"');
    expect(source).toContain('className="grid w-full grid-cols-2 gap-2"');
    expect(source).toContain('className="grid w-full grid-cols-4 gap-2"');
    expect(source).toContain('!targetSlot && myGroupsSelectionMode');
    expect(source).toContain('Выбрать для ставки');
  });
});
