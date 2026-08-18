import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
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

export const websiteLoginSessions = mysqlTable("website_login_sessions", {
  nonce: varchar("nonce", { length: 96 }).primaryKey(),
  telegramOpenId: varchar("telegramOpenId", { length: 64 }),
  status: mysqlEnum("status", ["pending", "confirmed", "consumed", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebsiteLoginSession = typeof websiteLoginSessions.$inferSelect;

export const groupsCatalog = mysqlTable("groups_catalog", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  username: varchar("username", { length: 128 }),
  inviteLink: varchar("inviteLink", { length: 512 }),
  description: text("description"),
  avatarFileId: varchar("avatarFileId", { length: 255 }),
  animatedAvatarKey: varchar("animatedAvatarKey", { length: 512 }),
  animatedAvatarUrl: varchar("animatedAvatarUrl", { length: 512 }),
  animatedAvatarUpdatedAt: timestamp("animatedAvatarUpdatedAt"),
  membersCount: int("membersCount").default(0).notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  category: mysqlEnum("category", ["Каналы", "Чаты"]).default("Каналы").notNull(),
  subcategory: varchar("subcategory", { length: 64 }).default("General").notNull(),
  country: varchar("country", { length: 64 }).default("Global").notNull(),
  city: varchar("city", { length: 96 }),
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
  listingType: mysqlEnum("listingType", ["catalog", "sale"]).default("catalog").notNull(),
  anonymousListing: boolean("anonymousListing").default(true).notNull(),
  monthlyEntryEnabled: boolean("monthlyEntryEnabled").default(false).notNull(),
  monthlyEntryStars: int("monthlyEntryStars"),
  monthlyEntryLinkName: varchar("monthlyEntryLinkName", { length: 64 }),
  monthlyEntryInviteLink: varchar("monthlyEntryInviteLink", { length: 512 }),
  monthlyEntryUpdatedAt: timestamp("monthlyEntryUpdatedAt"),
  rewardActive: boolean("rewardActive").default(false).notNull(),
  rewardBudget: int("rewardBudget").default(0).notNull(),
  rewardPerSubscription: int("rewardPerSubscription").default(0).notNull(),
  rewardPerInvite: int("rewardPerInvite").default(0).notNull(),
  rewardPerManualAdd: int("rewardPerManualAdd").default(1).notNull(),
  deleteServiceMessages: boolean("deleteServiceMessages").default(false).notNull(),
  ownerPinned: boolean("ownerPinned").default(false).notNull(),
  ownerSortOrder: int("ownerSortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("groups_catalog_listing_filters_idx").on(table.status, table.category, table.subcategory, table.country),
  index("groups_catalog_geography_idx").on(table.status, table.country, table.city),
  index("groups_catalog_owner_idx").on(table.ownerOpenId),
  index("groups_catalog_owner_layout_idx").on(table.ownerOpenId, table.ownerPinned, table.ownerSortOrder),
  index("groups_catalog_listed_at_idx").on(table.listedAt),
]);

export type GroupCatalog = typeof groupsCatalog.$inferSelect;
export type InsertGroupCatalog = typeof groupsCatalog.$inferInsert;

export const groupStatsSnapshots = mysqlTable("group_stats_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  membersCount: int("membersCount").default(0).notNull(),
  messagesCount: int("messagesCount").default(0).notNull(),
  joinedCount: int("joinedCount").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, table => [
  index("group_stats_snapshots_group_recorded_idx").on(table.groupId, table.recordedAt),
]);

export type GroupStatsSnapshot = typeof groupStatsSnapshots.$inferSelect;

export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  groupId: int("groupId"),
  telegramChatId: varchar("telegramChatId", { length: 64 }),
  amount: int("amount").notNull(),
  kind: mysqlEnum("kind", ["group_connection_bonus", "listing_spend", "manual_bonus", "reward_campaign_reserve", "reward_campaign_release", "reward_subscription", "reward_invite_referral", "reward_manual_add"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("credit_transactions_kind_telegram_chat_unique").on(table.kind, table.telegramChatId),
  index("credit_transactions_user_created_idx").on(table.userOpenId, table.createdAt),
]);

export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const rewardEvents = mysqlTable("reward_events", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  beneficiaryOpenId: varchar("beneficiaryOpenId", { length: 64 }).notNull(),
  memberTelegramId: varchar("memberTelegramId", { length: 64 }).notNull(),
  inviterOpenId: varchar("inviterOpenId", { length: 64 }),
  eventType: mysqlEnum("eventType", ["subscription", "invite_referral", "manual_add"]).notNull(),
  amount: int("amount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("reward_events_group_member_beneficiary_type_unique").on(table.groupId, table.memberTelegramId, table.beneficiaryOpenId, table.eventType),
  index("reward_events_beneficiary_created_idx").on(table.beneficiaryOpenId, table.createdAt),
]);

export type RewardEvent = typeof rewardEvents.$inferSelect;

export const rewardInviteLinks = mysqlTable("reward_invite_links", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  beneficiaryOpenId: varchar("beneficiaryOpenId", { length: 64 }).notNull(),
  inviteLink: varchar("inviteLink", { length: 512 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("reward_invite_links_group_beneficiary_unique").on(table.groupId, table.beneficiaryOpenId),
]);

export type RewardInviteLink = typeof rewardInviteLinks.$inferSelect;

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
}, table => [
  uniqueIndex("auction_slots_board_slot_unique").on(table.category, table.country, table.slotNumber),
]);

export type AuctionSlot = typeof auctionSlots.$inferSelect;
export type InsertAuctionSlot = typeof auctionSlots.$inferInsert;

export const rankingBidIntents = mysqlTable("ranking_bid_intents", {
  id: int("id").autoincrement().primaryKey(),
  slotId: int("slotId").notNull(),
  groupId: int("groupId").notNull(),
  bidderOpenId: varchar("bidderOpenId", { length: 64 }).notNull(),
  bidAmount: int("bidAmount").notNull(),
  status: mysqlEnum("status", ["recorded", "verified", "cancelled"]).default("recorded").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("ranking_bid_intents_bidder_status_idx").on(table.bidderOpenId, table.status),
  index("ranking_bid_intents_slot_idx").on(table.slotId),
]);

export type RankingBidIntent = typeof rankingBidIntents.$inferSelect;

export const starsRankingPaymentIntents = mysqlTable("stars_ranking_payment_intents", {
  id: int("id").autoincrement().primaryKey(),
  payload: varchar("payload", { length: 96 }).notNull().unique(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  slotId: int("slotId").notNull(),
  groupId: int("groupId").notNull(),
  bidAmount: int("bidAmount").notNull(),
  starsAmount: int("starsAmount").notNull(),
  status: mysqlEnum("status", ["pending", "pre_checkout_approved", "paid", "refund_required", "cancelled", "expired"]).default("pending").notNull(),
  telegramPaymentChargeId: varchar("telegramPaymentChargeId", { length: 128 }).unique(),
  telegramUserId: varchar("telegramUserId", { length: 64 }),
  invoiceMessageId: int("invoiceMessageId"),
  failureReason: varchar("failureReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  paidAt: timestamp("paidAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("stars_rank_payment_user_status_idx").on(table.userOpenId, table.status),
  index("stars_rank_payment_slot_status_idx").on(table.slotId, table.status),
  index("stars_rank_payment_expiry_idx").on(table.status, table.expiresAt),
]);

export type StarsRankingPaymentIntent = typeof starsRankingPaymentIntents.$inferSelect;

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
  assetClass: mysqlEnum("assetClass", ["onchain", "offchain"]).default("offchain").notNull(),
  nftItemAddress: varchar("nftItemAddress", { length: 96 }).unique(),
  ownerWalletAddress: varchar("ownerWalletAddress", { length: 96 }),
  ownershipVerifiedAt: timestamp("ownershipVerifiedAt"),
  ownershipVerification: varchar("ownershipVerification", { length: 255 }),
  showcaseGroupId: int("showcaseGroupId"),
  showcaseProfile: boolean("showcaseProfile").default(false).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "both"]).default("both").notNull(),
  status: mysqlEnum("status", ["available", "rented", "sold"]).default("available").notNull(),
  currentRenterOpenId: varchar("currentRenterOpenId", { length: 64 }),
  rentalExpiresAt: timestamp("rentalExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("nft_usernames_owner_asset_status_idx").on(table.ownerOpenId, table.assetClass, table.status),
]);

export type NftUsername = typeof nftUsernames.$inferSelect;
export type InsertNftUsername = typeof nftUsernames.$inferInsert;

export const nftTransfers = mysqlTable("nft_transfers", {
  id: int("id").autoincrement().primaryKey(),
  nftId: int("nftId").notNull(),
  assetClass: mysqlEnum("assetClass", ["onchain", "offchain"]).notNull(),
  status: mysqlEnum("status", ["draft", "awaiting_signature", "broadcast_pending", "completed", "cancelled", "expired", "failed"]).default("draft").notNull(),
  senderOpenId: varchar("senderOpenId", { length: 64 }).notNull(),
  recipientOpenId: varchar("recipientOpenId", { length: 64 }).notNull(),
  recipientInput: varchar("recipientInput", { length: 128 }).notNull(),
  sourceWalletAddress: varchar("sourceWalletAddress", { length: 96 }),
  recipientWalletAddress: varchar("recipientWalletAddress", { length: 96 }),
  transferReference: varchar("transferReference", { length: 128 }).unique(),
  transactionBocHash: varchar("transactionBocHash", { length: 128 }),
  transactionLt: varchar("transactionLt", { length: 64 }),
  failureReason: varchar("failureReason", { length: 255 }),
  expiresAt: timestamp("expiresAt"),
  signedAt: timestamp("signedAt"),
  confirmedAt: timestamp("confirmedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("nft_transfers_sender_status_idx").on(table.senderOpenId, table.status),
  index("nft_transfers_recipient_status_idx").on(table.recipientOpenId, table.status),
  index("nft_transfers_nft_status_idx").on(table.nftId, table.status),
]);

export type NftTransfer = typeof nftTransfers.$inferSelect;
export type InsertNftTransfer = typeof nftTransfers.$inferInsert;

export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId"),
  nftId: int("nftId"),
  buyerOpenId: varchar("buyerOpenId", { length: 64 }).notNull(),
  sellerOpenId: varchar("sellerOpenId", { length: 64 }).notNull(),
  price: varchar("price", { length: 64 }).notNull(),
  dealType: mysqlEnum("dealType", ["group_buy", "nft_buy", "nft_rent"]).default("group_buy").notNull(),
  rentalDays: int("rentalDays"),
  status: mysqlEnum("status", ["open", "escrow_funded", "active", "completed", "expired", "cancelled", "disputed"]).default("open").notNull(),
  fundingReference: varchar("fundingReference", { length: 128 }),
  transferEvidence: varchar("transferEvidence", { length: 512 }),
  fundedAt: timestamp("fundedAt"),
  transferObservedAt: timestamp("transferObservedAt"),
  buyerConfirmedAt: timestamp("buyerConfirmedAt"),
  releasedAt: timestamp("releasedAt"),
  cancelledAt: timestamp("cancelledAt"),
  expiresAt: timestamp("expiresAt"),
  disputedAt: timestamp("disputedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("deals_buyer_status_created_idx").on(table.buyerOpenId, table.status, table.createdAt),
  index("deals_seller_status_created_idx").on(table.sellerOpenId, table.status, table.createdAt),
  index("deals_status_expires_idx").on(table.status, table.expiresAt),
]);

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
