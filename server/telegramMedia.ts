import type { Express } from "express";
import axios from "axios";
import { getGroupByChatId } from "./db";

export function registerTelegramMediaRoutes(app: Express) {
  app.get("/api/telegram-avatar/:chatId", async (req, res) => {
    const chatId = req.params.chatId;
    if (!/^-?\d+$/.test(chatId)) return res.status(400).end();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(503).end();

    const group = await getGroupByChatId(chatId);
    if (!group?.avatarFileId) return res.status(404).end();

    try {
      const fileResult = await axios.get<{ ok: boolean; result: { file_path: string } }>(`https://api.telegram.org/bot${token}/getFile`, {
        params: { file_id: group.avatarFileId }, timeout: 20_000,
      });
      if (!fileResult.data.ok || !fileResult.data.result.file_path) return res.status(404).end();
      const image = await axios.get(`https://api.telegram.org/file/bot${token}/${fileResult.data.result.file_path}`, {
        responseType: "arraybuffer", timeout: 20_000,
      });
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", image.headers["content-type"] ?? "image/jpeg");
      res.send(Buffer.from(image.data));
    } catch {
      res.status(404).end();
    }
  });
}
