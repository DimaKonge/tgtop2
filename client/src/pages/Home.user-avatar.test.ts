import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP Telegram user avatar sync", () => {
  it("prioritizes the current Mini App photo_url over a cached session avatar", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("const displayUserAvatar = telegramAvatar ?? user?.avatarUrl;");
    expect(source).not.toContain("user?.avatarUrl ?? telegramAvatar");
    expect(source).toContain("src={displayUserAvatar}");
  });
});
