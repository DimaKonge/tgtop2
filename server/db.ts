import { eq, and, or, asc, desc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import { InsertUser, users, groupsCatalog, groupStatsSnapshots, creditTransactions, auctionSlots, nftUsernames, nftTransfers, deals, InsertGroupCatalog, InsertNftUsername } from "../drizzle/schema";
import { ENV } from './_core/env';
import { GROUP_CONNECTION_BONUS, getGroupConnectionBonusIdentity } from "./groupBonusPolicy";
import { cascadeRankedOccupants } from "./auctionCascade";
import { GROUP_TRANSFER_WINDOW_MS, canBuyerCancel, getTransferDeadline } from "./protectedDeals";
import { getNftTransferRequirements, getNftTransferReference, normalizeTelegramRecipient } from "./nftTransferPolicy";

export { GROUP_CONNECTION_BONUS } from "./groupBonusPolicy";

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
export async function getAuctionSlots(category?: string, country?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(auctionSlots);
  const conditions = [];
  if (category && category !== "Все") {
    conditions.push(eq(auctionSlots.category, category as any));
  }
  if (country && country !== "Global") {
    conditions.push(eq(auctionSlots.country, country));
  }
  
  const slots = conditions.length > 0
    ? await db.select().from(auctionSlots).where(and(...conditions))
    : await db.select().from(auctionSlots);
  const groupIds = slots.map(slot => slot.groupId).filter((id): id is number => id !== null);
  if (groupIds.length === 0) return slots.map(slot => ({ ...slot, group: null }));
  const groups = await db.select().from(groupsCatalog).where(inArray(groupsCatalog.id, groupIds));
  const groupMap = new Map(groups.map(group => [group.id, group]));
  return slots.map(slot => ({ ...slot, group: slot.groupId ? groupMap.get(slot.groupId) ?? null : null }));
}

export async function placeBid(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const group = groupId ? await getGroupById(groupId) : undefined;
  if (!groupId || !group) throw new Error("Группа недоступна для размещения");
  const target = (await db.select().from(auctionSlots).where(eq(auctionSlots.id, slotId)).limit(1))[0];
  if (!target) throw new Error("Позиция рейтинга не найдена");
  const board = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, target.category),
    eq(auctionSlots.country, target.country)
  )).orderBy(asc(auctionSlots.slotNumber));

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
  });
}

export async function getGroupsCatalog(category?: string, country?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(groupsCatalog.status, "listed")];
  if (category && category !== "Все") conditions.push(eq(groupsCatalog.category, category as "Каналы" | "Чаты"));
  if (country && country !== "Все" && country !== "Global") conditions.push(eq(groupsCatalog.country, country));
  return await db.select().from(groupsCatalog).where(and(...conditions)).orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
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
  return { group, snapshots: snapshots.reverse(), ownerNfts };
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
  listingType?: "catalog" | "sale" | "rent" | "both";
  salePriceTon?: string;
  rentalPriceTon?: string;
  minRentalDays?: number;
  maxRentalDays?: number;
  country?: string;
};

export function normalizeGroupListingOptions(listing?: GroupListingOptions | string) {
  const options = typeof listing === "string" ? { salePriceTon: listing } : (listing ?? {});
  const listingType = options.listingType ?? (options.salePriceTon ? "sale" : "catalog");
  return {
    listingType,
    salePriceTon: listingType === "sale" || listingType === "both" ? (options.salePriceTon ?? null) : null,
    rentalPriceTon: listingType === "rent" || listingType === "both" ? (options.rentalPriceTon ?? null) : null,
    minRentalDays: listingType === "rent" || listingType === "both" ? (options.minRentalDays ?? null) : null,
    maxRentalDays: listingType === "rent" || listingType === "both" ? (options.maxRentalDays ?? null) : null,
    country: options.country,
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
  const groupsNeedingListing = groups.filter(group => group.status !== "listed");
  const totalCost = groupsNeedingListing.length * cost;
  const user = await getUserByOpenId(ownerOpenId);
  if (!user || user.bonusBalance < totalCost) throw new Error("Недостаточно бонусных GRAM");
  await db.transaction(async tx => {
    if (totalCost) {
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} - ${totalCost}` }).where(eq(users.openId, ownerOpenId));
      await tx.insert(creditTransactions).values(groupsNeedingListing.map(group => ({ userOpenId: ownerOpenId, groupId: group.id, amount: -cost, kind: "listing_spend" as const })));
    }
    await Promise.all(uniqueGroupIds.map(groupId => tx.update(groupsCatalog).set({
      status: "listed",
      listedAt: new Date(),
      listingType: listingOptions.listingType,
      salePriceTon: listingOptions.salePriceTon,
      rentalPriceTon: listingOptions.rentalPriceTon,
      minRentalDays: listingOptions.minRentalDays,
      maxRentalDays: listingOptions.maxRentalDays,
      ...(listingOptions.country ? { country: listingOptions.country } : {}),
    }).where(eq(groupsCatalog.id, groupId))));
  });
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
      rentalPriceTon: null,
      minRentalDays: null,
      maxRentalDays: null,
    }).where(inArray(groupsCatalog.id, uniqueGroupIds));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [nft] = await db.select().from(nftUsernames).where(and(
    eq(nftUsernames.id, nftId),
    eq(nftUsernames.ownerOpenId, ownerOpenId)
  )).limit(1);
  if (!nft) throw new Error("NFT недоступен для управления");
  if (groupId !== null) {
    const group = await getGroupById(groupId);
    if (!group || group.ownerOpenId !== ownerOpenId) {
      throw new Error("Выберите свою подключенную площадку");
    }
  }
  await db.update(nftUsernames).set({ showcaseGroupId: groupId }).where(and(
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
  if (!group || group.status !== "listed" || (group.listingType !== "sale" && group.listingType !== "both") || !group.salePriceTon) {
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
