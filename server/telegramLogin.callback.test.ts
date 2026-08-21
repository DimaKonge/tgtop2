import { describe, expect, it } from "vitest";
import { getCanonicalTelegramLoginStartUrl, getTelegramLoginCallbackUrl } from "./telegramLogin";

describe("Telegram Login callback URL", () => {
  it("uses the registered non-www callback when login starts from www.tgtop.xyz", () => {
    expect(getTelegramLoginCallbackUrl("https://www.tgtop.xyz")).toBe("https://tgtop.xyz/api/auth/telegram/callback");
  });

  it("keeps the current origin for non-production environments", () => {
    expect(getTelegramLoginCallbackUrl("https://3000-preview.manus.computer")).toBe("https://3000-preview.manus.computer/api/auth/telegram/callback");
  });

  it("moves the login start to the callback cookie domain before creating OAuth state", () => {
    expect(getCanonicalTelegramLoginStartUrl("https://www.tgtop.xyz", "/api/auth/telegram/login?returnTo=%2F")).toBe("https://tgtop.xyz/api/auth/telegram/login?returnTo=%2F");
    expect(getCanonicalTelegramLoginStartUrl("https://tgtop.xyz", "/api/auth/telegram/login?returnTo=%2F")).toBeNull();
  });
});
