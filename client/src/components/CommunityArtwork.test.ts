import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTelegramAvatarSrc } from "./CommunityArtwork";

describe("CommunityArtwork", () => {
  const source = readFileSync(new URL("./CommunityArtwork.tsx", import.meta.url), "utf8");

  it("keeps generic community artwork static unless a caller explicitly opts into animated media", () => {
    expect(source).toContain("allowAnimatedMedia = false");
    expect(source).toContain("allowAnimatedMedia && group.animatedAvatarUrl && !failed");
    expect(source).toContain('preload="metadata"');
  });

  it("uses the local proxy even when the stored Telegram file id is missing", () => {
    expect(getTelegramAvatarSrc({ chatId: "-100123", title: "Channel", username: "channel", avatarFileId: null })).toBe("/api/telegram-avatar/-100123");
    expect(source).toContain('`/api/telegram-avatar/${group.chatId}`');
    expect(source).not.toContain('https://t.me/i/userpic/320/');
    expect(source).toContain("group.title.slice(0, 1).toUpperCase()");
  });
});
