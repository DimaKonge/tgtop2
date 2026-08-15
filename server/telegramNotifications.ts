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

export async function sendStarsRankingInvoice(input: { openId: string; payload: string; starsAmount: number; groupTitle: string; slotNumber: number }) {
  const chatId = getTelegramChatIdFromOpenId(input.openId);
  if (!chatId || !botToken) return { sent: false, messageId: null };
  try {
    const response = await axios.post<{ ok: boolean; result?: { message_id?: number } }>(`https://api.telegram.org/bot${botToken}/sendInvoice`, {
      chat_id: chatId,
      title: "TG TOP · рейтинг",
      description: `Ставка за позицию ${input.slotNumber} для ${input.groupTitle}. Позиция активируется после подтверждённой оплаты.`,
      payload: input.payload,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "Ставка TG TOP", amount: input.starsAmount }],
      start_parameter: `rank_${input.payload.slice(-24)}`,
    }, { timeout: 15_000 });
    return { sent: Boolean(response.data.ok), messageId: response.data.result?.message_id ?? null };
  } catch (error) {
    console.warn("[Telegram] Could not send Stars ranking invoice:", error);
    return { sent: false, messageId: null };
  }
}
