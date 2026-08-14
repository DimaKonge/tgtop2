import { describe, expect, it } from "vitest";
import { __private__ } from "./telegramBot";

describe("TG TOP Telegram catalog onboarding", () => {
  it("recognises only Telegram administrator statuses as catalog-ready", () => {
    expect(__private__.isBotAdmin("administrator")).toBe(true);
    expect(__private__.isBotAdmin("creator")).toBe(true);
    expect(__private__.isBotAdmin("member")).toBe(false);
    expect(__private__.isBotAdmin("left")).toBe(false);
  });

  it("distinguishes active membership states for verified growth tracking", () => {
    expect(__private__.isActiveMember("member")).toBe(true);
    expect(__private__.isActiveMember("administrator")).toBe(true);
    expect(__private__.isActiveMember("left")).toBe(false);
    expect(__private__.isActiveMember("kicked")).toBe(false);
  });

  it("maps channels and group chats to the correct catalog categories", () => {
    expect(__private__.catalogCategory({ id: -1001, type: "channel" })).toBe("Каналы");
    expect(__private__.catalogCategory({ id: -1002, type: "supergroup" })).toBe("Чаты");
  });

  it("keeps the group connection reward denomination at 0.1 internal GRAM", async () => {
    const { GROUP_CONNECTION_BONUS } = await import("./db");
    expect(GROUP_CONNECTION_BONUS).toBe(100);
  });

  it("builds a public Telegram URL only for a channel with a verified username", () => {
    expect(__private__.publicGroupUrl({ id: -1001, type: "channel", username: "o_a_th" })).toBe("https://t.me/o_a_th");
    expect(__private__.publicGroupUrl({ id: -1002, type: "supergroup" })).toBeUndefined();
  });

  it("creates a rich owner confirmation with the GRAM award and both relevant actions", () => {
    const confirmation = __private__.buildOnboardingConfirmation(
      { id: -1001, type: "channel", title: "OATH", username: "o_a_th" },
      true
    );

    expect(confirmation.text).toContain("Группа добавлена в TG TOP");
    expect(confirmation.text).toContain("0.1 GRAM");
    expect(confirmation.buttons).toEqual(expect.arrayContaining([
      expect.arrayContaining([expect.objectContaining({ text: "Открыть TG TOP" })]),
      expect.arrayContaining([expect.objectContaining({ url: "https://t.me/o_a_th" })]),
    ]));
  });
});
