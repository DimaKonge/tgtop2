import { describe, expect, it } from "vitest";
import { canRefreshGroupMediaSnapshot, shouldPersistAnimatedAvatar } from "./groupMediaSnapshotPolicy";

describe("group media snapshot policy", () => {
  it("refreshes unlisted groups by default", () => {
    expect(canRefreshGroupMediaSnapshot("pending")).toBe(true);
    expect(canRefreshGroupMediaSnapshot("review")).toBe(true);
  });

  it("keeps listed and rented snapshots fixed unless explicitly forced", () => {
    expect(canRefreshGroupMediaSnapshot("listed")).toBe(false);
    expect(canRefreshGroupMediaSnapshot("rented")).toBe(false);
    expect(canRefreshGroupMediaSnapshot("listed", true)).toBe(true);
  });

  it("persists only a successfully downloaded video avatar", () => {
    expect(shouldPersistAnimatedAvatar("video", "updated")).toBe(true);
    expect(shouldPersistAnimatedAvatar("image", "updated")).toBe(false);
    expect(shouldPersistAnimatedAvatar("video", "static_profile_media")).toBe(false);
  });
});
