export function countSuccessfulTelegramAnnouncements(deliveries: readonly boolean[]) {
  return deliveries.reduce((count, delivered) => count + Number(delivered), 0);
}
