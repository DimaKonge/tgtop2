import axios from "axios";
import { getTelegramOperationLogDestination } from "./db";

export type OperationsLogKind = "top_activity" | "finance" | "launches" | "additions";

const botToken = process.env.TELEGRAM_RESERVE_BOT_TOKEN;

function sanitizeLine(value: string, maximum = 120) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maximum);
}

function displayUser(input: { name?: string | null; username?: string | null }) {
  const name = input.name ? sanitizeLine(input.name, 64) : "Пользователь";
  const username = input.username ? ` · @${sanitizeLine(input.username.replace(/^@/, ""), 64)}` : "";
  return `${name}${username}`;
}

export function formatTopActivityLog(input: { event: "bot_connected" | "listed_in_top"; groupTitle: string; groupId: number; actor?: { name?: string | null; username?: string | null } }) {
  const headline = input.event === "bot_connected" ? "🧩 Подключён бот TG TOP" : "🏆 Сообщество попало в TOP";
  return [
    headline,
    "",
    `Сообщество: ${sanitizeLine(input.groupTitle, 160)}`,
    `Карточка: #${input.groupId}`,
    ...(input.actor ? [`Пользователь: ${displayUser(input.actor)}`] : []),
  ].join("\n");
}

export function formatAdditionLog(input: { groupTitle: string; groupId: number; chatType: "group" | "supergroup" | "channel"; actor?: { name?: string | null; username?: string | null } }) {
  return [
    "➕ Новое добавление в TG TOP",
    "",
    `Тип: ${input.chatType === "channel" ? "Канал" : "Группа"}`,
    `Сообщество: ${sanitizeLine(input.groupTitle, 160)}`,
    `Карточка: #${input.groupId}`,
    ...(input.actor ? [`Владелец: ${displayUser(input.actor)}`] : []),
  ].join("\n");
}

export function formatFinanceLog(input: { event: "deposit_confirmed" | "withdrawal_requested" | "withdrawal_sent" | "withdrawal_confirmed"; amount: string; actor?: { name?: string | null; username?: string | null }; reference: string; transactionHash?: string | null }) {
  const headlines: Record<typeof input.event, string> = {
    deposit_confirmed: "✅ Подтверждено пополнение TG TOP",
    withdrawal_requested: "📝 Создана заявка на вывод",
    withdrawal_sent: "📤 Вывод отправлен в сеть",
    withdrawal_confirmed: "✅ Вывод подтверждён сетью",
  };
  return [
    headlines[input.event],
    "",
    `Сумма: ${sanitizeLine(input.amount, 48)}`,
    ...(input.actor ? [`Пользователь: ${displayUser(input.actor)}`] : []),
    `Операция: ${sanitizeLine(input.reference, 80)}`,
    ...(input.transactionHash ? [`Транзакция: https://tonviewer.com/transaction/${sanitizeLine(input.transactionHash, 128)}`] : []),
  ].join("\n");
}

export function formatLaunchLog(input: { username?: string | null; userId: string; source: "direct" | "referral"; referrer?: { name?: string | null; username?: string | null } | null; createdAt?: Date }) {
  return [
    "🚀 Новый запуск TG TOP",
    "",
    `Пользователь: ${input.username ? `@${sanitizeLine(input.username.replace(/^@/, ""), 64)}` : `ID ${sanitizeLine(input.userId, 48)}`}`,
    ...(input.source === "referral" && (input.referrer?.username || input.referrer?.name) ? [`Пришёл от: ${displayUser(input.referrer)}`] : []),
    `Время: ${(input.createdAt ?? new Date()).toISOString()}`,
  ].join("\n");
}

export async function deliverOperationsLog(kind: OperationsLogKind, text: string) {
  if (!botToken) return false;
  const destination = await getTelegramOperationLogDestination(kind);
  if (!destination) return false;
  try {
    const response = await axios.post<{ ok: boolean }>(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: destination.chatId,
      ...(destination.messageThreadId ? { message_thread_id: destination.messageThreadId } : {}),
      text: text.slice(0, 3_800),
      disable_web_page_preview: true,
    }, { timeout: 15_000 });
    return response.data.ok;
  } catch (error) {
    console.warn(`[Telegram] Private ${kind} log delivery failed`, error instanceof Error ? error.name : "unknown_error");
    return false;
  }
}
