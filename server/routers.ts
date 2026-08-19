import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createStarsRankingInvoiceLink, createTelegramMonthlySubscriptionInviteLink, createTelegramPrivateInviteLink, createTelegramRewardInviteLink, notifyCommunityListed, notifyRecordedRankingBid } from "./telegramNotifications";
import { formatTonAmount } from "./tonFormatting";

const tonAmount = z.string().regex(/^\d+(\.\d{1,9})?$/);
const groupListingInput = z.object({
  salePriceTon: tonAmount.optional(),
  country: z.enum(["Global", "UA", "PL", "DE", "GB", "US", "RU", "FR", "ES", "IT", "NL", "CZ", "RO", "TR", "CA", "AU", "AE", "KZ"]).optional(),
  city: z.string().trim().max(96).optional(),
  subcategory: z.string().min(2).max(64).optional(),
  anonymousListing: z.boolean().optional(),
  showOwnerContact: z.boolean().optional(),
  monthlyEntryEnabled: z.boolean().optional(),
  monthlyEntryStars: z.number().int().min(1).max(10_000).optional(),
  monthlyEntryLinkName: z.string().trim().max(64).optional(),
  rewardActive: z.boolean().optional(),
  rewardBudget: z.number().int().min(0).max(10_000_000).optional(),
  rewardPerSubscription: z.number().int().min(0).max(1_000_000).optional(),
  rewardPerInvite: z.number().int().min(0).max(1_000_000).optional(),
  rewardPerManualAdd: z.number().int().min(0).max(1_000_000).optional(),
});

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
      .input(z.object({ category: z.string().optional(), country: z.string().optional(), subcategory: z.string().optional(), city: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAuctionSlots(input?.category, input?.country, input?.subcategory, input?.city);
      }),

    placeBid: protectedProcedure
      .input(z.object({
        slotId: z.number(),
        bidAmount: z.number().positive().max(1_000),
        currentBid: z.string(),
        groupId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) {
          throw new Error("Выберите свою группу из личной папки");
        }
        const intent = await db.payRankingBidWithGramCredit(
          input.slotId,
          Math.round(input.bidAmount * 1000),
          `${formatTonAmount(input.bidAmount)} GRAM`,
          group.username ?? group.title,
          ctx.user.openId,
          input.groupId
        );
        void notifyRecordedRankingBid({
          openId: ctx.user.openId,
          groupTitle: intent.groupTitle,
          bidAmount: intent.bidAmount,
          slotNumber: intent.slotNumber,
        });
        return { success: true, rankingIntentId: intent.id, paymentStatus: "paid_gram" as const };
      }),

    createStarsRankingPayment: protectedProcedure
      .input(z.object({ slotId: z.number().int().positive(), groupId: z.number().int().positive(), bidAmount: z.number().positive().max(1_000) }))
      .mutation(async ({ ctx, input }) => {
        const intent = await db.createStarsRankingPaymentIntent({
          userOpenId: ctx.user.openId,
          slotId: input.slotId,
          groupId: input.groupId,
          bidAmount: Math.round(input.bidAmount * 1000),
        });
        const invoiceLink = await createStarsRankingInvoiceLink({
          payload: intent.payload,
          starsAmount: intent.starsAmount,
          groupTitle: intent.groupTitle,
          slotNumber: intent.slotNumber,
        });
        if (!invoiceLink) throw new Error("Не удалось открыть оплату Stars. Попробуйте снова.");
        return { success: true, starsAmount: intent.starsAmount, expiresAt: intent.expiresAt, invoiceLink };
      }),

    getGroups: publicProcedure
      .input(z.object({ category: z.string().optional(), country: z.string().optional(), subcategory: z.string().optional(), city: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getGroupsCatalog(input?.category, input?.country, input?.subcategory, input?.city);
      }),

    myGroups: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMyGroups(ctx.user.openId);
    }),
    openGiveaways: publicProcedure.query(async () => {
      return await db.getOpenGiveaways();
    }),
    createGiveaway: protectedProcedure
      .input(z.object({
        groupId: z.number().int().positive(),
        title: z.string().trim().min(3).max(160),
        prizeTitle: z.string().trim().min(2).max(160),
        rules: z.string().trim().max(2_000).optional(),
        boostOnly: z.boolean().optional(),
        endsAt: z.coerce.date(),
      }))
      .mutation(async ({ ctx, input }) => await db.createGiveaway(ctx.user.openId, input)),
    joinGiveaway: protectedProcedure
      .input(z.object({ giveawayId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => await db.joinGiveaway(input.giveawayId, ctx.user.openId)),

    saveMyGroupsLayout: protectedProcedure
      .input(z.object({
        orderedGroupIds: z.array(z.number().int().positive()).min(1).max(100),
        pinnedGroupIds: z.array(z.number().int().positive()).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveMyGroupsLayout(ctx.user.openId, input.orderedGroupIds, input.pinnedGroupIds);
        return { success: true } as const;
      }),

    getAccount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAccountLedger(ctx.user.openId);
    }),

    getAccountActivity: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAccountActivity(ctx.user.openId);
    }),

    getGroupDetail: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupDetail(input.groupId);
      }),

    getPublicOwnerProfile: publicProcedure
      .input(z.object({ openId: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        return await db.getPublicOwnerProfile(input.openId);
      }),

    getOwnerLeaderboard: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getOwnerLeaderboard(input?.limit);
      }),

    setPublicProfile: protectedProcedure
      .input(z.object({ publicProfile: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.setPublicProfile(ctx.user.openId, input.publicProfile);
        return { publicProfile: input.publicProfile };
      }),

    listGroupWithCredits: protectedProcedure
      .input(z.object({ groupId: z.number() }).merge(groupListingInput))
      .mutation(async ({ ctx, input }) => {
        const groups = await db.listGroupWithCredits(ctx.user.openId, input.groupId, input);
        await Promise.all(groups.map(group => notifyCommunityListed({
          chatId: group.chatId,
          groupId: group.id,
          groupTitle: group.title,
          listingType: group.listingType,
          salePriceTon: group.salePriceTon,
        })));
        return { success: true, announced: groups.length };
      }),

    listGroupsWithCredits: protectedProcedure
      .input(z.object({ groupIds: z.array(z.number()).min(1).max(50) }).merge(groupListingInput))
      .mutation(async ({ ctx, input }) => {
        const groups = await db.listGroupsWithCredits(ctx.user.openId, input.groupIds, input);
        await Promise.all(groups.map(group => notifyCommunityListed({
          chatId: group.chatId,
          groupId: group.id,
          groupTitle: group.title,
          listingType: group.listingType,
          salePriceTon: group.salePriceTon,
        })));
        return { success: true, announced: groups.length };
      }),

    createMonthlyEntryLink: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Канал недоступен для настройки");
        if (group.category !== "Каналы" || group.username || !group.monthlyEntryEnabled || !group.monthlyEntryStars) {
          throw new Error("Ежемесячный вход доступен только для приватного канала с указанной ценой");
        }
        const inviteLink = await createTelegramMonthlySubscriptionInviteLink({
          chatId: group.chatId,
          starsAmount: group.monthlyEntryStars,
          linkName: group.monthlyEntryLinkName,
        });
        await db.saveMonthlyEntryInviteLink(ctx.user.openId, group.id, inviteLink);
        return { success: true, inviteLink };
      }),

    createPrivateEntryLink: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Сообщество недоступно для настройки");
        if (group.username) throw new Error("Закрытая ссылка доступна только для приватного сообщества без @username");
        const inviteLink = await createTelegramPrivateInviteLink({ chatId: group.chatId, linkName: "TG TOP private entry" });
        await db.savePrivateEntryInviteLink(ctx.user.openId, group.id, inviteLink);
        return { success: true, inviteLink };
      }),

    createRewardInviteLink: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId === ctx.user.openId) throw new Error("Ссылка для приглашений недоступна");
        const result = await db.getOrCreateRewardInviteLink(input.groupId, ctx.user.openId, () =>
          createTelegramRewardInviteLink({
            chatId: group.chatId,
            linkName: `TG TOP reward ${ctx.user.openId.replace(/^telegram:/, "").slice(-10)}`,
          })
        );
        return { success: true, inviteLink: result.inviteLink, existing: result.existing };
      }),

    unlistGroups: protectedProcedure
      .input(z.object({ groupIds: z.array(z.number()).min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        await db.unlistGroups(ctx.user.openId, input.groupIds);
        return { success: true };
      }),

    deleteGroups: protectedProcedure
      .input(z.object({ groupIds: z.array(z.number()).min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteGroups(ctx.user.openId, input.groupIds);
        return { success: true };
      }),

    toggleServiceMessages: protectedProcedure
      .input(z.object({ groupId: z.number(), deleteServiceMessages: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleServiceMessages(ctx.user.openId, input.groupId, input.deleteServiceMessages);
        return { success: true };
      }),

    getNfts: publicProcedure.query(async () => {
      return await db.getNftUsernames();
    }),

    myNfts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNftUsernames(ctx.user.openId);
    }),

    myNftTransfers: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNftTransferHistory(ctx.user.openId);
    }),

    resolveNftTransferRecipient: protectedProcedure
      .input(z.object({ recipientInput: z.string().trim().min(1).max(128) }))
      .query(async ({ input }) => {
        return await db.resolveNftTransferRecipient(input.recipientInput);
      }),

    prepareNftTransfer: protectedProcedure
      .input(z.object({ nftId: z.number().int().positive(), recipientInput: z.string().trim().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        return await db.prepareNftTransfer(input.nftId, ctx.user.openId, input.recipientInput);
      }),

    completeOffchainNftTransfer: protectedProcedure
      .input(z.object({ transferId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await db.completeOffchainNftTransfer(input.transferId, ctx.user.openId);
      }),

    setNftShowcaseGroup: protectedProcedure
      .input(z.object({ nftId: z.number(), groupId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await db.setNftShowcaseGroup(input.nftId, ctx.user.openId, input.groupId);
        return { success: true };
      }),

    setNftShowcase: protectedProcedure
      .input(z.object({ nftId: z.number().int().positive(), target: z.enum(["profile", "group", "hidden"]), groupId: z.number().int().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.setNftShowcaseTarget(input.nftId, ctx.user.openId, input);
        return { success: true };
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
        assetClass: z.enum(["onchain", "offchain"]).default("offchain"),
        nftItemAddress: z.string().trim().min(20).max(96).optional(),
        ownerWalletAddress: z.string().trim().min(20).max(96).optional(),
      }).superRefine((input, context) => {
        if (input.assetClass === "onchain" && !input.nftItemAddress) {
          context.addIssue({ code: "custom", path: ["nftItemAddress"], message: "Укажите адрес On-chain NFT" });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createNftListing({
          ...input,
          ownerOpenId: ctx.user.openId,
          ownerUsername: ctx.user.name || ctx.user.openId.slice(0, 8),
          ownershipVerifiedAt: input.assetClass === "offchain" ? new Date() : null,
          ownershipVerification: input.assetClass === "offchain" ? "tg-top-internal" : null,
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

    createProtectedGroupDeal: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await db.createProtectedGroupDeal(input.groupId, ctx.user.openId);
        return { deal, commissionPercent: 0, transferWindowDays: 21 };
      }),

    cancelProtectedGroupDeal: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.cancelProtectedGroupDeal(input.dealId, ctx.user.openId);
      }),

    confirmProtectedGroupTransfer: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.confirmProtectedGroupTransfer(input.dealId, ctx.user.openId);
      }),

    myDeals: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserDeals(ctx.user.openId);
    }),
  }),
});

export type AppRouter = typeof appRouter;
