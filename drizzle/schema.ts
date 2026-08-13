import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const groupsCatalog = mysqlTable("groups_catalog", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  username: varchar("username", { length: 128 }),
  membersCount: int("membersCount").default(0).notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  category: mysqlEnum("category", ["Каналы", "Чаты"]).default("Каналы").notNull(),
  country: varchar("country", { length: 64 }).default("Global").notNull(),
  status: mysqlEnum("status", ["listed", "rented", "sold", "pending"]).default("listed").notNull(),
  messagesCount: int("messagesCount").default(0).notNull(),
  joinedCount: int("joinedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupCatalog = typeof groupsCatalog.$inferSelect;
export type InsertGroupCatalog = typeof groupsCatalog.$inferInsert;

export const auctionSlots = mysqlTable("auction_slots", {
  id: int("id").autoincrement().primaryKey(),
  slotNumber: int("slotNumber").notNull(), // 1 for King Pedestal, 4-7 for Premier Lots
  category: mysqlEnum("category", ["Все", "Каналы", "Чаты"]).default("Все").notNull(),
  country: varchar("country", { length: 64 }).default("Global").notNull(),
  title: varchar("title", { length: 255 }).default("Свободное место").notNull(),
  subtitle: varchar("subtitle", { length: 255 }).default("Ждет листинга").notNull(),
  currentBid: varchar("currentBid", { length: 64 }).default("0 TON").notNull(),
  bidAmount: int("bidAmount").default(0).notNull(),
  leaderUsername: varchar("leaderUsername", { length: 128 }).default("-").notNull(),
  leaderUserId: varchar("leaderUserId", { length: 64 }),
  groupId: int("groupId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuctionSlot = typeof auctionSlots.$inferSelect;
export type InsertAuctionSlot = typeof auctionSlots.$inferInsert;

// NFT Usernames & Channels table with MarketApp rental mechanics
export const nftUsernames = mysqlTable("nft_usernames", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 128 }).notNull().unique(),
  price: varchar("price", { length: 64 }).notNull(), // e.g. "150 TON"
  priceAmount: int("priceAmount").default(0).notNull(),
  rentalPricePerDay: varchar("rentalPricePerDay", { length: 64 }).notNull(), // e.g. "2 TON/day"
  rentalAmountPerDay: int("rentalAmountPerDay").default(0).notNull(),
  minRentalDays: int("minRentalDays").default(7).notNull(),
  maxRentalDays: int("maxRentalDays").default(365).notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  ownerUsername: varchar("ownerUsername", { length: 128 }).default("Anonymous").notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "both"]).default("both").notNull(),
  status: mysqlEnum("status", ["available", "rented", "sold"]).default("available").notNull(),
  currentRenterOpenId: varchar("currentRenterOpenId", { length: 64 }),
  rentalExpiresAt: timestamp("rentalExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NftUsername = typeof nftUsernames.$inferSelect;
export type InsertNftUsername = typeof nftUsernames.$inferInsert;

// Deals and Escrow Rentals table (MarketApp style)
export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId"),
  nftId: int("nftId"),
  buyerOpenId: varchar("buyerOpenId", { length: 64 }).notNull(),
  sellerOpenId: varchar("sellerOpenId", { length: 64 }).notNull(),
  price: varchar("price", { length: 64 }).notNull(),
  dealType: mysqlEnum("dealType", ["group_buy", "nft_buy", "nft_rent"]).default("group_buy").notNull(),
  rentalDays: int("rentalDays"), // for rentals
  status: mysqlEnum("status", ["open", "escrow_funded", "active", "completed", "disputed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
