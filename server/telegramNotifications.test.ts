import { describe, expect, it } from "vitest";
import { getTelegramChatIdFromOpenId } from "./telegramNotifications";

describe("ranking intent bot notifications", () => {
  it("only derives a Telegram chat id from a verified Telegram open id", () => {
    expect(getTelegramChatIdFromOpenId("telegram:123456")).toBe(123456);
    expect(getTelegramChatIdFromOpenId("manus-user")).toBeNull();
    expect(getTelegramChatIdFromOpenId("telegram:not-a-number")).toBeNull();
  });
});
