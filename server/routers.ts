import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tgTop: router({
    getSlots: publicProcedure
      .input(z.object({ category: z.string().optional(), country: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAuctionSlots(input?.category, input?.country);
      }),

    placeBid: protectedProcedure
      .input(z.object({
        slotId: z.number(),
        bidAmount: z.number(),
        currentBid: z.string(),
        groupId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) {
          throw new Error("Выберите свою группу из личной папки");
        }
        await db.placeBid(
          input.slotId,
          Math.round(input.bidAmount * 1000),
          `${input.bidAmount.toFixed(1)} TON`,
          group.username ?? group.title,
          ctx.user.openId,
          input.groupId
        );
        return { success: true };
      }),

    getGroups: publicProcedure
      .input(z.object({ category: z.string().optional(), country: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getGroupsCatalog(input?.category, input?.country);
      }),

    myGroups: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMyGroups(ctx.user.openId);
    }),

    getGroupDetail: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupDetail(input.groupId);
      }),

    listGroupWithCredits: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.listGroupWithCredits(ctx.user.openId, input.groupId);
        return { success: true };
      }),

    getNfts: publicProcedure.query(async () => {
      return await db.getNftUsernames();
    }),

    createNft: protectedProcedure
      .input(z.object({
        username: z.string(),
        price: z.string(),
        priceAmount: z.number(),
        rentalPricePerDay: z.string(),
        rentalAmountPerDay: z.number(),
        minRentalDays: z.number(),
        maxRentalDays: z.number(),
        listingType: z.enum(["sale", "rent", "both"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createNftListing({
          ...input,
          ownerOpenId: ctx.user.openId,
          ownerUsername: ctx.user.name || ctx.user.openId.slice(0, 8),
          status: "available",
        });
        return { success: true };
      }),

    rentNft: protectedProcedure
      .input(z.object({ nftId: z.number(), rentalDays: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.rentNft(input.nftId, ctx.user.openId, input.rentalDays);
        return { success: true };
      }),

    myDeals: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserDeals(ctx.user.openId);
    }),
  }),
});

export type AppRouter = typeof appRouter;
