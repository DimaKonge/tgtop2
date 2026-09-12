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

export function isValidTelegramUserId(userId: string): boolean {
  return /^\d{1,32}$/.test(userId);
}

export function isSafeTelegramAvatarContentType(contentType: unknown): contentType is string {
  return typeof contentType === "string" && /^image\/(?:avif|gif|jpeg|png|webp)$/i.test(contentType);
}

function hasBytesAt(body: Buffer, offset: number, bytes: number[]): boolean {
  return bytes.every((byte, index) => body[offset + index] === byte);
}

export function detectSafeTelegramAvatarContentType(body: Buffer, upstreamContentType: unknown, filePath: unknown): string | null {
  if (body.length < 12 || body.length > MAX_TELEGRAM_AVATAR_BYTES) return null;
  const declared = typeof upstreamContentType === "string" ? upstreamContentType.toLowerCase().split(";", 1)[0].trim() : "";
  const path = typeof filePath === "string" ? filePath.toLowerCase() : "";

  if (hasBytesAt(body, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytesAt(body, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (body.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (body.subarray(4, 8).toString("ascii") === "ftyp" && /(?:avif|avis|heic|heix|mif1)/.test(body.subarray(8, 24).toString("ascii"))) return "image/avif";

  // Never trust a MIME type or extension without a matching image signature.
  void declared;
  void path;
  return null;
}

async function loadTelegramAvatar(chatId: string): Promise<TelegramAvatarResult> {
  const cached = avatarCache.get(chatId);
  if (cached) return cached;
  return avatarRequests.run(chatId, async () => {
    const secondCached = avatarCache.get(chatId);
    if (secondCached) return secondCached;
    const group = await getGroupByChatId(chatId);
    if (!group) {
      const missing = { kind: "not-found" } as const;
      avatarCache.set(chatId, missing, AVATAR_NOT_FOUND_CACHE_TTL_MS);
      return missing;
    }
    const tokens = getTelegramAvatarTokens(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN);
    for (const token of tokens) {
      try {
        // Existing catalog rows may predate avatar persistence or may have been
        // updated with a null photo. Recover the current channel photo directly
        // from Telegram before declaring the avatar unavailable.
        let fileId = group.avatarFileId;
        if (!fileId) {
          const chatResult = await axios.get<{ ok: boolean; result?: { photo?: { small_file_id?: string } } }>(`https://api.telegram.org/bot${token}/getChat`, {
            params: { chat_id: chatId }, timeout: 8_000, maxContentLength: 64_000, maxBodyLength: 64_000,
          });
          fileId = chatResult.data.ok ? chatResult.data.result?.photo?.small_file_id ?? null : null;
        }
        if (!fileId) continue;
        const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
          params: { file_id: fileId }, timeout: 8_000, maxContentLength: 64_000, maxBodyLength: 64_000,
        });
        if (!fileResult.data.ok || !fileResult.data.result.file_path) continue;
        const image = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
          responseType: "arraybuffer", timeout: 12_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
        });
        const body = Buffer.from(image.data);
        const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], fileResult.data.result.file_path);
        if (!contentType) continue;
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

async function loadTelegramUserAvatar(userId: string): Promise<TelegramAvatarResult> {
  const cacheKey = `user:${userId}`;
  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;
  return avatarRequests.run(cacheKey, async () => {
    const secondCached = avatarCache.get(cacheKey);
    if (secondCached) return secondCached;
    const tokens = getTelegramAvatarTokens(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN);
    for (const token of tokens) {
      try {
        const photosRes = await axios.get<{ ok: boolean; result?: { photos?: Array<Array<{ file_id: string }>> } }>(
          `https://api.telegram.org/bot${token}/getUserProfilePhotos`,
          { params: { user_id: Number(userId), limit: 1 }, timeout: 8_000, maxContentLength: 64_000, maxBodyLength: 64_000 }
        );
        const fileId = photosRes.data.ok ? photosRes.data.result?.photos?.[0]?.slice(-1)[0]?.file_id : null;
        if (!fileId) continue;
        const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(
          `https://api.telegram.org/bot${token}/getFile`,
          { params: { file_id: fileId }, timeout: 8_000, maxContentLength: 64_000, maxBodyLength: 64_000 }
        );
        if (!fileResult.data.ok || !fileResult.data.result.file_path) continue;
        const image = await axios.get<ArrayBuffer>(
          `https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`,
          { responseType: "arraybuffer", timeout: 12_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES }
        );
        const body = Buffer.from(image.data);
        const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], fileResult.data.result.file_path);
        if (!contentType) continue;
        const result = { kind: "image", body, contentType } as const;
        avatarCache.set(cacheKey, result, AVATAR_CACHE_TTL_MS);
        return result;
      } catch {
        // Try next token
      }
    }
    const missing = { kind: "not-found" } as const;
    avatarCache.set(cacheKey, missing, AVATAR_NOT_FOUND_CACHE_TTL_MS);
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

  app.get("/api/telegram-user-avatar/:userId", async (req, res) => {
    const userId = req.params.userId;
    if (!isValidTelegramUserId(userId)) return res.status(400).end();
    try {
      const avatar = await loadTelegramUserAvatar(userId);
      if (avatar.kind === "not-found") return res.status(404).setHeader("Cache-Control", "public, max-age=60").end();
      res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
      res.setHeader("Content-Type", avatar.contentType);
      return res.send(avatar.body);
    } catch {
      return res.status(502).end();
    }
  });
}
