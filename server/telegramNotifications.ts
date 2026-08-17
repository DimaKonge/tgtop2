import axios from "axios";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL ?? "https://tgtop.xyz";

export function getTelegramChatIdFromOpenId(openId: string): number | null {
  const match = openId.match(/^telegram:(\d+)$/);
  return match ? Number(match[1]) : null;
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
  const listingUrl = `https://t.me/TGTOP_robot/app?startapp=listing_${input.groupId}`;
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
    const response = await axios.post<{ ok: boolean }>(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: input.chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: "Открыть в TG TOP", url: listingUrl }]] },
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
