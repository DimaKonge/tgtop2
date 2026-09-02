import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createStarsRankingInvoiceLink, createTelegramMonthlySubscriptionInviteLink, createTelegramPrivateInviteLink, createTelegramRewardInviteLink, notifyCommunityListed, notifyCommunityRemovedFromTop, notifyRecordedRankingBid } from "./telegramNotifications";
import { getTelegramChatGifts, getTelegramGroupAdministrators, getTelegramUserAvatarUrl, resolveVerifiedGroupEntryLink } from "./telegramBot";
import { fetchTelegramGroupProfileMedia } from "./telegramUserAgent";
import { formatTonAmount } from "./tonFormatting";
import { getWalletNfts } from "./tonNft";
import { canCreateNftListing } from "./nftOwnershipPublicationPolicy";
import { deliverOperationsLog, formatTopActivityLog } from "./telegramOperationsLogger";
import { canResolveVerifiedEntryLink } from "./entryLinkAccess";
import { countSuccessfulTelegramAnnouncements } from "./listingAnnouncementPolicy";
import { telegramUserAgentRouter } from "./routers/telegramUserAgentRouter";
import { financeProcedures } from "./routers/financeRouter";
import { supportRouter } from "./routers/supportRouter";
import { getTelegramIdFromOpenId } from "./onboardingIntentPolicy";
import { canRefreshGroupMediaSnapshot, shouldPersistAnimatedAvatar } from "./groupMediaSnapshotPolicy";

const gramAmount = z.string().regex(/^\d+(\.\d{1,2})?$/);
const catalogCode = z.string().trim().min(2).max(96).regex(/^[A-Za-z0-9 _-]+$/);
const mediaRefreshCooldowns = new Map<string, number>();
const MEDIA_REFRESH_COOLDOWN_MS = 10 * 60_000;

async function refreshListedGroupMediaSnapshot(group: { id: number; chatId: string }) {
  try {
    const result = await fetchTelegramGroupProfileMedia(group.chatId, group.id);
    if (!shouldPersistAnimatedAvatar(result.mediaType, result.reason)) return;
    await db.updateGroupAnimatedAvatarSnapshot(group.id, {
      animatedAvatarKey: result.animatedAvatarKey,
      animatedAvatarUrl: result.animatedAvatarUrl,
    });
  } catch (error) {
    console.warn(`[Media] Snapshot refresh skipped for group ${group.id}`, error);
  }
}

const groupListingInput = z.object({
  salePriceTon: gramAmount.nullable().optional(),
  country: z.string().trim().min(2).max(64).optional(),
  city: z.string().trim().max(96).optional(),
  subcategory: z.string().min(2).max(64).optional(),
  anonymousListing: z.boolean().optional(),
  showOwnerContact: z.boolean().optional(),
  managerPublic: z.boolean().optional(),
  listingAnnouncementEnabled: z.boolean().optional(),
  searchIndexable: z.boolean().optional(),
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

  telegramUserAgent: telegramUserAgentRouter,
  support: supportRouter,

  tgTop: router({
    ...financeProcedures,
    createCommunityOnboardingIntent: protectedProcedure
      .input(z.object({ kind: z.enum(["group", "channel"]) }))
      .mutation(async ({ ctx, input }) => {
        const ownerTelegramId = getTelegramIdFromOpenId(ctx.user.openId);
        if (!ownerTelegramId) throw new Error("Войдите через Telegram, чтобы добавить сообщество");
        const intent = await db.createTelegramOnboardingIntent({ ownerTelegramId, kind: input.kind });
        if (intent.status === "rate_limited") {
          throw new Error("Лимит новых подключений достигнут. Попробуйте позже.");
        }
        return { token: intent.token, expiresAt: intent.expiresAt };
      }),

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
        anonymousListing: z.boolean().optional(),
        showOwnerContact: z.boolean().optional(),
        managerPublic: z.boolean().optional(),
        listingAnnouncementEnabled: z.boolean().optional(),
        searchIndexable: z.boolean().optional(),
        country: groupListingInput.shape.country,
        city: groupListingInput.shape.city,
        subcategory: z.string().min(2).max(64).optional(),
        salePriceTon: gramAmount.nullable().optional(),
        rewardActive: z.boolean().optional(),
        rewardBudget: z.number().int().min(0).optional(),
        rewardPerSubscription: z.number().int().min(0).optional(),
        rewardPerManualAdd: z.number().int().min(0).optional(),
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
          input.groupId,
          input.anonymousListing === undefined && input.showOwnerContact === undefined && input.managerPublic === undefined && input.listingAnnouncementEnabled === undefined && input.searchIndexable === undefined && input.country === undefined && input.city === undefined && input.subcategory === undefined && input.salePriceTon === undefined && input.rewardActive === undefined && input.rewardBudget === undefined && input.rewardPerSubscription === undefined && input.rewardPerManualAdd === undefined
            ? undefined
            : {
                anonymousListing: input.anonymousListing,
                showOwnerContact: input.showOwnerContact,
                managerPublic: input.managerPublic,
                listingAnnouncementEnabled: input.listingAnnouncementEnabled,
                searchIndexable: input.searchIndexable,
                country: input.country,
                city: input.city,
                subcategory: input.subcategory,
                salePriceTon: input.salePriceTon,
                rewardActive: input.rewardActive,
                rewardBudget: input.rewardBudget,
                rewardPerSubscription: input.rewardPerSubscription,
                rewardPerManualAdd: input.rewardPerManualAdd,
              }
        );
        void notifyRecordedRankingBid({
          openId: ctx.user.openId,
          groupTitle: intent.groupTitle,
          bidAmount: intent.bidAmount,
          slotNumber: intent.slotNumber,
        });
        void deliverOperationsLog("top_activity", formatTopActivityLog({
          event: "listed_in_top",
          groupTitle: intent.groupTitle,
          groupId: input.groupId,
          actor: { name: ctx.user.name, username: ctx.user.telegramUsername },
        }));
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
    refreshMyGroupMedia: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive(), forceListedRefresh: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Сообщество недоступно для обновления media");
        if (!canRefreshGroupMediaSnapshot(group.status, input.forceListedRefresh)) {
          return { groupId: group.id, refreshed: false, skipped: "listed_snapshot" as const };
        }
        const cooldownKey = `${ctx.user.openId}:${group.id}`;
        const lastRefreshAt = mediaRefreshCooldowns.get(cooldownKey) ?? 0;
        if (!input.forceListedRefresh && Date.now() - lastRefreshAt < MEDIA_REFRESH_COOLDOWN_MS) {
          return { groupId: group.id, refreshed: false, skipped: "cooldown" as const };
        }
        mediaRefreshCooldowns.set(cooldownKey, Date.now());
        const result = await fetchTelegramGroupProfileMedia(group.chatId, group.id);
        if (!shouldPersistAnimatedAvatar(result.mediaType, result.reason)) return { ...result, refreshed: false };
        const saved = await db.updateGroupAnimatedAvatarSnapshot(group.id, {
          animatedAvatarKey: result.animatedAvatarKey,
          animatedAvatarUrl: result.animatedAvatarUrl,
        });
        return { ...result, refreshed: true, group: saved };
      }),
    getGroupAdministrators: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Сообщество недоступно для настройки менеджера");
        try {
          return await getTelegramGroupAdministrators(group.chatId);
        } catch {
          throw new Error("Не удалось получить администраторов. Добавьте @TG_TOPBOT в администраторы группы и повторите попытку.");
        }
      }),
    setGroupManager: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive(), telegramUserId: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Сообщество недоступно для настройки менеджера");
        let administrators;
        try {
          administrators = await getTelegramGroupAdministrators(group.chatId);
        } catch {
          throw new Error("Не удалось проверить администраторов. Убедитесь, что @TG_TOPBOT добавлен в администраторы группы.");
        }
        const manager = administrators.find(admin => admin.telegramUserId === input.telegramUserId);
        if (!manager) throw new Error("Выбранный аккаунт больше не является администратором этой группы");
        const avatarUrl = manager.avatarUrl ?? await getTelegramUserAvatarUrl(manager.telegramUserId);
        const managerWithAvatar = { ...manager, avatarUrl };
        await db.setGroupManager(ctx.user.openId, group.id, managerWithAvatar);
        return { success: true, manager: managerWithAvatar };
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

    getGroupDetail: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getGroupDetail(input.groupId, ctx.user?.openId);
      }),

    getChannelGifts: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group || group.ownerOpenId !== ctx.user.openId) throw new Error("Подарки доступны владельцу подключённого канала");
        try {
          return await getTelegramChatGifts(group.chatId);
        } catch {
          throw new Error("Telegram пока не дал доступ к подаркам канала. Проверьте, что @TG_TOPBOT — администратор с правом публикации сообщений.");
        }
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

    getModerationAccess: protectedProcedure.query(async ({ ctx }) => {
      return await db.getModerationAccess(ctx.user.openId);
    }),

    getCatalogTaxonomy: publicProcedure.query(async () => {
      return await db.getCatalogTaxonomy();
    }),

    getApprovedBots: publicProcedure
      .input(z.object({ category: z.string().trim().max(64).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getApprovedBotListings(input?.category);
      }),

    myBotListings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMyBotListings(ctx.user.openId);
    }),

    submitBotListing: protectedProcedure
      .input(z.object({ telegramLink: z.string().trim().min(3).max(512) }))
      .mutation(async ({ ctx, input }) => {
        return await db.submitBotListing(ctx.user.openId, input.telegramLink);
      }),

    addCatalogCountry: protectedProcedure
      .input(z.object({ code: catalogCode.max(64), label: z.string().trim().min(2).max(96) }))
      .mutation(async ({ ctx, input }) => {
        return await db.addCatalogCountry(ctx.user.openId, input);
      }),

    deleteCatalogCountry: protectedProcedure
      .input(z.object({ countryCode: catalogCode.max(64) }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCatalogCountry(ctx.user.openId, input.countryCode);
        return { success: true } as const;
      }),

    addCatalogCity: protectedProcedure
      .input(z.object({ countryCode: catalogCode.max(64), code: catalogCode, label: z.string().trim().min(2).max(128) }))
      .mutation(async ({ ctx, input }) => {
        return await db.addCatalogCity(ctx.user.openId, input);
      }),

    deleteCatalogCity: protectedProcedure
      .input(z.object({ cityId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCatalogCity(ctx.user.openId, input.cityId);
        return { success: true } as const;
      }),

    addCatalogTopic: protectedProcedure
      .input(z.object({ category: z.enum(["Каналы", "Чаты", "Боты"]), code: catalogCode.max(64), label: z.string().trim().min(2).max(96) }))
      .mutation(async ({ ctx, input }) => {
        return await db.addCatalogTopic(ctx.user.openId, input);
      }),

    deleteCatalogTopic: protectedProcedure
      .input(z.object({ topicId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCatalogTopic(ctx.user.openId, input.topicId);
        return { success: true } as const;
      }),

    getModerationQueue: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      if (!access.canModerate) throw new Error("Недостаточно прав для просмотра очереди модерации");
      return await db.getModerationQueue();
    }),

    getBotModerationQueue: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      if (!access.canModerate) throw new Error("Недостаточно прав для просмотра заявок ботов");
      return await db.getBotModerationQueue();
    }),

    getAllBotListings: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      if (!access.canModerate) throw new Error("Недостаточно прав для просмотра каталога ботов");
      return await db.getAllBotListings();
    }),

    deleteBotListing: protectedProcedure
      .input(z.object({ botListingId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const access = await db.getModerationAccess(ctx.user.openId);
        if (!access.canModerate) throw new Error("Недостаточно прав для удаления ботов");
        return await db.deleteBotListing(ctx.user.openId, input.botListingId);
      }),

    moderateBotListing: protectedProcedure
      .input(z.object({
        botListingId: z.number().int().positive(),
        action: z.enum(["approve", "reject"]),
        category: z.string().trim().min(2).max(64).optional(),
        reason: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const access = await db.getModerationAccess(ctx.user.openId);
        if (!access.canModerate) throw new Error("Недостаточно прав для модерации заявок ботов");
        if (input.action === "reject" && (!input.reason || input.reason.length < 3)) {
          throw new Error("Укажите причину отклонения заявки на бота");
        }
        return await db.moderateBotListing({ reviewerOpenId: ctx.user.openId, ...input });
      }),

    getActiveModerationListings: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      if (!access.canModerate) throw new Error("Недостаточно прав для просмотра активных лотов");
      return await db.getActiveModerationListings();
    }),

    moderateGroup: protectedProcedure
      .input(z.object({
        groupId: z.number().int().positive(),
        action: z.enum(["review", "block", "approve"]),
        reason: z.string().trim().min(3).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const access = await db.getModerationAccess(ctx.user.openId);
        if (!access.canModerate) throw new Error("Недостаточно прав для модерации лотов");
        const group = await db.moderateGroup(ctx.user.openId, input.groupId, input.action, input.reason);
        const ownerNotified = input.action !== "approve"
          ? await notifyCommunityRemovedFromTop({ openId: group.ownerOpenId, groupTitle: group.title, reason: input.reason })
          : false;
        return { success: true, ownerNotified } as const;
      }),

    getModerators: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      if (!access.canManageModerators) throw new Error("Недостаточно прав для управления модераторами");
      return await db.getModerators();
    }),

    setModeratorRole: protectedProcedure
      .input(z.object({ telegramUsername: z.string().trim().min(2).max(128), role: z.enum(["moderator", "user"]) }))
      .mutation(async ({ ctx, input }) => {
        return await db.setModeratorRole(ctx.user.openId, input.telegramUsername, input.role);
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
        const deliveries = await Promise.all(groups.filter(group => group.listingAnnouncementEnabled).map(group => notifyCommunityListed({
          chatId: group.chatId,
          groupId: group.id,
          groupTitle: group.title,
          listingType: group.listingType,
          salePriceTon: group.salePriceTon,
        })));
        void Promise.all(groups.map(group => refreshListedGroupMediaSnapshot(group))).catch(() => undefined);
        return { success: true, announced: countSuccessfulTelegramAnnouncements(deliveries) };
      }),

    listGroupsWithCredits: protectedProcedure
      .input(z.object({ groupIds: z.array(z.number()).min(1).max(50) }).merge(groupListingInput))
      .mutation(async ({ ctx, input }) => {
        const groups = await db.listGroupsWithCredits(ctx.user.openId, input.groupIds, input);
        const deliveries = await Promise.all(groups.filter(group => group.listingAnnouncementEnabled).map(group => notifyCommunityListed({
          chatId: group.chatId,
          groupId: group.id,
          groupTitle: group.title,
          listingType: group.listingType,
          salePriceTon: group.salePriceTon,
        })));
        void Promise.all(groups.map(group => refreshListedGroupMediaSnapshot(group))).catch(() => undefined);
        return { success: true, announced: countSuccessfulTelegramAnnouncements(deliveries) };
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

    resolveVerifiedEntryLink: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new Error("Сообщество не найдено");
        const access = group.username ? { canModerate: false } : await db.getModerationAccess(ctx.user.openId);
        if (!canResolveVerifiedEntryLink({ target: group, viewerOpenId: ctx.user.openId, canModerate: access.canModerate })) {
          throw new Error("Закрытая ссылка доступна только владельцу сообщества или модератору");
        }
        const entryUrl = await resolveVerifiedGroupEntryLink(group);
        return { entryUrl };
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

    getRewardCampaignStats: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => await db.getRewardCampaignStats(ctx.user.openId, input.groupId)),

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

    getWalletNfts: protectedProcedure
      .input(z.object({ walletAddress: z.string().trim().min(20).max(96) }))
      .query(async ({ input }) => await getWalletNfts(input.walletAddress)),

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
        if (!canCreateNftListing(input.assetClass)) {
          throw new Error("Публикация On-chain NFT появится только после подключения независимой проверки владения");
        }
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

    createNftRentalDeal: protectedProcedure
      .input(z.object({ nftId: z.number().int().positive(), rentalDays: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => db.createNftRentalDeal(input.nftId, ctx.user.openId, input.rentalDays)),
    cancelNftRental: protectedProcedure
      .input(z.object({ dealId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => db.cancelNftRental(input.dealId, ctx.user.openId)),
    confirmNftRental: protectedProcedure
      .input(z.object({ dealId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => db.confirmNftRental(input.dealId, ctx.user.openId)),

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
