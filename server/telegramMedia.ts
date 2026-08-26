import type { Express } from "express";
import axios from "axios";
import { getGroupByChatId } from "./db";

export function getTelegramAvatarTokens(primaryToken?: string, reserveToken?: string) {
  return Array.from(new Set([primaryToken, reserveToken].filter((token): token is string => Boolean(token))));
}

export function registerTelegramMediaRoutes(app: Express) {
  app.get("/api/telegram-avatar/:chatId", async (req, res) => {
    const chatId = req.params.chatId;
    if (!/^-?\d+$/.test(chatId)) return res.status(400).end();
    const tokens = getTelegramAvatarTokens(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN);
    if (!tokens.length) return res.status(503).end();

    const group = await getGroupByChatId(chatId);
    if (!group?.avatarFileId) return res.status(404).end();

    for (const token of tokens) {
      try {
        const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
          params: { file_id: group.avatarFileId }, timeout: 20_000,
        });
        if (!fileResult.data.ok || !fileResult.data.result.file_path) continue;
        const image = await axios.get(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
          responseType: "arraybuffer", timeout: 20_000,
        });
        res.setHeader("Cache-Control", "public, max-age=3600");
        const imageContentType = image.headers["content-type"];
        res.setHeader("Content-Type", typeof imageContentType === "string" ? imageContentType : "image/jpeg");
        return res.send(Buffer.from(image.data));
      } catch {
        // Telegram file identifiers are bot-specific, so try the parallel reserve bot next.
      }
    }

    return res.status(404).end();
  });
}
