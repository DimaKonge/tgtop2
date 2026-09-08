export const formatTon = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};
export const formatFinancialGram = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};
export const formatPositionDuration = (updatedAt: Date | string | null | undefined, now: number) => {
  const startedAt = updatedAt ? new Date(updatedAt).getTime() : now;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, "0")).join(":");
};
