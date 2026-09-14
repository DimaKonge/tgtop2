import { z } from "zod";
import * as db from "../db";
import * as telegramUserAgent from "../telegramUserAgent";
import { requireTelegramUserAgentOwner } from "../telegramUserAgentAccess";
import { protectedProcedure, router } from "../_core/trpc";

async function requireOwner(openId: string) {
  const access = await db.getModerationAccess(openId);
  requireTelegramUserAgentOwner(access);
}

export const telegramUserAgentRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.getTelegramUserAgentStatus();
  }),
  requestCode: protectedProcedure.input(z.object({ phone: z.string().trim().min(8).max(32) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.beginTelegramUserAgentLogin(ctx.user.openId, input.phone);
  }),
  confirmCode: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(8) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.confirmTelegramUserAgentCode(ctx.user.openId, input.code);
  }),
  confirmPassword: protectedProcedure.input(z.object({ password: z.string().min(1).max(256) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.confirmTelegramUserAgentPassword(ctx.user.openId, input.password);
  }),
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.disconnectTelegramUserAgent(ctx.user.openId);
  }),
  bootstrapOwnerDm: protectedProcedure.input(z.object({ username: z.string().trim().min(5).max(33) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.bootstrapTelegramOwnerDmGreeting(ctx.user.openId, input.username);
  }),
  getHistoricalStats: protectedProcedure.query(async ({ ctx }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.getTelegramHistoricalStatsOverview();
  }),
  allowHistoricalStatsTarget: protectedProcedure.input(z.object({ username: z.string().trim().min(5).max(33) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.addTelegramHistoricalStatsTarget(ctx.user.openId, input.username);
  }),
  refreshHistoricalStats: protectedProcedure.input(z.object({ username: z.string().trim().min(5).max(33) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user.openId);
    return await telegramUserAgent.refreshTelegramHistoricalStats(ctx.user.openId, input.username);
  }),
});
