export const GROUP_CONNECTION_BONUS = 100;

/**
 * Telegram chat IDs survive catalog removal and re-listing, unlike a database row ID.
 * They are therefore the immutable identity for a one-time connection reward.
 */
export function getGroupConnectionBonusIdentity(chatId: string): string {
  const normalizedChatId = chatId.trim();
  if (!normalizedChatId) throw new Error("Telegram chat ID is required for a group connection bonus");
  return normalizedChatId;
}
