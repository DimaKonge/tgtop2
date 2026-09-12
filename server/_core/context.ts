import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { claimBetaReferralReward, getUserByOpenId, upsertUser } from "../db";
import { validateTelegramInitDataWithTokens } from "../telegramAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authUnavailable?: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authUnavailable = false;

  try {
    const initData = opts.req.header("x-telegram-init-data");
    const verifiedTelegram = initData
      ? validateTelegramInitDataWithTokens(initData, [process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_RESERVE_BOT_TOKEN])
      : null;

    if (verifiedTelegram) {
      try {
        const telegramUser = verifiedTelegram.user;
        const openId = `telegram:${telegramUser.id}`;
        const telegramFullName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ").trim();
        const name = telegramFullName || telegramUser.username || `User ${telegramUser.id}`;
        const avatarUrl = telegramUser.photo_url || `/api/telegram-user-avatar/${telegramUser.id}`;
        await upsertUser({
          openId,
          name,
          avatarUrl,
          telegramUsername: telegramUser.username ?? null,
          loginMethod: "telegram-mini-app",
          lastSignedIn: new Date(),
        });
        await claimBetaReferralReward(openId);
        user = (await getUserByOpenId(openId)) ?? null;
        if (!user) authUnavailable = true;
      } catch (error) {
        authUnavailable = true;
        console.warn("[Auth] Telegram identity could not be loaded", error instanceof Error ? error.name : "unknown_error");
      }
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
    authUnavailable,
  };
}
