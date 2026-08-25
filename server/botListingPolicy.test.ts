import { describe, expect, it } from "vitest";
import { normalizeTelegramBotLink } from "./botListingPolicy";

describe("bot listing link policy", () => {
  it("normalizes supported public Telegram bot links", () => {
    expect(normalizeTelegramBotLink(" https://t.me/ExampleBot?start=abc ")).toEqual({
      username: "ExampleBot",
      telegramLink: "https://t.me/ExampleBot",
    });
    expect(normalizeTelegramBotLink("@ExampleBot")).toEqual({
      username: "ExampleBot",
      telegramLink: "https://t.me/ExampleBot",
    });
  });

  it("rejects links that cannot identify a public Telegram username", () => {
    expect(() => normalizeTelegramBotLink("https://t.me/+privateInvite")).toThrow("Вставьте корректную публичную ссылку Telegram");
    expect(() => normalizeTelegramBotLink("not a link")).toThrow("Вставьте корректную публичную ссылку Telegram");
  });
});
