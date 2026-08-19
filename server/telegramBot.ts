import "dotenv/config";
import axios from "axios";
import { notifyRewardCredited } from "./telegramNotifications";
import {
  getGroupByChatId,
  getRewardInviteBeneficiary,
  attributeTelegramReferral,
  grantGroupConnectionBonus,
  recordGroupActivity,
  recordGroupMembership,
  recordGroupSnapshot,
  awardTelegramReward,
  observeProtectedGroupTransfer,
  approveStarsRankingPayment,
  settleStarsRankingPayment,
  upsertTelegramGroup,
  upsertUser,
} from "./db";
import { notifyRankingOutbid } from "./telegramNotifications";

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  description?: string;
  photo?: { small_file_id?: string };
};

type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string; is_bot?: boolean };
type ChatMember = { status: string; user: TelegramUser };
type ChatMemberUpdate = {
  chat: TelegramChat;
  from: TelegramUser;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: { invite_link?: string; creator?: TelegramUser };
};
type TelegramActivity = { chat: TelegramChat; views?: number };
type TelegramUpdate = {
  update_id: number;
  message?: TelegramActivity & {
    message_id: number;
    from?: TelegramUser;
    text?: string;
    new_chat_members?: TelegramUser[];
    left_chat_member?: TelegramUser;
    new_chat_title?: string;
    pinned_message?: unknown;
    successful_payment?: { currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string };
  };
  channel_post?: TelegramActivity;
  chat_member?: ChatMemberUpdate;
  my_chat_member?: { chat: TelegramChat; from: TelegramUser; old_chat_member: ChatMember; new_chat_member: ChatMember };
  pre_checkout_query?: { id: string; from: TelegramUser; currency: string; total_amount: number; invoice_payload: string };
};

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL ?? "https://tgtop.xyz";
const pollTimeoutSeconds = 30;

function isBotAdmin(status: string): boolean { return status === "administrator" || status === "creator"; }
function isChatOwner(status: string): boolean { return status === "creator" || status === "owner"; }
function isActiveMember(status: string): boolean { return ["creator", "administrator", "member", "restricted"].includes(status); }
function catalogCategory(chat: TelegramChat): "Каналы" | "Чаты" { return chat.type === "channel" ? "Каналы" : "Чаты"; }
function catalogChatId(chatId: number): string { return String(chatId); }
function publicGroupUrl(chat: TelegramChat): string | undefined { return chat.username ? `https://t.me/${chat.username}` : undefined; }
async function getChatInviteLink(chatId: number): Promise<string | undefined> {
  try {
    const link = await telegramCall<string>("exportChatInviteLink", { chat_id: chatId });
    return link || undefined;
  } catch {
    try {
      const chat = await getChatProfile(chatId);
      // @ts-expect-error invite_link might exist on chat object
      return chat.invite_link || undefined;
    } catch {
      return undefined;
    }
  }
}
export function getReferralCodeFromStartText(text?: string): string | undefined {
  const match = text?.trim().match(/^\/start\s+ref_([A-Za-z0-9]{6,32})$/i);
  return match?.[1]?.toUpperCase();
}
function getApiUrl(method: string): string {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function telegramCall<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await axios.post<{ ok: boolean; result: T; description?: string }>(getApiUrl(method), payload, { timeout: 40_000 });
  if (!response.data.ok) throw new Error(response.data.description ?? `Telegram API ${method} failed`);
  return response.data.result;
}

export type TelegramGroupAdministrator = {
  telegramUserId: string;
  username: string | null;
  name: string;
};

export async function getTelegramGroupAdministrators(chatId: string): Promise<TelegramGroupAdministrator[]> {
  const administrators = await telegramCall<ChatMember[]>("getChatAdministrators", { chat_id: chatId });
  return administrators
    .filter(member => isBotAdmin(member.status) && !member.user.is_bot)
    .map(member => ({
      telegramUserId: String(member.user.id),
      username: member.user.username ?? null,
      name: [member.user.first_name, member.user.last_name].filter(Boolean).join(" ") || member.user.username || `ID ${member.user.id}`,
    }));
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
  const inviteLink = await getChatInviteLink(chat.id);
  const ownerOpenId = `telegram:${from.id}`;
  await upsertUser({ openId: ownerOpenId, name: from.username ?? from.first_name ?? "Telegram user", telegramUsername: from.username ?? null, loginMethod: "telegram-bot", lastSignedIn: new Date() });
  await upsertTelegramGroup({
    chatId: catalogChatId(chat.id), title: profile.title ?? chat.title ?? "Telegram community", username: profile.username ?? chat.username ?? null,
    inviteLink: inviteLink ?? null,
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

async function awardMembershipReward(membership: ChatMemberUpdate): Promise<void> {
  const member = membership.new_chat_member.user;
  if (member.is_bot || !member.id) return;
  const chatId = catalogChatId(membership.chat.id);
  const viaInviteLink = Boolean(membership.invite_link?.invite_link);
  const memberName = member.username ?? member.first_name ?? "Telegram user";
  if (membership.chat.type === "channel") {
    const linkCreator = membership.invite_link?.creator;
    const rewardLink = membership.invite_link?.invite_link
      ? await getRewardInviteBeneficiary(chatId, membership.invite_link.invite_link)
      : undefined;
    const rewardLinkTelegramId = rewardLink?.beneficiaryOpenId.match(/^telegram:(\d+)$/)?.[1];
    const result = rewardLinkTelegramId && Number(rewardLinkTelegramId) !== member.id
      ? await awardTelegramReward({
          chatId,
          eventType: "invite_referral",
          beneficiaryTelegramId: Number(rewardLinkTelegramId),
          memberTelegramId: member.id,
          inviterTelegramId: Number(rewardLinkTelegramId),
        })
      : viaInviteLink && linkCreator && !linkCreator.is_bot && linkCreator.id !== member.id
      ? await awardTelegramReward({
          chatId,
          eventType: "invite_referral",
          beneficiaryTelegramId: linkCreator.id,
          memberTelegramId: member.id,
          beneficiaryName: linkCreator.username ?? linkCreator.first_name ?? "Telegram user",
          beneficiaryUsername: linkCreator.username,
          inviterTelegramId: linkCreator.id,
        })
      : await awardTelegramReward({
          chatId,
          eventType: "subscription",
          beneficiaryTelegramId: member.id,
          memberTelegramId: member.id,
          beneficiaryName: memberName,
          beneficiaryUsername: member.username,
        });
    if (result.awarded) {
      console.info(`[Telegram] Awarded ${result.amount / 100} GRAM for ${rewardLinkTelegramId || (viaInviteLink && linkCreator && !linkCreator.is_bot) ? "channel referral" : "channel subscription"} in ${chatId}`);
      await notifyRewardCredited({ telegramUserId: result.beneficiaryTelegramId, groupTitle: result.groupTitle, amount: result.amount });
    }
    return;
  }
  if ((membership.chat.type === "group" || membership.chat.type === "supergroup") && !viaInviteLink && !membership.from.is_bot && membership.from.id !== member.id) {
    const result = await awardTelegramReward({
      chatId,
      eventType: "manual_add",
      beneficiaryTelegramId: membership.from.id,
      memberTelegramId: member.id,
      beneficiaryName: membership.from.username ?? membership.from.first_name ?? "Telegram user",
      beneficiaryUsername: membership.from.username,
      inviterTelegramId: membership.from.id,
    });
    if (result.awarded) {
      console.info(`[Telegram] Awarded ${result.amount / 100} GRAM for manual chat addition in ${chatId}`);
      await notifyRewardCredited({ telegramUserId: result.beneficiaryTelegramId, groupTitle: result.groupTitle, amount: result.amount });
    }
  }
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.pre_checkout_query) {
    const checkout = update.pre_checkout_query;
    const approval = checkout.currency === "XTR"
      ? await approveStarsRankingPayment({ payload: checkout.invoice_payload, telegramUserId: checkout.from.id, starsAmount: checkout.total_amount })
      : { approved: false, reason: "Поддерживаются только Telegram Stars" };
    await telegramCall<boolean>("answerPreCheckoutQuery", approval.approved
      ? { pre_checkout_query_id: checkout.id, ok: true }
      : { pre_checkout_query_id: checkout.id, ok: false, error_message: approval.reason });
    return;
  }
  if (update.my_chat_member) { await saveAdminChat(update); return; }
  if (update.chat_member) {
    const membership = update.chat_member;
    if (!isChatOwner(membership.old_chat_member.status) && isChatOwner(membership.new_chat_member.status)) {
      await observeProtectedGroupTransfer(catalogChatId(membership.chat.id), `telegram:${membership.new_chat_member.user.id}`);
    }
    const joins = !isActiveMember(membership.old_chat_member.status) && isActiveMember(membership.new_chat_member.status);
    const leaves = isActiveMember(membership.old_chat_member.status) && !isActiveMember(membership.new_chat_member.status);
    if (joins || leaves) await recordGroupMembership(catalogChatId(membership.chat.id), joins, leaves, Boolean(membership.invite_link?.invite_link));
    if (joins) await awardMembershipReward(membership);
    return;
  }
  const message = update.message;
  if (message?.successful_payment) {
    const payment = message.successful_payment;
    if (!message.from || payment.currency !== "XTR") return;
    const settlement = await settleStarsRankingPayment({
      payload: payment.invoice_payload,
      telegramUserId: message.from.id,
      starsAmount: payment.total_amount,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
    });
    const refunded = settlement.status === "refund_required"
      ? await telegramCall<boolean>("refundStarPayment", {
          user_id: message.from.id,
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
        }).catch(error => {
          console.error("[Telegram] Could not automatically refund Stars ranking payment:", error);
          return false;
        })
      : false;
    if (settlement.status === "paid" && !settlement.idempotent && settlement.outbid) {
      void notifyRankingOutbid(settlement.outbid);
    }
    await telegramCall<boolean>("sendMessage", {
      chat_id: message.chat.id,
      text: settlement.status === "paid"
        ? "✅ Оплата Stars подтверждена. Ставка TG TOP активирована."
        : refunded
          ? "↩️ Позиция изменилась до подтверждения. Stars автоматически возвращены."
          : "⚠️ Оплата получена, но позиция изменилась. Запрос на возврат Stars передан в поддержку: /paysupport",
    });
    return;
  }
  const activity = message ?? update.channel_post;
  if (activity && (activity.chat.type === "group" || activity.chat.type === "supergroup" || activity.chat.type === "channel")) {
    await recordGroupActivity(catalogChatId(activity.chat.id), activity.views ?? 0);
    const chatIdStr = catalogChatId(activity.chat.id);
    const group = await getGroupByChatId(chatIdStr);
    if (group?.deleteServiceMessages && message && (message.new_chat_members || message.left_chat_member || message.new_chat_title || message.pinned_message)) {
      await telegramCall<boolean>("deleteMessage", {
        chat_id: activity.chat.id,
        message_id: message.message_id,
      }).catch(() => {});
    }
  }
  if (message?.text?.startsWith("/terms")) {
    await telegramCall<boolean>("sendMessage", {
      chat_id: message.chat.id,
      text: "Условия оплаты TG TOP: Stars оплачивают цифровую услугу размещения в рейтинге. Позиция активируется только после чека Telegram. Если позиция недоступна на момент подтверждения, Stars возвращаются автоматически либо через поддержку. Для вопросов: /paysupport",
    });
    return;
  }
  if (message?.text?.startsWith("/paysupport")) {
    await telegramCall<boolean>("sendMessage", {
      chat_id: message.chat.id,
      text: "Поддержка оплат TG TOP: опишите номер чека, позицию и группу в одном сообщении. Мы проверим историю платежа и ответим в этом чате.",
    });
    return;
  }
  if (!message?.text?.startsWith("/start")) return;
  if (message.from) {
    const openId = `telegram:${message.from.id}`;
    await upsertUser({ openId, name: message.from.username ?? message.from.first_name ?? "Telegram user", telegramUsername: message.from.username ?? null, loginMethod: "telegram-bot", lastSignedIn: new Date() });
    const referralCode = getReferralCodeFromStartText(message.text);
    const attributed = referralCode ? await attributeTelegramReferral(message.from.id, referralCode) : false;
    await openMiniApp(message.chat.id, attributed
      ? "Вы присоединились к TG TOP по приглашению. Откройте приложение, чтобы добавить группу и посмотреть каталог."
      : "Добро пожаловать в TG TOP. Откройте приложение, чтобы управлять каталогом и рейтингом.");
    return;
  }
  await openMiniApp(message.chat.id, "Добро пожаловать в TG TOP. Откройте приложение, чтобы управлять каталогом и рейтингом.");
}

function getTelegramPollingErrorSummary(error: unknown): string {
  if (!error || typeof error !== "object") return "Unexpected Telegram polling failure";
  const response = "response" in error ? (error.response as { status?: unknown; data?: { description?: unknown } } | undefined) : undefined;
  const status = typeof response?.status === "number" ? response.status : undefined;
  const description = typeof response?.data?.description === "string" ? response.data.description : undefined;
  if (status && description) return `Telegram API ${status}: ${description}`;
  if (status) return `Telegram API ${status}`;
  return "Unexpected Telegram polling failure";
}

async function run(): Promise<void> {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  console.info("[Telegram] Starting long-polling for @TGTOP_robot");
  let offset = 0;
  while (true) {
    try {
      const updates = await telegramCall<TelegramUpdate[]>("getUpdates", { offset, timeout: pollTimeoutSeconds, allowed_updates: ["message", "channel_post", "my_chat_member", "chat_member", "pre_checkout_query"] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await handleUpdate(update); } catch (error) { console.error(`[Telegram] Failed to process update ${update.update_id}:`, error); }
      }
    } catch (error) {
      console.error("[Telegram] Polling error:", getTelegramPollingErrorSummary(error));
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
}

export const __private__ = { buildOnboardingConfirmation, catalogCategory, getReferralCodeFromStartText, getTelegramPollingErrorSummary, isActiveMember, isBotAdmin, isChatOwner, publicGroupUrl };
const isMainModule = process.argv[1] ? new URL(`file://${process.argv[1]}`).href === import.meta.url : false;
if (isMainModule) void run();
