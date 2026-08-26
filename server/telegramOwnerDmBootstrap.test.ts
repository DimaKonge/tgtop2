import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Telegram owner-DM bootstrap safety", () => {
  it("allows only an owner-resolved user and one explicit greeting path", () => {
    const source = readFileSync(new URL("./telegramUserAgent.ts", import.meta.url), "utf8");
    expect(source).toContain("bootstrapTelegramOwnerDmGreeting");
    expect(source).toContain("entity instanceof Api.User");
    expect(source).toContain("entity.bot");
    expect(source).toContain("saveTelegramOwnerDmBinding");
    expect(source).toContain("TG TOP Assistant готов");
  });

  it("keeps publishing, rights and finance commands outside the bootstrap path", () => {
    const source = readFileSync(new URL("./telegramUserAgent.ts", import.meta.url), "utf8");
    const bootstrap = source.slice(source.indexOf("export async function bootstrapTelegramOwnerDmGreeting"), source.indexOf("export async function beginTelegramUserAgentLogin"));
    expect(bootstrap).not.toContain("inviteToChannel");
    expect(bootstrap).not.toContain("sendFile");
    expect(bootstrap).not.toContain("transfer");
  });
});
