import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { __private__, isValidTelegramMemberCount } from "./telegramBot";

describe("TG TOP Telegram catalog onboarding", () => {
  it("recognises only Telegram administrator statuses as catalog-ready", () => {
    expect(__private__.isBotAdmin("administrator")).toBe(true);
    expect(__private__.isBotAdmin("creator")).toBe(true);
    expect(__private__.isBotAdmin("member")).toBe(false);
    expect(__private__.isBotAdmin("left")).toBe(false);
  });

  it("requires Telegram creator/owner status before allowing an onboarding ownership binding", () => {
    expect(__private__.isChatOwner("creator")).toBe(true);
    expect(__private__.isChatOwner("owner")).toBe(true);
    expect(__private__.isChatOwner("administrator")).toBe(false);
    expect(__private__.isChatOwner("member")).toBe(false);
  });

  it("requires and consumes a short-lived owner intent before any catalog or bonus side effect", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("async function saveAdminChat"), source.indexOf("async function awardMembershipReward"));
    const intentRead = handler.indexOf("getActiveTelegramOnboardingIntent");
    const ownerVerification = handler.indexOf('telegramCall<ChatMember>("getChatMember"');
    const profileRead = handler.indexOf("getChatProfile");
    const intentConsume = handler.indexOf("consumeTelegramOnboardingIntent");
    const groupWrite = handler.indexOf("upsertTelegramGroup");
    const bonusWrite = handler.indexOf("grantGroupConnectionBonus");

    expect(handler).toContain('activeBotLabel.toLowerCase() !== "@tg_topbot"');
    expect(handler).toContain('recordIgnoredOnboardingUpdate(`missing ${intentKind} intent`)');
    expect(intentRead).toBeGreaterThan(-1);
    expect(ownerVerification).toBeGreaterThan(intentRead);
    expect(profileRead).toBeGreaterThan(ownerVerification);
    expect(intentConsume).toBeGreaterThan(profileRead);
    expect(groupWrite).toBeGreaterThan(intentConsume);
    expect(bonusWrite).toBeGreaterThan(groupWrite);
  });

  it("never answers a startgroup command inside the selected community", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const startHandler = source.slice(source.indexOf('if (!message?.text?.startsWith("/start")) return;'), source.indexOf("async function getTelegramPollingErrorSummary"));
    expect(startHandler).toContain('if (message.chat.type !== "private") return;');
    expect(startHandler.indexOf('message.chat.type !== "private"')).toBeLessThan(startHandler.indexOf("upsertUser"));
    expect(startHandler.indexOf('message.chat.type !== "private"')).toBeLessThan(startHandler.indexOf("openMiniApp"));
  });

  it("does not persist event receipts or one log line per untrusted bot-added update", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const bypass = source.slice(source.indexOf("async function shouldBypassGlobalEventClaim"), source.indexOf("function formatAllMembersText"));
    expect(bypass).toContain("update.my_chat_member");
    expect(bypass).toContain("getActiveTelegramOnboardingIntent");
    expect(source).toContain("ignoredOnboardingUpdates += 1");
    expect(source).toContain("nextIgnoredOnboardingLogAt = now + 60_000");
    expect(source).not.toContain("Ignored bot-added event without onboarding intent for");
  });

  it("distinguishes active membership states for verified growth tracking", () => {
    expect(__private__.isActiveMember("member")).toBe(true);
    expect(__private__.isActiveMember("administrator")).toBe(true);
    expect(__private__.isActiveMember("left")).toBe(false);
    expect(__private__.isActiveMember("kicked")).toBe(false);
  });

  it("maps channels and group chats to the correct catalog categories", () => {
    expect(__private__.catalogCategory({ id: -1001, type: "channel" })).toBe("Каналы");
    expect(__private__.catalogCategory({ id: -1002, type: "supergroup" })).toBe("Чаты");
  });

  it("keeps the group connection reward denomination at 0.1 internal GRAM", async () => {
    const { GROUP_CONNECTION_BONUS } = await import("./db");
    expect(GROUP_CONNECTION_BONUS).toBe(10);
  });

  it("builds a public Telegram URL only for a channel with a verified username", () => {
    expect(__private__.publicGroupUrl({ id: -1001, type: "channel", username: "o_a_th" })).toBe("https://t.me/o_a_th");
    expect(__private__.publicGroupUrl({ id: -1002, type: "supergroup" })).toBeUndefined();
  });

  it("keeps both active bots available for administrator avatar retrieval", () => {
    expect(__private__.getActiveBotTokens("primary", "reserve")).toEqual(["primary", "reserve"]);
    expect(__private__.getActiveBotTokens("primary", "primary")).toEqual(["primary"]);
  });

  it("accepts a bounded referral payload and rejects unrelated start text", () => {
    expect(__private__.getReferralCodeFromStartText("/start ref_tg8fa43b2c1")).toBe("TG8FA43B2C1");
    expect(__private__.getReferralCodeFromStartText("/start invite-anything")).toBeUndefined();
    expect(__private__.getReferralCodeFromStartText("/start ref_invalid-payload")).toBeUndefined();
  });

  it("recognises only the owner sticker-id command and reads the replied sticker file_id", () => {
    expect(__private__.isStickerIdCommand("/stickerid")).toBe(true);
    expect(__private__.isStickerIdCommand("/stickerid@TGTOP_robot")).toBe(true);
    expect(__private__.isStickerIdCommand("/stickerid extra")).toBe(false);
    expect(__private__.isStickerIdCommand("/allmembers")).toBe(false);
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain("isAuthorizedOperationsOwner(message)");
    expect(source).toContain("message.reply_to_message?.sticker");
    expect(source).toContain("Sticker file_id:");
  });

  it("keeps referral attribution silent in the welcome copy", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).not.toContain("Откройте каталог по приглашению");
    expect(source).toContain('source: attributed ? "referral" : "direct"');
    expect(source).toContain("Добро пожаловать в TG TOP — каталог Telegram-сообществ");
  });

  it("sends the selected TGTOP16 sticker before the welcome text", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const stickerIndex = source.indexOf('telegramCall<boolean>("sendSticker"');
    const textIndex = source.indexOf('telegramCall<boolean>("sendMessage"', stickerIndex);
    expect(source).toContain("CAACAgQAAxkBAAM7apCKivp2Zo4HRaVZkvKXmfrdXZIAAtYjAALqAohQfiIRNuroIOM9BA");
    expect(source).toContain("includeWelcomeSticker = false");
    expect(stickerIndex).toBeGreaterThan(-1);
    expect(textIndex).toBeGreaterThan(stickerIndex);
    expect(source).toContain("openMiniApp(message.chat.id, welcomePrefix + \"Добро пожаловать в TG TOP — каталог Telegram-сообществ");
  });

  it("reduces Telegram polling failures to a safe API summary without request internals", () => {
    const summary = __private__.getTelegramPollingErrorSummary({
      config: { url: "https://api.telegram.org/bot-secret/getUpdates" },
      response: { status: 409, data: { description: "Conflict: terminated by other getUpdates request" } },
    });

    expect(summary).toBe("Telegram API 409: Conflict: terminated by other getUpdates request");
    expect(summary).not.toContain("bot-secret");
    expect(__private__.getTelegramPollingErrorSummary(new Error("request configuration"))).toBe("Unexpected Telegram polling failure");
  });

  it("starts polling only from the dedicated bot entrypoint, never from the web-server bundle", () => {
    expect(__private__.isTelegramBotEntrypoint("/opt/tgtop/dist/telegramBot.js")).toBe(true);
    expect(__private__.isTelegramBotEntrypoint("/home/ubuntu/gifts-lab-v2/server/telegramBot.ts")).toBe(true);
    expect(__private__.isTelegramBotEntrypoint("/opt/tgtop/dist/index.js")).toBe(false);
    expect(__private__.isTelegramBotEntrypoint(undefined)).toBe(false);
  });

  it("creates a rich owner confirmation with the GRAM award and both relevant actions", () => {
    const confirmation = __private__.buildOnboardingConfirmation(
      { id: -1001, type: "channel", title: "OATH", username: "o_a_th" },
      true
    );

    expect(confirmation.text).toContain("Группа добавлена в TG TOP");
    expect(confirmation.text).toContain("0.1 GRAM");
    expect(confirmation.buttons).toEqual(expect.arrayContaining([
      expect.arrayContaining([expect.objectContaining({ text: "Открыть TG TOP" })]),
      expect.arrayContaining([expect.objectContaining({ url: "https://t.me/o_a_th" })]),
    ]));
  });

  it("does not inspect message content, but audits ranked entry links without trusting stale usernames", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).not.toContain("inspectLocalContent");
    expect(source).toContain("resolveVerifiedGroupEntryLink");
    expect(source).toContain("auditRankedEntryLinks");
    expect(source).toContain("flagGroupForModeration");
    expect(source).toContain("10 * 60_000");
    expect(source).toContain("profile.id !== chatId");
    expect(source).toContain("recordVerifiedPublicUsername");
    expect(source).toContain('moderationStatus: "approved"');
    expect(source).toContain('telegramCall<ChatMember>("getChatMember"');
    expect(source).toContain("Подключить сообщество к TG TOP может только его владелец Telegram");
  });

  it("loads real channel gifts only through Telegram getChatGifts without any transfer action", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain('telegramCall<RawOwnedGifts>("getChatGifts"');
    expect(source).toContain("exclude_unsaved: false");
    expect(source).not.toContain('"transferGift"');
  });

  it("never converts an unavailable Telegram audience count into a fabricated zero", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const memberCountBlock = source.slice(source.indexOf("async function getMemberCount"), source.indexOf("async function getChatProfile"));

    expect(isValidTelegramMemberCount(0)).toBe(true);
    expect(isValidTelegramMemberCount(42)).toBe(true);
    expect(isValidTelegramMemberCount(-1)).toBe(false);
    expect(isValidTelegramMemberCount(1.5)).toBe(false);
    expect(memberCountBlock).toContain("attempt <= 3");
    expect(memberCountBlock).toContain("return undefined;");
    expect(memberCountBlock).not.toContain("return 0");
    expect(source).toContain("if (membersCount === undefined)");
    expect(source).toContain("карточка не создана с неточными цифрами");
  });
});
