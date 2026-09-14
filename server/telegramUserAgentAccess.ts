export type TelegramUserAgentAdminAccess = {
  canManageModerators: boolean;
};

export function requireTelegramUserAgentOwner(access: TelegramUserAgentAdminAccess) {
  if (!access.canManageModerators) {
    throw new Error("Доступ к рабочему Telegram-аккаунту есть только у главного администратора TG TOP");
  }
}
