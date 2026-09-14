import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("launch member TXT export", () => {
  const botSource = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
  const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  it("merges historical Telegram profiles with confirmed starts by latest known activity without including support-message content", () => {
    expect(dbSource).toContain("export async function getAllKnownTelegramMembers()");
    expect(dbSource).toContain("orderBy(desc(miniAppLaunchEvents.createdAt))");
    expect(dbSource).toContain('where(like(users.openId, "telegram:%"))');
    expect(dbSource).toContain("historical_profile");
    expect(dbSource).toContain("confirmed_start");
    expect(dbSource).toContain("new Map<string");
    expect(dbSource).toContain("right.lastActivity.getTime() - left.lastActivity.getTime()");
    expect(botSource).toContain("function formatAllMembersText");
    expect(botSource).toContain("getAllKnownTelegramMembers");
    expect(botSource).not.toContain("telegramSupportMessages");
  });

  it("uploads a UTF-8 text document rather than forwarding or posting the member list publicly", () => {
    expect(botSource).toContain('getApiUrl("sendDocument")');
    expect(botSource).toContain('type: "text/plain;charset=utf-8"');
    expect(botSource).toContain("form.append(\"message_thread_id\"");
    expect(botSource).not.toContain('forwardMessage');
  });
});
