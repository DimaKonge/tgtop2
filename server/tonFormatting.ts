export function formatTonAmount(value: number | string | null | undefined): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toFixed(9).replace(/\.?0+$/, "");
}
