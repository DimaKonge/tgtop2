import "dotenv/config";
import axios from "axios";
import { notifyRewardCredited } from "./telegramNotifications";
import { storagePut } from "./storage";
import {
  getGroupByChatId,
  getRewardInviteBeneficiary,
  attributeTelegramReferral,
  getTelegramOwnerDmBinding,
  grantGroupConnectionBonus,
  recordGroupActivity,
  recordGroupMembership,
  recordGroupSnapshot,
  awardTelegramReward,
  observeProtectedGroupTransfer,
  approveStarsRankingPayment,
  claimTelegramEvent,
  consumeTelegramOnboardingIntent,
  flagGroupForModeration,
  getActiveTelegramOnboardingIntent,
  getRankedEntryLinkTargets,
  getTelegramReferralReferrer,
  getTelegramOperationsOwnerBinding,
  getAllKnownTelegramMembers,
  getUniqueMiniAppLaunchMembers,
  recordMiniAppLaunch,
  recordTelegramSupportInbound,
  recordTelegramSupportOutbound,
  getTelegramOperationLogDestination,
  getTelegramSupportMessageByOwnerNotification,
  linkTelegramSupportOwnerNotification,
  recordVerifiedPublicUsername,
  saveTelegramOperationLogDestination,
  settleStarsRankingPayment,
  saveTelegramOperationsOwnerBinding,
  upsertTelegramGroup,
  upsertUser,
} from "./db";
import { notifyCommunityEntryLinkInvalidated, notifyCommunityEntryLinkRevalidated, notifyRankingOutbid } from "./telegramNotifications";
import { ENV } from "./_core/env";
import { deliverOperationsLog, formatAdditionLog, formatLaunchLog, formatTopActivityLog } from "./telegramOperationsLogger";

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  description?: string;
  photo?: { small_file_id?: string };
  invite_link?: string;
};

type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string; is_bot?: boolean };
type ChatMember = { status: string; user: TelegramUser };
type ChatMemberUpdate = {
  date?: number;
  chat: TelegramChat;
  from: TelegramUser;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: { invite_link?: string; creator?: TelegramUser };
};
type TelegramActivity = { chat: TelegramChat; message_id?: number; views?: number };
type TelegramUpdate = {
  update_id: number;
  message?: TelegramActivity & {
    message_id: number;
    from?: TelegramUser;
    text?: string;
    caption?: string;
    message_thread_id?: number;
    photo?: Array<{ file_id: string }>;
    video?: { file_id: string };
    document?: { file_id: string };
    sticker?: { file_id: string };
    animation?: { file_id: string };
    audio?: { file_id: string };
    voice?: { file_id: string };
    new_chat_members?: TelegramUser[];
    left_chat_member?: TelegramUser;
    new_chat_title?: string;
    pinned_message?: unknown;
    successful_payment?: { currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string };
    reply_to_message?: { message_id?: number; from?: TelegramUser; text?: string; sticker?: { file_id: string } };
  };
  channel_post?: TelegramActivity & { text?: string; caption?: string; message_id: number };
  chat_member?: ChatMemberUpdate;
  my_chat_member?: { date?: number; chat: TelegramChat; from: TelegramUser; old_chat_member: ChatMember; new_chat_member: ChatMember };
  pre_checkout_query?: { id: string; from: TelegramUser; currency: string; total_amount: number; invoice_payload: string };
};

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const reserveBotToken = process.env.TELEGRAM_RESERVE_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL ?? "https://tgtop.me";
const pollTimeoutSeconds = 30;
const welcomeStickerFileId = "CAACAgQAAxkBAAM7apCKivp2Zo4HRaVZkvKXmfrdXZIAAtYjAALqAohQfiIRNuroIOM9BA";
let activeBotLabel = "@TG_TOPBOT";
let ignoredOnboardingUpdates = 0;
let nextIgnoredOnboardingLogAt = 0;

function isBotAdmin(status: string): boolean { return status === "administrator" || status === "creator"; }
function isChatOwner(status: string): boolean { return status === "creator" || status === "owner"; }
function isActiveMember(status: string): boolean { return ["creator", "administrator", "member", "restricted"].includes(status); }
export function isValidTelegramMemberCount(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function catalogCategory(chat: TelegramChat): "Каналы" | "Чаты" { return chat.type === "channel" ? "Каналы" : "Чаты"; }
function catalogChatId(chatId: number): string { return String(chatId); }
function publicGroupUrl(chat: TelegramChat): string | undefined { return chat.username ? `https://t.me/${chat.username}` : undefined; }
function recordIgnoredOnboardingUpdate(reason: string) {
  ignoredOnboardingUpdates += 1;
  const now = Date.now();
  if (now < nextIgnoredOnboardingLogAt) return;
  console.warn(`[Telegram] Ignored ${ignoredOnboardingUpdates} onboarding update(s): ${reason}`);
  ignoredOnboardingUpdates = 0;
  nextIgnoredOnboardingLogAt = now + 60_000;
}
const OPERATIONS_BOOTSTRAP_OWNER_USERNAME = "dimij";
function isExpectedLogBot(kind: NonNullable<ReturnType<typeof parsePrivateLogDestinationCommand>>) {
  return kind === "support" ? "@tg_topbot" : "@tgtop_robot";
}

export function parsePrivateLogDestinationCommand(text: string | undefined): "top_activity" | "finance" | "support" | "launches" | "additions" | null {
  const normalized = text?.trim().toLowerCase() ?? "";
  if (/^\/tgtop_log_top(?:@\w+)?$/.test(normalized)) return "top_activity";
  if (/^\/tgtop_log_connections(?:@\w+)?$/.test(normalized)) return "top_activity";
  if (/^\/tgtop_log_finance(?:@\w+)?$/.test(normalized)) return "finance";
  if (/^\/tgtop_support(?:@\w+)?$/.test(normalized)) return "support";
  if (/^\/tgtop_log_launches(?:@\w+)?$/.test(normalized)) return "launches";
  if (/^\/tgtop_log_additions(?:@\w+)?$/.test(normalized)) return "additions";
  return null;
}

function isAllMembersCommand(text: string | undefined) {
  return /^\/allmembers(?:@tgtop_robot)?$/i.test(text?.trim() ?? "");
}

function isStickerIdCommand(text: string | undefined) {
  return /^\/stickerid(?:@tgtop_robot)?$/i.test(text?.trim() ?? "");
}

async function configurePrivateLogDestination(message: NonNullable<TelegramUpdate["message"]>) {
  const kind = parsePrivateLogDestinationCommand(message.text);
  if (!kind) return false;
  if (activeBotLabel.toLowerCase() !== isExpectedLogBot(kind)) return false;
  if (message.chat.type !== "group" && message.chat.type !== "supergroup" && message.chat.type !== "channel") {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, text: "Подключите закрытую группу или канал, а не личный чат." }).catch(() => {});
    return true;
  }
  if (message.message_thread_id === undefined) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, text: "Откройте нужный topic и отправьте команду внутри него." }).catch(() => {});
    return true;
  }
  const topicReply = { message_thread_id: message.message_thread_id };
  if (!message.from || message.from.is_bot || !(await isAuthorizedOperationsOwner(message))) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Эту закрытую log-группу может подключить только владелец TG TOP." }).catch(() => {});
    return true;
  }
  try {
    await saveTelegramOperationsOwnerBinding({
      chatId: catalogChatId(message.chat.id),
      ownerTelegramId: String(message.from.id),
      ownerUsername: message.from.username ?? null,
    });
  } catch {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Эта private log-группа уже привязана к другому владельцу." }).catch(() => {});
    return true;
  }
  await saveTelegramOperationLogDestination({
    kind,
    chatId: catalogChatId(message.chat.id),
    messageThreadId: message.message_thread_id ?? null,
    chatTitle: message.chat.title ?? null,
    configuredByOpenId: `telegram:${message.from.id}`,
  });
  const label = kind === "top_activity" ? "TOP-активность" : kind === "finance" ? "Финансы" : kind === "support" ? "Поддержка" : kind === "launches" ? "Запуски" : "Добавления";
  await telegramCall<boolean>("sendMessage", {
    chat_id: message.chat.id,
    ...topicReply,
    text: `✅ Private log «${label}» подключён. Сюда будут приходить только подтверждённые события TG TOP. Никаких команд управления деньгами этот журнал не выполняет.`,
  }).catch(() => {});
  return true;
}

async function shouldBypassGlobalEventClaim(update: TelegramUpdate) {
  if (update.my_chat_member) {
    const membership = update.my_chat_member;
    const supportedChat = membership.chat.type === "group" || membership.chat.type === "supergroup" || membership.chat.type === "channel";
    const botWasActivated = isBotAdmin(membership.new_chat_member.status) && !isBotAdmin(membership.old_chat_member.status);
    if (activeBotLabel.toLowerCase() !== "@tg_topbot" || !supportedChat || !botWasActivated) return true;
    const kind = membership.chat.type === "channel" ? "channel" as const : "group" as const;
    return !(await getActiveTelegramOnboardingIntent({ ownerTelegramId: String(membership.from.id), kind }));
  }
  const message = update.message;
  if (!message) return false;
  const command = parsePrivateLogDestinationCommand(message.text);
  if (command && activeBotLabel.toLowerCase() !== isExpectedLogBot(command)) return true;
  if (isAllMembersCommand(message.text) && activeBotLabel.toLowerCase() !== "@tgtop_robot") return true;
  if (isStickerIdCommand(message.text) && activeBotLabel.toLowerCase() !== "@tgtop_robot") return true;
  if (activeBotLabel.toLowerCase() !== "@tgtop_robot" || !message.reply_to_message?.message_id) return false;
  const destination = await getTelegramOperationLogDestination("support");
  return Boolean(
    destination
      && destination.chatId === catalogChatId(message.chat.id)
      && (destination.messageThreadId === null || destination.messageThreadId === message.message_thread_id),
  );
}

function formatAllMembersText(members: Array<{ userOpenId: string; telegramUsername: string | null }>) {
  return members.map(member => {
    if (member.telegramUsername) return `@${member.telegramUsername}`;
    const telegramId = member.userOpenId.match(/^telegram:(\d+)$/)?.[1];
    return telegramId ? `ID ${telegramId}` : member.userOpenId;
  }).join("\n");
}

async function sendTextDocument(input: { chatId: number; messageThreadId: number; fileName: string; text: string }) {
  const form = new FormData();
  form.append("chat_id", String(input.chatId));
  form.append("message_thread_id", String(input.messageThreadId));
  form.append("document", new Blob([input.text], { type: "text/plain;charset=utf-8" }), input.fileName);
  const response = await axios.post<{ ok: boolean; description?: string }>(getApiUrl("sendDocument"), form, { timeout: 40_000 });
  if (!response.data.ok) throw new Error(response.data.description ?? "Telegram API sendDocument failed");
}

async function handleStickerIdCommand(message: NonNullable<TelegramUpdate["message"]>) {
  if (!isStickerIdCommand(message.text) || activeBotLabel.toLowerCase() !== "@tgtop_robot") return false;
  const topicReply = message.message_thread_id === undefined ? {} : { message_thread_id: message.message_thread_id };
  if (!message.from || message.from.is_bot || !(await isAuthorizedOperationsOwner(message))) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Эта команда доступна только владельцу TG TOP." }).catch(() => {});
    return true;
  }
  const sticker = message.reply_to_message?.sticker;
  if (!sticker?.file_id) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Ответь командой /stickerid именно на сообщение со стикером." }).catch(() => {});
    return true;
  }
  await telegramCall<boolean>("sendMessage", {
    chat_id: message.chat.id,
    ...topicReply,
    text: `Sticker file_id:\n${sticker.file_id}`,
    disable_web_page_preview: true,
  }).catch(() => {});
  return true;
}

async function handleAllMembersExport(message: NonNullable<TelegramUpdate["message"]>) {
  if (!isAllMembersCommand(message.text) || activeBotLabel.toLowerCase() !== "@tgtop_robot") return false;
  if ((message.chat.type !== "group" && message.chat.type !== "supergroup") || message.message_thread_id === undefined) return false;
  const topicReply = { message_thread_id: message.message_thread_id };
  if (!message.from || message.from.is_bot || !(await isAuthorizedOperationsOwner(message))) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Выгрузка доступна только владельцу TG TOP в теме «Запуски»." }).catch(() => {});
    return true;
  }
  const destination = await getTelegramOperationLogDestination("launches");
  if (!destination || destination.chatId !== catalogChatId(message.chat.id) || destination.messageThreadId !== message.message_thread_id) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Сначала подключите этот topic командой /tgtop_log_launches@TGTOP_robot." }).catch(() => {});
    return true;
  }
  const members = await getAllKnownTelegramMembers();
  if (!members.length) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, ...topicReply, text: "Подтверждённых запусков пока нет." }).catch(() => {});
    return true;
  }
  await sendTextDocument({
    chatId: message.chat.id,
    messageThreadId: message.message_thread_id,
    fileName: "tgtop_allmembers.txt",
    text: formatAllMembersText(members),
  });
  return true;
}

function ownerTelegramChatId(): string | null {
  const match = ENV.ownerOpenId?.match(/^telegram:(-?\d+)$/);
  return match?.[1] ?? null;
}

async function isAuthorizedOwnerTelegramUser(telegramUserId: number) {
  const candidate = String(telegramUserId);
  if (ownerTelegramChatId() === candidate) return true;
  const ownerBinding = await getTelegramOwnerDmBinding();
  return ownerBinding?.ownerTelegramId === candidate;
}

async function isAuthorizedOperationsOwner(message: NonNullable<TelegramUpdate["message"]>) {
  if (!message.from) return false;
  const chatId = catalogChatId(message.chat.id);
  const ownerBinding = await getTelegramOperationsOwnerBinding();
  if (ownerBinding) return ownerBinding.chatId === chatId && ownerBinding.ownerTelegramId === String(message.from.id);
  if (await isAuthorizedOwnerTelegramUser(message.from.id)) return true;
  if (message.from.username?.toLowerCase() !== OPERATIONS_BOOTSTRAP_OWNER_USERNAME) return false;
  const membership = await telegramCall<ChatMember>("getChatMember", { chat_id: message.chat.id, user_id: message.from.id }).catch(() => null);
  return Boolean(membership && isChatOwner(membership.status));
}

async function handleSupportReply(message: NonNullable<TelegramUpdate["message"]>) {
  if (activeBotLabel.toLowerCase() !== "@tg_topbot") return false;
  if (message.chat.type !== "group" && message.chat.type !== "supergroup") return false;
  if (!message.from || message.from.is_bot || !(await isAuthorizedOperationsOwner(message))) return false;
  const replyId = message.reply_to_message?.message_id;
  const text = message.text?.trim();
  const mediaLabel = supportMediaLabel(message);
  if (!replyId || ((!text && !mediaLabel) || text?.startsWith("/"))) return false;
  const destination = await getTelegramOperationLogDestination("support");
  if (!destination || destination.chatId !== catalogChatId(message.chat.id)) return false;
  if (destination.messageThreadId !== null && destination.messageThreadId !== message.message_thread_id) return false;
  const inbound = await getTelegramSupportMessageByOwnerNotification(String(replyId));
  if (!inbound) return false;
  const replyText = (text ?? `[${mediaLabel}]${message.caption ? ` ${message.caption.trim()}` : ""}`).slice(0, 4_000);
  const delivered = await sendSupportOwnerMessage(message, { chatId: inbound.telegramUserId, messageThreadId: null }, replyText);
  await recordTelegramSupportOutbound({
    telegramUserId: inbound.telegramUserId,
    telegramUsername: inbound.telegramUsername,
    text: replyText,
    telegramMessageId: String(delivered.message_id),
  });
  await telegramCall<boolean>("sendMessage", {
    chat_id: message.chat.id,
    message_thread_id: message.message_thread_id,
    text: "✅ Ответ отправлен пользователю.",
  });
  return true;
}

function supportMediaLabel(message: NonNullable<TelegramUpdate["message"]>) {
  if (message.photo?.length) return "Фото";
  if (message.video) return "Видео";
  if (message.document) return "Документ";
  if (message.sticker) return "Стикер";
  if (message.animation) return "GIF/анимация";
  if (message.audio) return "Аудио";
  if (message.voice) return "Голосовое сообщение";
  return null;
}

async function sendSupportOwnerMessage(message: NonNullable<TelegramUpdate["message"]>, destination: { chatId: string; messageThreadId: number | null }, caption: string) {
  const common = {
    chat_id: destination.chatId,
    ...(destination.messageThreadId ? { message_thread_id: destination.messageThreadId } : {}),
  };
  if (message.photo?.length) return telegramCall<{ message_id: number }>("sendPhoto", { ...common, photo: message.photo[message.photo.length - 1].file_id, caption });
  if (message.video) return telegramCall<{ message_id: number }>("sendVideo", { ...common, video: message.video.file_id, caption });
  if (message.document) return telegramCall<{ message_id: number }>("sendDocument", { ...common, document: message.document.file_id, caption });
  if (message.sticker) return telegramCall<{ message_id: number }>("sendSticker", { ...common, sticker: message.sticker.file_id });
  if (message.animation) return telegramCall<{ message_id: number }>("sendAnimation", { ...common, animation: message.animation.file_id, caption });
  if (message.audio) return telegramCall<{ message_id: number }>("sendAudio", { ...common, audio: message.audio.file_id, caption });
  if (message.voice) return telegramCall<{ message_id: number }>("sendVoice", { ...common, voice: message.voice.file_id, caption });
  return telegramCall<{ message_id: number }>("sendMessage", { ...common, text: caption, disable_web_page_preview: true });
}

async function handleSupportInbound(message: NonNullable<TelegramUpdate["message"]>) {
  if (activeBotLabel.toLowerCase() !== "@tg_topbot") return false;
  if (message.chat.type !== "private" || !message.from || message.from.is_bot) return false;
  const text = message.text?.trim();
  const caption = message.caption?.trim();
  const mediaLabel = supportMediaLabel(message);
  if ((!text && !mediaLabel) || text?.startsWith("/") || caption?.startsWith("/")) return false;
  const destination = await getTelegramOperationLogDestination("support");
  if (!destination) {
    await telegramCall<boolean>("sendMessage", { chat_id: message.chat.id, text: "Поддержка временно не подключена. Попробуйте позже." }).catch(() => {});
    return true;
  }
  const inboundId = await recordTelegramSupportInbound({
    telegramUserId: String(message.from.id),
    telegramUsername: message.from.username ?? null,
    text: (text ?? `[${mediaLabel}]${caption ? ` ${caption}` : ""}`).slice(0, 4_000),
    telegramMessageId: String(message.message_id),
  });
  const ownerCaption = [
    "📩 Новое сообщение в поддержку TG TOP",
    `Пользователь: ${message.from.username ? `@${message.from.username}` : `ID ${message.from.id}`}`,
    mediaLabel ? `Тип вложения: ${mediaLabel}` : "",
    caption ? `Подпись: ${caption.slice(0, 3_400)}` : text ? text.slice(0, 3_600) : "",
    "",
    "Ответьте реплаем на эту карточку — бот отправит ответ пользователю.",
  ].filter(Boolean).join("\n");
  const ownerMessage = await sendSupportOwnerMessage(message, destination, ownerCaption);
  await linkTelegramSupportOwnerNotification(inboundId, String(ownerMessage.message_id));
  return true;
}

type RankedEntryLinkTarget = {
  id: number;
  chatId: string;
  title: string;
  ownerOpenId: string;
  username: string | null;
  inviteLink: string | null;
  monthlyEntryInviteLink: string | null;
  status: string;
};

async function invalidateStaleEntryLink(target: RankedEntryLinkTarget) {
  if (target.status !== "listed") return false;
  const removed = await flagGroupForModeration(target.chatId, "Подтверждённая ссылка входа изменилась или больше недоступна");
  if (removed) void notifyCommunityEntryLinkInvalidated({ openId: target.ownerOpenId, groupTitle: target.title });
  return removed;
}

type EntryLinkResolverDependencies = {
  getChatProfile?: (chatId: number) => Promise<TelegramChat>;
  invalidateStaleEntryLink?: (target: RankedEntryLinkTarget) => Promise<boolean>;
  recordVerifiedPublicUsername?: (input: { chatId: string; verifiedUsername: string }) => Promise<boolean>;
  notifyCommunityEntryLinkRevalidated?: (input: { openId: string; groupTitle: string; username: string }) => unknown;
};

export async function resolveVerifiedGroupEntryLink(target: RankedEntryLinkTarget, dependencies: EntryLinkResolverDependencies = {}): Promise<string> {
  const chatId = Number(target.chatId);
  if (!Number.isSafeInteger(chatId)) throw new Error("Не удалось проверить сообщество в Telegram");
  const getProfile = dependencies.getChatProfile ?? getChatProfile;
  const invalidate = dependencies.invalidateStaleEntryLink ?? invalidateStaleEntryLink;
  const recordUsername = dependencies.recordVerifiedPublicUsername ?? recordVerifiedPublicUsername;
  const notifyRevalidated = dependencies.notifyCommunityEntryLinkRevalidated ?? notifyCommunityEntryLinkRevalidated;
  let profile: TelegramChat;
  try {
    profile = await getProfile(chatId);
  } catch {
    throw new Error("Не удалось проверить ссылку сообщества. Убедитесь, что TG TOP остаётся администратором.");
  }
  if (profile.id !== chatId) {
    await invalidate(target);
    throw new Error("Не удалось подтвердить Telegram-идентичность сообщества. Карточка снята с ТОПа до повторной проверки.");
  }
  if (target.username) {
    if (!profile.username) {
      await invalidate(target);
      throw new Error("Публичный адрес сообщества больше недоступен. Карточка снята с ТОПа до повторной проверки.");
    }
    if (profile.username !== target.username) {
      try {
        const updated = await recordUsername({ chatId: target.chatId, verifiedUsername: profile.username });
        if (updated) void notifyRevalidated({ openId: target.ownerOpenId, groupTitle: target.title, username: profile.username });
      } catch (error) {
        console.warn(`[Telegram] Verified username update skipped for ${target.id}:`, error);
      }
    }
    return `https://t.me/${profile.username}`;
  }
  if (target.monthlyEntryInviteLink) return target.monthlyEntryInviteLink;
  if (target.inviteLink && profile.invite_link === target.inviteLink) return target.inviteLink;
  await invalidate(target);
  throw new Error("Подтверждённая ссылка входа больше недоступна. Карточка снята с ТОПа до повторной проверки.");
}

let lastEntryLinkAuditAt = 0;
async function auditRankedEntryLinks() {
  const now = Date.now();
  if (now - lastEntryLinkAuditAt < 10 * 60_000) return;
  lastEntryLinkAuditAt = now;
  const targets = await getRankedEntryLinkTargets();
  for (const target of targets) {
    try {
      await resolveVerifiedGroupEntryLink(target);
    } catch (error) {
      console.info(`[Telegram] Entry link audit skipped ${target.id}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
}
async function getChatInviteLink(chatId: number): Promise<string | undefined> {
  try {
    const link = await telegramCall<string>("exportChatInviteLink", { chat_id: chatId });
    return link || undefined;
  } catch {
    try {
      const chat = await getChatProfile(chatId);
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
function getApiUrl(method: string, token = botToken): string {
  if (!token) throw new Error("Telegram bot token is not configured");
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramCall<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  return telegramCallWithToken<T>(botToken, method, payload);
}

async function telegramCallWithToken<T>(token: string | undefined, method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await axios.post<{ ok: boolean; result: T; description?: string }>(getApiUrl(method, token), payload, { timeout: 40_000 });
  if (!response.data.ok) throw new Error(response.data.description ?? `Telegram API ${method} failed`);
  return response.data.result;
}

function getActiveBotTokens(primary = botToken, reserve = reserveBotToken): string[] {
  return Array.from(new Set([primary, reserve].filter((token): token is string => Boolean(token))));
}

export type TelegramGroupAdministrator = {
  telegramUserId: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
};

export type TelegramChatGift = {
  id: string;
  title: string;
  emoji: string;
  unique: boolean;
  mediaUrl: string | null;
  mediaKind: "video" | "tgs" | "image" | null;
};

type TelegramFile = { file_path?: string };
type TelegramUserProfilePhotos = { photos: Array<Array<{ file_id: string }>> };

export async function getTelegramGroupAdministrators(chatId: string): Promise<TelegramGroupAdministrator[]> {
  const administrators = await telegramCall<ChatMember[]>("getChatAdministrators", { chat_id: chatId });
  const eligibleAdministrators = administrators
    .filter(member => isBotAdmin(member.status) && !member.user.is_bot)
    .map(member => ({
      telegramUserId: String(member.user.id),
      username: member.user.username ?? null,
      name: [member.user.first_name, member.user.last_name].filter(Boolean).join(" ") || member.user.username || `ID ${member.user.id}`,
    }));
  return await Promise.all(eligibleAdministrators.map(async administrator => ({
    ...administrator,
    avatarUrl: await getTelegramUserAvatarUrl(administrator.telegramUserId),
  })));
}

export async function getTelegramChatGifts(chatId: string): Promise<TelegramChatGift[]> {
  type StickerMedia = { file_id?: string; is_video?: boolean; is_animated?: boolean; thumbnail?: { file_id?: string } };
  type RawGift = {
    owned_gift_id?: string;
    type?: "regular" | "unique";
    gift?: { id?: string; title?: string; name?: string; sticker?: StickerMedia & { emoji?: string } };
    unique_gift?: { name?: string; title?: string; number?: number; sticker?: StickerMedia & { emoji?: string } };
  };
  type RawOwnedGifts = { gifts?: RawGift[] };

  const result = await telegramCall<RawOwnedGifts>("getChatGifts", {
    chat_id: chatId,
    exclude_unsaved: false,
    limit: 100,
  });
  const gifts = result.gifts ?? [];
  return await Promise.all(gifts.map(async (gift, index) => {
    const uniqueGift = gift.unique_gift;
    const regularGift = gift.gift;
    const sticker = uniqueGift?.sticker ?? regularGift?.sticker;
    const title = uniqueGift?.name ?? uniqueGift?.title ?? regularGift?.title ?? regularGift?.name ?? `Подарок #${index + 1}`;
    const mediaKind = sticker?.is_video ? "video" : sticker?.is_animated ? "tgs" : sticker?.file_id ? "image" : null;
    const sourceFileId = sticker?.file_id ?? sticker?.thumbnail?.file_id;
    let mediaUrl: string | null = null;
    if (sourceFileId) {
      try {
        const file = await telegramCall<TelegramFile>("getFile", { file_id: sourceFileId });
        if (file.file_path) {
          const media = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${botToken}/${file.file_path}`, { responseType: "arraybuffer", timeout: 20_000 });
          const extension = file.file_path.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
          const mediaContentType = media.headers["content-type"];
          const stored = await storagePut(`telegram/channel-gifts/${chatId}/${sourceFileId}.${extension}`, Buffer.from(media.data), typeof mediaContentType === "string" ? mediaContentType : "application/octet-stream");
          mediaUrl = stored.url;
        }
      } catch {
        mediaUrl = null;
      }
    }
    return {
      id: gift.owned_gift_id ?? regularGift?.id ?? `${title}-${index}`,
      title: uniqueGift?.number ? `${title} #${uniqueGift.number}` : title,
      emoji: uniqueGift?.sticker?.emoji ?? regularGift?.sticker?.emoji ?? "🎁",
      unique: gift.type === "unique" || Boolean(uniqueGift),
      mediaUrl,
      mediaKind,
    };
  }));
}

export async function getTelegramUserAvatarUrl(telegramUserId: string): Promise<string | null> {
  for (const token of getActiveBotTokens()) {
    try {
      const photos = await telegramCallWithToken<TelegramUserProfilePhotos>(token, "getUserProfilePhotos", { user_id: Number(telegramUserId), limit: 1 });
      const fileId = photos.photos[0]?.at(-1)?.file_id;
      if (!fileId) continue;
      const file = await telegramCallWithToken<TelegramFile>(token, "getFile", { file_id: fileId });
      if (!file.file_path) continue;
      const response = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { responseType: "arraybuffer", timeout: 15_000 });
      const managerContentType = response.headers["content-type"];
      const stored = await storagePut(`telegram/managers/${telegramUserId}.jpg`, Buffer.from(response.data), typeof managerContentType === "string" ? managerContentType : "image/jpeg");
      return stored.url;
    } catch {
      continue;
    }
  }
  return null;
}

async function getMemberCount(chatId: number): Promise<number | undefined> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const count = await telegramCall<unknown>("getChatMemberCount", { chat_id: chatId });
      if (isValidTelegramMemberCount(count)) return count;
      console.warn(`[Telegram] Invalid member count for ${chatId}`);
    } catch (error) {
      console.warn(`[Telegram] Could not read member count for ${chatId} (attempt ${attempt}/3):`, error);
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 750));
  }
  return undefined;
}

async function getChatProfile(chatId: number): Promise<TelegramChat> { return await telegramCall<TelegramChat>("getChat", { chat_id: chatId }); }

async function openMiniApp(chatId: number, greeting: string, includeWelcomeSticker = false): Promise<void> {
  if (includeWelcomeSticker) {
    await telegramCall<boolean>("sendSticker", { chat_id: chatId, sticker: welcomeStickerFileId });
  }
  await telegramCall<boolean>("sendMessage", {
    chat_id: chatId,
    text: greeting,
    reply_markup: { inline_keyboard: [[{ text: "Открыть TG TOP", web_app: { url: miniAppUrl } }]] },
  });
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

async function sendOnboardingReadFailure(ownerChatId: number): Promise<void> {
  await telegramCall<boolean>("sendMessage", {
    chat_id: ownerChatId,
    text: "TG TOP не смог получить данные сообщества из Telegram, поэтому карточка не создана с неточными цифрами. Убедитесь, что @TG_TOPBOT остаётся администратором, затем удалите и снова добавьте его в администраторы, чтобы повторить подключение.",
  }).catch(() => {});
}

async function saveAdminChat(update: TelegramUpdate): Promise<void> {
  const membership = update.my_chat_member;
  if (!membership) return;
  const { chat, from, old_chat_member: previous, new_chat_member: current } = membership;
  if (chat.type !== "group" && chat.type !== "supergroup" && chat.type !== "channel") return;
  if (!isBotAdmin(current.status) || isBotAdmin(previous.status)) return;
  if (activeBotLabel.toLowerCase() !== "@tg_topbot") return;

  const intentKind = chat.type === "channel" ? "channel" as const : "group" as const;
  const ownerTelegramId = String(from.id);
  const intent = await getActiveTelegramOnboardingIntent({ ownerTelegramId, kind: intentKind });
  if (!intent) {
    recordIgnoredOnboardingUpdate(`missing ${intentKind} intent`);
    return;
  }

  let actorMembership: ChatMember;
  try {
    actorMembership = await telegramCall<ChatMember>("getChatMember", { chat_id: chat.id, user_id: from.id });
  } catch {
    await telegramCall<boolean>("sendMessage", {
      chat_id: from.id,
      text: "TG TOP не смог подтвердить владельца сообщества. Убедитесь, что вы владелец и @TG_TOPBOT остаётся администратором, затем повторите подключение.",
    }).catch(() => {});
    return;
  }
  if (!isChatOwner(actorMembership.status)) {
    await telegramCall<boolean>("sendMessage", {
      chat_id: from.id,
      text: "Подключить сообщество к TG TOP может только его владелец Telegram. Попросите владельца добавить @TG_TOPBOT в администраторы.",
    }).catch(() => {});
    return;
  }

  let profile: TelegramChat;
  try {
    profile = await getChatProfile(chat.id);
  } catch {
    await sendOnboardingReadFailure(from.id);
    return;
  }
  const membersCount = await getMemberCount(chat.id);
  if (membersCount === undefined) {
    await sendOnboardingReadFailure(from.id);
    return;
  }
  const consumed = await consumeTelegramOnboardingIntent({
    ownerTelegramId,
    kind: intentKind,
    chatId: catalogChatId(chat.id),
  });
  if (!consumed) {
    recordIgnoredOnboardingUpdate(`consumed ${intentKind} intent`);
    return;
  }
  const inviteLink = await getChatInviteLink(chat.id);
  const ownerOpenId = `telegram:${from.id}`;
  await upsertUser({ openId: ownerOpenId, name: from.username ?? from.first_name ?? "Telegram user", telegramUsername: from.username ?? null, loginMethod: "telegram-bot", lastSignedIn: new Date() });
  await upsertTelegramGroup({
    chatId: catalogChatId(chat.id), title: profile.title ?? chat.title ?? "Telegram community", username: profile.username ?? chat.username ?? null,
    inviteLink: inviteLink ?? null,
    description: profile.description ?? null, avatarFileId: profile.photo?.small_file_id ?? null, membersCount, ownerOpenId,
    category: catalogCategory(chat), country: "Global", status: "pending", moderationStatus: "approved", moderationReason: null, messagesCount: 0, joinedCount: 0, lastPostViews: 0, lastStatsAt: new Date(),
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
  if (savedGroup) {
    const additionLog = formatAdditionLog({
      groupTitle: savedGroup.title,
      groupId: savedGroup.id,
      chatType: chat.type === "channel" ? "channel" : chat.type === "group" ? "group" : "supergroup",
      actor: { name: from.first_name, username: from.username },
    });
    void deliverOperationsLog("additions", additionLog);
    void deliverOperationsLog("top_activity", formatTopActivityLog({
      event: "bot_connected",
      groupTitle: savedGroup.title,
      groupId: savedGroup.id,
      actor: { name: from.first_name, username: from.username },
    }));
  }
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
  if (membership.chat.type === "group" || membership.chat.type === "supergroup") {
    const rewardLink = membership.invite_link?.invite_link
      ? await getRewardInviteBeneficiary(chatId, membership.invite_link.invite_link)
      : undefined;
    const rewardLinkTelegramId = rewardLink?.beneficiaryOpenId.match(/^telegram:(\d+)$/)?.[1];
    const result = rewardLinkTelegramId && Number(rewardLinkTelegramId) !== member.id
      ? await awardTelegramReward({
          chatId,
          eventType: "manual_add",
          beneficiaryTelegramId: Number(rewardLinkTelegramId),
          memberTelegramId: member.id,
          inviterTelegramId: Number(rewardLinkTelegramId),
        })
      : !viaInviteLink && !membership.from.is_bot && membership.from.id !== member.id
        ? await awardTelegramReward({
            chatId,
            eventType: "manual_add",
            beneficiaryTelegramId: membership.from.id,
            memberTelegramId: member.id,
            beneficiaryName: membership.from.username ?? membership.from.first_name ?? "Telegram user",
            beneficiaryUsername: membership.from.username,
            inviterTelegramId: membership.from.id,
          })
        : undefined;
    if (result?.awarded) {
      console.info(`[Telegram] Awarded ${result.amount / 100} GRAM for ${rewardLinkTelegramId ? "tracked group join" : "manual chat addition"} in ${chatId}`);
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
  if (update.message && await configurePrivateLogDestination(update.message)) return;
  if (update.message && await handleStickerIdCommand(update.message)) return;
  if (update.message && await handleAllMembersExport(update.message)) return;
  if (update.chat_member) {
    const membership = update.chat_member;
    if (!isChatOwner(membership.old_chat_member.status) && isChatOwner(membership.new_chat_member.status)) {
      await observeProtectedGroupTransfer(catalogChatId(membership.chat.id), `telegram:${membership.new_chat_member.user.id}`);
    }
    const joins = !isActiveMember(membership.old_chat_member.status) && isActiveMember(membership.new_chat_member.status);
    const leaves = isActiveMember(membership.old_chat_member.status) && !isActiveMember(membership.new_chat_member.status);
    const addedByAnotherMember = joins && !membership.invite_link?.invite_link && !membership.from.is_bot && membership.from.id !== membership.new_chat_member.user.id;
    if (joins || leaves) await recordGroupMembership(catalogChatId(membership.chat.id), joins, leaves, Boolean(membership.invite_link?.invite_link), addedByAnotherMember);
    if (joins) await awardMembershipReward(membership);
    return;
  }
  const message = update.message;
  if (message && await handleSupportReply(message)) return;
  if (message && await handleSupportInbound(message)) return;
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
  if (message.chat.type !== "private") return;
  if (message.from) {
    const openId = `telegram:${message.from.id}`;
    await upsertUser({ openId, name: message.from.username ?? message.from.first_name ?? "Telegram user", telegramUsername: message.from.username ?? null, loginMethod: "telegram-bot", lastSignedIn: new Date() });
    const referralCode = getReferralCodeFromStartText(message.text);
    const attributed = referralCode ? await attributeTelegramReferral(message.from.id, referralCode) : false;
    const referrer = attributed ? await getTelegramReferralReferrer(message.from.id) : null;
    const launch = await recordMiniAppLaunch({
      userOpenId: openId,
      source: attributed ? "referral" : "direct",
      startParam: attributed ? `ref_${referralCode}` : undefined,
      sessionKey: `telegram_bot_start:${message.from.id}`,
    });
    if (launch.isNew) {
      void deliverOperationsLog("launches", formatLaunchLog({
        username: message.from.username ?? null,
        userId: String(message.from.id),
        source: attributed ? "referral" : "direct",
        referrer,
      }));
    }
    await openMiniApp(message.chat.id, "Добро пожаловать в TG TOP — рейтинг Telegram-сообществ и других активов. Откройте приложение, чтобы начать.", true);
    return;
  }
  await openMiniApp(message.chat.id, "Добро пожаловать в TG TOP — рейтинг Telegram-сообществ и других активов. Откройте приложение, чтобы начать.");
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

function isTelegramBotEntrypoint(entryPath?: string): boolean {
  return Boolean(entryPath && /(?:^|\/)telegramBot\.(?:ts|js)$/.test(entryPath));
}

export function getTelegramEventKey(update: TelegramUpdate): string | null {
  if (update.pre_checkout_query) return `precheckout:${update.pre_checkout_query.id}`;
  if (update.my_chat_member) {
    const membership = update.my_chat_member;
    return `admin:${membership.chat.id}:${membership.from.id}:${membership.date ?? 0}:${membership.new_chat_member.status}`;
  }
  if (update.chat_member) {
    const membership = update.chat_member;
    return `membership:${membership.chat.id}:${membership.new_chat_member.user.id}:${membership.date ?? 0}:${membership.old_chat_member.status}:${membership.new_chat_member.status}`;
  }
  const message = update.message ?? update.channel_post;
  if (!message) return null;
  if (update.message?.successful_payment?.telegram_payment_charge_id) return `payment:${update.message.successful_payment.telegram_payment_charge_id}`;
  if (typeof message.message_id !== "number") return null;
  return `message:${message.chat.id}:${message.message_id}`;
}

export async function runTelegramBot(botLabel = "@TG_TOPBOT"): Promise<void> {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  activeBotLabel = botLabel;
  console.info(`[Telegram] Starting long-polling for ${botLabel}`);
  let offset = 0;
  while (true) {
    try {
      const updates = await telegramCall<TelegramUpdate[]>("getUpdates", { offset, timeout: pollTimeoutSeconds, allowed_updates: ["message", "channel_post", "my_chat_member", "chat_member", "pre_checkout_query"] });
      await auditRankedEntryLinks();
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          const eventKey = getTelegramEventKey(update);
          if (eventKey && !(await shouldBypassGlobalEventClaim(update)) && !(await claimTelegramEvent(eventKey, botLabel))) {
            console.info(`[Telegram] Duplicate event skipped by ${botLabel}: ${eventKey}`);
            continue;
          }
          await handleUpdate(update);
        } catch (error) { console.error(`[Telegram] Failed to process update ${update.update_id}:`, error); }
      }
    } catch (error) {
      console.error("[Telegram] Polling error:", getTelegramPollingErrorSummary(error));
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
}

export const __private__ = { auditRankedEntryLinks, buildOnboardingConfirmation, catalogCategory, getActiveBotTokens, getReferralCodeFromStartText, getTelegramEventKey, getTelegramPollingErrorSummary, isActiveMember, isAllMembersCommand, isBotAdmin, isChatOwner, isStickerIdCommand, isTelegramBotEntrypoint, publicGroupUrl, resolveVerifiedGroupEntryLink };
if (isTelegramBotEntrypoint(process.argv[1])) void runTelegramBot();
