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
