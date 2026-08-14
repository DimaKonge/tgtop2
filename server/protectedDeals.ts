export const GROUP_TRANSFER_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

export type ProtectedDealStatus =
  | "open"
  | "escrow_funded"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "disputed";

export function getTransferDeadline(fundedAt: Date) {
  return new Date(fundedAt.getTime() + GROUP_TRANSFER_WINDOW_MS);
}

export function canBuyerCancel(status: ProtectedDealStatus) {
  return status === "open" || status === "escrow_funded";
}

export function canReleaseAfterTransfer(status: ProtectedDealStatus) {
  return status === "active";
}

export function canBuyerConfirmTransfer(status: ProtectedDealStatus) {
  return status === "active";
}

export function getProtectedDealLabel(status: ProtectedDealStatus) {
  const labels: Record<ProtectedDealStatus, string> = {
    open: "Ожидает оплаты",
    escrow_funded: "Средства в эскроу · передайте owner-права до дедлайна",
    active: "Передача зафиксирована · ожидается финальное подтверждение",
    completed: "Сделка завершена",
    expired: "Срок передачи истек",
    cancelled: "Отменена покупателем",
    disputed: "На разборе",
  };
  return labels[status];
}
