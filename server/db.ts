import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, groupsCatalog, groupStatsSnapshots, creditTransactions, auctionSlots, nftUsernames, deals, InsertGroupCatalog, InsertNftUsername } from "../drizzle/schema";
import { ENV } from './_core/env';

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

    const textFields = ["name", "email", "avatarUrl", "loginMethod"] as const;
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
  await db.update(auctionSlots).set({
    bidAmount,
    currentBid: currentBidStr,
    leaderUsername,
    leaderUserId,
    groupId: groupId ?? null,
    title: group?.title ?? "Свободное место",
    subtitle: group?.username ? `@${group.username}` : (group?.category ?? "Ждет листинга"),
    updatedAt: new Date()
  }).where(eq(auctionSlots.id, slotId));
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
  return { group, snapshots: snapshots.reverse() };
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

export const GROUP_CONNECTION_BONUS = 100;

export async function grantGroupConnectionBonus(ownerOpenId: string, groupId: number) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select().from(creditTransactions).where(and(
    eq(creditTransactions.userOpenId, ownerOpenId),
    eq(creditTransactions.groupId, groupId),
    eq(creditTransactions.kind, "group_connection_bonus")
  )).limit(1);
  if (existing.length > 0) return false;
  await db.transaction(async tx => {
    await tx.insert(creditTransactions).values({ userOpenId: ownerOpenId, groupId, amount: GROUP_CONNECTION_BONUS, kind: "group_connection_bonus" });
    await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} + ${GROUP_CONNECTION_BONUS}` }).where(eq(users.openId, ownerOpenId));
  });
  return true;
}

export async function listGroupWithCredits(ownerOpenId: string, groupId: number, cost = GROUP_CONNECTION_BONUS) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const group = await getGroupById(groupId);
  if (!group || group.ownerOpenId !== ownerOpenId) throw new Error("Группа недоступна для размещения");
  const user = await getUserByOpenId(ownerOpenId);
  if (!user || user.bonusBalance < cost) throw new Error("Недостаточно бонусных GRAM");
  await db.transaction(async tx => {
    await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} - ${cost}` }).where(eq(users.openId, ownerOpenId));
    await tx.insert(creditTransactions).values({ userOpenId: ownerOpenId, groupId, amount: -cost, kind: "listing_spend" });
    await tx.update(groupsCatalog).set({ status: "listed", listedAt: new Date() }).where(eq(groupsCatalog.id, groupId));
  });
}

export async function getNftUsernames() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(nftUsernames).orderBy(desc(nftUsernames.createdAt));
}

export async function createNftListing(data: InsertNftUsername) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(nftUsernames).values(data);
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

export async function getUserDeals(openId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(deals).where(eq(deals.buyerOpenId, openId));
}
