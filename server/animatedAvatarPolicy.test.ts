import { describe, expect, it } from "vitest";
import { MAX_ANIMATED_AVATAR_BYTES, validateAnimatedAvatarUpload } from "./animatedAvatarPolicy";

const mp4Header = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

describe("animated group avatar upload policy", () => {
  it("accepts a bounded MP4 payload", () => {
    expect(() => validateAnimatedAvatarUpload("video/mp4", mp4Header)).not.toThrow();
  });

  it("rejects unsupported, oversized, and malformed uploads", () => {
    expect(() => validateAnimatedAvatarUpload("video/webm", mp4Header)).toThrow("MP4");
    expect(() => validateAnimatedAvatarUpload("video/mp4", Buffer.alloc(MAX_ANIMATED_AVATAR_BYTES + 1))).toThrow("5 МБ");
    expect(() => validateAnimatedAvatarUpload("video/mp4", Buffer.from("not an mp4"))).toThrow("MP4-видео");
  });
});
