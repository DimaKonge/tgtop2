import { describe, expect, it } from "vitest";
import { getTelegramAvatarTokens } from "./telegramMedia";

describe("Telegram avatar tokens", () => {
  it("uses both active bot credentials for bot-specific Telegram file identifiers", () => {
    expect(getTelegramAvatarTokens("primary", "reserve")).toEqual(["primary", "reserve"]);
  });

  it("does not repeat the same credential or include missing values", () => {
    expect(getTelegramAvatarTokens("primary", "primary")).toEqual(["primary"]);
    expect(getTelegramAvatarTokens(undefined, "reserve")).toEqual(["reserve"]);
  });
});
