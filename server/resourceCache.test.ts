import { describe, expect, it } from "vitest";
import { BoundedTtlCache, InFlightRequestCoalescer } from "./resourceCache";
import { isSafeStorageKey } from "./_core/storageProxy";
import { isSafeTelegramAvatarContentType, isValidTelegramAvatarChatId } from "./telegramMedia";

describe("BoundedTtlCache", () => {
  it("expires stale entries and keeps the cache within its explicit capacity", () => {
    let now = 1_000;
    const cache = new BoundedTtlCache<string>(2, () => now);
    cache.set("first", "a", 100);
    cache.set("second", "b", 100);
    expect(cache.get("first")).toBe("a");
    cache.set("third", "c", 100);
    expect(cache.get("second")).toBeUndefined();
    expect(cache.size).toBe(2);
    now += 101;
    expect(cache.get("first")).toBeUndefined();
    expect(cache.get("third")).toBeUndefined();
  });
});

describe("InFlightRequestCoalescer", () => {
  it("shares simultaneous cache misses rather than starting duplicate upstream work", async () => {
    const coalescer = new InFlightRequestCoalescer<string>();
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return "avatar";
    };
    const first = coalescer.run("-100", loader);
    const second = coalescer.run("-100", loader);
    expect(first).toBe(second);
    await expect(first).resolves.toBe("avatar");
    expect(calls).toBe(1);
    expect(coalescer.size).toBe(0);
  });
});

describe("public media input guards", () => {
  it("allows ordinary nested object keys but rejects traversal and malformed keys", () => {
    expect(isSafeStorageKey("telegram/managers/123.jpg")).toBe(true);
    expect(isSafeStorageKey("../private.json")).toBe(false);
    expect(isSafeStorageKey("telegram//photo.jpg")).toBe(false);
    expect(isSafeStorageKey("telegram\\photo.jpg")).toBe(false);
    expect(isSafeStorageKey("a".repeat(513))).toBe(false);
  });

  it("accepts only bounded Telegram chat identifiers and image media types", () => {
    expect(isValidTelegramAvatarChatId("-1001234567890")).toBe(true);
    expect(isValidTelegramAvatarChatId("1; SELECT 1")).toBe(false);
    expect(isValidTelegramAvatarChatId("1".repeat(33))).toBe(false);
    expect(isSafeTelegramAvatarContentType("image/webp")).toBe(true);
    expect(isSafeTelegramAvatarContentType("text/html")).toBe(false);
  });
});
