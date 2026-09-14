export function getSafeTonWithdrawalError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/Минимальная сумма|после резерва|недостаточно|адрес|приостановлен|идемпотент|проверке|не настроен|недействителен|не соответствует/i.test(message)) return message;
  return "Не удалось обработать вывод GRAM. Средства не были списаны повторно; проверьте статус операции позже.";
}
