import { describe, expect, it } from "vitest";
import {
  detectSafeTelegramAvatarContentType,
  getTelegramAvatarTokens,
  isValidTelegramAvatarChatId,
} from "./telegramMedia";

describe("Telegram avatar tokens", () => {
  it("uses both active bot credentials for bot-specific Telegram file identifiers", () => {
    expect(getTelegramAvatarTokens("primary", "reserve")).toEqual(["primary", "reserve"]);
  });

  it("does not repeat the same credential or include missing values", () => {
    expect(getTelegramAvatarTokens("primary", "primary")).toEqual(["primary"]);
    expect(getTelegramAvatarTokens(undefined, "reserve")).toEqual(["reserve"]);
  });

  it("accepts a real JPEG when Telegram declares octet-stream", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectSafeTelegramAvatarContentType(jpeg, "application/octet-stream", "photos/file_1.jpg")).toBe("image/jpeg");
  });

  it("accepts PNG and WebP by signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const webp = Buffer.from("RIFF0000WEBP", "ascii");
    expect(detectSafeTelegramAvatarContentType(png, "application/octet-stream", "file_1")).toBe("image/png");
    expect(detectSafeTelegramAvatarContentType(webp, "application/octet-stream", "file_2")).toBe("image/webp");
  });

  it("rejects arbitrary bytes despite a permissive MIME type or image extension", () => {
    expect(detectSafeTelegramAvatarContentType(Buffer.from("not an image", "ascii"), "image/jpeg", "file.jpg")).toBeNull();
  });

  it("keeps chat id validation strict", () => {
    expect(isValidTelegramAvatarChatId("-1001708382303")).toBe(true);
    expect(isValidTelegramAvatarChatId("../../etc/passwd")).toBe(false);
  });
});
