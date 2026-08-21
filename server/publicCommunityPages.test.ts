import { describe, expect, it } from "vitest";
import { buildPublicCommunityHtml } from "./publicCommunityPages";

describe("public community HTML", () => {
  it("renders indexable metadata and preserves safe HTML escaping", () => {
    const html = buildPublicCommunityHtml({
      id: 1, chatId: "-1001", title: "Amber <WIN>", username: "amberlend", description: "<script>alert(1)</script>", avatarFileId: null,
      membersCount: 5, category: "Каналы", country: "Global", subcategory: "Crypto", managerName: null, managerUsername: null, managerAvatarUrl: null, lastStatsAt: null, snapshots: [],
    });
    expect(html).toContain('<link rel="canonical" href="https://tgtop.xyz/c/amberlend">');
    expect(html).toContain('<meta name="robots" content="index,follow">');
    expect(html).toContain("Amber &lt;WIN&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("Весь мир · Каналы · Crypto");
    expect(html).not.toContain("Данные подтверждаются ботом");
  });
});
