const SAFE_PREFIXES = [
  "Введите сумму TON",
  "Минимальное пополнение",
  "Сумма пополнения",
  "Кошелёк для пополнений",
  "Пополнение не найдено",
  "Срок этого пополнения",
  "Эта TON-транзакция",
  "Не удалось проверить транзакцию TON",
  "TonAPI не настроен",
];

export const TON_DEPOSIT_GENERIC_ERROR = "Не удалось обработать пополнение. Попробуйте ещё раз через минуту.";

export function getSafeTonDepositError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return SAFE_PREFIXES.some(prefix => message.startsWith(prefix)) ? message : TON_DEPOSIT_GENERIC_ERROR;
}
