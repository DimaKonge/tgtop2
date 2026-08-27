import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parsePrivateLogDestinationCommand } from "./telegramBot";

describe("private log destination commands", () => {
  it("accepts only exact commands for the four supported private topics", () => {
    expect(parsePrivateLogDestinationCommand("/tgtop_log_top")).toBe("top_activity");
    expect(parsePrivateLogDestinationCommand("/tgtop_log_finance@TG_TOPBOT")).toBe("finance");
    expect(parsePrivateLogDestinationCommand("/tgtop_support@TG_TOPBOT")).toBe("support");
    expect(parsePrivateLogDestinationCommand("/tgtop_log_launches@TGTOP_robot")).toBe("launches");
    expect(parsePrivateLogDestinationCommand("/tgtop_log_top extra")).toBeNull();
    expect(parsePrivateLogDestinationCommand("/start")).toBeNull();
  });

  it("routes support setup to the main bot and all service logs to the reserve bot", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain('return kind === "support" ? "@tg_topbot" : "@tgtop_robot"');
    expect(source).toContain("activeBotLabel.toLowerCase() !== isExpectedLogBot(kind)");
    expect(source).toContain("messageThreadId: message.message_thread_id ?? null");
  });

  it("uses the verified owner Telegram binding as a fallback and never treats an anonymous sender chat as owner proof", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain("getTelegramOwnerDmBinding");
    expect(source).toContain("ownerBinding?.ownerTelegramId === candidate");
    expect(source).toContain("message.from.is_bot");
    expect(source).not.toContain("message.sender_chat");
  });

  it("returns configuration responses to the source topic and only bootstraps the declared creator handle once", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain('const OPERATIONS_BOOTSTRAP_OWNER_USERNAME = "dimij"');
    expect(source).toContain('telegramCall<ChatMember>("getChatMember"');
    expect(source).toContain("isChatOwner(membership.status)");
    expect(source).toContain("const topicReply = { message_thread_id: message.message_thread_id }");
    expect(source).toContain("...topicReply");
    expect(source).toContain("saveTelegramOperationsOwnerBinding");
  });
});
