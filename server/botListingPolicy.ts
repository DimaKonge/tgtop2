export type NormalizedBotLink = {
  username: string;
  telegramLink: string;
};

const TELEGRAM_BOT_USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

export function normalizeTelegramBotLink(value: string): NormalizedBotLink {
  const raw = value.trim();
  const candidate = raw.startsWith("@")
    ? raw.slice(1)
    : raw.replace(/^https?:\/\/(?:www\.)?t\.me\//i, "").replace(/^t\.me\//i, "");
  const username = candidate.split(/[/?#]/, 1)[0]?.trim() ?? "";

  if (!TELEGRAM_BOT_USERNAME.test(username)) {
    throw new Error("Вставьте корректную публичную ссылку Telegram: https://t.me/username");
  }

  return { username, telegramLink: `https://t.me/${username}` };
}
