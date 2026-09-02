import { describe, expect, it } from "vitest";
import { canRefreshGroupMediaSnapshot, shouldUpdateAnimatedAvatarSnapshot } from "./groupMediaSnapshotPolicy";

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
    expect(shouldUpdateAnimatedAvatarSnapshot("video", "updated")).toBe(true);
    expect(shouldUpdateAnimatedAvatarSnapshot("image", "updated")).toBe(false);
    expect(shouldUpdateAnimatedAvatarSnapshot("video", "static_profile_media")).toBe(true);
    expect(shouldUpdateAnimatedAvatarSnapshot(null, "no_profile_media")).toBe(true);
  });
});
