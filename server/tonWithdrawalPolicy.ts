import { parseTonToNano } from "./tonDeposits";

export const TON_NANO = BigInt("1000000000");
export const TON_WITHDRAWAL_MINIMUM_NANO = BigInt("100000000");
// Консервативный максимум для простой single-output V4R2-транзакции. Разница с фактической сетью возвращается на внутренний TON-баланс после сверки.
export const TON_WITHDRAWAL_FEE_RESERVE_NANO = BigInt("50000000");
export const TON_WITHDRAWAL_FEE_SAFETY_MARGIN_NANO = BigInt("2000000");
export const TON_WITHDRAWAL_USER_COOLDOWN_MS = 60_000;
export const TON_WITHDRAWAL_ADDRESS_COOLDOWN_MS = 5 * 60_000;
export const TON_WITHDRAWAL_LARGE_NANO = BigInt(5) * TON_NANO;
export const TON_WITHDRAWAL_DAILY_LIMIT_NANO = BigInt(20) * TON_NANO;
export const TON_WITHDRAWAL_MAX_PER_HOUR = 2;
export const TON_WITHDRAWAL_GLOBAL_MAX_PER_MINUTE = 120;

export type TonWithdrawalRiskReason =
  | "new_destination"
  | "large_amount"
  | "user_hourly_limit"
  | "daily_limit"
  | "user_cooldown"
  | "address_cooldown"
  | "global_velocity"
  | "fee_preflight";

export type TonWithdrawalQuote = {
  grossAmountNano: bigint;
  feeReserveNano: bigint;
  netAmountNano: bigint;
};

export type TonWithdrawalRiskSnapshot = {
  nowMs: number;
  hasPriorConfirmedDestination: boolean;
  userRequestsLastHour: number;
  userGrossTodayNano: bigint;
  lastUserRequestAtMs: number | null;
  lastAddressRequestAtMs: number | null;
  globalRequestsLastMinute: number;
  emergencyPaused: boolean;
};

export type TonWithdrawalRiskDecision = {
  status: "queued" | "manual_review";
  reasons: TonWithdrawalRiskReason[];
};

export function formatNanoTon(value: bigint): string {
  const whole = value / TON_NANO;
  const fraction = (value % TON_NANO).toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function quoteTonWithdrawal(amountTon: string): TonWithdrawalQuote {
  const grossAmountNano = parseTonToNano(amountTon);
  if (grossAmountNano < TON_WITHDRAWAL_MINIMUM_NANO) {
    throw new Error("Минимальная сумма вывода — 0.1 TON");
  }
  const netAmountNano = grossAmountNano - TON_WITHDRAWAL_FEE_RESERVE_NANO;
  if (netAmountNano <= BigInt(0)) {
    throw new Error("Сумма после резерва комиссии должна быть больше нуля");
  }
  return { grossAmountNano, feeReserveNano: TON_WITHDRAWAL_FEE_RESERVE_NANO, netAmountNano };
}

export function classifyTonWithdrawalRisk(snapshot: TonWithdrawalRiskSnapshot, quote: TonWithdrawalQuote): TonWithdrawalRiskDecision {
  const reasons: TonWithdrawalRiskReason[] = [];
  if (!snapshot.hasPriorConfirmedDestination) reasons.push("new_destination");
  if (quote.grossAmountNano >= TON_WITHDRAWAL_LARGE_NANO) reasons.push("large_amount");
  if (snapshot.userRequestsLastHour >= TON_WITHDRAWAL_MAX_PER_HOUR) reasons.push("user_hourly_limit");
  if (snapshot.userGrossTodayNano + quote.grossAmountNano > TON_WITHDRAWAL_DAILY_LIMIT_NANO) reasons.push("daily_limit");
  if (snapshot.lastUserRequestAtMs !== null && snapshot.nowMs - snapshot.lastUserRequestAtMs < TON_WITHDRAWAL_USER_COOLDOWN_MS) reasons.push("user_cooldown");
  if (snapshot.lastAddressRequestAtMs !== null && snapshot.nowMs - snapshot.lastAddressRequestAtMs < TON_WITHDRAWAL_ADDRESS_COOLDOWN_MS) reasons.push("address_cooldown");
  if (snapshot.globalRequestsLastMinute >= TON_WITHDRAWAL_GLOBAL_MAX_PER_MINUTE) reasons.push("global_velocity");
  if (snapshot.emergencyPaused) throw new Error("Автоматический вывод временно приостановлен");
  return { status: "queued", reasons };
}

export function getTonWithdrawalRiskLabel(reason: TonWithdrawalRiskReason): string {
  const labels: Record<TonWithdrawalRiskReason, string> = {
    new_destination: "новый адрес получателя",
    large_amount: "крупная сумма",
    user_hourly_limit: "превышен лимит заявок за час",
    daily_limit: "превышен дневной лимит",
    user_cooldown: "слишком частые заявки пользователя",
    address_cooldown: "слишком частые выплаты на этот адрес",
    global_velocity: "защита от высокой нагрузки",
    fee_preflight: "комиссия сети требует ручной проверки",
  };
  return labels[reason];
}
