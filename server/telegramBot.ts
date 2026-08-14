import "dotenv/config";
import axios from "axios";
import {
  getGroupByChatId,
  grantGroupConnectionBonus,
  recordGroupActivity,
  recordGroupMembership,
  recordGroupSnapshot,
  upsertTelegramGroup,
  upsertUser,
} from "./db";

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  description?: string;
  photo?: { small_file_id?: string };
};

type TelegramUser = { id: number; first_name?: string; username?: string };
type ChatMember = { status: string; user: TelegramUser };
type ChatMemberUpdate = {
  chat: TelegramChat;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: { invite_link?: string };
};
type TelegramActivity = { chat: TelegramChat; views?: number };
type TelegramUpdate = {
  update_id: number;
  message?: TelegramActivity & { from?: TelegramUser; text?: string; new_chat_members?: TelegramUser[] };
  channel_post?: TelegramActivity;
  chat_member?: ChatMemberUpdate;
  my_chat_member?: { chat: TelegramChat; from: TelegramUser; old_chat_member: ChatMember; new_chat_member: ChatMember };
};

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL ?? "https://tgtop.xyz";
const pollTimeoutSeconds = 30;

function isBotAdmin(status: string): boolean { return status === "administrator" || status === "creator"; }
function isActiveMember(status: string): boolean { return ["creator", "administrator", "member", "restricted"].includes(status); }
function catalogCategory(chat: TelegramChat): "Каналы" | "Чаты" { return chat.type === "channel" ? "Каналы" : "Чаты"; }
function catalogChatId(chatId: number): string { return String(chatId); }
function publicGroupUrl(chat: TelegramChat): string | undefined { return chat.username ? `https://t.me/${chat.username}` : undefined; }
function getApiUrl(method: string): string {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function telegramCall<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await axios.post<{ ok: boolean; result: T; description?: string }>(getApiUrl(method), payload, { timeout: 40_000 });
  if (!response.data.ok) throw new Error(response.data.description ?? `Telegram API ${method} failed`);
  return response.data.result;
}

async function getMemberCount(chatId: number): Promise<number> {
  try { return await telegramCall<number>("getChatMemberCount", { chat_id: chatId }); }
  catch (error) { console.warn(`[Telegram] Could not read member count for ${chatId}:`, error); return 0; }
}

async function getChatProfile(chatId: number): Promise<TelegramChat> { return await telegramCall<TelegramChat>("getChat", { chat_id: chatId }); }

async function openMiniApp(chatId: number, greeting: string): Promise<void> {
  await telegramCall<boolean>("sendMessage", { chat_id: chatId, text: greeting, reply_markup: { inline_keyboard: [[{ text: "Открыть TG TOP", web_app: { url: miniAppUrl } }]] } });
}

function buildOnboardingConfirmation(group: TelegramChat, awarded: boolean): { text: string; buttons: Array<Array<Record<string, unknown>>> } {
  const handle = group.username ? `@${group.username}` : group.title ?? "Сообщество";
  const text = [
    "✅ Группа добавлена в TG TOP",
    "",
    `Площадка: ${handle}`,
    "Статус: в личной папке",
    awarded ? "🎁 Начислено: 0.1 GRAM для размещения в каталоге" : "ℹ️ Бонус за эту площадку уже был начислен ранее",
    "",
    "Откройте TG TOP, чтобы посмотреть статистику, разместить группу в каталоге или подать заявку на ячейку рейтинга.",
  ].join("\n");
  const buttons: Array<Array<Record<string, unknown>>> = [[{ text: "Открыть TG TOP", web_app: { url: miniAppUrl } }]];
  const groupUrl = publicGroupUrl(group);
  if (groupUrl) buttons.push([{ text: `Открыть ${handle}`, url: groupUrl }]);
  return { text, buttons };
}

async function sendOnboardingConfirmation(ownerChatId: number, group: TelegramChat, awarded: boolean): Promise<void> {
  const confirmation = buildOnboardingConfirmation(group, awarded);
  try { await telegramCall<boolean>("sendMessage", { chat_id: ownerChatId, text: confirmation.text, reply_markup: { inline_keyboard: confirmation.buttons } }); }
  catch (error) { console.warn(`[Telegram] Could not send onboarding confirmation to ${ownerChatId}:`, error); }
}

async function saveAdminChat(update: TelegramUpdate): Promise<void> {
  const membership = update.my_chat_member;
  if (!membership) return;
  const { chat, from, old_chat_member: previous, new_chat_member: current } = membership;
  if (chat.type !== "group" && chat.type !== "supergroup" && chat.type !== "channel") return;
  if (!isBotAdmin(current.status) || isBotAdmin(previous.status)) return;

  const profile = await getChatProfile(chat.id);
  const membersCount = await getMemberCount(chat.id);
  const ownerOpenId = `telegram:${from.id}`;
  await upsertUser({ openId: ownerOpenId, name: from.username ?? from.first_name ?? "Telegram user", loginMethod: "telegram-bot", lastSignedIn: new Date() });
  await upsertTelegramGroup({
    chatId: catalogChatId(chat.id), title: profile.title ?? chat.title ?? "Telegram community", username: profile.username ?? chat.username ?? null,
    description: profile.description ?? null, avatarFileId: profile.photo?.small_file_id ?? null, membersCount, ownerOpenId,
    category: catalogCategory(chat), country: "Global", status: "pending", messagesCount: 0, joinedCount: 0, lastPostViews: 0, lastStatsAt: new Date(),
  });
  const savedGroup = await getGroupByChatId(catalogChatId(chat.id));
  let awarded = false;
  if (savedGroup) {
    await recordGroupSnapshot(savedGroup.id, membersCount, savedGroup.messagesCount, savedGroup.joinedCount);
    awarded = await grantGroupConnectionBonus(ownerOpenId, savedGroup.id);
    if (awarded) console.info(`[Telegram] Awarded 0.1 GRAM to ${ownerOpenId}`);
  }
  await sendOnboardingConfirmation(from.id, profile, awarded);
  await openMiniApp(chat.id, "TG TOP подключён. Сообщество добавлено в личную папку.");
  console.info(`[Telegram] Cataloged ${catalogCategory(chat)} ${chat.id}`);
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.my_chat_member) { await saveAdminChat(update); return; }
  if (update.chat_member) {
    const membership = update.chat_member;
    const joins = !isActiveMember(membership.old_chat_member.status) && isActiveMember(membership.new_chat_member.status);
    const leaves = isActiveMember(membership.old_chat_member.status) && !isActiveMember(membership.new_chat_member.status);
    if (joins || leaves) await recordGroupMembership(catalogChatId(membership.chat.id), joins, leaves, Boolean(membership.invite_link?.invite_link));
    return;
  }
  const message = update.message;
  const activity = message ?? update.channel_post;
  if (activity && (activity.chat.type === "group" || activity.chat.type === "supergroup" || activity.chat.type === "channel")) {
    await recordGroupActivity(catalogChatId(activity.chat.id), activity.views ?? 0);
  }
  if (!message?.text?.startsWith("/start")) return;
  await openMiniApp(message.chat.id, "Добро пожаловать в TG TOP. Откройте приложение, чтобы управлять каталогом и рейтингом.");
}

async function run(): Promise<void> {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  console.info("[Telegram] Starting long-polling for @TGTOP_robot");
  let offset = 0;
  while (true) {
    try {
      const updates = await telegramCall<TelegramUpdate[]>("getUpdates", { offset, timeout: pollTimeoutSeconds, allowed_updates: ["message", "channel_post", "my_chat_member", "chat_member"] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await handleUpdate(update); } catch (error) { console.error(`[Telegram] Failed to process update ${update.update_id}:`, error); }
      }
    } catch (error) {
      console.error("[Telegram] Polling error:", error);
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
}

export const __private__ = { buildOnboardingConfirmation, catalogCategory, isActiveMember, isBotAdmin, publicGroupUrl };
const isMainModule = process.argv[1] ? new URL(`file://${process.argv[1]}`).href === import.meta.url : false;
if (isMainModule) void run();
