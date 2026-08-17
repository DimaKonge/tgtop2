import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTelegramChatIdFromOpenId } from "./telegramNotifications";

describe("ranking intent bot notifications", () => {
  it("only derives a Telegram chat id from a verified Telegram open id", () => {
    expect(getTelegramChatIdFromOpenId("telegram:123456")).toBe(123456);
    expect(getTelegramChatIdFromOpenId("manus-user")).toBeNull();
    expect(getTelegramChatIdFromOpenId("telegram:not-a-number")).toBeNull();
  });
});

describe("Stars invoice window delivery", () => {
  it("creates an official invoice link instead of sending a payment message to the bot chat", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("createStarsRankingInvoiceLink");
    expect(source).toContain("/createInvoiceLink");
    expect(source).not.toContain("/sendInvoice");
  });
});

describe("community listing announcements", () => {
  it("posts a localized TG TOP listing announcement with a safe Mini App detail link", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("notifyCommunityListed");
    expect(source).toContain("Сообщество добавлено в TG TOP");
    expect(source).toContain("listing=");
    expect(source).toContain("Открыть в TG TOP");
  });
});
