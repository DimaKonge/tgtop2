import type { Express } from "express";
import axios from "axios";
import { getGroupByChatId, getUserByOpenId } from "./db";
import { BoundedTtlCache, InFlightRequestCoalescer } from "./resourceCache";

const MAX_TELEGRAM_AVATAR_BYTES = 1_500_000;
const AVATAR_CACHE_TTL_MS = 10 * 60_000;
const AVATAR_NOT_FOUND_CACHE_TTL_MS = 15_000;

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
        let fileId = group.avatarFileId;
        if (fileId) {
          try {
            const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
              params: { file_id: fileId }, timeout: 6_000, maxContentLength: 64_000, maxBodyLength: 64_000,
            });
            if (fileResult.data.ok && fileResult.data.result?.file_path) {
              const image = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
                responseType: "arraybuffer", timeout: 10_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
              });
              const body = Buffer.from(image.data);
              const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], fileResult.data.result.file_path);
              if (contentType) {
                const result = { kind: "image", body, contentType } as const;
                avatarCache.set(chatId, result, AVATAR_CACHE_TTL_MS);
                return result;
              }
            }
          } catch {
            fileId = null;
          }
        }
        if (!fileId) {
          const chatResult = await axios.get<{ ok: boolean; result?: { photo?: { small_file_id?: string } } }>(`https://api.telegram.org/bot${token}/getChat`, {
            params: { chat_id: chatId }, timeout: 6_000, maxContentLength: 64_000, maxBodyLength: 64_000,
          });
          fileId = chatResult.data.ok ? chatResult.data.result?.photo?.small_file_id ?? null : null;
          if (fileId) {
            const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
              params: { file_id: fileId }, timeout: 6_000, maxContentLength: 64_000, maxBodyLength: 64_000,
            });
            if (fileResult.data.ok && fileResult.data.result?.file_path) {
              const image = await axios.get<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
                responseType: "arraybuffer", timeout: 10_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
              });
              const body = Buffer.from(image.data);
              const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], fileResult.data.result.file_path);
              if (contentType) {
                const result = { kind: "image", body, contentType } as const;
                avatarCache.set(chatId, result, AVATAR_CACHE_TTL_MS);
                return result;
              }
            }
          }
        }
      } catch {
        // Telegram file identifiers are bot-specific, so try the reserve bot next.
      }
    }

    // Fallback: If channel has a username, Telegram hosts a public picture at t.me/i/userpic/320/username.jpg
    if (group.username) {
      try {
        const cleanUsername = group.username.replace(/^@/, "").trim();
        const image = await axios.get<ArrayBuffer>(`https://t.me/i/userpic/320/${encodeURIComponent(cleanUsername)}.jpg`, {
          responseType: "arraybuffer",
          timeout: 6_000,
          maxContentLength: MAX_TELEGRAM_AVATAR_BYTES,
          maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
        });
        const body = Buffer.from(image.data);
        const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], `${cleanUsername}.jpg`);
        if (contentType) {
          const result = { kind: "image", body, contentType } as const;
          avatarCache.set(chatId, result, AVATAR_CACHE_TTL_MS);
          return result;
        }
      } catch {
        // Ignore and fall through
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

    // 1. Look up user in database: if they have a known external avatarUrl or username, fetch it
    try {
      const user = await getUserByOpenId(`telegram:${userId}`);
      if (user) {
        if (user.avatarUrl && /^https?:\/\//i.test(user.avatarUrl) && !user.avatarUrl.includes("/api/telegram-user-avatar/")) {
          try {
            const image = await axios.get<ArrayBuffer>(user.avatarUrl, {
              responseType: "arraybuffer",
              timeout: 6_000,
              maxContentLength: MAX_TELEGRAM_AVATAR_BYTES,
              maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
            });
            const body = Buffer.from(image.data);
            const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], user.avatarUrl);
            if (contentType) {
              const result = { kind: "image", body, contentType } as const;
              avatarCache.set(cacheKey, result, AVATAR_CACHE_TTL_MS);
              return result;
            }
          } catch {
            // Continue
          }
        }

        if (user.telegramUsername) {
          try {
            const cleanUsername = user.telegramUsername.replace(/^@/, "").trim();
            const image = await axios.get<ArrayBuffer>(`https://t.me/i/userpic/320/${encodeURIComponent(cleanUsername)}.jpg`, {
              responseType: "arraybuffer",
              timeout: 6_000,
              maxContentLength: MAX_TELEGRAM_AVATAR_BYTES,
              maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES,
            });
            const body = Buffer.from(image.data);
            const contentType = detectSafeTelegramAvatarContentType(body, image.headers["content-type"], `${cleanUsername}.jpg`);
            if (contentType) {
              const result = { kind: "image", body, contentType } as const;
              avatarCache.set(cacheKey, result, AVATAR_CACHE_TTL_MS);
              return result;
            }
          } catch {
            // Continue
          }
        }
      }
    } catch {
      // Ignore db errors and proceed to Bot API
    }

    // 2. Try Bot API getUserProfilePhotos
    const tokens = getTelegramAvatarTokens(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN);
    for (const token of tokens) {
      try {
        const photosRes = await axios.get<{ ok: boolean; result?: { photos?: Array<Array<{ file_id: string }>> } }>(
          `https://api.telegram.org/bot${token}/getUserProfilePhotos`,
          { params: { user_id: Number(userId), limit: 1 }, timeout: 6_000, maxContentLength: 64_000, maxBodyLength: 64_000 }
        );
        const fileId = photosRes.data.ok ? photosRes.data.result?.photos?.[0]?.slice(-1)[0]?.file_id : null;
        if (!fileId) continue;
        const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(
          `https://api.telegram.org/bot${token}/getFile`,
          { params: { file_id: fileId }, timeout: 6_000, maxContentLength: 64_000, maxBodyLength: 64_000 }
        );
        if (!fileResult.data.ok || !fileResult.data.result.file_path) continue;
        const image = await axios.get<ArrayBuffer>(
          `https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`,
          { responseType: "arraybuffer", timeout: 10_000, maxContentLength: MAX_TELEGRAM_AVATAR_BYTES, maxBodyLength: MAX_TELEGRAM_AVATAR_BYTES }
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

    // 3. User Agent (MTProto worker) with safe timeout
    try {
      const { fetchTelegramUserProfilePhoto } = await import("./telegramUserAgent");
      const body = await Promise.race([
        fetchTelegramUserProfilePhoto(userId),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (body) {
        const contentType = detectSafeTelegramAvatarContentType(body, "image/jpeg", "avatar.jpg");
        if (contentType) {
          const result = { kind: "image", body, contentType } as const;
          avatarCache.set(cacheKey, result, AVATAR_CACHE_TTL_MS);
          return result;
        }
      }
    } catch {
      // User Agent not configured or failed
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
      if (avatar.kind === "not-found") return res.status(404).setHeader("Cache-Control", "public, max-age=15").end();
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
      if (avatar.kind === "not-found") return res.status(404).setHeader("Cache-Control", "public, max-age=15").end();
      res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
      res.setHeader("Content-Type", avatar.contentType);
      return res.send(avatar.body);
    } catch {
      return res.status(502).end();
    }
  });
}
