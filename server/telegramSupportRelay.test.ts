import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const botSource = readFileSync(resolve(process.cwd(), "server/telegramBot.ts"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

/** Contract regression: this suite intentionally checks the safety boundary, not Telegram network behavior. */
describe("Telegram support relay contract", () => {
  it("uses the dedicated support destination and restricts relay to the main @TG_TOPBOT", () => {
    expect(botSource).toContain('getTelegramOperationLogDestination("support")');
    expect(botSource).toContain('activeBotLabel.toLowerCase() !== "@tg_topbot"');
    expect(botSource).toContain("getTelegramSupportMessageByOwnerNotification");
    expect(botSource).toContain("linkTelegramSupportOwnerNotification");
  });

  it("requires owner identity before sending a reply from the closed chat", () => {
    expect(botSource).toContain("message.from.id.toString() !== ownerTelegramChatId()");
    expect(botSource).toContain("message.reply_to_message?.message_id");
    expect(botSource).toContain('telegramCall<{ message_id: number }>("sendMessage"');
  });

  it("persists inbound and outbound support history without native forwarding", () => {
    expect(botSource).toContain("recordTelegramSupportInbound");
    expect(botSource).toContain("recordTelegramSupportOutbound");
    expect(dbSource).toContain("ownerNotificationMessageId");
    expect(schemaSource).toContain('mysqlTable("telegram_support_messages"');
    expect(dbSource).toContain("recordTelegramSupportInbound");
  });

  it("records direct and referral starts as separate honest launch sources", () => {
    expect(botSource).toContain('source: attributed ? "referral" : "direct"');
    expect(botSource).toContain("recordMiniAppLaunch");
    expect(botSource).toContain("sessionKey: `telegram_bot_start:${message.from.id}`");
    expect(schemaSource).toContain('mysqlTable("mini_app_launch_events"');
  });

  it("routes one private forum group by configured topic without mixing support and metrics", () => {
    expect(schemaSource).toContain('messageThreadId: int("messageThreadId")');
    expect(dbSource).toContain("messageThreadId: input.messageThreadId ?? null");
    expect(botSource).toContain("messageThreadId: message.message_thread_id ?? null");
    expect(botSource).toContain("destination.messageThreadId !== message.message_thread_id");
    expect(botSource).toContain("message_thread_id: destination.messageThreadId");
  });

  it("keeps global deduplication for normal updates but makes the reserve bot skip a matching support reply before claim", () => {
    expect(botSource).toContain("shouldBypassGlobalEventClaim");
    expect(botSource).toContain('activeBotLabel.toLowerCase() !== "@tgtop_robot" || !message.reply_to_message?.message_id');
    expect(botSource).toContain('getTelegramOperationLogDestination("support")');
    expect(botSource).toContain("!(await shouldBypassGlobalEventClaim(update)) && !(await claimTelegramEvent(eventKey, botLabel))");
  });

  it("resolves the actual referral-code owner only after a successful attribution", () => {
    expect(botSource).toContain("const referrer = attributed ? await getTelegramReferralReferrer(message.from.id) : null;");
    expect(botSource).toContain("referrer,");
    expect(dbSource).toContain("getTelegramReferralReferrer");
    expect(dbSource).toContain("eq(users.referralCode, referredUser.referredBy)");
  });
});
