import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("CommunityArtwork", () => {
  const source = readFileSync(new URL("./CommunityArtwork.tsx", import.meta.url), "utf8");

  it("keeps generic community artwork static unless a caller explicitly opts into animated media", () => {
    expect(source).toContain("allowAnimatedMedia = false");
    expect(source).toContain("allowAnimatedMedia && group.animatedAvatarUrl && !failed");
    expect(source).toContain('preload="metadata"');
  });

  it("uses the protected local avatar route before public Telegram fallback", () => {
    expect(source).toContain('`/api/telegram-avatar/${group.chatId}`');
    expect(source).toContain('`https://t.me/i/userpic/320/${group.username}.jpg`');
    expect(source).toContain("group.title.slice(0, 1).toUpperCase()");
  });
});
