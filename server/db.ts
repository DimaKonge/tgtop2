import { eq, and, or, asc, desc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import { InsertUser, users, groupsCatalog, groupStatsSnapshots, creditTransactions, auctionSlots, rankingBidIntents, starsRankingPaymentIntents, nftUsernames, nftTransfers, deals, InsertGroupCatalog, InsertNftUsername } from "../drizzle/schema";
import { ENV } from './_core/env';
import { GROUP_CONNECTION_BONUS, getGroupConnectionBonusIdentity } from "./groupBonusPolicy";
import { cascadeRankedOccupants } from "./auctionCascade";
import { GROUP_TRANSFER_WINDOW_MS, canBuyerCancel, canBuyerConfirmTransfer, getTransferDeadline } from "./protectedDeals";
import { getNftTransferRequirements, getNftTransferReference, normalizeTelegramRecipient } from "./nftTransferPolicy";
import { isCatalogSubcategory } from "./catalogTaxonomy";
import { getMinimumRankingBidMilliTon, isQualifyingRankingBid } from "./rankingBidPolicy";
import { planVacantRankingAssignments } from "./autoPlacementPolicy";
import { formatTonAmount } from "./tonFormatting";

export { GROUP_CONNECTION_BONUS } from "./groupBonusPolicy";

export const STARS_PER_MINIMUM_RANKING_BID = 10;
const STARS_RANKING_PAYMENT_TTL_MS = 20 * 60 * 1000;

export function getStarsAmountForRankingBid(bidAmount: number) {
  return Math.max(STARS_PER_MINIMUM_RANKING_BID, Math.ceil(bidAmount / 10));
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
    ...credits.map(item => ({ id: `credit:${item.id}`, type: "credit" as const, status: item.kind, createdAt: item.createdAt, title: item.kind === "group_connection_bonus" ? "connection_bonus" : "catalog_listing", subject: namedGroup(item.groupTitle, item.groupUsername), amount: item.amount / 100, currency: "GRAM", direction: item.amount >= 0 ? "in" as const : "out" as const })),
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
export async function getAuctionSlots(category?: string, country?: string, subcategory?: string) {
  const db = await getDb();
  if (!db) return [];

  const slots = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, "Все"),
    eq(auctionSlots.country, "Global")
  )).orderBy(asc(auctionSlots.slotNumber));
  const groupIds = slots.map(slot => slot.groupId).filter((id): id is number => id !== null);
  if (groupIds.length === 0) return slots.map(slot => ({ ...slot, group: null }));
  const groupConditions = [inArray(groupsCatalog.id, groupIds)];
  if (category && category !== "Все") groupConditions.push(eq(groupsCatalog.category, category as "Каналы" | "Чаты"));
  if (country && country !== "Все" && country !== "Global") groupConditions.push(eq(groupsCatalog.country, country));
  if (subcategory && subcategory !== "Все") groupConditions.push(eq(groupsCatalog.subcategory, subcategory));
  const groups = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...groupConditions));
  const groupMap = new Map(groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl }) => [
    group.id,
    {
      ...group,
      owner: {
        openId: group.ownerOpenId,
        name: ownerName,
        telegramUsername: ownerTelegramUsername,
        avatarUrl: ownerAvatarUrl,
      },
    },
  ]));
  return slots.map(slot => ({ ...slot, group: slot.groupId ? groupMap.get(slot.groupId) ?? null : null }));
}

export async function placeBid(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const group = groupId ? await getGroupById(groupId) : undefined;
  if (!groupId || !group) throw new Error("Группа недоступна для размещения");
  const target = (await db.select().from(auctionSlots).where(eq(auctionSlots.id, slotId)).limit(1))[0];
  if (!target) throw new Error("Позиция рейтинга не найдена");
  if (!isQualifyingRankingBid(bidAmount, target.bidAmount, target.groupId !== null)) {
    const requiredMilliTon = getMinimumRankingBidMilliTon(target.bidAmount, target.groupId !== null);
    throw new Error(`Минимальная ставка для этой позиции — ${formatTonAmount(requiredMilliTon / 1000)} TON`);
  }
  const board = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, target.category),
    eq(auctionSlots.country, target.country)
  )).orderBy(asc(auctionSlots.slotNumber));

  let rankingIntentId = 0;
  await db.transaction(async tx => {
    const originalByGroupId = new Map(board.filter(slot => slot.groupId !== null).map(slot => [slot.groupId!, slot]));
    const cascaded = cascadeRankedOccupants(
      board.map(slot => ({ slotNumber: slot.slotNumber, occupant: slot.groupId })),
      target.slotNumber,
      groupId
    );

    for (const slot of board) {
      const nextGroupId = cascaded.find(item => item.slotNumber === slot.slotNumber)?.occupant ?? null;
      if (slot.id === target.id) {
        await tx.update(auctionSlots).set({
          bidAmount,
          currentBid: currentBidStr,
          leaderUsername,
          leaderUserId,
          groupId,
          title: group.title,
          subtitle: group.username ? `@${group.username}` : group.category,
          updatedAt: new Date(),
        }).where(eq(auctionSlots.id, slot.id));
        continue;
      }
      const source = nextGroupId ? originalByGroupId.get(nextGroupId) : undefined;
      const changed = slot.groupId !== nextGroupId;
      if (!changed) continue;
      await tx.update(auctionSlots).set(source ? {
        bidAmount: source.bidAmount,
        currentBid: source.currentBid,
        leaderUsername: source.leaderUsername,
        leaderUserId: source.leaderUserId,
        groupId: source.groupId,
        title: source.title,
        subtitle: source.subtitle,
        updatedAt: new Date(),
      } : {
        bidAmount: 0,
        currentBid: "0 TON",
        leaderUsername: "-",
        leaderUserId: null,
        groupId: null,
        title: "Свободное место",
        subtitle: "Ждет листинга",
        updatedAt: new Date(),
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

export async function getGroupsCatalog(category?: string, country?: string, subcategory?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(groupsCatalog.status, "listed")];
  if (category && category !== "Все") conditions.push(eq(groupsCatalog.category, category as "Каналы" | "Чаты"));
  if (subcategory && subcategory !== "Все") conditions.push(eq(groupsCatalog.subcategory, subcategory));
  if (country && country !== "Все" && country !== "Global") conditions.push(eq(groupsCatalog.country, country));
  const groups = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...conditions))
    .orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
  return groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl }) => ({
    ...group,
    owner: {
      openId: group.ownerOpenId,
      name: ownerName,
      telegramUsername: ownerTelegramUsername,
      avatarUrl: ownerAvatarUrl,
    },
  }));
}

export async function getPublicOwnerProfile(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [owner] = await db.select({
    openId: users.openId,
    name: users.name,
    telegramUsername: users.telegramUsername,
    avatarUrl: users.avatarUrl,
  }).from(users).where(eq(users.openId, openId)).limit(1);
  if (!owner) return undefined;
  const groups = await db.select().from(groupsCatalog).where(and(
    eq(groupsCatalog.ownerOpenId, openId),
    eq(groupsCatalog.status, "listed")
  )).orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
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
    groups: groups.map(group => ({ ...group, owner })),
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
    .where(eq(groupsCatalog.status, "listed"))
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
  const groups = await db.select().from(groupsCatalog).where(eq(groupsCatalog.ownerOpenId, ownerOpenId)).orderBy(desc(groupsCatalog.createdAt));
  for (const group of groups) await grantGroupConnectionBonus(ownerOpenId, group.id);
  return groups;
}

export async function getGroupDetail(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const group = await getGroupById(id);
  if (!group) return undefined;
  const snapshots = await db.select().from(groupStatsSnapshots).where(eq(groupStatsSnapshots.groupId, id)).orderBy(desc(groupStatsSnapshots.recordedAt)).limit(30);
  const ownerNfts = await db.select().from(nftUsernames)
    .where(and(eq(nftUsernames.showcaseGroupId, group.id), eq(nftUsernames.status, "available")))
    .orderBy(desc(nftUsernames.createdAt));
  return {
    group,
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
  listingType?: "catalog" | "sale";
  salePriceTon?: string;
  country?: string;
  subcategory?: string;
};

export function normalizeGroupListingOptions(listing?: GroupListingOptions | string) {
  const options = typeof listing === "string" ? { salePriceTon: listing } : (listing ?? {});
  const listingType: "catalog" | "sale" = options.listingType === "sale" || options.salePriceTon ? "sale" : "catalog";
  return {
    listingType,
    salePriceTon: listingType === "sale" ? (options.salePriceTon ?? null) : null,
    rentalPriceTon: null,
    minRentalDays: null,
    maxRentalDays: null,
    country: options.country,
    subcategory: options.subcategory,
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
  const groupsNeedingListing = groups.filter(group => group.status !== "listed");
  const targetGroupsForAnnouncement = groups;
  const totalCost = groupsNeedingListing.length * cost;
  const user = await getUserByOpenId(ownerOpenId);
  if (!user || user.bonusBalance < totalCost) throw new Error("Недостаточно бонусных GRAM");
  await db.transaction(async tx => {
    if (totalCost) {
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} - ${totalCost}` }).where(eq(users.openId, ownerOpenId));
      await tx.insert(creditTransactions).values(groupsNeedingListing.map(group => ({ userOpenId: ownerOpenId, groupId: group.id, amount: -cost, kind: "listing_spend" as const })));
    } else {
      await tx.insert(creditTransactions).values(groups.map(group => ({ userOpenId: ownerOpenId, groupId: group.id, amount: 0, kind: "listing_spend" as const })).filter((v, i, a) => a.findIndex(t => t.groupId === v.groupId) === i));
    }
    await Promise.all(uniqueGroupIds.map(groupId => tx.update(groupsCatalog).set({
      status: "listed",
      listedAt: new Date(),
      listingType: listingOptions.listingType,
      salePriceTon: listingOptions.salePriceTon,
      ...(listingOptions.country ? { country: listingOptions.country } : {}),
      ...(listingOptions.subcategory ? { subcategory: listingOptions.subcategory } : {}),
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
  }));
}

export async function listGroupWithCredits(ownerOpenId: string, groupId: number, listing?: GroupListingOptions | string, cost = GROUP_CONNECTION_BONUS) {
  return listGroupsWithCredits(ownerOpenId, [groupId], listing, cost);
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
