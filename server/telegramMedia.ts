import type { Express } from "express";
import axios from "axios";
import { getGroupByChatId } from "./db";
import { BoundedTtlCache, InFlightRequestCoalescer } from "./resourceCache";

const MAX_TELEGRAM_AVATAR_BYTES = 1_500_000;
const AVATAR_CACHE_TTL_MS = 10 * 60_000;
const AVATAR_NOT_FOUND_CACHE_TTL_MS = 60_000;

type TelegramAvatarResult =
  | { kind: "image"; body: Buffer; contentType: string }
  | { kind: "not-found" };

const avatarCache = new BoundedTtlCache<TelegramAvatarResult>(192);
const avatarRequests = new InFlightRequestCoalescer<TelegramAvatarResult>();

export function getTelegramAvatarTokens(primaryToken?: string, reserveToken?: string) {
  return Array.from(new Set([primaryToken, reserveToken].filter((token): token is string => Boolean(token))));
}

export function isValidTelegramAvatarChatId(chatId: string): boolean {
  return /^-?\d+$/.test(chatId) && chatId.length <= 32;
}

export function isSafeTelegramAvatarContentType(contentType: unknown): contentType is string {
  return typeof contentType === "string" && /^image\/(?:avif|gif|jpeg|png|webp)$/i.test(contentType);
}

async function loadTelegramAvatar(chatId: string): Promise<TelegramAvatarResult> {
  const cached = avatarCache.get(chatId);
  if (cached) return cached;
  return avatarRequests.run(chatId, async () => {
    const secondCached = avatarCache.get(chatId);
    if (secondCached) return secondCached;
    const group = await getGroupByChatId(chatId);
    if (!group?.avatarFileId) {
      const missing = { kind: "not-found" } as const;
      avatarCache.set(chatId, missing, AVATAR_NOT_FOUND_CACHE_TTL_MS);
      return missing;
    }
    const tokens = getTelegramAvatarTokens(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN);
    for (const token of tokens) {
      try {
        const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
          params: { file_id: group.avatarFileId }, timeout: 8_000, maxContentLength: 64_000, maxBodyLength: 64_000,
        });
        if (!fileResult.data.ok || !fileResult.data.result.file_path) continue;
        const image = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
          responseType: "arraybuffer", timeout: 12_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
        });
        const body = Buffer.from(image.data);
        const contentType = image.headers["content-type"];
        if (body.length === 0 || body.length > MAX_TELEGRAM_AVATAR_BYTES || !isSafeTelegramAvatarContentType(contentType)) continue;
        const result = { kind: "image", body, contentType } as const;
        avatarCache.set(chatId, result, AVATAR_CACHE_TTL_MS);
        return result;
      } catch {
        // Telegram file identifiers are bot-specific, so try the reserve bot next.
      }
    }
    const missing = { kind: "not-found" } as const;
    avatarCache.set(chatId, missing, AVATAR_NOT_FOUND_CACHE_TTL_MS);
    return missing;
  });
}

export function registerTelegramMediaRoutes(app: Express) {
  app.get("/api/telegram-avatar/:chatId", async (req, res) => {
    const chatId = req.params.chatId;
    if (!isValidTelegramAvatarChatId(chatId)) return res.status(400).end();
    try {
      const avatar = await loadTelegramAvatar(chatId);
      if (avatar.kind === "not-found") return res.status(404).setHeader("Cache-Control", "public, max-age=60").end();
      res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
      res.setHeader("Content-Type", avatar.contentType);
      return res.send(avatar.body);
    } catch {
      return res.status(502).end();
    }
  });
}
