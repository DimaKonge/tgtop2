import { eq, and, or, asc, desc, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import { InsertUser, users, groupsCatalog, groupStatsSnapshots, creditTransactions, rewardEvents, rewardInviteLinks, auctionSlots, rankingBidIntents, starsRankingPaymentIntents, nftUsernames, nftTransfers, deals, InsertGroupCatalog, InsertNftUsername } from "../drizzle/schema";
import { ENV } from './_core/env';
import { GROUP_CONNECTION_BONUS, getGroupConnectionBonusIdentity } from "./groupBonusPolicy";
import { GROUP_TRANSFER_WINDOW_MS, canBuyerCancel, canBuyerConfirmTransfer, getTransferDeadline } from "./protectedDeals";
import { getNftTransferRequirements, getNftTransferReference, normalizeTelegramRecipient } from "./nftTransferPolicy";
import { isCatalogSubcategory } from "./catalogTaxonomy";
import { getMinimumRankingBidMilliTon, getRankingFloorMilliTon, isQualifyingRankingBid, sortRankingEntriesByBid } from "./rankingBidPolicy";
import { planVacantRankingAssignments } from "./autoPlacementPolicy";
import { formatTonAmount } from "./tonFormatting";
import { DEFAULT_MANUAL_ADD_REWARD, getRewardAmount, isRewardCampaignActive, type RewardEventType, validateRewardCampaignConfig } from "./rewardCampaignPolicy";

export { GROUP_CONNECTION_BONUS } from "./groupBonusPolicy";

export const STARS_PER_MINIMUM_RANKING_BID = 10;
const STARS_RANKING_PAYMENT_TTL_MS = 20 * 60 * 1000;

export function getStarsAmountForRankingBid(bidAmount: number) {
  return Math.max(STARS_PER_MINIMUM_RANKING_BID, Math.ceil(bidAmount / 10));
}

function toPublicGroup<T extends typeof groupsCatalog.$inferSelect>(group: T) {
  const active = isRewardCampaignActive(group);
  const rewardAmount = active
    ? getRewardAmount(group, group.category === "Чаты" ? "manual_add" : "subscription")
    : 0;
  const {
    monthlyEntryInviteLink: _monthlyEntryInviteLink,
    rewardActive: _rewardActive,
    rewardBudget: _rewardBudget,
    rewardPerSubscription: _rewardPerSubscription,
    rewardPerInvite: _rewardPerInvite,
    rewardPerManualAdd: _rewardPerManualAdd,
    ...publicGroup
  } = group;
  return { ...publicGroup, rewardActive: active, rewardAmount };
}

function toDetailGroup<T extends typeof groupsCatalog.$inferSelect>(group: T) {
  const publicGroup = toPublicGroup(group);
  const active = isRewardCampaignActive(group);
  return {
    ...publicGroup,
    reward: active
      ? {
          subscriptionAmount: getRewardAmount(group, "subscription"),
          inviteAmount: getRewardAmount(group, "invite_referral"),
          manualAddAmount: getRewardAmount(group, "manual_add"),
        }
      : undefined,
  };
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "avatarUrl", "telegramUsername", "loginMethod"] as const;
    textFields.forEach((field) => {
      const val = user[field];
      if (val !== undefined) {
        values[field] = val ?? null;
        updateSet[field] = val ?? null;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function setPublicProfile(openId: string, publicProfile: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ publicProfile }).where(eq(users.openId, openId));
}

export async function getAccountLedger(openId: string) {
  const db = await getDb();
  if (!db) return { user: undefined, transactions: [], referral: undefined };
  const user = await getUserByOpenId(openId);
  const transactions = await db.select({
    id: creditTransactions.id,
    amount: creditTransactions.amount,
    kind: creditTransactions.kind,
    createdAt: creditTransactions.createdAt,
    groupId: creditTransactions.groupId,
    groupTitle: groupsCatalog.title,
    groupUsername: groupsCatalog.username,
  }).from(creditTransactions)
    .leftJoin(groupsCatalog, eq(creditTransactions.groupId, groupsCatalog.id))
    .where(eq(creditTransactions.userOpenId, openId))
    .orderBy(desc(creditTransactions.createdAt), desc(creditTransactions.id));
  const referral = user ? await getReferralOverview(openId) : undefined;
  return { user, transactions, referral };
}

export async function getAccountActivity(openId: string) {
  const db = await getDb();
  if (!db) return [];
  const [credits, starsPayments, bids, userDeals, transfers] = await Promise.all([
    db.select({
      id: creditTransactions.id,
      amount: creditTransactions.amount,
      kind: creditTransactions.kind,
      createdAt: creditTransactions.createdAt,
      groupTitle: groupsCatalog.title,
      groupUsername: groupsCatalog.username,
    }).from(creditTransactions).leftJoin(groupsCatalog, eq(creditTransactions.groupId, groupsCatalog.id))
      .where(eq(creditTransactions.userOpenId, openId)),
    db.select({
      id: starsRankingPaymentIntents.id,
      starsAmount: starsRankingPaymentIntents.starsAmount,
      status: starsRankingPaymentIntents.status,
      createdAt: starsRankingPaymentIntents.createdAt,
      paidAt: starsRankingPaymentIntents.paidAt,
      groupTitle: groupsCatalog.title,
      groupUsername: groupsCatalog.username,
    }).from(starsRankingPaymentIntents).leftJoin(groupsCatalog, eq(starsRankingPaymentIntents.groupId, groupsCatalog.id))
      .where(eq(starsRankingPaymentIntents.userOpenId, openId)),
    db.select({
      id: rankingBidIntents.id,
      bidAmount: rankingBidIntents.bidAmount,
      status: rankingBidIntents.status,
      createdAt: rankingBidIntents.createdAt,
      groupTitle: groupsCatalog.title,
      groupUsername: groupsCatalog.username,
    }).from(rankingBidIntents).leftJoin(groupsCatalog, eq(rankingBidIntents.groupId, groupsCatalog.id))
      .where(eq(rankingBidIntents.bidderOpenId, openId)),
    getUserDeals(openId),
    getNftTransferHistory(openId),
  ]);
  const namedGroup = (groupTitle: string | null, groupUsername: string | null) => groupUsername ? `@${groupUsername}` : (groupTitle ?? "TG TOP");
  return [
    ...credits.map(item => ({
      id: `credit:${item.id}`,
      type: "credit" as const,
      status: item.kind,
      createdAt: item.createdAt,
      title: item.kind === "group_connection_bonus"
        ? "connection_bonus"
        : item.kind === "manual_bonus"
          ? "manual_bonus"
          : item.kind === "reward_campaign_reserve"
            ? "reward_campaign_reserve"
            : item.kind === "reward_campaign_release"
              ? "reward_campaign_release"
              : item.kind === "reward_subscription"
                ? "reward_subscription"
                : item.kind === "reward_invite_referral"
                  ? "reward_invite_referral"
                  : item.kind === "reward_manual_add"
                    ? "reward_manual_add"
                    : "catalog_listing",
      subject: namedGroup(item.groupTitle, item.groupUsername),
      amount: item.amount / 100,
      currency: "GRAM",
      direction: item.amount >= 0 ? "in" as const : "out" as const,
    })),
    ...starsPayments.map(item => ({ id: `stars:${item.id}`, type: "stars" as const, status: item.status, createdAt: item.paidAt ?? item.createdAt, title: "ranking_stars", subject: namedGroup(item.groupTitle, item.groupUsername), amount: item.starsAmount, currency: "Stars", direction: "out" as const })),
    ...bids.map(item => ({ id: `bid:${item.id}`, type: "bid" as const, status: item.status, createdAt: item.createdAt, title: "ranking_bid", subject: namedGroup(item.groupTitle, item.groupUsername), amount: item.bidAmount / 1000, currency: "TON", direction: "neutral" as const })),
    ...userDeals.map(item => ({ id: `deal:${item.id}`, type: "deal" as const, status: item.status, createdAt: item.createdAt, title: item.dealType, subject: namedGroup(item.groupTitle, item.groupUsername), amount: Number(item.price), currency: "TON", direction: item.buyerOpenId === openId ? "out" as const : "in" as const })),
    ...transfers.map(item => ({ id: `nft:${item.id}`, type: "nft_transfer" as const, status: item.status, createdAt: item.confirmedAt ?? item.createdAt, title: "nft_transfer", subject: item.username ? `@${item.username}` : "NFT", amount: null, currency: null, direction: item.senderOpenId === openId ? "out" as const : "in" as const })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 100);
}

function createReferralCode() {
  return `TG${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function getReferralOverview(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const user = await getUserByOpenId(openId);
  if (!user) return undefined;
  let referralCode = user.referralCode;
  if (!referralCode) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = createReferralCode();
      try {
        await db.update(users).set({ referralCode: candidate }).where(eq(users.openId, openId));
        referralCode = candidate;
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
      }
    }
  }
  if (!referralCode) throw new Error("Не удалось создать реферальный код");
  const referrals = await db.select({ id: users.id }).from(users).where(eq(users.referredBy, referralCode));
  const freshUser = await getUserByOpenId(openId);
  return {
    referralCode,
    referralLink: `https://t.me/TGTOP_robot?start=ref_${referralCode}`,
    referralsCount: referrals.length,
    earnings: freshUser?.referralEarnings ?? user.referralEarnings,
  };
}

export async function attributeTelegramReferral(telegramUserId: number, referralCode: string) {
  const db = await getDb();
  if (!db) return false;
  const cleanCode = referralCode.trim().toUpperCase();
  const referrer = await db.select().from(users).where(eq(users.referralCode, cleanCode)).limit(1);
  const referredOpenId = `telegram:${telegramUserId}`;
  const referredUser = await getUserByOpenId(referredOpenId);
  if (!referrer[0] || !referredUser || referredUser.referredBy || referrer[0].openId === referredOpenId) return false;
  await db.update(users).set({ referredBy: cleanCode }).where(eq(users.openId, referredOpenId));
  return true;
}

// TG TOP specific queries
export async function getAuctionSlots(category?: string, country?: string, subcategory?: string, city?: string) {
  const db = await getDb();
  if (!db) return [];

  let slots = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, "Все"),
    eq(auctionSlots.country, "Global")
  )).orderBy(asc(auctionSlots.slotNumber));
  const rankedSlots = sortRankingEntriesByBid(slots.filter(slot => slot.groupId !== null).map(slot => ({ ...slot, heldSince: slot.updatedAt })));
  const vacantSlots = slots.filter(slot => slot.groupId === null);
  const strictOrder = [...rankedSlots, ...vacantSlots];
  if (strictOrder.some((source, index) => source.id !== slots[index]?.id)) {
    const now = new Date();
    await db.transaction(async tx => {
      for (let index = 0; index < strictOrder.length; index += 1) {
        const source = strictOrder[index];
        const target = slots[index];
        if (!target || source.id === target.id) continue;
        await tx.update(auctionSlots).set({
          bidAmount: source.bidAmount,
          currentBid: source.currentBid,
          leaderUsername: source.leaderUsername,
          leaderUserId: source.leaderUserId,
          groupId: source.groupId,
          title: source.title,
          subtitle: source.subtitle,
          updatedAt: now,
        }).where(eq(auctionSlots.id, target.id));
      }
    });
    slots = await db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, "Все"),
      eq(auctionSlots.country, "Global")
    )).orderBy(asc(auctionSlots.slotNumber));
  }
  const groupIds = slots.map(slot => slot.groupId).filter((id): id is number => id !== null);
  if (groupIds.length === 0) return slots.map(slot => ({ ...slot, group: null }));
  const groupConditions = [inArray(groupsCatalog.id, groupIds)];
  if (category && category !== "Все") groupConditions.push(eq(groupsCatalog.category, category as "Каналы" | "Чаты"));
  if (country && country !== "Все" && country !== "Global") groupConditions.push(eq(groupsCatalog.country, country));
  if (subcategory && subcategory !== "Все") groupConditions.push(eq(groupsCatalog.subcategory, subcategory));
  if (city && city !== "Все") groupConditions.push(eq(groupsCatalog.city, city));
  const groups = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...groupConditions));
  const groupMap = new Map(groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl }) => {
    const publicGroup = toPublicGroup(group);
    return [
    group.id,
    {
      ...publicGroup,
      owner: group.anonymousListing ? undefined : {
        openId: group.ownerOpenId,
        name: ownerName,
        telegramUsername: ownerTelegramUsername,
        avatarUrl: ownerAvatarUrl,
      },
    },
  ];
  }));
  return slots.map(slot => ({ ...slot, group: slot.groupId ? groupMap.get(slot.groupId) ?? null : null }));
}

export async function placeBid(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const group = groupId ? await getGroupById(groupId) : undefined;
  if (!groupId || !group) throw new Error("Группа недоступна для размещения");
  const target = (await db.select().from(auctionSlots).where(eq(auctionSlots.id, slotId)).limit(1))[0];
  if (!target) throw new Error("Позиция рейтинга не найдена");
  const slotFloor = getRankingFloorMilliTon(target.slotNumber);
  if (!isQualifyingRankingBid(bidAmount, target.bidAmount, target.groupId !== null, slotFloor)) {
    const requiredMilliTon = getMinimumRankingBidMilliTon(target.bidAmount, target.groupId !== null, slotFloor);
    throw new Error(`Минимальная ставка для этой позиции — ${formatTonAmount(requiredMilliTon / 1000)} GRAM`);
  }
  const board = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, target.category),
    eq(auctionSlots.country, target.country)
  )).orderBy(asc(auctionSlots.slotNumber));

  let rankingIntentId = 0;
  await db.transaction(async tx => {
    const now = new Date();
    const incoming = {
      bidAmount,
      currentBid: currentBidStr,
      leaderUsername,
      leaderUserId,
      groupId,
      title: group.title,
      subtitle: group.username ? `@${group.username}` : group.category,
      heldSince: now,
    };
    const strictOrder = sortRankingEntriesByBid([
      ...board.filter(slot => slot.groupId !== null && slot.groupId !== groupId).map(slot => ({ ...slot, heldSince: slot.updatedAt })),
      incoming,
    ]);

    for (let index = 0; index < board.length; index += 1) {
      const slot = board[index];
      const source = strictOrder[index];
      const changed = slot.groupId !== (source?.groupId ?? null);
      if (!changed) continue;
      await tx.update(auctionSlots).set(source ? {
        bidAmount: source.bidAmount,
        currentBid: source.currentBid,
        leaderUsername: source.leaderUsername,
        leaderUserId: source.leaderUserId,
        groupId: source.groupId,
        title: source.title,
        subtitle: source.subtitle,
        updatedAt: now,
      } : {
        bidAmount: 0,
        currentBid: "0 GRAM",
        leaderUsername: "-",
        leaderUserId: null,
        groupId: null,
        title: "Свободное место",
        subtitle: "Ждет листинга",
        updatedAt: now,
      }).where(eq(auctionSlots.id, slot.id));
    }

    const inserted = await tx.insert(rankingBidIntents).values({
      slotId: target.id,
      groupId,
      bidderOpenId: leaderUserId,
      bidAmount,
      status: "recorded",
    });
    rankingIntentId = Number(inserted[0]?.insertId ?? 0);
  });

  return { id: rankingIntentId, slotNumber: target.slotNumber, bidAmount, groupTitle: group.title };
}

export async function createStarsRankingPaymentIntent(input: { userOpenId: string; slotId: number; groupId: number; bidAmount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const group = await getGroupById(input.groupId);
  if (!group || group.ownerOpenId !== input.userOpenId) throw new Error("Выберите свою группу из личной папки");
  const [slot] = await db.select().from(auctionSlots).where(eq(auctionSlots.id, input.slotId)).limit(1);
  if (!slot || !isQualifyingRankingBid(input.bidAmount, slot.bidAmount, slot.groupId !== null)) {
    throw new Error("Ставка больше недействительна. Обновите рейтинг и повторите попытку.");
  }
  const payload = `tg_top_rank_${randomBytes(18).toString("hex")}`;
  const expiresAt = new Date(Date.now() + STARS_RANKING_PAYMENT_TTL_MS);
  const starsAmount = getStarsAmountForRankingBid(input.bidAmount);
  const result = await db.insert(starsRankingPaymentIntents).values({
    payload,
    userOpenId: input.userOpenId,
    slotId: input.slotId,
    groupId: input.groupId,
    bidAmount: input.bidAmount,
    starsAmount,
    expiresAt,
  });
  return { id: Number(result[0]?.insertId ?? 0), payload, starsAmount, expiresAt, groupTitle: group.title, slotNumber: slot.slotNumber };
}

export async function setStarsRankingInvoiceMessage(intentId: number, invoiceMessageId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(starsRankingPaymentIntents).set({ invoiceMessageId }).where(eq(starsRankingPaymentIntents.id, intentId));
}

export async function approveStarsRankingPayment(input: { payload: string; telegramUserId: number; starsAmount: number }) {
  const db = await getDb();
  if (!db) return { approved: false, reason: "Сервис оплаты временно недоступен" };
  const [intent] = await db.select().from(starsRankingPaymentIntents).where(eq(starsRankingPaymentIntents.payload, input.payload)).limit(1);
  if (!intent || intent.status !== "pending" || intent.expiresAt.getTime() < Date.now()) return { approved: false, reason: "Счёт истёк или уже обработан" };
  if (intent.userOpenId !== `telegram:${input.telegramUserId}` || intent.starsAmount !== input.starsAmount) return { approved: false, reason: "Параметры счёта не совпадают" };
  const group = await getGroupById(intent.groupId);
  const [slot] = await db.select().from(auctionSlots).where(eq(auctionSlots.id, intent.slotId)).limit(1);
  if (!group || group.ownerOpenId !== intent.userOpenId || !slot || !isQualifyingRankingBid(intent.bidAmount, slot.bidAmount, slot.groupId !== null)) {
    return { approved: false, reason: "Позиция изменилась. Обновите рейтинг и создайте новый счёт." };
  }
  await db.update(starsRankingPaymentIntents).set({ status: "pre_checkout_approved", telegramUserId: String(input.telegramUserId) }).where(eq(starsRankingPaymentIntents.id, intent.id));
  return { approved: true };
}

export async function settleStarsRankingPayment(input: { payload: string; telegramUserId: number; starsAmount: number; telegramPaymentChargeId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [alreadyRecorded] = await db.select().from(starsRankingPaymentIntents)
    .where(eq(starsRankingPaymentIntents.telegramPaymentChargeId, input.telegramPaymentChargeId)).limit(1);
  if (alreadyRecorded?.status === "paid") return { status: "paid" as const, idempotent: true };
  const [intent] = await db.select().from(starsRankingPaymentIntents).where(eq(starsRankingPaymentIntents.payload, input.payload)).limit(1);
  if (!intent || intent.userOpenId !== `telegram:${input.telegramUserId}` || intent.starsAmount !== input.starsAmount) {
    throw new Error("Не удалось сопоставить подтверждённую Stars-оплату со ставкой");
  }
  if (intent.status === "paid") return { status: "paid" as const, idempotent: true };
  if (intent.status !== "pre_checkout_approved") {
    await db.update(starsRankingPaymentIntents).set({
      status: "refund_required",
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      telegramUserId: String(input.telegramUserId),
      failureReason: "Оплата не получила предварительное подтверждение",
    }).where(eq(starsRankingPaymentIntents.id, intent.id));
    return { status: "refund_required" as const, idempotent: false };
  }
  const group = await getGroupById(intent.groupId);
  if (!group) throw new Error("Группа для подтверждённой ставки больше недоступна");
  try {
    await placeBid(intent.slotId, intent.bidAmount, `${formatTonAmount(intent.bidAmount / 1000)} TON`, group.username ?? group.title, intent.userOpenId, intent.groupId);
    await db.update(starsRankingPaymentIntents).set({
      status: "paid",
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      telegramUserId: String(input.telegramUserId),
      paidAt: new Date(),
    }).where(eq(starsRankingPaymentIntents.id, intent.id));
    return { status: "paid" as const, idempotent: false };
  } catch (error) {
    await db.update(starsRankingPaymentIntents).set({
      status: "refund_required",
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      telegramUserId: String(input.telegramUserId),
      failureReason: error instanceof Error ? error.message.slice(0, 255) : "Не удалось активировать ставку",
    }).where(eq(starsRankingPaymentIntents.id, intent.id));
    return { status: "refund_required" as const, idempotent: false };
  }
}

export async function getGroupsCatalog(category?: string, country?: string, subcategory?: string, city?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(groupsCatalog.status, "listed")];
  if (category && category !== "Все") conditions.push(eq(groupsCatalog.category, category as "Каналы" | "Чаты"));
  if (subcategory && subcategory !== "Все") conditions.push(eq(groupsCatalog.subcategory, subcategory));
  if (country && country !== "Все" && country !== "Global") conditions.push(eq(groupsCatalog.country, country));
  if (city && city !== "Все") conditions.push(eq(groupsCatalog.city, city));
  const groups = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...conditions))
    .orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
  return groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl }) => {
    const publicGroup = toPublicGroup(group);
    return {
      ...publicGroup,
      owner: group.anonymousListing ? undefined : {
        openId: group.ownerOpenId,
        name: ownerName,
        telegramUsername: ownerTelegramUsername,
        avatarUrl: ownerAvatarUrl,
      },
    };
  });
}

export async function getPublicOwnerProfile(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const groups = await db.select().from(groupsCatalog).where(and(
    eq(groupsCatalog.ownerOpenId, openId),
    eq(groupsCatalog.status, "listed"),
    eq(groupsCatalog.anonymousListing, false)
  )).orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
  if (!groups.length) return undefined;
  const [owner] = await db.select({
    openId: users.openId,
    name: users.name,
    telegramUsername: users.telegramUsername,
    avatarUrl: users.avatarUrl,
    publicProfile: users.publicProfile,
  }).from(users).where(eq(users.openId, openId)).limit(1);
  if (!owner || !owner.publicProfile) return undefined;
  const nfts = await db.select({
    id: nftUsernames.id,
    username: nftUsernames.username,
    price: nftUsernames.price,
    rentalPricePerDay: nftUsernames.rentalPricePerDay,
    assetClass: nftUsernames.assetClass,
    listingType: nftUsernames.listingType,
  }).from(nftUsernames).where(and(
    eq(nftUsernames.ownerOpenId, openId),
    eq(nftUsernames.status, "available"),
    eq(nftUsernames.showcaseProfile, true)
  )).orderBy(desc(nftUsernames.createdAt));
  return {
    owner,
    groups: groups.map(group => {
      const publicGroup = toPublicGroup(group);
      return { ...publicGroup, owner };
    }),
    nfts,
  };
}

export async function getOwnerLeaderboard(limit = 25) {
  const db = await getDb();
  if (!db) return [];
  const totalMembers = sql<number>`COALESCE(SUM(${groupsCatalog.membersCount}), 0)`;
  const activeListings = sql<number>`COUNT(${groupsCatalog.id})`;
  const rows = await db.select({
    openId: groupsCatalog.ownerOpenId,
    name: users.name,
    telegramUsername: users.telegramUsername,
    avatarUrl: users.avatarUrl,
    activeListings,
    totalMembers,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(eq(groupsCatalog.status, "listed"), eq(groupsCatalog.anonymousListing, false), eq(users.publicProfile, true)))
    .groupBy(groupsCatalog.ownerOpenId, users.name, users.telegramUsername, users.avatarUrl)
    .orderBy(desc(totalMembers), desc(activeListings), asc(groupsCatalog.ownerOpenId))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map((row, index) => ({
    rank: index + 1,
    owner: {
      openId: row.openId,
      name: row.name,
      telegramUsername: row.telegramUsername,
      avatarUrl: row.avatarUrl,
    },
    activeListings: Number(row.activeListings),
    totalMembers: Number(row.totalMembers),
  }));
}

export async function upsertTelegramGroup(data: InsertGroupCatalog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(groupsCatalog).values(data).onDuplicateKeyUpdate({
    set: {
      title: data.title,
      username: data.username,
      description: data.description,
      avatarFileId: data.avatarFileId,
      membersCount: data.membersCount,
      ownerOpenId: data.ownerOpenId,
      category: data.category,
      country: data.country,
      lastStatsAt: data.lastStatsAt,
    },
  });
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groupsCatalog).where(eq(groupsCatalog.id, id)).limit(1);
  return result[0];
}

export async function getGroupByChatId(chatId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groupsCatalog).where(eq(groupsCatalog.chatId, chatId)).limit(1);
  return result[0];
}

export async function getMyGroups(ownerOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  const groups = await db.select().from(groupsCatalog)
    .where(eq(groupsCatalog.ownerOpenId, ownerOpenId))
    .orderBy(desc(groupsCatalog.ownerPinned), asc(groupsCatalog.ownerSortOrder), desc(groupsCatalog.createdAt));
  for (const group of groups) await grantGroupConnectionBonus(ownerOpenId, group.id);
  return groups;
}

export async function saveMyGroupsLayout(ownerOpenId: string, orderedGroupIds: number[], pinnedGroupIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const uniqueOrderedIds = Array.from(new Set(orderedGroupIds));
  const uniquePinnedIds = Array.from(new Set(pinnedGroupIds));
  if (uniqueOrderedIds.length !== orderedGroupIds.length || uniquePinnedIds.length !== pinnedGroupIds.length) {
    throw new Error("Порядок групп содержит повторяющиеся записи");
  }

  const orderedSet = new Set(uniqueOrderedIds);
  if (uniquePinnedIds.some(id => !orderedSet.has(id))) {
    throw new Error("Закрепить можно только группу из личного списка");
  }

  const ownedGroups = await db.select({ id: groupsCatalog.id }).from(groupsCatalog)
    .where(eq(groupsCatalog.ownerOpenId, ownerOpenId));
  if (ownedGroups.length !== uniqueOrderedIds.length || ownedGroups.some(group => !orderedSet.has(group.id))) {
    throw new Error("Порядок должен включать все ваши группы");
  }

  const pinnedSet = new Set(uniquePinnedIds);
  await db.transaction(async tx => {
    for (let index = 0; index < uniqueOrderedIds.length; index += 1) {
      const groupId = uniqueOrderedIds[index];
      await tx.update(groupsCatalog).set({
        ownerPinned: pinnedSet.has(groupId),
        ownerSortOrder: index,
      }).where(and(eq(groupsCatalog.id, groupId), eq(groupsCatalog.ownerOpenId, ownerOpenId)));
    }
  });
}

export async function getGroupDetail(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [detailRow] = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(eq(groupsCatalog.id, id))
    .limit(1);
  if (!detailRow) return undefined;
  const { group, ownerName, ownerTelegramUsername, ownerAvatarUrl } = detailRow;
  const snapshots = await db.select().from(groupStatsSnapshots).where(eq(groupStatsSnapshots.groupId, id)).orderBy(desc(groupStatsSnapshots.recordedAt)).limit(30);
  const ownerNfts = await db.select().from(nftUsernames)
    .where(and(eq(nftUsernames.showcaseGroupId, group.id), eq(nftUsernames.status, "available")))
    .orderBy(desc(nftUsernames.createdAt));
  return {
    group: toDetailGroup(group),
    owner: group.anonymousListing ? undefined : {
      openId: group.ownerOpenId,
      name: ownerName,
      telegramUsername: ownerTelegramUsername,
      avatarUrl: ownerAvatarUrl,
    },
    ownerContact: group.showOwnerContact && ownerTelegramUsername ? {
      telegramUsername: ownerTelegramUsername,
    } : undefined,
    snapshots: snapshots.reverse(),
    ownerNfts,
    analytics: { source: "tgtop_bot_observed" as const, observedSince: group.createdAt },
  };
}

export async function recordGroupSnapshot(groupId: number, membersCount: number, messagesCount: number, joinedCount: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(groupStatsSnapshots).values({ groupId, membersCount, messagesCount, joinedCount });
}

export async function recordGroupActivity(chatId: string, views = 0) {
  const db = await getDb();
  if (!db) return;
  const group = await getGroupByChatId(chatId);
  if (!group) return;
  const nextMessages = group.messagesCount + 1;
  await db.update(groupsCatalog).set({
    messagesCount: nextMessages,
    lastPostViews: views,
    lastPostAt: new Date(),
    lastStatsAt: new Date(),
  }).where(eq(groupsCatalog.id, group.id));
  await recordGroupSnapshot(group.id, group.membersCount, nextMessages, group.joinedCount);
}

export async function recordGroupMembership(chatId: string, joined: boolean, left: boolean, viaInviteLink: boolean) {
  const db = await getDb();
  if (!db) return;
  const group = await getGroupByChatId(chatId);
  if (!group) return;
  const nextJoined = group.joinedCount + (joined ? 1 : 0);
  const nextLeaves = group.leavesCount + (left ? 1 : 0);
  const nextInvited = group.invitedCount + (joined && viaInviteLink ? 1 : 0);
  await db.update(groupsCatalog).set({
    joinedCount: nextJoined,
    leavesCount: nextLeaves,
    invitedCount: nextInvited,
    lastStatsAt: new Date(),
  }).where(eq(groupsCatalog.id, group.id));
  await recordGroupSnapshot(group.id, group.membersCount, group.messagesCount, nextJoined);
}

export type TelegramRewardInput = {
  chatId: string;
  eventType: RewardEventType;
  beneficiaryTelegramId: number;
  memberTelegramId: number;
  beneficiaryName?: string;
  beneficiaryUsername?: string;
  inviterTelegramId?: number;
};

export async function awardTelegramReward(input: TelegramRewardInput) {
  const db = await getDb();
  if (!db) return { awarded: false as const, reason: "database_unavailable" as const };
  const group = await getGroupByChatId(input.chatId);
  if (!group || group.status !== "listed") return { awarded: false as const, reason: "group_unavailable" as const };
  const amount = getRewardAmount(group, input.eventType);
  const beneficiaryOpenId = `telegram:${input.beneficiaryTelegramId}`;
  if (!isRewardCampaignActive(group) || amount < 1 || group.rewardBudget < amount || beneficiaryOpenId === group.ownerOpenId) {
    return { awarded: false as const, reason: "campaign_inactive" as const };
  }
  try {
    await db.transaction(async tx => {
      await tx.insert(rewardEvents).values({
        groupId: group.id,
        beneficiaryOpenId,
        memberTelegramId: String(input.memberTelegramId),
        inviterOpenId: input.inviterTelegramId ? `telegram:${input.inviterTelegramId}` : null,
        eventType: input.eventType,
        amount,
      });
      const updated = await tx.update(groupsCatalog).set({
        rewardBudget: sql`${groupsCatalog.rewardBudget} - ${amount}`,
      }).where(and(
        eq(groupsCatalog.id, group.id),
        eq(groupsCatalog.rewardActive, true),
        gte(groupsCatalog.rewardBudget, amount)
      ));
      const affectedRows = Number((updated as unknown as Array<{ affectedRows?: number }>)[0]?.affectedRows ?? 0);
      if (affectedRows !== 1) throw new Error("reward_budget_unavailable");
      await tx.insert(users).values({
        openId: beneficiaryOpenId,
        name: input.beneficiaryName ?? "Telegram user",
        telegramUsername: input.beneficiaryUsername ?? null,
        loginMethod: "telegram-bot",
        lastSignedIn: new Date(),
      }).onDuplicateKeyUpdate({
        set: {
          ...(input.beneficiaryName ? { name: input.beneficiaryName } : {}),
          ...(input.beneficiaryUsername ? { telegramUsername: input.beneficiaryUsername } : {}),
          lastSignedIn: new Date(),
        },
      });
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} + ${amount}` }).where(eq(users.openId, beneficiaryOpenId));
      await tx.insert(creditTransactions).values({
        userOpenId: beneficiaryOpenId,
        groupId: group.id,
        telegramChatId: group.chatId,
        amount,
        kind: input.eventType === "subscription"
          ? "reward_subscription"
          : input.eventType === "invite_referral"
            ? "reward_invite_referral"
            : "reward_manual_add",
      });
      const [afterSpend] = await tx.select().from(groupsCatalog).where(eq(groupsCatalog.id, group.id)).limit(1);
      if (afterSpend && !isRewardCampaignActive(afterSpend)) {
        await tx.update(groupsCatalog).set({ rewardActive: false }).where(eq(groupsCatalog.id, group.id));
      }
    });
    return {
      awarded: true as const,
      amount,
      groupId: group.id,
      beneficiaryTelegramId: input.beneficiaryTelegramId,
      groupTitle: group.title,
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") return { awarded: false as const, reason: "duplicate" as const };
    if (error instanceof Error && error.message === "reward_budget_unavailable") return { awarded: false as const, reason: "budget_exhausted" as const };
    throw error;
  }
}

export async function getOrCreateRewardInviteLink(groupId: number, beneficiaryOpenId: string, createInviteLink: () => Promise<string>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(groupsCatalog).where(eq(groupsCatalog.id, groupId)).limit(1);
  if (!group || group.status !== "listed" || group.category !== "Каналы" || !isRewardCampaignActive(group) || getRewardAmount(group, "invite_referral") < 1) {
    throw new Error("Пригласительная кампания для канала недоступна");
  }
  const [existing] = await db.select().from(rewardInviteLinks).where(and(
    eq(rewardInviteLinks.groupId, groupId),
    eq(rewardInviteLinks.beneficiaryOpenId, beneficiaryOpenId)
  )).limit(1);
  if (existing) return { inviteLink: existing.inviteLink, existing: true };
  const inviteLink = await createInviteLink();
  try {
    await db.insert(rewardInviteLinks).values({ groupId, beneficiaryOpenId, inviteLink });
    return { inviteLink, existing: false };
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const [concurrent] = await db.select().from(rewardInviteLinks).where(and(
      eq(rewardInviteLinks.groupId, groupId),
      eq(rewardInviteLinks.beneficiaryOpenId, beneficiaryOpenId)
    )).limit(1);
    if (!concurrent) throw error;
    return { inviteLink: concurrent.inviteLink, existing: true };
  }
}

export async function getRewardInviteBeneficiary(chatId: string, inviteLink: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [group] = await db.select().from(groupsCatalog).where(eq(groupsCatalog.chatId, chatId)).limit(1);
  if (!group) return undefined;
  const [link] = await db.select().from(rewardInviteLinks).where(and(
    eq(rewardInviteLinks.groupId, group.id),
    eq(rewardInviteLinks.inviteLink, inviteLink)
  )).limit(1);
  return link ? { beneficiaryOpenId: link.beneficiaryOpenId, groupId: group.id } : undefined;
}

export async function grantGroupConnectionBonus(ownerOpenId: string, groupId: number) {
  const db = await getDb();
  if (!db) return false;
  const group = await getGroupById(groupId);
  if (!group) return false;
  const telegramChatId = getGroupConnectionBonusIdentity(group.chatId);
  const existing = await db.select().from(creditTransactions).where(and(
    eq(creditTransactions.telegramChatId, telegramChatId),
    eq(creditTransactions.kind, "group_connection_bonus")
  )).limit(1);
  if (existing.length > 0) return false;
  try {
    await db.transaction(async tx => {
      await tx.insert(creditTransactions).values({
        userOpenId: ownerOpenId,
        groupId,
        telegramChatId,
        amount: GROUP_CONNECTION_BONUS,
        kind: "group_connection_bonus",
      });
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} + ${GROUP_CONNECTION_BONUS}` }).where(eq(users.openId, ownerOpenId));
    });
    return true;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") return false;
    throw error;
  }
}

export type GroupListingOptions = {
  salePriceTon?: string;
  country?: string;
  city?: string;
  subcategory?: string;
  anonymousListing?: boolean;
  showOwnerContact?: boolean;
  monthlyEntryEnabled?: boolean;
  monthlyEntryStars?: number;
  monthlyEntryLinkName?: string;
  rewardActive?: boolean;
  rewardBudget?: number;
  rewardPerSubscription?: number;
  rewardPerInvite?: number;
  rewardPerManualAdd?: number;
};

export function normalizeGroupListingOptions(listing?: GroupListingOptions | string) {
  const options = typeof listing === "string" ? { salePriceTon: listing } : (listing ?? {});
  const salePriceTon = options.salePriceTon?.trim() || null;
  const listingType: "catalog" | "sale" = salePriceTon ? "sale" : "catalog";
  return {
    listingType,
    salePriceTon,
    rentalPriceTon: null,
    minRentalDays: null,
    maxRentalDays: null,
    country: options.country,
    city: options.city,
    subcategory: options.subcategory,
    anonymousListing: options.anonymousListing ?? true,
    showOwnerContact: options.showOwnerContact ?? false,
    monthlyEntryEnabled: options.monthlyEntryEnabled,
    monthlyEntryStars: options.monthlyEntryStars,
    monthlyEntryLinkName: options.monthlyEntryLinkName?.trim() || null,
    rewardActive: options.rewardActive,
    rewardBudget: options.rewardBudget,
    rewardPerSubscription: options.rewardPerSubscription,
    rewardPerInvite: options.rewardPerInvite,
    rewardPerManualAdd: options.rewardPerManualAdd,
  };
}

export async function listGroupsWithCredits(ownerOpenId: string, groupIds: number[], listing?: GroupListingOptions | string, cost = GROUP_CONNECTION_BONUS) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const uniqueGroupIds = Array.from(new Set(groupIds));
  if (!uniqueGroupIds.length) throw new Error("Выберите хотя бы одну группу");
  const listingOptions = normalizeGroupListingOptions(listing);
  const groups = await db.select().from(groupsCatalog).where(inArray(groupsCatalog.id, uniqueGroupIds));
  if (groups.length !== uniqueGroupIds.length || groups.some(group => group.ownerOpenId !== ownerOpenId)) throw new Error("Группа недоступна для размещения");
  if (listingOptions.subcategory) {
    const categories = Array.from(new Set(groups.map(group => group.category)));
    if (categories.length !== 1 || !isCatalogSubcategory(categories[0], listingOptions.subcategory)) {
      throw new Error("Подкатегория не соответствует выбранным группам");
    }
  }
  if (listingOptions.monthlyEntryEnabled) {
    if (groups.length !== 1 || groups[0].category !== "Каналы" || groups[0].username) {
      throw new Error("Ежемесячный вход в Stars доступен только для одного приватного канала");
    }
    if (!Number.isInteger(listingOptions.monthlyEntryStars) || (listingOptions.monthlyEntryStars ?? 0) < 1 || (listingOptions.monthlyEntryStars ?? 0) > 10000) {
      throw new Error("Укажите цену от 1 до 10000 Stars в месяц");
    }
  }
  const includesRewardCampaign = [
    listingOptions.rewardActive,
    listingOptions.rewardBudget,
    listingOptions.rewardPerSubscription,
    listingOptions.rewardPerInvite,
    listingOptions.rewardPerManualAdd,
  ].some(value => value !== undefined);
  if (includesRewardCampaign && groups.length !== 1) {
    throw new Error("Кампанию вознаграждений можно настроить для одной группы за раз");
  }
  const rewardGroup = groups[0];
  const rewardConfig = includesRewardCampaign && rewardGroup
    ? {
        category: rewardGroup.category,
        rewardActive: listingOptions.rewardActive ?? rewardGroup.rewardActive,
        rewardBudget: listingOptions.rewardActive === false ? 0 : (listingOptions.rewardBudget ?? rewardGroup.rewardBudget),
        rewardPerSubscription: listingOptions.rewardPerSubscription ?? rewardGroup.rewardPerSubscription,
        rewardPerInvite: listingOptions.rewardPerInvite ?? rewardGroup.rewardPerInvite,
        rewardPerManualAdd: listingOptions.rewardPerManualAdd ?? rewardGroup.rewardPerManualAdd,
      }
    : undefined;
  const rewardValidationError = rewardConfig ? validateRewardCampaignConfig(rewardConfig) : undefined;
  if (rewardValidationError) throw new Error(rewardValidationError);
  const groupsNeedingListing = groups.filter(group => group.status !== "listed");
  const targetGroupsForAnnouncement = groups;
  const totalCost = groupsNeedingListing.length * cost;
  const user = await getUserByOpenId(ownerOpenId);
  const reservedRewardBudget = rewardConfig && rewardGroup ? Math.max(0, rewardConfig.rewardBudget - rewardGroup.rewardBudget) : 0;
  const releasedRewardBudget = rewardConfig && rewardGroup ? Math.max(0, rewardGroup.rewardBudget - rewardConfig.rewardBudget) : 0;
  if (!user || user.bonusBalance + releasedRewardBudget < totalCost + reservedRewardBudget) throw new Error("Недостаточно бонусных GRAM");
  await db.transaction(async tx => {
    if (totalCost || reservedRewardBudget || releasedRewardBudget) {
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} - ${totalCost + reservedRewardBudget} + ${releasedRewardBudget}` }).where(eq(users.openId, ownerOpenId));
    }
    if (totalCost) {
      await tx.insert(creditTransactions).values(groupsNeedingListing.map(group => ({ userOpenId: ownerOpenId, groupId: group.id, amount: -cost, kind: "listing_spend" as const })));
    } else {
      await tx.insert(creditTransactions).values(groups.map(group => ({ userOpenId: ownerOpenId, groupId: group.id, amount: 0, kind: "listing_spend" as const })).filter((v, i, a) => a.findIndex(t => t.groupId === v.groupId) === i));
    }
    if (rewardGroup && reservedRewardBudget) {
      await tx.insert(creditTransactions).values({ userOpenId: ownerOpenId, groupId: rewardGroup.id, amount: -reservedRewardBudget, kind: "reward_campaign_reserve" });
    }
    if (rewardGroup && releasedRewardBudget) {
      await tx.insert(creditTransactions).values({ userOpenId: ownerOpenId, groupId: rewardGroup.id, amount: releasedRewardBudget, kind: "reward_campaign_release" });
    }
    await Promise.all(uniqueGroupIds.map(groupId => tx.update(groupsCatalog).set({
      status: "listed",
      listedAt: new Date(),
      listingType: listingOptions.listingType,
      salePriceTon: listingOptions.salePriceTon,
      ...(listingOptions.country ? { country: listingOptions.country } : {}),
      ...(listingOptions.city !== undefined ? { city: listingOptions.city || null } : {}),
      ...(listingOptions.subcategory ? { subcategory: listingOptions.subcategory } : {}),
      ...(listingOptions.anonymousListing !== undefined ? { anonymousListing: listingOptions.anonymousListing } : {}),
      ...(listingOptions.showOwnerContact !== undefined ? { showOwnerContact: listingOptions.showOwnerContact } : {}),
      ...(listingOptions.monthlyEntryEnabled !== undefined ? {
        monthlyEntryEnabled: listingOptions.monthlyEntryEnabled,
        monthlyEntryStars: listingOptions.monthlyEntryEnabled ? listingOptions.monthlyEntryStars ?? null : null,
        monthlyEntryLinkName: listingOptions.monthlyEntryEnabled ? listingOptions.monthlyEntryLinkName : null,
        monthlyEntryInviteLink: null,
        monthlyEntryUpdatedAt: null,
      } : {}),
      ...(rewardConfig && rewardGroup?.id === groupId ? {
        rewardActive: isRewardCampaignActive(rewardConfig),
        rewardBudget: rewardConfig.rewardBudget,
        rewardPerSubscription: rewardConfig.rewardPerSubscription,
        rewardPerInvite: rewardConfig.rewardPerInvite,
        rewardPerManualAdd: rewardConfig.rewardPerManualAdd,
      } : {}),
    }).where(eq(groupsCatalog.id, groupId))));

    const board = await tx.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, "Все"),
      eq(auctionSlots.country, "Global")
    )).orderBy(asc(auctionSlots.slotNumber));
    const assignments = planVacantRankingAssignments(board, groupsNeedingListing.map(group => group.id));
    for (const assignment of assignments) {
      const group = groups.find(item => item.id === assignment.groupId);
      if (!group) continue;
      await tx.update(auctionSlots).set({
        groupId: group.id,
        title: group.title,
        subtitle: group.username ? `@${group.username}` : group.category,
        leaderUsername: group.username ?? group.title,
        leaderUserId: group.ownerOpenId,
        bidAmount: 0,
        currentBid: "0 TON",
        updatedAt: new Date(),
      }).where(and(eq(auctionSlots.id, assignment.slotId), sql`${auctionSlots.groupId} IS NULL`));
    }
  });
  return targetGroupsForAnnouncement.map(group => ({
    id: group.id,
    chatId: group.chatId,
    title: group.title,
    listingType: listingOptions.listingType,
    salePriceTon: listingOptions.salePriceTon ?? null,
    monthlyEntryEnabled: listingOptions.monthlyEntryEnabled ?? false,
    monthlyEntryStars: listingOptions.monthlyEntryEnabled ? listingOptions.monthlyEntryStars ?? null : null,
  }));
}

export async function saveMonthlyEntryInviteLink(ownerOpenId: string, groupId: number, inviteLink: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(groupsCatalog).where(and(eq(groupsCatalog.id, groupId), eq(groupsCatalog.ownerOpenId, ownerOpenId))).limit(1);
  if (!group) throw new Error("Канал недоступен для настройки");
  if (!group.monthlyEntryEnabled || group.category !== "Каналы" || group.username || !group.monthlyEntryStars) {
    throw new Error("Ежемесячный вход доступен только для приватного канала с указанной ценой");
  }
  await db.update(groupsCatalog).set({ monthlyEntryInviteLink: inviteLink, monthlyEntryUpdatedAt: new Date() }).where(eq(groupsCatalog.id, groupId));
}

export async function savePrivateEntryInviteLink(ownerOpenId: string, groupId: number, inviteLink: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(groupsCatalog).where(and(eq(groupsCatalog.id, groupId), eq(groupsCatalog.ownerOpenId, ownerOpenId))).limit(1);
  if (!group) throw new Error("Сообщество недоступно для настройки");
  if (group.username) throw new Error("Закрытая ссылка нужна только приватному сообществу без @username");
  await db.update(groupsCatalog).set({ inviteLink }).where(eq(groupsCatalog.id, groupId));
}

export async function listGroupWithCredits(ownerOpenId: string, groupId: number, listing?: GroupListingOptions | string, cost = GROUP_CONNECTION_BONUS) {
  return listGroupsWithCredits(ownerOpenId, [groupId], listing, cost);
}

export async function deleteGroups(ownerOpenId: string, groupIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const uniqueGroupIds = Array.from(new Set(groupIds));
  if (!uniqueGroupIds.length) throw new Error("Выберите хотя бы одну группу");
  const groups = await db.select().from(groupsCatalog).where(inArray(groupsCatalog.id, uniqueGroupIds));
  if (groups.length !== uniqueGroupIds.length || groups.some(group => group.ownerOpenId !== ownerOpenId)) {
    throw new Error("Группа недоступна для удаления");
  }
  await db.transaction(async tx => {
    await tx.update(auctionSlots).set({
      groupId: null,
      leaderUserId: null,
      leaderUsername: "-",
      currentBid: "0 TON",
      bidAmount: 0,
      title: "Свободное место",
      subtitle: "Ждет листинга",
      updatedAt: new Date(),
    }).where(inArray(auctionSlots.groupId, uniqueGroupIds));
    await tx.delete(groupsCatalog).where(inArray(groupsCatalog.id, uniqueGroupIds));
  });
}

export async function toggleServiceMessages(ownerOpenId: string, groupId: number, deleteServiceMessages: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(groupsCatalog).where(eq(groupsCatalog.id, groupId));
  if (!group || group.ownerOpenId !== ownerOpenId) throw new Error("Группа не найдена");
  if (group.category !== "Чаты") throw new Error("Автоочистка доступна только для чатов");
  await db.update(groupsCatalog).set({ deleteServiceMessages }).where(eq(groupsCatalog.id, groupId));
}

export async function unlistGroups(ownerOpenId: string, groupIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const uniqueGroupIds = Array.from(new Set(groupIds));
  if (!uniqueGroupIds.length) throw new Error("Выберите хотя бы одну группу");
  const groups = await db.select().from(groupsCatalog).where(inArray(groupsCatalog.id, uniqueGroupIds));
  if (groups.length !== uniqueGroupIds.length || groups.some(group => group.ownerOpenId !== ownerOpenId)) {
    throw new Error("Группа недоступна для управления");
  }
  await db.transaction(async tx => {
    await tx.update(auctionSlots).set({
      groupId: null,
      leaderUserId: null,
      leaderUsername: "-",
      currentBid: "0 TON",
      bidAmount: 0,
      title: "Свободное место",
      subtitle: "Ждет листинга",
    }).where(inArray(auctionSlots.groupId, uniqueGroupIds));
    await tx.update(groupsCatalog).set({
      status: "pending",
      listedAt: null,
      listingType: "catalog",
      salePriceTon: null,
    }).where(inArray(groupsCatalog.id, uniqueGroupIds));

    const board = await tx.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, "Все"),
      eq(auctionSlots.country, "Global")
    )).orderBy(asc(auctionSlots.slotNumber));
    const listedCandidates = await tx.select().from(groupsCatalog).where(eq(groupsCatalog.status, "listed"))
      .orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
    const assignments = planVacantRankingAssignments(board, listedCandidates.map(group => group.id));
    const candidatesById = new Map(listedCandidates.map(group => [group.id, group]));
    for (const assignment of assignments) {
      const group = candidatesById.get(assignment.groupId);
      if (!group) continue;
      await tx.update(auctionSlots).set({
        groupId: group.id,
        title: group.title,
        subtitle: group.username ? `@${group.username}` : group.category,
        leaderUsername: group.username ?? group.title,
        leaderUserId: group.ownerOpenId,
        bidAmount: 0,
        currentBid: "0 TON",
        updatedAt: new Date(),
      }).where(and(eq(auctionSlots.id, assignment.slotId), sql`${auctionSlots.groupId} IS NULL`));
    }
  });
}

export async function getNftUsernames(ownerOpenId?: string) {
  const db = await getDb();
  if (!db) return [];
  if (ownerOpenId) {
    return await db.select().from(nftUsernames).where(eq(nftUsernames.ownerOpenId, ownerOpenId)).orderBy(desc(nftUsernames.createdAt));
  }
  return await db.select().from(nftUsernames).orderBy(desc(nftUsernames.createdAt));
}

export async function createNftListing(data: InsertNftUsername) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(nftUsernames).values(data);
}

export async function setNftShowcaseGroup(nftId: number, ownerOpenId: string, groupId: number | null) {
  return setNftShowcaseTarget(nftId, ownerOpenId, groupId === null ? { target: "hidden" } : { target: "group", groupId });
}

export async function setNftShowcaseTarget(nftId: number, ownerOpenId: string, input: { target: "profile" | "group" | "hidden"; groupId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [nft] = await db.select().from(nftUsernames).where(and(
    eq(nftUsernames.id, nftId),
    eq(nftUsernames.ownerOpenId, ownerOpenId)
  )).limit(1);
  if (!nft) throw new Error("NFT недоступен для управления");
  if (input.target === "group") {
    if (!input.groupId) throw new Error("Выберите подключенную площадку для витрины");
    const group = await getGroupById(input.groupId);
    if (!group || group.ownerOpenId !== ownerOpenId) {
      throw new Error("Выберите свою подключенную площадку");
    }
  }
  const showcase = input.target === "profile"
    ? { showcaseProfile: true, showcaseGroupId: null }
    : input.target === "group"
      ? { showcaseProfile: false, showcaseGroupId: input.groupId! }
      : { showcaseProfile: false, showcaseGroupId: null };
  await db.update(nftUsernames).set(showcase).where(and(
    eq(nftUsernames.id, nftId),
    eq(nftUsernames.ownerOpenId, ownerOpenId)
  ));
}

export async function rentNft(nftId: number, renterOpenId: string, rentalDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + rentalDays * 24 * 60 * 60 * 1000);
  
  await db.update(nftUsernames).set({
    status: "rented",
    currentRenterOpenId: renterOpenId,
    rentalExpiresAt: expiresAt
  }).where(eq(nftUsernames.id, nftId));
}

export async function resolveNftTransferRecipient(recipientInput: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = normalizeTelegramRecipient(recipientInput);
  const [recipient] = await db.select({
    openId: users.openId,
    name: users.name,
    telegramUsername: users.telegramUsername,
    avatarUrl: users.avatarUrl,
  }).from(users).where(
    normalized.kind === "openId"
      ? eq(users.openId, normalized.value)
      : eq(users.telegramUsername, normalized.value)
  ).limit(1);

  if (!recipient) throw new Error("Получатель не найден в TG TOP. Попросите его открыть приложение через @TGTOP_robot.");
  return recipient;
}

export async function prepareNftTransfer(nftId: number, senderOpenId: string, recipientInput: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [nft] = await db.select().from(nftUsernames).where(and(
    eq(nftUsernames.id, nftId),
    eq(nftUsernames.ownerOpenId, senderOpenId),
    eq(nftUsernames.status, "available")
  )).limit(1);
  if (!nft) throw new Error("NFT недоступен для передачи");

  const recipient = await resolveNftTransferRecipient(recipientInput);
  if (recipient.openId === senderOpenId) throw new Error("Нельзя передать NFT самому себе");

  const requirements = getNftTransferRequirements(nft.assetClass);
  if (nft.assetClass === "onchain" && !nft.nftItemAddress) {
    throw new Error("Для On-chain NFT нужен подтвержденный адрес NFT-элемента");
  }

  const reference = `${getNftTransferReference()}_${randomBytes(5).toString("hex")}`;
  await db.insert(nftTransfers).values({
    nftId: nft.id,
    assetClass: nft.assetClass,
    status: nft.assetClass === "onchain" ? "awaiting_signature" : "draft",
    senderOpenId,
    recipientOpenId: recipient.openId,
    recipientInput: recipientInput.trim(),
    sourceWalletAddress: nft.ownerWalletAddress,
    transferReference: reference,
    expiresAt: nft.assetClass === "onchain" ? new Date(Date.now() + 10 * 60 * 1000) : null,
  });

  const [transfer] = await db.select().from(nftTransfers).where(eq(nftTransfers.transferReference, reference)).limit(1);
  if (!transfer) throw new Error("Не удалось создать передачу NFT");
  return { transfer, nft, recipient, requirements };
}

export async function completeOffchainNftTransfer(transferId: number, senderOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();

  await db.transaction(async tx => {
    const [transfer] = await tx.select().from(nftTransfers).where(and(
      eq(nftTransfers.id, transferId),
      eq(nftTransfers.senderOpenId, senderOpenId)
    )).limit(1);
    if (!transfer) throw new Error("Передача NFT не найдена");
    if (transfer.assetClass !== "offchain" || transfer.status !== "draft") {
      throw new Error("Эту передачу нельзя подтвердить как Off-chain NFT");
    }

    const [nft] = await tx.select().from(nftUsernames).where(and(
      eq(nftUsernames.id, transfer.nftId),
      eq(nftUsernames.ownerOpenId, senderOpenId),
      eq(nftUsernames.assetClass, "offchain"),
      eq(nftUsernames.status, "available")
    )).limit(1);
    if (!nft) throw new Error("NFT больше недоступен для передачи");

    const [recipient] = await tx.select({
      name: users.name,
      telegramUsername: users.telegramUsername,
    }).from(users).where(eq(users.openId, transfer.recipientOpenId)).limit(1);
    if (!recipient) throw new Error("Получатель больше недоступен в TG TOP");

    await tx.update(nftUsernames).set({
      ownerOpenId: transfer.recipientOpenId,
      ownerUsername: recipient.telegramUsername ?? recipient.name ?? transfer.recipientOpenId.slice(0, 12),
      showcaseGroupId: null,
      currentRenterOpenId: null,
      rentalExpiresAt: null,
    }).where(eq(nftUsernames.id, nft.id));
    await tx.update(nftTransfers).set({ status: "completed", confirmedAt: now }).where(eq(nftTransfers.id, transfer.id));
  });

  return { success: true, platformFeePercent: 0 };
}

export async function getNftTransferHistory(openId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: nftTransfers.id,
    nftId: nftTransfers.nftId,
    assetClass: nftTransfers.assetClass,
    status: nftTransfers.status,
    senderOpenId: nftTransfers.senderOpenId,
    recipientOpenId: nftTransfers.recipientOpenId,
    recipientInput: nftTransfers.recipientInput,
    transferReference: nftTransfers.transferReference,
    expiresAt: nftTransfers.expiresAt,
    createdAt: nftTransfers.createdAt,
    confirmedAt: nftTransfers.confirmedAt,
    username: nftUsernames.username,
  }).from(nftTransfers)
    .leftJoin(nftUsernames, eq(nftTransfers.nftId, nftUsernames.id))
    .where(or(eq(nftTransfers.senderOpenId, openId), eq(nftTransfers.recipientOpenId, openId)))
    .orderBy(desc(nftTransfers.createdAt));
}

export async function getUserDeals(openId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: deals.id,
    groupId: deals.groupId,
    buyerOpenId: deals.buyerOpenId,
    sellerOpenId: deals.sellerOpenId,
    price: deals.price,
    dealType: deals.dealType,
    status: deals.status,
    fundedAt: deals.fundedAt,
    transferObservedAt: deals.transferObservedAt,
    buyerConfirmedAt: deals.buyerConfirmedAt,
    expiresAt: deals.expiresAt,
    cancelledAt: deals.cancelledAt,
    createdAt: deals.createdAt,
    groupTitle: groupsCatalog.title,
    groupUsername: groupsCatalog.username,
  }).from(deals)
    .leftJoin(groupsCatalog, eq(deals.groupId, groupsCatalog.id))
    .where(or(eq(deals.buyerOpenId, openId), eq(deals.sellerOpenId, openId)))
    .orderBy(desc(deals.createdAt));
}

export async function createProtectedGroupDeal(groupId: number, buyerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const group = await getGroupById(groupId);
  if (!group || group.status !== "listed" || group.listingType !== "sale" || !group.salePriceTon) {
    throw new Error("Группа недоступна для безопасной покупки");
  }
  if (group.ownerOpenId === buyerOpenId) throw new Error("Нельзя купить собственную группу");
  const [existing] = await db.select().from(deals).where(and(
    eq(deals.groupId, groupId),
    eq(deals.buyerOpenId, buyerOpenId),
    eq(deals.status, "open")
  )).limit(1);
  if (existing) return existing;
  await db.insert(deals).values({
    groupId,
    buyerOpenId,
    sellerOpenId: group.ownerOpenId,
    price: group.salePriceTon,
    dealType: "group_buy",
    status: "open",
  });
  const [created] = await db.select().from(deals).where(and(
    eq(deals.groupId, groupId),
    eq(deals.buyerOpenId, buyerOpenId),
    eq(deals.status, "open")
  )).orderBy(desc(deals.id)).limit(1);
  return created;
}

/** Internal-only: call only after independent on-chain escrow funding verification. */
export async function markProtectedDealFunded(dealId: number, fundingReference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const fundedAt = new Date();
  const expiresAt = getTransferDeadline(fundedAt);
  await db.update(deals).set({
    status: "escrow_funded",
    fundedAt,
    expiresAt,
    fundingReference,
  }).where(and(eq(deals.id, dealId), eq(deals.status, "open")));
}

export async function observeProtectedGroupTransfer(chatId: string, newOwnerOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  const group = await getGroupByChatId(chatId);
  if (!group) return [];
  const now = new Date();
  const eligible = await db.select().from(deals).where(and(
    eq(deals.groupId, group.id),
    eq(deals.buyerOpenId, newOwnerOpenId),
    eq(deals.status, "escrow_funded")
  ));
  for (const deal of eligible) {
    if (!deal.expiresAt || deal.expiresAt.getTime() < now.getTime()) continue;
    await db.update(deals).set({
      status: "active",
      transferObservedAt: now,
      transferEvidence: `telegram_owner:${newOwnerOpenId}`,
    }).where(and(eq(deals.id, deal.id), eq(deals.status, "escrow_funded")));
  }
  return eligible;
}

export async function cancelProtectedGroupDeal(dealId: number, buyerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId))).limit(1);
  if (!deal || deal.dealType !== "group_buy" || !canBuyerCancel(deal.status)) {
    throw new Error("Эту сделку уже нельзя отменить");
  }
  await db.update(deals).set({ status: "cancelled", cancelledAt: new Date() }).where(and(
    eq(deals.id, dealId),
    eq(deals.buyerOpenId, buyerOpenId),
    eq(deals.status, deal.status)
  ));
  return { requiresEscrowRefund: deal.status === "escrow_funded", transferWindowMs: GROUP_TRANSFER_WINDOW_MS };
}

/** Records buyer acknowledgement after bot-observed owner transfer. Settlement remains locked until on-chain verification exists. */
export async function confirmProtectedGroupTransfer(dealId: number, buyerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId))).limit(1);
  if (!deal || deal.dealType !== "group_buy" || !canBuyerConfirmTransfer(deal.status) || !deal.transferObservedAt) {
    throw new Error("Подтверждение передачи пока недоступно");
  }
  if (deal.buyerConfirmedAt) return { settlementLocked: true, alreadyConfirmed: true };
  await db.update(deals).set({ buyerConfirmedAt: new Date() }).where(and(
    eq(deals.id, dealId),
    eq(deals.buyerOpenId, buyerOpenId),
    eq(deals.status, "active")
  ));
  return { settlementLocked: true, alreadyConfirmed: false };
}
