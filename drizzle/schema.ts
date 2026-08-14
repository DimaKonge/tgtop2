import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  referredBy: varchar("referredBy", { length: 32 }),
  referralEarnings: varchar("referralEarnings", { length: 64 }).default("0 TON").notNull(),
  bonusBalance: int("bonusBalance").default(0).notNull(),
  mainBalanceTon: decimal("mainBalanceTon", { precision: 20, scale: 9 }).default("0.000000000").notNull(),
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
  description: text("description"),
  avatarFileId: varchar("avatarFileId", { length: 255 }),
  membersCount: int("membersCount").default(0).notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  category: mysqlEnum("category", ["Каналы", "Чаты"]).default("Каналы").notNull(),
  country: varchar("country", { length: 64 }).default("Global").notNull(),
  status: mysqlEnum("status", ["listed", "rented", "sold", "pending"]).default("listed").notNull(),
  messagesCount: int("messagesCount").default(0).notNull(),
  joinedCount: int("joinedCount").default(0).notNull(),
  leavesCount: int("leavesCount").default(0).notNull(),
  invitedCount: int("invitedCount").default(0).notNull(),
  lastPostViews: int("lastPostViews").default(0).notNull(),
  lastPostAt: timestamp("lastPostAt"),
  lastStatsAt: timestamp("lastStatsAt"),
  listedAt: timestamp("listedAt"),
  salePriceTon: decimal("salePriceTon", { precision: 20, scale: 9 }),
  listingType: mysqlEnum("listingType", ["catalog", "sale", "rent", "both"]).default("catalog").notNull(),
  rentalPriceTon: decimal("rentalPriceTon", { precision: 20, scale: 9 }),
  minRentalDays: int("minRentalDays"),
  maxRentalDays: int("maxRentalDays"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupCatalog = typeof groupsCatalog.$inferSelect;
export type InsertGroupCatalog = typeof groupsCatalog.$inferInsert;

export const groupStatsSnapshots = mysqlTable("group_stats_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  membersCount: int("membersCount").default(0).notNull(),
  messagesCount: int("messagesCount").default(0).notNull(),
  joinedCount: int("joinedCount").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type GroupStatsSnapshot = typeof groupStatsSnapshots.$inferSelect;

export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  groupId: int("groupId"),
  telegramChatId: varchar("telegramChatId", { length: 64 }),
  amount: int("amount").notNull(),
  kind: mysqlEnum("kind", ["group_connection_bonus", "listing_spend"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("credit_transactions_kind_telegram_chat_unique").on(table.kind, table.telegramChatId),
]);

export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const auctionSlots = mysqlTable("auction_slots", {
  id: int("id").autoincrement().primaryKey(),
  slotNumber: int("slotNumber").notNull(),
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

export const nftUsernames = mysqlTable("nft_usernames", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 128 }).notNull().unique(),
  price: varchar("price", { length: 64 }).notNull(),
  priceAmount: int("priceAmount").default(0).notNull(),
  rentalPricePerDay: varchar("rentalPricePerDay", { length: 64 }).notNull(),
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

export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId"),
  nftId: int("nftId"),
  buyerOpenId: varchar("buyerOpenId", { length: 64 }).notNull(),
  sellerOpenId: varchar("sellerOpenId", { length: 64 }).notNull(),
  price: varchar("price", { length: 64 }).notNull(),
  dealType: mysqlEnum("dealType", ["group_buy", "nft_buy", "nft_rent"]).default("group_buy").notNull(),
  rentalDays: int("rentalDays"),
  status: mysqlEnum("status", ["open", "escrow_funded", "active", "completed", "disputed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
