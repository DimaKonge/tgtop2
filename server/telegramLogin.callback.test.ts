import { describe, expect, it } from "vitest";
import { getCanonicalTelegramLoginStartUrl, getTelegramLoginCallbackUrl } from "./telegramLogin";

describe("Telegram Login callback URL", () => {
  it("uses tgtop.me as the callback origin for every production domain alias", () => {
    expect(getTelegramLoginCallbackUrl("https://www.tgtop.xyz")).toBe("https://tgtop.me/api/auth/telegram/callback");
    expect(getTelegramLoginCallbackUrl("https://tgtop.xyz")).toBe("https://tgtop.me/api/auth/telegram/callback");
    expect(getTelegramLoginCallbackUrl("https://www.tgtop.me")).toBe("https://tgtop.me/api/auth/telegram/callback");
  });

  it("keeps the current origin for non-production environments", () => {
    expect(getTelegramLoginCallbackUrl("https://3000-preview.manus.computer")).toBe("https://3000-preview.manus.computer/api/auth/telegram/callback");
  });

  it("moves every production login alias to tgtop.me before creating OAuth state", () => {
    expect(getCanonicalTelegramLoginStartUrl("https://www.tgtop.xyz", "/api/auth/telegram/login?returnTo=%2F")).toBe("https://tgtop.me/api/auth/telegram/login?returnTo=%2F");
    expect(getCanonicalTelegramLoginStartUrl("https://tgtop.xyz", "/api/auth/telegram/login?returnTo=%2F")).toBe("https://tgtop.me/api/auth/telegram/login?returnTo=%2F");
    expect(getCanonicalTelegramLoginStartUrl("https://tgtop.me", "/api/auth/telegram/login?returnTo=%2F")).toBeNull();
  });
});
