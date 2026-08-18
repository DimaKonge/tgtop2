import axios from "axios";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL ?? "https://tgtop.xyz";

export function getTelegramChatIdFromOpenId(openId: string): number | null {
  const match = openId.match(/^telegram:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export async function notifyRewardCredited(input: { telegramUserId: number; groupTitle: string; amount: number }) {
  if (!botToken) return false;
  const amount = (input.amount / 100).toFixed(2).replace(/\.?0+$/, "");
  const text = [
    "✅ GRAM зачислены на баланс",
    "",
    `+${amount} GRAM · ${input.groupTitle}`,
    "Баланс и история в TG TOP обновятся автоматически.",
  ].join("\n");
  try {
    const response = await axios.post<{ ok: boolean }>(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: input.telegramUserId,
      text,
      reply_markup: { inline_keyboard: [[{ text: "Открыть баланс", web_app: { url: miniAppUrl } }]] },
    }, { timeout: 15_000 });
    return response.data.ok;
  } catch (error) {
    console.warn("[Telegram] Could not send reward-credit notification:", error);
    return false;
  }
}

export async function notifyRecordedRankingBid(input: { openId: string; groupTitle: string; bidAmount: number; slotNumber: number }) {
  const chatId = getTelegramChatIdFromOpenId(input.openId);
  if (!chatId || !botToken) return false;

  const amount = (input.bidAmount / 1000).toFixed(3).replace(/\.?(0+)$/, "");
  const text = [
    "📝 Ставка TG TOP зафиксирована",
    "",
    `Группа: ${input.groupTitle}`,
    `Позиция: ${input.slotNumber}`,
    `Ставка: ${amount} TON`,
    "Статус: записано во внутреннем журнале TG TOP.",
    "",
    "Это не подтверждение оплаты: TON не отправлялся и не списывался.",
  ].join("\n");

  try {
    const response = await axios.post<{ ok: boolean }>(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: [[{ text: "Открыть TG TOP", web_app: { url: miniAppUrl } }]] },
    }, { timeout: 15_000 });
    return response.data.ok;
  } catch (error) {
    console.warn("[Telegram] Could not send ranking-intent confirmation:", error);
    return false;
  }
}

export async function notifyCommunityListed(input: {
  chatId: string;
  groupId: number;
  groupTitle: string;
  listingType: "catalog" | "sale";
  salePriceTon?: string | null;
}) {
  if (!botToken) return false;
  const listingUrl = `https://t.me/TGTOP_robot?startapp=listing_${input.groupId}`;
  const text = [
    "✨ Сообщество добавлено в TG TOP",
    "",
    `🏷 ${input.groupTitle}`,
    input.listingType === "sale" && input.salePriceTon
      ? `💎 Статус: продаётся · ${input.salePriceTon} TON`
      : "📌 Статус: доступно в каталоге TG TOP",
    "",
    "Откройте карточку сообщества, чтобы увидеть актуальные условия и статистику.",
  ].join("\n");
  try {
    const miniAppDirectUrl = `https://t.me/TGTOP_robot?startapp=listing_${input.groupId}`;
    const response = await axios.post<{ ok: boolean }>(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: input.chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: "Открыть в TG TOP", url: miniAppDirectUrl }]] },
    }, { timeout: 15_000 });
    return response.data.ok;
  } catch (error) {
    console.warn("[Telegram] Could not post community listing announcement:", error);
    return false;
  }
}

export async function createStarsRankingInvoiceLink(input: { payload: string; starsAmount: number; groupTitle: string; slotNumber: number }) {
  if (!botToken) return null;
  try {
    const response = await axios.post<{ ok: boolean; result?: string }>(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      title: "TG TOP · рейтинг",
      description: `Ставка за позицию ${input.slotNumber} для ${input.groupTitle}. Позиция активируется после подтверждённой оплаты.`,
      payload: input.payload,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "Ставка TG TOP", amount: input.starsAmount }],
      start_parameter: `rank_${input.payload.slice(-24)}`,
    }, { timeout: 15_000 });
    return response.data.ok && response.data.result ? response.data.result : null;
  } catch (error) {
    console.warn("[Telegram] Could not create Stars ranking invoice link:", error);
    return null;
  }
}

export async function createTelegramMonthlySubscriptionInviteLink(input: { chatId: string; starsAmount: number; linkName?: string | null }) {
  if (!botToken) throw new Error("TG TOP bot token is not configured");
  try {
    const response = await axios.post<{ ok: boolean; result?: { invite_link?: string }; description?: string }>(`https://api.telegram.org/bot${botToken}/createChatSubscriptionInviteLink`, {
      chat_id: input.chatId,
      subscription_period: 2_592_000,
      subscription_price: input.starsAmount,
      ...(input.linkName ? { name: input.linkName } : {}),
    }, { timeout: 15_000 });
    if (!response.data.ok || !response.data.result?.invite_link) {
      throw new Error(response.data.description ?? "Telegram не создал платную ссылку");
    }
    return response.data.result.invite_link;
  } catch (error) {
    throw telegramInviteLinkError(error, "Не удалось создать платную ссылку Telegram");
  }
}

function telegramInviteLinkError(error: unknown, fallback: string) {
  const description = axios.isAxiosError(error)
    ? (error.response?.data as { description?: string } | undefined)?.description
    : error instanceof Error ? error.message : undefined;
  if (/not enough rights|administrator rights|invite users/i.test(description ?? "")) {
    return new Error("Боту нужны права администратора «Пригласительные ссылки» / «Добавлять пользователей». Откройте права @TGTOP_robot в сообществе и повторите попытку.");
  }
  if (/chat not found|chat.*invalid/i.test(description ?? "")) {
    return new Error("TG TOP не видит это сообщество. Добавьте @TGTOP_robot администратором и обновите список «Мои».");
  }
  return new Error(description ?? fallback);
}

export async function createTelegramPrivateInviteLink(input: { chatId: string; linkName: string }) {
  if (!botToken) throw new Error("TG TOP bot token is not configured");
  try {
    const response = await axios.post<{ ok: boolean; result?: { invite_link?: string }; description?: string }>(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      chat_id: input.chatId,
      name: input.linkName,
    }, { timeout: 15_000 });
    if (!response.data.ok || !response.data.result?.invite_link) throw new Error(response.data.description ?? "Telegram не создал закрытую ссылку");
    return response.data.result.invite_link;
  } catch (error) {
    throw telegramInviteLinkError(error, "Не удалось создать закрытую ссылку Telegram");
  }
}

export async function createTelegramRewardInviteLink(input: { chatId: string; linkName: string }) {
  if (!botToken) throw new Error("TG TOP bot token is not configured");
  try {
    const response = await axios.post<{ ok: boolean; result?: { invite_link?: string }; description?: string }>(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      chat_id: input.chatId,
      name: input.linkName,
    }, { timeout: 15_000 });
    if (!response.data.ok || !response.data.result?.invite_link) {
      throw new Error(response.data.description ?? "Telegram не создал ссылку для приглашения");
    }
    return response.data.result.invite_link;
  } catch (error) {
    throw telegramInviteLinkError(error, "Не удалось создать ссылку Telegram для вознаграждений");
  }
}
