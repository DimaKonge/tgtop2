import { describe, expect, it } from "vitest";
import { __private__ } from "./telegramUserAgent";

describe("Telegram historical stats safety", () => {
  it("accepts only a normalized public username for the allowlist", () => {
    expect(__private__.normalizeStatsUsername(" @TGTOP_Community ")).toBe("tgtop_community");
    expect(() => __private__.normalizeStatsUsername("https://t.me/TGTOP_Community")).toThrow();
  });
});
