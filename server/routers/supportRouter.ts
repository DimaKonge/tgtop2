import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { requireTelegramUserAgentOwner } from "../telegramUserAgentAccess";

async function requireOwner(openId: string) {
  const access = await db.getModerationAccess(openId);
  requireTelegramUserAgentOwner(access);
}

export const supportRouter = router({
  inbox: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
    .query(async ({ ctx, input }) => {
      await requireOwner(ctx.user.openId);
      return await db.getTelegramSupportInbox(input?.limit ?? 100);
    }),
});
