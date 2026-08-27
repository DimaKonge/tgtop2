import { describe, expect, it } from "vitest";
import { telegramNotificationPercent } from "./ChartPanels";

describe("official Telegram analytics presentation", () => {
  it("shows notification percentage only when Telegram supplied a valid aggregate", () => {
    expect(telegramNotificationPercent({ notificationsEnabled: { part: 25, total: 100 } })).toBe(25);
    expect(telegramNotificationPercent({ notificationsEnabled: { part: 0, total: 4 } })).toBe(0);
    expect(telegramNotificationPercent({ notificationsEnabled: { part: 3, total: 0 } })).toBeNull();
    expect(telegramNotificationPercent(undefined)).toBeNull();
  });
});
