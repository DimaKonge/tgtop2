import { describe, expect, it } from "vitest";
import { getAnalyticsDelta, getAnalyticsPriority, shouldRefreshAvatar } from "./analyticsPolicy";

const baseTarget = {
  groupId: 100,
  chatId: "-100100",
  kind: "channel" as const,
  listed: true,
  enabled: true,
};

describe("analytics policy", () => {
  it("keeps only occupied TOP slots on realtime priority", () => {
    expect(getAnalyticsPriority({ ...baseTarget, topRank: 1 })).toBe("realtime");
    expect(getAnalyticsPriority({ ...baseTarget, topRank: 7 })).toBe("realtime");
    expect(getAnalyticsPriority({ ...baseTarget, topRank: null })).toBe("hourly");
    expect(getAnalyticsPriority({ ...baseTarget, listed: false, topRank: 1 })).toBe("daily");
  });

  it("presents confirmed changes as positive and negative deltas", () => {
    expect(getAnalyticsDelta(100, 106)).toMatchObject({ direction: "up", label: "+6", tone: "positive" });
    expect(getAnalyticsDelta(106, 100)).toMatchObject({ direction: "down", label: "−6", tone: "negative" });
    expect(getAnalyticsDelta(100, 100)).toMatchObject({ direction: "flat", tone: "neutral" });
    expect(getAnalyticsDelta(null, 100)).toMatchObject({ direction: "flat", label: "нет сравнения" });
  });

  it("refreshes a TOP avatar only when Telegram reports a changed photo identity", () => {
    expect(shouldRefreshAvatar("photo-a", "photo-b")).toBe(true);
    expect(shouldRefreshAvatar("photo-a", "photo-a")).toBe(false);
    expect(shouldRefreshAvatar("photo-a", null)).toBe(false);
  });
});
