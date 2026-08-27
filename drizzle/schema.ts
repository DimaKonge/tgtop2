import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "moderator", "admin"]).default("user").notNull(),
  publicProfile: boolean("publicProfile").default(false).notNull(),
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

export const telegramEventReceipts = mysqlTable("telegram_event_receipts", {
  eventKey: varchar("eventKey", { length: 191 }).primaryKey(),
  firstBot: varchar("firstBot", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelegramEventReceipt = typeof telegramEventReceipts.$inferSelect;

export const telegramUserAgentSessions = mysqlTable("telegram_user_agent_sessions", {
  id: int("id").autoincrement().primaryKey(),
  scope: varchar("scope", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["disconnected", "code_pending", "password_pending", "connected", "error"]).default("disconnected").notNull(),
  encryptedSession: text("encryptedSession"),
  encryptedPhone: text("encryptedPhone"),
  encryptedPhoneCodeHash: text("encryptedPhoneCodeHash"),
  accountTelegramId: varchar("accountTelegramId", { length: 64 }),
  accountUsername: varchar("accountUsername", { length: 128 }),
  expiresAt: timestamp("expiresAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("telegram_user_agent_sessions_scope_unique").on(table.scope)]);

export type TelegramUserAgentSession = typeof telegramUserAgentSessions.$inferSelect;

export const telegramUserAgentAuditEvents = mysqlTable("telegram_user_agent_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 64 }).notNull(),
  actorOpenId: varchar("actorOpenId", { length: 64 }).notNull(),
  details: varchar("details", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("telegram_user_agent_audit_created_idx").on(table.createdAt)]);

export type TelegramUserAgentAuditEvent = typeof telegramUserAgentAuditEvents.$inferSelect;

export const telegramOwnerDmBindings = mysqlTable("telegram_owner_dm_bindings", {
  id: int("id").autoincrement().primaryKey(),
  scope: varchar("scope", { length: 32 }).notNull(),
  ownerTelegramId: varchar("ownerTelegramId", { length: 64 }).notNull(),
  expectedUsername: varchar("expectedUsername", { length: 128 }).notNull(),
  boundByOpenId: varchar("boundByOpenId", { length: 64 }).notNull(),
  greetingSentAt: timestamp("greetingSentAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("telegram_owner_dm_bindings_scope_unique").on(table.scope),
  uniqueIndex("telegram_owner_dm_bindings_owner_unique").on(table.ownerTelegramId),
]);

export type TelegramOwnerDmBinding = typeof telegramOwnerDmBindings.$inferSelect;

export const telegramOwnerDmWorkerStates = mysqlTable("telegram_owner_dm_worker_states", {
  scope: varchar("scope", { length: 32 }).primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  manusTaskId: varchar("manusTaskId", { length: 128 }),
  activationSentAt: timestamp("activationSentAt"),
  lastError: varchar("lastError", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramOwnerDmWorkerState = typeof telegramOwnerDmWorkerStates.$inferSelect;

export const telegramOwnerDmJobs = mysqlTable("telegram_owner_dm_jobs", {
  id: int("id").autoincrement().primaryKey(),
  telegramMessageId: varchar("telegramMessageId", { length: 64 }).notNull(),
  ownerTelegramId: varchar("ownerTelegramId", { length: 64 }).notNull(),
  encryptedInput: text("encryptedInput").notNull(),
  status: mysqlEnum("status", ["queued", "leased", "waiting_agent", "completed", "manual_review", "cancelled"]).default("queued").notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  leaseToken: varchar("leaseToken", { length: 96 }),
  leaseExpiresAt: timestamp("leaseExpiresAt"),
  attempts: int("attempts").default(0).notNull(),
  manusTaskId: varchar("manusTaskId", { length: 128 }),
  dispatchedAt: timestamp("dispatchedAt"),
  deliveredEventId: varchar("deliveredEventId", { length: 128 }),
  lastError: varchar("lastError", { length: 255 }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("telegram_owner_dm_jobs_message_unique").on(table.ownerTelegramId, table.telegramMessageId),
  index("telegram_owner_dm_jobs_status_available_idx").on(table.status, table.availableAt, table.id),
  index("telegram_owner_dm_jobs_lease_expires_idx").on(table.status, table.leaseExpiresAt),
]);

export type TelegramOwnerDmJob = typeof telegramOwnerDmJobs.$inferSelect;

export const telegramStatsTargets = mysqlTable("telegram_stats_targets", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 128 }).notNull(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  kind: mysqlEnum("kind", ["channel", "supergroup"]).notNull(),
  addedByOpenId: varchar("addedByOpenId", { length: 64 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastRefreshedAt: timestamp("lastRefreshedAt"),
  lastAvailability: mysqlEnum("lastAvailability", ["pending", "ready", "unavailable"]).default("pending").notNull(),
  lastError: varchar("lastError", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("telegram_stats_targets_username_unique").on(table.username), uniqueIndex("telegram_stats_targets_chat_unique").on(table.chatId)]);

export type TelegramStatsTarget = typeof telegramStatsTargets.$inferSelect;

export const telegramStatsSnapshots = mysqlTable("telegram_stats_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  targetId: int("targetId").notNull(),
  collectedAt: timestamp("collectedAt").defaultNow().notNull(),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  memberCount: int("memberCount"),
  viewsPerPost: int("viewsPerPost"),
  sharesPerPost: int("sharesPerPost"),
  reactionsPerPost: int("reactionsPerPost"),
  historyJson: text("historyJson").notNull(),
}, table => [index("telegram_stats_snapshots_target_collected_idx").on(table.targetId, table.collectedAt)]);

export type TelegramStatsSnapshot = typeof telegramStatsSnapshots.$inferSelect;

export const telegramOperationLogDestinations = mysqlTable("telegram_operation_log_destinations", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["top_activity", "finance"]).notNull(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  chatTitle: varchar("chatTitle", { length: 255 }),
  configuredByOpenId: varchar("configuredByOpenId", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("telegram_operation_log_destinations_kind_unique").on(table.kind)]);

export type TelegramOperationLogDestination = typeof telegramOperationLogDestinations.$inferSelect;

export const catalogCountries = mysqlTable("catalog_countries", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 96 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("catalog_countries_code_unique").on(table.code)]);

export const catalogCities = mysqlTable("catalog_cities", {
  id: int("id").autoincrement().primaryKey(),
  countryCode: varchar("countryCode", { length: 64 }).notNull(),
  code: varchar("code", { length: 96 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("catalog_cities_country_code_unique").on(table.countryCode, table.code),
  index("catalog_cities_country_sort_idx").on(table.countryCode, table.sortOrder),
]);

export const catalogTopics = mysqlTable("catalog_topics", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["Каналы", "Чаты", "Боты"]).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 96 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("catalog_topics_category_code_unique").on(table.category, table.code),
  index("catalog_topics_category_sort_idx").on(table.category, table.sortOrder),
]);

export type CatalogCountry = typeof catalogCountries.$inferSelect;
export type CatalogCity = typeof catalogCities.$inferSelect;
export type CatalogTopic = typeof catalogTopics.$inferSelect;

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
  status: mysqlEnum("status", ["listed", "rented", "sold", "pending", "review", "blocked"]).default("listed").notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "review", "blocked"]).default("pending").notNull(),
  moderationReason: varchar("moderationReason", { length: 255 }),
  moderationReviewedBy: varchar("moderationReviewedBy", { length: 64 }),
  moderationReviewedAt: timestamp("moderationReviewedAt"),
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
  showOwnerContact: boolean("showOwnerContact").default(false).notNull(),
  managerTelegramUserId: varchar("managerTelegramUserId", { length: 64 }),
  managerUsername: varchar("managerUsername", { length: 128 }),
  managerName: varchar("managerName", { length: 255 }),
  managerAvatarUrl: varchar("managerAvatarUrl", { length: 512 }),
  managerPublic: boolean("managerPublic").default(true).notNull(),
  listingAnnouncementEnabled: boolean("listingAnnouncementEnabled").default(true).notNull(),
  searchIndexable: boolean("searchIndexable").default(false).notNull(),
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
  index("groups_catalog_search_index_idx").on(table.searchIndexable, table.status, table.username),
]);

export type GroupCatalog = typeof groupsCatalog.$inferSelect;
export type InsertGroupCatalog = typeof groupsCatalog.$inferInsert;

export const groupEntryLinkAudits = mysqlTable("group_entry_link_audits", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  previousUsername: varchar("previousUsername", { length: 128 }),
  verifiedUsername: varchar("verifiedUsername", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("group_entry_link_audits_group_created_idx").on(table.groupId, table.createdAt)]);

export type GroupEntryLinkAudit = typeof groupEntryLinkAudits.$inferSelect;

export const botListings = mysqlTable("bot_listings", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  username: varchar("username", { length: 128 }).notNull(),
  telegramLink: varchar("telegramLink", { length: 512 }).notNull(),
  category: varchar("category", { length: 64 }).default("General").notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  moderationReason: varchar("moderationReason", { length: 255 }),
  moderationReviewedBy: varchar("moderationReviewedBy", { length: 64 }),
  moderationReviewedAt: timestamp("moderationReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("bot_listings_username_unique").on(table.username),
  index("bot_listings_status_category_created_idx").on(table.moderationStatus, table.category, table.createdAt),
  index("bot_listings_owner_created_idx").on(table.ownerOpenId, table.createdAt),
]);

export type BotListing = typeof botListings.$inferSelect;
export type InsertBotListing = typeof botListings.$inferInsert;

export const moderationEvents = mysqlTable("moderation_events", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  action: mysqlEnum("action", ["auto_review", "manual_review", "manual_block", "manual_approve"]).notNull(),
  actorOpenId: varchar("actorOpenId", { length: 64 }),
  reason: varchar("reason", { length: 255 }).notNull(),
  evidenceSummary: varchar("evidenceSummary", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("moderation_events_group_created_idx").on(table.groupId, table.createdAt)]);

export const groupStatsSnapshots = mysqlTable("group_stats_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  membersCount: int("membersCount").default(0).notNull(),
  messagesCount: int("messagesCount").default(0).notNull(),
  joinedCount: int("joinedCount").default(0).notNull(),
  leavesCount: int("leavesCount").default(0).notNull(),
  invitedCount: int("invitedCount").default(0).notNull(),
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
  kind: mysqlEnum("kind", ["group_connection_bonus", "listing_spend", "ranking_spend", "ranking_refund", "manual_bonus", "reward_campaign_reserve", "reward_campaign_release", "reward_subscription", "reward_invite_referral", "reward_manual_add"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("credit_transactions_kind_telegram_chat_unique").on(table.kind, table.telegramChatId),
  index("credit_transactions_user_created_idx").on(table.userOpenId, table.createdAt),
]);

export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const tonDeposits = mysqlTable("ton_deposits", {
  id: int("id").autoincrement().primaryKey(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  senderWalletAddress: varchar("senderWalletAddress", { length: 96 }).notNull(),
  recipientWalletAddress: varchar("recipientWalletAddress", { length: 96 }).notNull(),
  requestedAmountNano: decimal("requestedAmountNano", { precision: 30, scale: 0 }).notNull(),
  creditedAmountTon: decimal("creditedAmountTon", { precision: 20, scale: 9 }),
  reference: varchar("reference", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["created", "submitted", "confirmed", "expired", "rejected"]).default("created").notNull(),
  transactionHash: varchar("transactionHash", { length: 128 }),
  transactionLt: varchar("transactionLt", { length: 64 }),
  failureReason: varchar("failureReason", { length: 255 }),
  expiresAt: timestamp("expiresAt").notNull(),
  submittedAt: timestamp("submittedAt"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("ton_deposits_reference_unique").on(table.reference),
  uniqueIndex("ton_deposits_transaction_hash_unique").on(table.transactionHash),
  index("ton_deposits_user_status_created_idx").on(table.userOpenId, table.status, table.createdAt),
  index("ton_deposits_recipient_created_idx").on(table.recipientWalletAddress, table.createdAt),
]);

export type TonDeposit = typeof tonDeposits.$inferSelect;

export const tonWithdrawals = mysqlTable("ton_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  payoutWalletAddress: varchar("payoutWalletAddress", { length: 96 }).notNull(),
  destinationWalletAddress: varchar("destinationWalletAddress", { length: 96 }).notNull(),
  grossAmountNano: decimal("grossAmountNano", { precision: 30, scale: 0 }).notNull(),
  feeReserveNano: decimal("feeReserveNano", { precision: 30, scale: 0 }).notNull(),
  actualFeeNano: decimal("actualFeeNano", { precision: 30, scale: 0 }),
  netAmountNano: decimal("netAmountNano", { precision: 30, scale: 0 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
  reference: varchar("reference", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["queued", "manual_review", "broadcast_pending", "sent", "confirmed", "failed_refunded", "cancelled"]).notNull(),
  riskReasons: varchar("riskReasons", { length: 512 }),
  externalMessageHash: varchar("externalMessageHash", { length: 128 }),
  transactionHash: varchar("transactionHash", { length: 128 }),
  transactionLt: varchar("transactionLt", { length: 64 }),
  broadcastAt: timestamp("broadcastAt"),
  sentAt: timestamp("sentAt"),
  confirmedAt: timestamp("confirmedAt"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedByOpenId: varchar("reviewedByOpenId", { length: 64 }),
  failureReason: varchar("failureReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("ton_withdrawals_user_idempotency_unique").on(table.userOpenId, table.idempotencyKey),
  uniqueIndex("ton_withdrawals_reference_unique").on(table.reference),
  uniqueIndex("ton_withdrawals_transaction_hash_unique").on(table.transactionHash),
  uniqueIndex("ton_withdrawals_external_message_hash_unique").on(table.externalMessageHash),
  index("ton_withdrawals_user_created_idx").on(table.userOpenId, table.createdAt),
  index("ton_withdrawals_destination_created_idx").on(table.destinationWalletAddress, table.createdAt),
  index("ton_withdrawals_status_created_idx").on(table.status, table.createdAt),
]);

export type TonWithdrawal = typeof tonWithdrawals.$inferSelect;

/**
 * Durable background work for a TON withdrawal. A user request only writes this
 * record; a separate worker claims it with a lease and never shares process
 * memory with the public API.
 */
export const tonPayoutJobs = mysqlTable("ton_payout_jobs", {
  id: int("id").autoincrement().primaryKey(),
  withdrawalId: int("withdrawalId").notNull(),
  kind: mysqlEnum("kind", ["broadcast", "reconcile"]).notNull(),
  status: mysqlEnum("status", ["queued", "leased", "completed", "manual_review", "cancelled"]).default("queued").notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  leaseToken: varchar("leaseToken", { length: 96 }),
  leaseExpiresAt: timestamp("leaseExpiresAt"),
  attempts: int("attempts").default(0).notNull(),
  lastError: varchar("lastError", { length: 255 }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("ton_payout_jobs_withdrawal_kind_unique").on(table.withdrawalId, table.kind),
  index("ton_payout_jobs_status_available_idx").on(table.status, table.availableAt, table.id),
  index("ton_payout_jobs_lease_expires_idx").on(table.status, table.leaseExpiresAt),
]);

export type TonPayoutJob = typeof tonPayoutJobs.$inferSelect;

/**
 * A fencing lease for the one wallet sequence that may sign/broadcast payouts.
 * The token is checked on every release/update so a stale process cannot take
 * over after its lease expires.
 */
export const tonPayoutWalletLeases = mysqlTable("ton_payout_wallet_leases", {
  payoutWalletAddress: varchar("payoutWalletAddress", { length: 96 }).primaryKey(),
  leaseToken: varchar("leaseToken", { length: 96 }).notNull(),
  holderId: varchar("holderId", { length: 96 }).notNull(),
  leaseExpiresAt: timestamp("leaseExpiresAt").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TonPayoutWalletLease = typeof tonPayoutWalletLeases.$inferSelect;

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

export const giveaways = mysqlTable("giveaways", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  prizeTitle: varchar("prizeTitle", { length: 160 }).notNull(),
  rules: text("rules"),
  boostOnly: boolean("boostOnly").default(false).notNull(),
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("giveaways_status_ends_idx").on(table.status, table.endsAt),
  index("giveaways_owner_created_idx").on(table.ownerOpenId, table.createdAt),
  index("giveaways_group_created_idx").on(table.groupId, table.createdAt),
]);

export type Giveaway = typeof giveaways.$inferSelect;

export const giveawayParticipants = mysqlTable("giveaway_participants", {
  id: int("id").autoincrement().primaryKey(),
  giveawayId: int("giveawayId").notNull(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("giveaway_participants_giveaway_user_unique").on(table.giveawayId, table.userOpenId),
  index("giveaway_participants_giveaway_joined_idx").on(table.giveawayId, table.joinedAt),
]);

export type GiveawayParticipant = typeof giveawayParticipants.$inferSelect;

export const auctionSlots = mysqlTable("auction_slots", {
  id: int("id").autoincrement().primaryKey(),
  slotNumber: int("slotNumber").notNull(),
  category: mysqlEnum("category", ["Все", "Каналы", "Чаты"]).default("Все").notNull(),
  subcategory: varchar("subcategory", { length: 64 }).default("Все").notNull(),
  country: varchar("country", { length: 64 }).default("Global").notNull(),
  title: varchar("title", { length: 255 }).default("Свободное место").notNull(),
  subtitle: varchar("subtitle", { length: 255 }).default("Ждет листинга").notNull(),
  currentBid: varchar("currentBid", { length: 64 }).default("0 GRAM").notNull(),
  bidAmount: int("bidAmount").default(0).notNull(),
  leaderUsername: varchar("leaderUsername", { length: 128 }).default("-").notNull(),
  leaderUserId: varchar("leaderUserId", { length: 64 }),
  groupId: int("groupId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("auction_slots_board_slot_unique").on(table.category, table.subcategory, table.country, table.slotNumber),
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
