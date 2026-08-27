import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("launch member TXT export", () => {
  const botSource = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
  const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  it("deduplicates users in descending launch order without including support-message content", () => {
    expect(dbSource).toContain("export async function getUniqueMiniAppLaunchMembers()");
    expect(dbSource).toContain("orderBy(desc(miniAppLaunchEvents.createdAt))");
    expect(dbSource).toContain("new Map<string");
    expect(botSource).toContain("function formatAllMembersText");
    expect(botSource).not.toContain("telegramSupportMessages");
  });

  it("uploads a UTF-8 text document rather than forwarding or posting the member list publicly", () => {
    expect(botSource).toContain('getApiUrl("sendDocument")');
    expect(botSource).toContain('type: "text/plain;charset=utf-8"');
    expect(botSource).toContain("form.append(\"message_thread_id\"");
    expect(botSource).not.toContain('forwardMessage');
  });
});
