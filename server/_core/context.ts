import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { validateTelegramInitData } from "../telegramAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const initData = opts.req.header("x-telegram-init-data");
    const verifiedTelegram = initData && process.env.TELEGRAM_BOT_TOKEN
      ? validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
      : null;

    if (verifiedTelegram) {
      const telegramUser = verifiedTelegram.user;
      const openId = `telegram:${telegramUser.id}`;
      await upsertUser({
        openId,
        name: telegramUser.username ?? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" "),
        avatarUrl: telegramUser.photo_url ?? null,
        loginMethod: "telegram-mini-app",
        lastSignedIn: new Date(),
      });
      user = (await getUserByOpenId(openId)) ?? null;
    } else {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
