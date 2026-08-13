import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, groupsCatalog, auctionSlots, nftUsernames, deals, InsertGroupCatalog, InsertAuctionSlot, InsertNftUsername, InsertDeal } from "../drizzle/schema";
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

    const textFields = ["name", "email", "loginMethod"] as const;
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
  
  if (conditions.length > 0) {
    return await db.select().from(auctionSlots).where(and(...conditions));
  }
  return await db.select().from(auctionSlots);
}

export async function placeBid(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(auctionSlots).set({
    bidAmount,
    currentBid: currentBidStr,
    leaderUsername,
    leaderUserId,
    groupId: groupId ?? null,
    updatedAt: new Date()
  }).where(eq(auctionSlots.id, slotId));
}

export async function getGroupsCatalog(category?: string, country?: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(groupsCatalog).orderBy(desc(groupsCatalog.membersCount));
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
