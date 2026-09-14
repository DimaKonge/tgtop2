export const NFT_RENTAL_MAX_DAYS = 3650;

export type NftRentalStatus = "open" | "escrow_funded" | "active" | "completed" | "expired" | "cancelled" | "disputed";

export function validateRentalDays(days: number, minDays: number, maxDays: number) {
  if (!Number.isInteger(days) || days < 1 || days > NFT_RENTAL_MAX_DAYS) return false;
  return days >= minDays && days <= maxDays;
}

export function canCancelNftRental(status: NftRentalStatus) {
  return status === "open" || status === "escrow_funded";
}

export function canConfirmNftRental(status: NftRentalStatus, transferObserved: boolean) {
  return status === "active" && transferObserved;
}

export function rentalTotalUnits(perDayUnits: number, days: number) {
  if (!Number.isSafeInteger(perDayUnits) || perDayUnits < 0 || !Number.isSafeInteger(days) || days < 1) {
    throw new Error("Некорректная сумма или срок аренды");
  }
  const total = perDayUnits * days;
  if (!Number.isSafeInteger(total)) throw new Error("Сумма аренды слишком большая");
  return total;
}
