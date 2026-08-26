import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { __private__ } from "./telegramUserAgent";

describe("Telegram user-agent safety boundary", () => {
  it("encrypts stored session-state using the server secret without exposing its plaintext", () => {
    const encrypted = __private__.encrypt("temporary-session-state");
    expect(encrypted).not.toContain("temporary-session-state");
    expect(__private__.decrypt(encrypted)).toBe("temporary-session-state");
  });

  it("validates only E.164 phones and numeric login codes", () => {
    expect(__private__.normalizePhone("+380 67 123 45 67")).toBe("+380671234567");
    expect(() => __private__.normalizePhone("0671234567")).toThrow();
    expect(__private__.normalizeCode("1 2 3 4 5")).toBe("12345");
    expect(() => __private__.normalizeCode("abcd")).toThrow();
  });

  it("recognizes Teleproto RPC errorMessage so a valid code can advance to 2FA", () => {
    expect(__private__.getErrorCode({ errorMessage: "SESSION_PASSWORD_NEEDED" })).toBe("SESSION_PASSWORD_NEEDED");
  });

  it("uses encrypted stored state and contains no posting, chat-management or financial operations", () => {
    const source = readFileSync(new URL("./telegramUserAgent.ts", import.meta.url), "utf8");
    expect(source).toContain('createCipheriv("aes-256-gcm"');
    expect(source).toContain('createDecipheriv("aes-256-gcm"');
    expect(source).toContain('action: "connected"');
    expect(source).not.toContain("sendMessage");
    expect(source).not.toContain("inviteToChannel");
    expect(source).not.toContain("sendFile");
    expect(source).not.toContain("transfer");
  });
});
