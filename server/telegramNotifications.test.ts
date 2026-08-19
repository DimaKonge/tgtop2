import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTelegramChatIdFromOpenId, hasAnyTelegramBoost } from "./telegramNotifications";

describe("ranking intent bot notifications", () => {
  it("only derives a Telegram chat id from a verified Telegram open id", () => {
    expect(getTelegramChatIdFromOpenId("telegram:123456")).toBe(123456);
    expect(getTelegramChatIdFromOpenId("manus-user")).toBeNull();
    expect(getTelegramChatIdFromOpenId("telegram:not-a-number")).toBeNull();
  });

  it("recognizes a non-empty Telegram boost list", () => {
    expect(hasAnyTelegramBoost([])).toBe(false);
    expect(hasAnyTelegramBoost([{}])).toBe(true);
    expect(hasAnyTelegramBoost(undefined)).toBe(false);
  });

  it("prepares an actionable outbid notification with the current competitor price and restore link", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("notifyRankingOutbid");
    expect(source).toContain("Вас только что перебили");
    expect(source).toContain("Ставка конкурента:");
    expect(source).toContain("Вернуть место");
    expect(source).toContain("?rankSlot=${input.slotId}");
  });
});

describe("Stars invoice window delivery", () => {
  it("creates an official invoice link instead of sending a payment message to the bot chat", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("createStarsRankingInvoiceLink");
    expect(source).toContain("/createInvoiceLink");
    expect(source).not.toContain("/sendInvoice");
  });

  it("uses Telegram's native monthly subscription invite endpoint for paid channel access", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("createTelegramMonthlySubscriptionInviteLink");
    expect(source).toContain("/createChatSubscriptionInviteLink");
    expect(source).toContain("subscription_period: 2_592_000");
    expect(source).toContain("subscription_price: input.starsAmount");
  });
});

describe("community listing announcements", () => {
  it("posts a localized TG TOP listing announcement with a safe Mini App detail link", () => {
    const source = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");
    expect(source).toContain("notifyCommunityListed");
    expect(source).toContain("Сообщество добавлено в TG TOP");
    expect(source).toContain("startapp=listing_");
    expect(source).toContain("Открыть в TG TOP");
  });
});
