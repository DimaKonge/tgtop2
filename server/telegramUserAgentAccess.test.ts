import { describe, expect, it } from "vitest";
import { requireTelegramUserAgentOwner } from "./telegramUserAgentAccess";

describe("Telegram user-agent owner access", () => {
  it("allows only the server-confirmed main administrator", () => {
    expect(() => requireTelegramUserAgentOwner({ canManageModerators: true })).not.toThrow();
    expect(() => requireTelegramUserAgentOwner({ canManageModerators: false })).toThrow(
      "Доступ к рабочему Telegram-аккаунту есть только у главного администратора TG TOP",
    );
  });
});
