import { eq, and, or, asc, desc, gte, gt, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import { InsertUser, users, groupsCatalog, groupStatsSnapshots, creditTransactions, tonDeposits, tonWithdrawals, rewardEvents, rewardInviteLinks, giveaways, giveawayParticipants, auctionSlots, rankingBidIntents, starsRankingPaymentIntents, nftUsernames, nftTransfers, deals, telegramEventReceipts, moderationEvents, catalogCountries, catalogCities, catalogTopics, InsertGroupCatalog, InsertNftUsername } from "../drizzle/schema";
import { ENV } from './_core/env';
import { GROUP_CONNECTION_BONUS, getGroupConnectionBonusIdentity } from "./groupBonusPolicy";
import { GROUP_TRANSFER_WINDOW_MS, INSUFFICIENT_GRAM_BALANCE_MESSAGE, canBuyerCancel, canBuyerConfirmTransfer, getTransferDeadline, hasSufficientGramBalance } from "./protectedDeals";
import { getNftTransferRequirements, getNftTransferReference, normalizeTelegramRecipient } from "./nftTransferPolicy";
import { assignRankingEntriesToSlots, getMinimumRankingBidMilliTon, getRankingFloorMilliTon, isQualifyingRankingBid } from "./rankingBidPolicy";
import { planVacantRankingAssignments } from "./autoPlacementPolicy";
import { formatTonAmount } from "./tonFormatting";
import { canCreateRewardPersonalInviteLink, DEFAULT_MANUAL_ADD_REWARD, getRewardAmount, isRewardCampaignActive, type RewardEventType, validateRewardCampaignConfig } from "./rewardCampaignPolicy";
import { canExposeOwnerProfile } from "./ownerVisibilityPolicy";
import { isGiveawayOpen, isValidGiveawayEnd } from "./giveawayPolicy";
import { getTelegramChatIdFromOpenId, verifyTelegramUserChatBoost } from "./telegramNotifications";
import { getSearchIndexingError } from "./seoPolicy";
import { buildTonDepositPayload, createTonDepositReference, decodeTonComment, findMatchingTonDepositTransaction, findRejectedTonDepositTransaction, formatNanoTon, getRecentTonDepositTransactions, normalizeTonAddress, parseTonToNano, toFriendlyTonAddress, TON_DEPOSIT_TTL_MS } from "./tonDeposits";
import { buildTonPayoutExternalBoc, broadcastTonPayoutBoc, emulateTonPayoutFee, getConfiguredTonPayoutWalletAddress, getTonPayoutTransactionByMessageHash, TonPayoutRejectedError } from "./tonPayoutWallet";
import { classifyTonWithdrawalRisk, formatNanoTon as formatWithdrawalNanoTon, getTonWithdrawalRiskLabel, quoteTonWithdrawal as getTonWithdrawalQuote, TON_WITHDRAWAL_ADDRESS_COOLDOWN_MS, TON_WITHDRAWAL_FEE_SAFETY_MARGIN_NANO } from "./tonWithdrawalPolicy";
import { canCancelNftRental, canConfirmNftRental, rentalTotalUnits, validateRentalDays, NFT_RENTAL_MAX_DAYS as POLICY_NFT_RENTAL_MAX_DAYS } from "./nftRentalPolicy";

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
  return {
    ...publicGroup,
    ...(group.managerPublic ? {} : { managerTelegramUserId: null, managerUsername: null, managerName: null, managerAvatarUrl: null }),
    rewardActive: active,
    rewardAmount,
  };
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

export function isDuplicateTelegramEventError(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const databaseError = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (databaseError.code === "ER_DUP_ENTRY" || databaseError.errno === 1062) return true;
    current = databaseError.cause;
  }
  return false;
}

export async function claimTelegramEvent(eventKey: string, firstBot: string) {
  const db = await getDb();
  if (!db) return true;
  try {
    const result = await db.insert(telegramEventReceipts).values({ eventKey, firstBot }).onDuplicateKeyUpdate({
      set: { eventKey: sql`${telegramEventReceipts.eventKey}` },
    });
    return Number(result[0]?.affectedRows ?? 0) === 1;
  } catch (error) {
    if (isDuplicateTelegramEventError(error)) return false;
    throw error;
  }
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

function getTonDepositWalletAddress() {
  const address = process.env.TON_DEPOSIT_WALLET_ADDRESS;
  if (!address) throw new Error("Кошелёк для пополнений TON не настроен");
  return normalizeTonAddress(address);
}

export async function getTonDeposits(openId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: tonDeposits.id,
    requestedAmountNano: tonDeposits.requestedAmountNano,
    creditedAmountTon: tonDeposits.creditedAmountTon,
    reference: tonDeposits.reference,
    status: tonDeposits.status,
    failureReason: tonDeposits.failureReason,
    expiresAt: tonDeposits.expiresAt,
    submittedAt: tonDeposits.submittedAt,
    confirmedAt: tonDeposits.confirmedAt,
    createdAt: tonDeposits.createdAt,
  }).from(tonDeposits).where(eq(tonDeposits.userOpenId, openId)).orderBy(desc(tonDeposits.createdAt), desc(tonDeposits.id)).limit(20);
}

export async function getTonWithdrawalDefaultRecipient(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const row = (await db.select({ senderWalletAddress: tonDeposits.senderWalletAddress })
    .from(tonDeposits)
    .where(and(eq(tonDeposits.userOpenId, openId), eq(tonDeposits.status, "confirmed")))
    .orderBy(desc(tonDeposits.confirmedAt), desc(tonDeposits.id))
    .limit(1))[0];
  return row ? { destinationWalletAddress: toFriendlyTonAddress(row.senderWalletAddress) } : null;
}

export async function createTonDeposit(input: { userOpenId: string; senderWalletAddress: string; amountTon: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const requestedAmountNano = parseTonToNano(input.amountTon);
  const senderWalletAddress = normalizeTonAddress(input.senderWalletAddress);
  const recipientWalletAddress = getTonDepositWalletAddress();
  const reference = createTonDepositReference();
  const expiresAt = new Date(Date.now() + TON_DEPOSIT_TTL_MS);
  const result = await db.insert(tonDeposits).values({
    userOpenId: input.userOpenId,
    senderWalletAddress,
    recipientWalletAddress,
    requestedAmountNano: requestedAmountNano.toString(),
    reference,
    expiresAt,
  });
  return {
    id: Number(result[0].insertId),
    recipientWalletAddress: toFriendlyTonAddress(recipientWalletAddress),
    amountNano: requestedAmountNano.toString(),
    amountTon: formatNanoTon(requestedAmountNano),
    reference,
    payload: buildTonDepositPayload(reference),
    validUntil: Math.floor(expiresAt.getTime() / 1_000),
  };
}

export async function markTonDepositSubmitted(input: { userOpenId: string; depositId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const deposit = (await db.select().from(tonDeposits).where(and(eq(tonDeposits.id, input.depositId), eq(tonDeposits.userOpenId, input.userOpenId))).limit(1))[0];
  if (!deposit) throw new Error("Пополнение не найдено");
  if (deposit.status === "confirmed") return { status: "confirmed" as const, newlyConfirmed: false, amountTon: deposit.creditedAmountTon ?? "0" };
  if (deposit.status === "expired" || deposit.status === "rejected") throw new Error("Срок этого пополнения истёк. Создайте новое.");
  if (deposit.expiresAt.getTime() <= Date.now()) {
    await db.update(tonDeposits).set({ status: "expired", failureReason: "Срок подтверждения истёк" }).where(eq(tonDeposits.id, deposit.id));
    throw new Error("Срок этого пополнения истёк. Создайте новое.");
  }
  await db.update(tonDeposits).set({ status: "submitted", submittedAt: new Date() }).where(and(eq(tonDeposits.id, deposit.id), eq(tonDeposits.status, "created")));
  return { status: "submitted" as const, newlyConfirmed: false, amountTon: "0" };
}

export async function verifyTonDeposit(input: { userOpenId: string; depositId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const deposit = (await db.select().from(tonDeposits).where(and(eq(tonDeposits.id, input.depositId), eq(tonDeposits.userOpenId, input.userOpenId))).limit(1))[0];
  if (!deposit) throw new Error("Пополнение не найдено");
  if (deposit.status === "confirmed") return { status: "confirmed" as const, newlyConfirmed: false, amountTon: deposit.creditedAmountTon ?? "0" };
  if (deposit.status === "expired" || deposit.status === "rejected") return { status: deposit.status, newlyConfirmed: false, amountTon: "0" };
  if (deposit.expiresAt.getTime() <= Date.now()) {
    await db.update(tonDeposits).set({ status: "expired", failureReason: "Срок подтверждения истёк" }).where(eq(tonDeposits.id, deposit.id));
    return { status: "expired" as const, newlyConfirmed: false, amountTon: "0" };
  }

  const transactions = await getRecentTonDepositTransactions(deposit.recipientWalletAddress);
  const match = findMatchingTonDepositTransaction({
    transactions,
    senderWalletAddress: deposit.senderWalletAddress,
    recipientWalletAddress: deposit.recipientWalletAddress,
    requestedAmountNano: BigInt(deposit.requestedAmountNano),
    reference: deposit.reference,
  });
  if (!match) {
    const rejection = findRejectedTonDepositTransaction({
      transactions,
      senderWalletAddress: deposit.senderWalletAddress,
      recipientWalletAddress: deposit.recipientWalletAddress,
      reference: deposit.reference,
    });
    if (rejection) {
      await db.update(tonDeposits).set({
        status: "rejected",
        transactionHash: rejection.transactionHash,
        transactionLt: rejection.transactionLt,
        failureReason: rejection.reason,
      }).where(and(eq(tonDeposits.id, deposit.id), inArray(tonDeposits.status, ["created", "submitted"])));
      return { status: "rejected" as const, newlyConfirmed: false, amountTon: "0" };
    }
    await db.update(tonDeposits).set({ status: "submitted", submittedAt: deposit.submittedAt ?? new Date() }).where(and(eq(tonDeposits.id, deposit.id), eq(tonDeposits.status, "created")));
    return { status: "submitted" as const, newlyConfirmed: false, amountTon: "0" };
  }

  const creditedAmountTon = formatNanoTon(match.receivedNano);
  try {
    let newlyConfirmed = false;
    await db.transaction(async tx => {
      const duplicate = (await tx.select({ id: tonDeposits.id }).from(tonDeposits).where(eq(tonDeposits.transactionHash, match.transactionHash)).limit(1))[0];
      if (duplicate && duplicate.id !== deposit.id) throw new Error("Эта TON-транзакция уже была зачислена");
      const update = await tx.update(tonDeposits).set({
        status: "confirmed",
        transactionHash: match.transactionHash,
        transactionLt: match.transactionLt,
        creditedAmountTon,
        confirmedAt: new Date(),
        failureReason: null,
      }).where(and(eq(tonDeposits.id, deposit.id), inArray(tonDeposits.status, ["created", "submitted"])));
      if (Number(update[0]?.affectedRows ?? 0) !== 1) return;
      await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${creditedAmountTon}` }).where(eq(users.openId, input.userOpenId));
      newlyConfirmed = true;
    });
    return { status: "confirmed" as const, newlyConfirmed, amountTon: creditedAmountTon };
  } catch (error) {
    if (isDuplicateTelegramEventError(error)) throw new Error("Эта TON-транзакция уже была зачислена");
    throw error;
  }
}

type TonWithdrawalStatus = "queued" | "manual_review" | "broadcast_pending" | "sent" | "confirmed" | "failed_refunded" | "cancelled";
let payoutQueue: Promise<void> = Promise.resolve();

function runInPayoutQueue<T>(operation: () => Promise<T>) {
  const current = payoutQueue.then(operation, operation);
  payoutQueue = current.then(() => undefined, () => undefined);
  return current;
}

function isTonWithdrawalAutomationEnabled() {
  return process.env.TON_WITHDRAWALS_ENABLED === "true" && process.env.TON_WITHDRAWALS_PAUSED !== "true";
}

function toTonWithdrawalView(row: typeof tonWithdrawals.$inferSelect) {
  return {
    id: row.id,
    grossAmountNano: String(row.grossAmountNano),
    feeReserveNano: String(row.feeReserveNano),
    actualFeeNano: row.actualFeeNano === null ? null : String(row.actualFeeNano),
    netAmountNano: String(row.netAmountNano),
    destinationWalletAddress: toFriendlyTonAddress(row.destinationWalletAddress),
    reference: row.reference,
    status: row.status as TonWithdrawalStatus,
    riskReasons: row.riskReasons,
    transactionHash: row.transactionHash,
    transactionLt: row.transactionLt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    confirmedAt: row.confirmedAt,
  };
}

export async function getTonWithdrawals(openId: string) {
  const db = await getDb();
  if (!db) return [];
  const pending = await db.select({ id: tonWithdrawals.id }).from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, openId), inArray(tonWithdrawals.status, ["broadcast_pending", "sent"]))).limit(3);
  for (const withdrawal of pending) {
    try {
      await reconcileTonWithdrawal({ userOpenId: openId, withdrawalId: withdrawal.id });
    } catch {
      // Временная ошибка сети не должна ломать историю; следующая загрузка повторит только сверку.
    }
  }
  const rows = await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.userOpenId, openId)).orderBy(desc(tonWithdrawals.createdAt), desc(tonWithdrawals.id)).limit(20);
  return rows.map(toTonWithdrawalView);
}

export async function quoteTonWithdrawal(input: { amountTon: string; destinationWalletAddress: string }) {
  const quote = getTonWithdrawalQuote(input.amountTon);
  const destinationWalletAddress = normalizeTonAddress(input.destinationWalletAddress);
  return {
    grossAmountNano: quote.grossAmountNano.toString(),
    feeReserveNano: quote.feeReserveNano.toString(),
    netAmountNano: quote.netAmountNano.toString(),
    grossAmountTon: formatWithdrawalNanoTon(quote.grossAmountNano),
    feeReserveTon: formatWithdrawalNanoTon(quote.feeReserveNano),
    netAmountTon: formatWithdrawalNanoTon(quote.netAmountNano),
    destinationWalletAddress: toFriendlyTonAddress(destinationWalletAddress),
  };
}

export async function createTonWithdrawal(input: { userOpenId: string; amountTon: string; destinationWalletAddress: string; idempotencyKey: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const quote = getTonWithdrawalQuote(input.amountTon);
  const destinationWalletAddress = normalizeTonAddress(input.destinationWalletAddress);
  const payoutWalletAddress = await getConfiguredTonPayoutWalletAddress();
  if (destinationWalletAddress === payoutWalletAddress) throw new Error("Адрес получателя не может совпадать с горячим кошельком выплат");
  const existing = (await db.select().from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), eq(tonWithdrawals.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (existing) return toTonWithdrawalView(existing);
  const active = (await db.select().from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), inArray(tonWithdrawals.status, ["queued", "manual_review", "broadcast_pending", "sent"]))).orderBy(desc(tonWithdrawals.createdAt), desc(tonWithdrawals.id)).limit(1))[0];
  if (active) return toTonWithdrawalView(active);

  const now = new Date();
  const [priorDestination, userHour, addressRecent, userDay, globalMinute] = await Promise.all([
    db.select({ id: tonWithdrawals.id }).from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), eq(tonWithdrawals.destinationWalletAddress, destinationWalletAddress), eq(tonWithdrawals.status, "confirmed"))).limit(1),
    db.select({ total: sql<number>`count(*)`, lastAt: sql<Date | null>`max(${tonWithdrawals.createdAt})` }).from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), gte(tonWithdrawals.createdAt, new Date(now.getTime() - 60 * 60_000)))),
    db.select({ lastAt: sql<Date | null>`max(${tonWithdrawals.createdAt})` }).from(tonWithdrawals).where(and(eq(tonWithdrawals.destinationWalletAddress, destinationWalletAddress), gte(tonWithdrawals.createdAt, new Date(now.getTime() - TON_WITHDRAWAL_ADDRESS_COOLDOWN_MS)))),
    db.select({ totalNano: sql<string>`coalesce(sum(${tonWithdrawals.grossAmountNano}), 0)` }).from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), gte(tonWithdrawals.createdAt, new Date(now.getTime() - 24 * 60 * 60_000)))),
    db.select({ total: sql<number>`count(*)` }).from(tonWithdrawals).where(gte(tonWithdrawals.createdAt, new Date(now.getTime() - 60_000))),
  ]);
  const risk = classifyTonWithdrawalRisk({
    nowMs: now.getTime(),
    hasPriorConfirmedDestination: priorDestination.length > 0,
    userRequestsLastHour: Number(userHour[0]?.total ?? 0),
    userGrossTodayNano: BigInt(userDay[0]?.totalNano ?? "0"),
    lastUserRequestAtMs: userHour[0]?.lastAt ? new Date(userHour[0].lastAt).getTime() : null,
    lastAddressRequestAtMs: addressRecent[0]?.lastAt ? new Date(addressRecent[0].lastAt).getTime() : null,
    globalRequestsLastMinute: Number(globalMinute[0]?.total ?? 0),
    emergencyPaused: process.env.TON_WITHDRAWALS_PAUSED === "true",
  }, quote);
  const grossTon = formatWithdrawalNanoTon(quote.grossAmountNano);
  const reference = `TGTOP-WD-${randomBytes(16).toString("hex").toUpperCase()}`;
  let created: typeof tonWithdrawals.$inferSelect | undefined;
  await db.transaction(async tx => {
    const duplicate = (await tx.select().from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), eq(tonWithdrawals.idempotencyKey, input.idempotencyKey))).limit(1))[0];
    if (duplicate) {
      created = duplicate;
      return;
    }
    const activeInTransaction = (await tx.select().from(tonWithdrawals).where(and(eq(tonWithdrawals.userOpenId, input.userOpenId), inArray(tonWithdrawals.status, ["queued", "manual_review", "broadcast_pending", "sent"]))).orderBy(desc(tonWithdrawals.createdAt), desc(tonWithdrawals.id)).limit(1))[0];
    if (activeInTransaction) {
      created = activeInTransaction;
      return;
    }
    const debit = await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} - ${grossTon}` }).where(and(eq(users.openId, input.userOpenId), gte(users.mainBalanceTon, grossTon)));
    if (Number(debit[0]?.affectedRows ?? 0) !== 1) throw new Error("Недостаточно основного GRAM-баланса для вывода");
    const result = await tx.insert(tonWithdrawals).values({
      userOpenId: input.userOpenId,
      payoutWalletAddress,
      destinationWalletAddress,
      grossAmountNano: quote.grossAmountNano.toString(),
      feeReserveNano: quote.feeReserveNano.toString(),
      netAmountNano: quote.netAmountNano.toString(),
      idempotencyKey: input.idempotencyKey,
      reference,
      status: risk.status,
      riskReasons: risk.reasons.join(",") || null,
    });
    created = (await tx.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, Number(result[0]?.insertId ?? 0))).limit(1))[0];
  });
  if (!created) throw new Error("Не удалось создать заявку на вывод");
  return toTonWithdrawalView(created);
}

export async function broadcastQueuedTonWithdrawal(withdrawalId: number) {
  if (!isTonWithdrawalAutomationEnabled()) return { attempted: false as const, reason: "automation_disabled" as const };
  return runInPayoutQueue(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const withdrawal = (await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, withdrawalId)).limit(1))[0];
    if (!withdrawal || withdrawal.status !== "queued") return { attempted: false as const, reason: "not_queued" as const };
    const grossAmountNano = BigInt(withdrawal.grossAmountNano);
    let prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: grossAmountNano, reference: withdrawal.reference });
    const emulateFeeWithRetry = async (boc: string) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await emulateTonPayoutFee(boc);
        } catch (error) {
          lastError = error;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
      throw lastError;
    };
    let estimatedFeeNano: bigint;
    try {
      estimatedFeeNano = await emulateFeeWithRetry(prepared.boc);
      if (estimatedFeeNano <= BigInt(0) || estimatedFeeNano >= grossAmountNano) throw new Error("fee_exceeds_amount");
      const estimatedNetNano = grossAmountNano - estimatedFeeNano;
      prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: estimatedNetNano, reference: withdrawal.reference });
      // Re-estimate the final message once; this keeps the user's fee tied to the actual message being sent.
      estimatedFeeNano = await emulateFeeWithRetry(prepared.boc);
      if (estimatedFeeNano <= BigInt(0) || estimatedFeeNano >= grossAmountNano) throw new Error("fee_exceeds_amount");
      const finalNetNano = grossAmountNano - estimatedFeeNano;
      if (finalNetNano !== estimatedNetNano) {
        prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: finalNetNano, reference: withdrawal.reference });
      }
    } catch {
      const grossTon = formatWithdrawalNanoTon(grossAmountNano);
      await db.transaction(async tx => {
        const cancelled = await tx.update(tonWithdrawals).set({ status: "cancelled", riskReasons: `${withdrawal.riskReasons ? `${withdrawal.riskReasons},` : ""}fee_preflight`, failureReason: "Отмена: комиссию сети нельзя безопасно рассчитать" }).where(and(eq(tonWithdrawals.id, withdrawal.id), eq(tonWithdrawals.status, "queued")));
        if (Number(cancelled[0]?.affectedRows ?? 0) === 1) {
          await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${grossTon}` }).where(eq(users.openId, withdrawal.userOpenId));
        }
      });
      return { attempted: false as const, reason: "fee_preflight_cancelled" as const };
    }
    const netAmountNano = grossAmountNano - estimatedFeeNano;
    const marked = await db.update(tonWithdrawals).set({ status: "broadcast_pending", feeReserveNano: estimatedFeeNano.toString(), netAmountNano: netAmountNano.toString(), externalMessageHash: prepared.externalMessageHash, broadcastAt: new Date(), failureReason: null }).where(and(eq(tonWithdrawals.id, withdrawal.id), eq(tonWithdrawals.status, "queued")));
    if (Number(marked[0]?.affectedRows ?? 0) !== 1) return { attempted: false as const, reason: "state_changed" as const };
    try {
      await broadcastTonPayoutBoc(prepared.boc);
      return { attempted: true as const, reason: "submitted" as const };
    } catch (error) {
      if (error instanceof TonPayoutRejectedError) {
        const grossTon = formatWithdrawalNanoTon(grossAmountNano);
        await db.transaction(async tx => {
          const cancelled = await tx.update(tonWithdrawals).set({ status: "cancelled", actualFeeNano: "0", failureReason: "Сеть отклонила транзакцию; GRAM возвращён на основной баланс" }).where(and(eq(tonWithdrawals.id, withdrawal.id), eq(tonWithdrawals.status, "broadcast_pending"), sql`${tonWithdrawals.transactionHash} IS NULL`));
          if (Number(cancelled[0]?.affectedRows ?? 0) === 1) {
            await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${grossTon}` }).where(eq(users.openId, withdrawal.userOpenId));
          }
        });
        return { attempted: false as const, reason: "broadcast_rejected_refunded" as const };
      }
      // Тайм-аут может означать уже принятую трансляцию; до сетевой сверки повтор не выполняется.
      await db.update(tonWithdrawals).set({ failureReason: "Трансляция проверяется в сети" }).where(eq(tonWithdrawals.id, withdrawal.id));
      return { attempted: true as const, reason: "broadcast_ambiguous" as const };
    }
  });
}

export async function reconcileTonWithdrawal(input: { userOpenId: string; withdrawalId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const withdrawal = (await db.select().from(tonWithdrawals).where(and(eq(tonWithdrawals.id, input.withdrawalId), eq(tonWithdrawals.userOpenId, input.userOpenId))).limit(1))[0];
  if (!withdrawal) throw new Error("Заявка на вывод не найдена");
  if (withdrawal.status !== "broadcast_pending" && withdrawal.status !== "sent") return toTonWithdrawalView(withdrawal);
  const transactions = await getRecentTonDepositTransactions(withdrawal.payoutWalletAddress);
  const trackedTransaction = withdrawal.externalMessageHash
    ? await getTonPayoutTransactionByMessageHash(withdrawal.externalMessageHash)
    : null;
  const confirmedWithoutOutgoingPayout = Boolean(
    trackedTransaction?.success &&
    Array.isArray(trackedTransaction.out_msgs) &&
    trackedTransaction.out_msgs.length === 0,
  );
  if (confirmedWithoutOutgoingPayout) {
    const grossTon = formatWithdrawalNanoTon(BigInt(withdrawal.grossAmountNano));
    await db.transaction(async tx => {
      const cancelled = await tx.update(tonWithdrawals).set({
        status: "cancelled",
        actualFeeNano: "0",
        failureReason: "Отмена: сеть обработала внешнее сообщение без исходящей выплаты; GRAM возвращён на основной баланс",
      }).where(and(
        eq(tonWithdrawals.id, withdrawal.id),
        inArray(tonWithdrawals.status, ["broadcast_pending", "sent"]),
        sql`${tonWithdrawals.transactionHash} IS NULL`,
      ));
      if (Number(cancelled[0]?.affectedRows ?? 0) === 1) {
        await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${grossTon}` }).where(eq(users.openId, withdrawal.userOpenId));
      }
    });
    const final = (await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, withdrawal.id)).limit(1))[0];
    return { ...toTonWithdrawalView(final!), newlyConfirmed: false };
  }
  const candidates = trackedTransaction ? [trackedTransaction, ...transactions] : transactions;
  const matched = candidates.find(transaction => transaction.success && transaction.hash && transaction.lt !== null && transaction.lt !== undefined && (transaction.out_msgs ?? []).some(message => {
    try {
      return normalizeTonAddress(message?.destination?.address ?? "") === withdrawal.destinationWalletAddress && BigInt(message?.value ?? "0") === BigInt(withdrawal.netAmountNano) && decodeTonComment(message?.raw_body) === withdrawal.reference;
    } catch {
      return false;
    }
  }));
  if (!matched || !matched.hash || matched.lt === null || matched.lt === undefined) return toTonWithdrawalView(withdrawal);
  const actualFeeNano = BigInt(matched.total_fees ?? "0");
  const refundNano = actualFeeNano < BigInt(withdrawal.feeReserveNano) ? BigInt(withdrawal.feeReserveNano) - actualFeeNano : BigInt(0);
  let newlyConfirmed = false;
  await db.transaction(async tx => {
    const update = await tx.update(tonWithdrawals).set({ status: "confirmed", actualFeeNano: actualFeeNano.toString(), transactionHash: matched.hash!, transactionLt: String(matched.lt), sentAt: new Date(), confirmedAt: new Date(), failureReason: null }).where(and(eq(tonWithdrawals.id, withdrawal.id), inArray(tonWithdrawals.status, ["broadcast_pending", "sent"])));
    if (Number(update[0]?.affectedRows ?? 0) !== 1) return;
    if (refundNano > BigInt(0)) await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${formatWithdrawalNanoTon(refundNano)}` }).where(eq(users.openId, input.userOpenId));
    newlyConfirmed = true;
  });
  const final = (await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, withdrawal.id)).limit(1))[0];
  return { ...toTonWithdrawalView(final!), newlyConfirmed };
}

export async function reviewTonWithdrawal(input: { withdrawalId: number; reviewerOpenId: string; action: "approve" | "reject"; reason?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let result: typeof tonWithdrawals.$inferSelect | undefined;
  await db.transaction(async tx => {
    const withdrawal = (await tx.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, input.withdrawalId)).limit(1))[0];
    if (!withdrawal || withdrawal.status !== "manual_review") throw new Error("Заявка недоступна для ручной проверки");
    if (input.action === "reject") {
      await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${formatWithdrawalNanoTon(BigInt(withdrawal.grossAmountNano))}` }).where(eq(users.openId, withdrawal.userOpenId));
      await tx.update(tonWithdrawals).set({ status: "cancelled", reviewedAt: new Date(), reviewedByOpenId: input.reviewerOpenId, failureReason: input.reason?.trim() || "Операция отклонена при ручной проверке" }).where(eq(tonWithdrawals.id, withdrawal.id));
    } else {
      await tx.update(tonWithdrawals).set({ status: "queued", reviewedAt: new Date(), reviewedByOpenId: input.reviewerOpenId, failureReason: null }).where(eq(tonWithdrawals.id, withdrawal.id));
    }
    result = (await tx.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, withdrawal.id)).limit(1))[0];
  });
  if (!result) throw new Error("Не удалось обработать заявку");
  return toTonWithdrawalView(result);
}

export async function getTonWithdrawalsForManualReview() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.status, "manual_review")).orderBy(asc(tonWithdrawals.createdAt)).limit(100);
  return rows.map(row => ({ ...toTonWithdrawalView(row), userOpenId: row.userOpenId, riskLabels: (row.riskReasons ?? "").split(",").filter(Boolean).map(reason => getTonWithdrawalRiskLabel(reason as Parameters<typeof getTonWithdrawalRiskLabel>[0])) }));
}

export async function getAccountActivity(openId: string) {
  const db = await getDb();
  if (!db) return [];
  const [credits, starsPayments, bids, userDeals, transfers, deposits, withdrawals] = await Promise.all([
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
    db.select({
      id: tonDeposits.id,
      requestedAmountNano: tonDeposits.requestedAmountNano,
      creditedAmountTon: tonDeposits.creditedAmountTon,
      status: tonDeposits.status,
      createdAt: tonDeposits.createdAt,
      submittedAt: tonDeposits.submittedAt,
      confirmedAt: tonDeposits.confirmedAt,
    }).from(tonDeposits).where(eq(tonDeposits.userOpenId, openId)),
    db.select({
      id: tonWithdrawals.id,
      grossAmountNano: tonWithdrawals.grossAmountNano,
      status: tonWithdrawals.status,
      transactionHash: tonWithdrawals.transactionHash,
      createdAt: tonWithdrawals.createdAt,
      broadcastAt: tonWithdrawals.broadcastAt,
      sentAt: tonWithdrawals.sentAt,
      confirmedAt: tonWithdrawals.confirmedAt,
    }).from(tonWithdrawals).where(eq(tonWithdrawals.userOpenId, openId)),
  ]);
  const namedGroup = (groupTitle: string | null, groupUsername: string | null) => groupUsername ? `@${groupUsername}` : (groupTitle ?? "TG TOP");
  const normalizedCredits = credits.map(item => ({
    sourceId: item.id,
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
                  : item.kind === "ranking_spend"
                    ? "ranking_spend"
                    : item.kind === "ranking_refund"
                      ? "ranking_refund"
                      : "catalog_listing",
    subject: namedGroup(item.groupTitle, item.groupUsername),
    amount: item.amount / 100,
    currency: "GRAM" as const,
    direction: item.amount >= 0 ? "in" as const : "out" as const,
  }));
  const pairedRankingSpendRefunds = new Map<number, typeof normalizedCredits[number]>();
  const consumedRankingRefunds = new Set<number>();
  for (const refund of normalizedCredits.filter(item => item.title === "ranking_refund")) {
    const spend = normalizedCredits
      .filter(item => item.title === "ranking_spend" && !pairedRankingSpendRefunds.has(item.sourceId) && item.subject === refund.subject && Math.abs(item.amount) === Math.abs(refund.amount) && item.createdAt <= refund.createdAt)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    if (!spend) continue;
    pairedRankingSpendRefunds.set(spend.sourceId, refund);
    consumedRankingRefunds.add(refund.sourceId);
  }
  const creditActivity: Array<{
    id: string;
    type: "credit";
    status: string;
    createdAt: Date;
    title: string;
    subject: string;
    amount: number;
    currency: "GRAM";
    direction: "in" | "out" | "neutral";
  }> = [];
  for (const item of normalizedCredits) {
    const refund = pairedRankingSpendRefunds.get(item.sourceId);
    if (refund) {
      creditActivity.push({
        id: `ranking-refund-pair:${item.sourceId}:${refund.sourceId}`,
        type: "credit",
        status: "refunded",
        createdAt: refund.createdAt,
        title: "ranking_refund_pair",
        subject: item.subject,
        amount: 0,
        currency: "GRAM",
        direction: "neutral",
      });
      continue;
    }
    if (consumedRankingRefunds.has(item.sourceId)) continue;
    const { sourceId: _sourceId, ...activity } = item;
    creditActivity.push(activity);
  }
  return [
    ...creditActivity,
    ...starsPayments.map(item => ({ id: `stars:${item.id}`, type: "stars" as const, status: item.status, createdAt: item.paidAt ?? item.createdAt, title: "ranking_stars", subject: namedGroup(item.groupTitle, item.groupUsername), amount: item.starsAmount, currency: "Stars", direction: "out" as const })),
    ...bids.map(item => ({ id: `bid:${item.id}`, type: "bid" as const, status: item.status, createdAt: item.createdAt, title: "ranking_bid", subject: namedGroup(item.groupTitle, item.groupUsername), amount: item.bidAmount / 1000, currency: "GRAM", direction: "neutral" as const })),
    ...userDeals.map(item => ({ id: `deal:${item.id}`, type: "deal" as const, status: item.status, createdAt: item.createdAt, title: item.dealType, subject: namedGroup(item.groupTitle, item.groupUsername), amount: Number(item.price), currency: "TON", direction: item.buyerOpenId === openId ? "out" as const : "in" as const })),
    ...transfers.map(item => ({ id: `nft:${item.id}`, type: "nft_transfer" as const, status: item.status, createdAt: item.confirmedAt ?? item.createdAt, title: "nft_transfer", subject: item.username ? `@${item.username}` : "NFT", amount: null, currency: null, direction: item.senderOpenId === openId ? "out" as const : "in" as const })),
    ...deposits.map(item => ({
      id: `deposit:${item.id}`,
      type: "deposit" as const,
      status: item.status,
      createdAt: item.confirmedAt ?? item.submittedAt ?? item.createdAt,
      title: "gram_deposit",
      subject: "GRAM wallet",
      amount: item.creditedAmountTon === null ? Number(item.requestedAmountNano) / 1_000_000_000 : Number(item.creditedAmountTon),
      currency: "GRAM" as const,
      direction: item.status === "confirmed" ? "in" as const : "neutral" as const,
    })),
    ...withdrawals.map(item => ({
      id: `withdrawal:${item.id}`,
      type: "withdrawal" as const,
      status: item.status,
      createdAt: item.confirmedAt ?? item.sentAt ?? item.broadcastAt ?? item.createdAt,
      title: "gram_withdrawal",
      subject: "GRAM wallet",
      amount: Number(item.grossAmountNano) / 1_000_000_000,
      currency: "GRAM" as const,
      direction: item.status === "confirmed" ? "out" as const : "neutral" as const,
      transactionHash: item.status === "confirmed" ? item.transactionHash : null,
    })),
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
    referralLink: `https://t.me/TG_TOPBOT?start=ref_${referralCode}`,
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

const RANKING_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

async function ensureAuctionBoard(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, category: "Все" | "Каналы" | "Чаты", subcategory: string, country: string) {
  await db.insert(auctionSlots).values(RANKING_SLOT_NUMBERS.map(slotNumber => ({
    slotNumber,
    category,
    subcategory,
    country,
    title: "Свободное место",
    subtitle: "Ждет листинга",
    currentBid: "0 GRAM",
    bidAmount: 0,
    leaderUsername: "-",
  }))).onDuplicateKeyUpdate({ set: { updatedAt: sql`${auctionSlots.updatedAt}` } });
}

// TG TOP specific queries
export async function getAuctionSlots(category?: string, country?: string, subcategory?: string, city?: string) {
  const db = await getDb();
  if (!db) return [];

  const requestedCategory = category === "Каналы" || category === "Чаты" ? category : "Все";
  const requestedSubcategory = subcategory && subcategory !== "Все" ? subcategory : "Все";
  const boardCategory = "Все";
  const boardSubcategory = "Все";
  const boardCountry = country && country !== "Все" ? country : "Global";
  await ensureAuctionBoard(db, boardCategory, boardSubcategory, boardCountry);

  let slots = await db.select().from(auctionSlots).where(and(
    eq(auctionSlots.category, boardCategory),
    eq(auctionSlots.subcategory, boardSubcategory),
    eq(auctionSlots.country, boardCountry)
  )).orderBy(asc(auctionSlots.slotNumber));
  const eligibleConditions = [eq(groupsCatalog.status, "listed")];
  if (boardCountry !== "Global") eligibleConditions.push(eq(groupsCatalog.country, boardCountry));
  const eligibleGroups = await db.select().from(groupsCatalog).where(and(...eligibleConditions))
    .orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt), asc(groupsCatalog.id));
  const autoAssignments = planVacantRankingAssignments(slots, eligibleGroups.map(group => group.id));
  if (autoAssignments.length) {
    const eligibleById = new Map(eligibleGroups.map(group => [group.id, group]));
    const now = new Date();
    await db.transaction(async tx => {
      for (const assignment of autoAssignments) {
        const group = eligibleById.get(assignment.groupId);
        if (!group) continue;
        await tx.update(auctionSlots).set({
          groupId: group.id,
          title: group.title,
          subtitle: group.username ? `@${group.username}` : group.category,
          leaderUsername: group.username ?? group.title,
          leaderUserId: group.ownerOpenId,
          bidAmount: 100,
          currentBid: "0.1 GRAM",
          updatedAt: now,
        }).where(and(eq(auctionSlots.id, assignment.slotId), sql`${auctionSlots.groupId} IS NULL`));
      }
    });
    slots = await db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, boardCategory),
      eq(auctionSlots.subcategory, boardSubcategory),
      eq(auctionSlots.country, boardCountry)
    )).orderBy(asc(auctionSlots.slotNumber));
  }
  const globalBoard = boardCategory === "Все"
    ? slots
    : await db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, "Все"),
      eq(auctionSlots.subcategory, boardSubcategory),
      eq(auctionSlots.country, boardCountry)
    )).orderBy(asc(auctionSlots.slotNumber));
  const globalEntryByGroupId = new Map(globalBoard.filter(slot => slot.groupId !== null).map(slot => [slot.groupId!, slot]));
  const strictOrder = assignRankingEntriesToSlots(slots.filter(slot => slot.groupId !== null).map(slot => {
    const canonicalEntry = boardCategory === "Все" ? undefined : globalEntryByGroupId.get(slot.groupId!);
    return canonicalEntry ? { ...canonicalEntry, id: slot.id, heldSince: canonicalEntry.updatedAt } : { ...slot, heldSince: slot.updatedAt };
  }), slots);
  if (strictOrder.some((source, index) => source?.groupId !== slots[index]?.groupId || source?.bidAmount !== slots[index]?.bidAmount)) {
    const now = new Date();
    await db.transaction(async tx => {
      for (let index = 0; index < strictOrder.length; index += 1) {
        const source = strictOrder[index];
        const target = slots[index];
        if (!target || (source?.groupId === target.groupId && source?.bidAmount === target.bidAmount)) continue;
        await tx.update(auctionSlots).set(source ? {
          bidAmount: source.bidAmount,
          currentBid: source.currentBid,
          leaderUsername: source.leaderUsername,
          leaderUserId: source.leaderUserId,
          groupId: source.groupId,
          title: source.title,
          subtitle: source.subtitle,
          updatedAt: source.groupId === target.groupId ? target.updatedAt : now,
        } : {
          bidAmount: 0,
          currentBid: "0 GRAM",
          leaderUsername: "-",
          leaderUserId: null,
          groupId: null,
          title: "Свободное место",
          subtitle: "Ждет листинга",
          updatedAt: now,
        }).where(eq(auctionSlots.id, target.id));
      }
    });
    slots = await db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, boardCategory),
      eq(auctionSlots.subcategory, boardSubcategory),
      eq(auctionSlots.country, boardCountry)
    )).orderBy(asc(auctionSlots.slotNumber));
  }
  const groupIds = slots.map(slot => slot.groupId).filter((id): id is number => id !== null);
  if (groupIds.length === 0) return slots.map(slot => ({ ...slot, group: null }));
  const groupConditions = [inArray(groupsCatalog.id, groupIds)];
  if (requestedCategory !== "Все") groupConditions.push(eq(groupsCatalog.category, requestedCategory));
  if (country && country !== "Все" && country !== "Global") groupConditions.push(eq(groupsCatalog.country, country));
  if (requestedSubcategory !== "Все") groupConditions.push(eq(groupsCatalog.subcategory, requestedSubcategory));
  if (city && city !== "Все") groupConditions.push(eq(groupsCatalog.city, city));
  const groups = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
    ownerPublicProfile: users.publicProfile,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...groupConditions));
  const groupMap = new Map(groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl, ownerPublicProfile }) => {
    const publicGroup = toPublicGroup(group);
    return [
    group.id,
    {
      ...publicGroup,
      owner: canExposeOwnerProfile(ownerPublicProfile) ? {
        openId: group.ownerOpenId,
        name: ownerName,
        telegramUsername: ownerTelegramUsername,
        avatarUrl: ownerAvatarUrl,
      } : undefined,
    },
  ];
  }));
  return slots.map(slot => {
    const group = slot.groupId ? groupMap.get(slot.groupId) ?? null : null;
    return group
      ? { ...slot, group }
      : { ...slot, bidAmount: 0, currentBid: "0 GRAM", leaderUsername: "-", leaderUserId: null, groupId: null, title: "Свободное место", subtitle: "Ждет листинга", group: null };
  });
}

export type RankingLotOptions = {
  anonymousListing?: boolean;
  showOwnerContact?: boolean;
  managerPublic?: boolean;
  listingAnnouncementEnabled?: boolean;
  searchIndexable?: boolean;
  country?: string;
  city?: string;
  subcategory?: string;
  salePriceTon?: string | null;
  rewardActive?: boolean;
  rewardBudget?: number;
  rewardPerSubscription?: number;
  rewardPerManualAdd?: number;
};

function getRankingRewardBudgetAdjustment(group: typeof groupsCatalog.$inferSelect, options?: RankingLotOptions) {
  const includesRewardCampaign = [options?.rewardActive, options?.rewardBudget, options?.rewardPerSubscription, options?.rewardPerManualAdd]
    .some(value => value !== undefined);
  if (!includesRewardCampaign) return { reservedRewardBudget: 0, releasedRewardBudget: 0 };
  const config = {
    category: group.category,
    rewardActive: options?.rewardActive ?? group.rewardActive,
    rewardBudget: options?.rewardActive === false ? 0 : (options?.rewardBudget ?? group.rewardBudget),
    rewardPerSubscription: options?.rewardPerSubscription ?? group.rewardPerSubscription,
    rewardPerInvite: group.rewardPerInvite,
    rewardPerManualAdd: options?.rewardPerManualAdd ?? group.rewardPerManualAdd,
  };
  const validationError = validateRewardCampaignConfig(config);
  if (validationError) throw new Error(validationError);
  return {
    reservedRewardBudget: Math.max(0, config.rewardBudget - group.rewardBudget),
    releasedRewardBudget: Math.max(0, group.rewardBudget - config.rewardBudget),
  };
}

export async function placeBid(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number, options?: RankingLotOptions) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const group = groupId ? await getGroupById(groupId) : undefined;
  if (!groupId || !group) throw new Error("Группа недоступна для размещения");
  if (options?.subcategory && options.subcategory !== "General") {
    const [topic] = await db.select({ id: catalogTopics.id }).from(catalogTopics).where(and(eq(catalogTopics.category, group.category), eq(catalogTopics.code, options.subcategory))).limit(1);
    if (!topic) throw new Error("Выберите подкатегорию из доступного списка");
  }
  const selectedCountry = options?.country === "Global" ? undefined : options?.country;
  const effectiveCountry = selectedCountry ?? group.country;
  if (selectedCountry) {
    const [country] = await db.select({ id: catalogCountries.id }).from(catalogCountries).where(eq(catalogCountries.code, selectedCountry)).limit(1);
    if (!country) throw new Error("Выберите страну из доступного списка");
  }
  if (options?.city) {
    const [city] = await db.select({ id: catalogCities.id }).from(catalogCities).where(and(eq(catalogCities.countryCode, effectiveCountry), eq(catalogCities.code, options.city))).limit(1);
    if (!city) throw new Error("Выберите город из доступного списка");
  }
  const requestedTarget = (await db.select().from(auctionSlots).where(eq(auctionSlots.id, slotId)).limit(1))[0];
  if (!requestedTarget) throw new Error("Позиция рейтинга не найдена");
  const target = requestedTarget.category === "Все" && requestedTarget.subcategory === "Все"
    ? requestedTarget
    : (await db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, "Все"),
      eq(auctionSlots.subcategory, "Все"),
      eq(auctionSlots.country, requestedTarget.country),
      eq(auctionSlots.slotNumber, requestedTarget.slotNumber)
    )).limit(1))[0];
  if (!target) throw new Error("Общая позиция рейтинга не найдена");
  const slotFloor = getRankingFloorMilliTon(target.slotNumber);
  const targetIsHeldByAnotherGroup = target.groupId !== null && target.groupId !== groupId;
  if (!isQualifyingRankingBid(bidAmount, targetIsHeldByAnotherGroup ? target.bidAmount : 0, targetIsHeldByAnotherGroup, slotFloor)) {
    const requiredMilliTon = targetIsHeldByAnotherGroup
      ? getMinimumRankingBidMilliTon(target.bidAmount, true, slotFloor)
      : slotFloor;
    throw new Error(`Минимальная ставка для этой позиции — ${formatTonAmount(requiredMilliTon / 1000)} GRAM`);
  }
  const outbid = target.groupId && target.groupId !== groupId && target.leaderUserId
    ? {
        openId: target.leaderUserId,
        groupTitle: target.title,
        slotId: target.id,
        slotNumber: target.slotNumber,
        competitorBidAmount: bidAmount,
        restoreMinimumBidAmount: getMinimumRankingBidMilliTon(bidAmount, true, slotFloor),
      }
    : undefined;
  const rankingCategories = ["Все"] as const;
  await Promise.all(rankingCategories.map(category => ensureAuctionBoard(db, category, target.subcategory, target.country)));
  const boards = await Promise.all(rankingCategories.map(category =>
    db.select().from(auctionSlots).where(and(
      eq(auctionSlots.category, category),
      eq(auctionSlots.subcategory, target.subcategory),
      eq(auctionSlots.country, target.country)
    )).orderBy(asc(auctionSlots.slotNumber))
  ));

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
    for (const board of boards) {
      const strictOrder = assignRankingEntriesToSlots([
        ...board.filter(slot => slot.groupId !== null && slot.groupId !== groupId).map(slot => ({ ...slot, heldSince: slot.updatedAt })),
        incoming,
      ], board);

      for (let index = 0; index < board.length; index += 1) {
        const slot = board[index];
        const source = strictOrder[index];
        const groupChanged = slot.groupId !== (source?.groupId ?? null);
        const bidChanged = slot.bidAmount !== (source?.bidAmount ?? 0);
        if (!groupChanged && !bidChanged) continue;
        await tx.update(auctionSlots).set(source ? {
          bidAmount: source.bidAmount,
          currentBid: source.currentBid,
          leaderUsername: source.leaderUsername,
          leaderUserId: source.leaderUserId,
          groupId: source.groupId,
          title: source.title,
          subtitle: source.subtitle,
          updatedAt: groupChanged ? now : slot.updatedAt,
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
    }
    if (options) {
      const salePriceTon = options.salePriceTon?.trim() || null;
      const searchIndexingError = getSearchIndexingError({ username: group.username, searchIndexable: options.searchIndexable });
      if (searchIndexingError) throw new Error(searchIndexingError);
      await tx.update(groupsCatalog).set({
        ...(options.anonymousListing !== undefined ? { anonymousListing: options.anonymousListing } : {}),
        ...(options.showOwnerContact !== undefined ? { showOwnerContact: options.showOwnerContact } : {}),
        ...(options.managerPublic !== undefined ? { managerPublic: options.managerPublic } : {}),
        ...(options.listingAnnouncementEnabled !== undefined ? { listingAnnouncementEnabled: options.listingAnnouncementEnabled } : {}),
        ...(options.searchIndexable !== undefined ? { searchIndexable: options.searchIndexable } : {}),
        ...(options.country ? { country: options.country } : {}),
        ...(options.city !== undefined ? { city: options.city || null } : {}),
        ...(options.subcategory ? { subcategory: options.subcategory } : {}),
        ...(options.salePriceTon !== undefined ? { salePriceTon, listingType: salePriceTon ? "sale" : "catalog" } : {}),
        ...(options.rewardActive !== undefined ? { rewardActive: options.rewardActive } : {}),
        ...(options.rewardBudget !== undefined ? { rewardBudget: options.rewardBudget } : {}),
        ...(options.rewardPerSubscription !== undefined ? { rewardPerSubscription: options.rewardPerSubscription } : {}),
        ...(options.rewardPerManualAdd !== undefined ? { rewardPerManualAdd: options.rewardPerManualAdd } : {}),
      }).where(eq(groupsCatalog.id, group.id));
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

  return { id: rankingIntentId, slotNumber: target.slotNumber, bidAmount, groupTitle: group.title, outbid };
}

export async function payRankingBidWithGramCredit(slotId: number, bidAmount: number, currentBidStr: string, leaderUsername: string, leaderUserId: string, groupId?: number, options?: RankingLotOptions) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const spendUnits = Math.round((bidAmount / 1000) * 100);
  const group = groupId ? await getGroupById(groupId) : undefined;
  if (!group || group.ownerOpenId !== leaderUserId) throw new Error("Выберите свою группу из личной папки");
  const { reservedRewardBudget, releasedRewardBudget } = getRankingRewardBudgetAdjustment(group, options);
  const totalDebit = spendUnits + reservedRewardBudget - releasedRewardBudget;

  await db.transaction(async tx => {
    const result = await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} - ${spendUnits + reservedRewardBudget} + ${releasedRewardBudget}` }).where(and(eq(users.openId, leaderUserId), gte(users.bonusBalance, Math.max(0, totalDebit))));
    if (Number(result[0]?.affectedRows ?? 0) !== 1) {
      throw new Error(`Недостаточно GRAM на балансе. Нужно ${formatTonAmount(Math.max(0, totalDebit) / 100)} GRAM`);
    }
    await tx.insert(creditTransactions).values({ userOpenId: leaderUserId, groupId: groupId ?? null, amount: -spendUnits, kind: "ranking_spend" });
    if (reservedRewardBudget) await tx.insert(creditTransactions).values({ userOpenId: leaderUserId, groupId: groupId ?? null, amount: -reservedRewardBudget, kind: "reward_campaign_reserve" });
    if (releasedRewardBudget) await tx.insert(creditTransactions).values({ userOpenId: leaderUserId, groupId: groupId ?? null, amount: releasedRewardBudget, kind: "reward_campaign_release" });
  });

  try {
    return await placeBid(slotId, bidAmount, currentBidStr, leaderUsername, leaderUserId, groupId, options);
  } catch (error) {
    await db.transaction(async tx => {
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} + ${totalDebit}` }).where(eq(users.openId, leaderUserId));
      await tx.insert(creditTransactions).values({ userOpenId: leaderUserId, groupId: groupId ?? null, amount: totalDebit, kind: "ranking_refund" });
    });
    throw error;
  }
}

export async function createStarsRankingPaymentIntent(input: { userOpenId: string; slotId: number; groupId: number; bidAmount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const group = await getGroupById(input.groupId);
  if (!group || group.ownerOpenId !== input.userOpenId) throw new Error("Выберите свою группу из личной папки");
  const [slot] = await db.select().from(auctionSlots).where(eq(auctionSlots.id, input.slotId)).limit(1);
  if (!slot || !isQualifyingRankingBid(input.bidAmount, slot.bidAmount, slot.groupId !== null, getRankingFloorMilliTon(slot.slotNumber))) {
    throw new Error("Ставка больше недействительна. Обновите рейтинг и повторите попытку.");
  }
  if (slot.category !== "Все" && group.category !== slot.category) throw new Error("Выберите группу из той же категории рейтинга");
  if (slot.subcategory !== "Все" && group.subcategory !== slot.subcategory) throw new Error("Выберите группу из той же подкатегории рейтинга");
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
  if (!group || group.ownerOpenId !== intent.userOpenId || !slot || !isQualifyingRankingBid(intent.bidAmount, slot.bidAmount, slot.groupId !== null, getRankingFloorMilliTon(slot.slotNumber))) {
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
    const placement = await placeBid(intent.slotId, intent.bidAmount, `${formatTonAmount(intent.bidAmount / 1000)} GRAM`, group.username ?? group.title, intent.userOpenId, intent.groupId);
    await db.update(starsRankingPaymentIntents).set({
      status: "paid",
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      telegramUserId: String(input.telegramUserId),
      paidAt: new Date(),
    }).where(eq(starsRankingPaymentIntents.id, intent.id));
    return { status: "paid" as const, idempotent: false, outbid: placement.outbid };
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
    ownerPublicProfile: users.publicProfile,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(and(...conditions))
    .orderBy(asc(groupsCatalog.listedAt), asc(groupsCatalog.createdAt));
  return groups.map(({ group, ownerName, ownerTelegramUsername, ownerAvatarUrl, ownerPublicProfile }) => {
    const publicGroup = toPublicGroup(group);
    return {
      ...publicGroup,
      owner: canExposeOwnerProfile(ownerPublicProfile) ? {
        openId: group.ownerOpenId,
        name: ownerName,
        telegramUsername: ownerTelegramUsername,
        avatarUrl: ownerAvatarUrl,
      } : undefined,
    };
  });
}

export async function getPublicOwnerProfile(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const groups = await db.select().from(groupsCatalog).where(and(
    eq(groupsCatalog.ownerOpenId, openId),
    eq(groupsCatalog.status, "listed")
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
    .where(and(inArray(groupsCatalog.status, ["listed", "pending"]), eq(users.publicProfile, true)))
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

export async function flagGroupForModeration(chatId: string, reason: string, evidence?: string) {
  const db = await getDb();
  if (!db) return false;
  const [group] = await db.select().from(groupsCatalog).where(eq(groupsCatalog.chatId, chatId)).limit(1);
  if (!group || group.moderationStatus === "blocked" || group.moderationStatus === "review") return false;
  await db.transaction(async tx => {
    await tx.update(groupsCatalog).set({
      status: "review",
      moderationStatus: "review",
      moderationReason: reason,
      moderationReviewedAt: new Date(),
      listedAt: null,
    }).where(eq(groupsCatalog.id, group.id));
    await tx.update(auctionSlots).set({
      groupId: null,
      leaderUserId: null,
      leaderUsername: "-",
      currentBid: "0 TON",
      bidAmount: 0,
      title: "Свободное место",
      subtitle: "Ждет листинга",
    }).where(eq(auctionSlots.groupId, group.id));
    await tx.insert(moderationEvents).values({
      groupId: group.id,
      action: "auto_review",
      reason,
      evidenceSummary: evidence?.slice(0, 255),
    });
  });
  return true;
}

export async function getModerationQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupsCatalog)
    .where(inArray(groupsCatalog.moderationStatus, ["review", "blocked"]))
    .orderBy(desc(groupsCatalog.moderationReviewedAt));
}

export async function getActiveModerationListings() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ group: groupsCatalog, ownerName: users.name }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(eq(groupsCatalog.status, "listed"))
    .orderBy(desc(groupsCatalog.listedAt), desc(groupsCatalog.createdAt));
  return rows.map(({ group, ownerName }) => ({ ...group, ownerName }));
}

export async function moderateGroup(actorOpenId: string, groupId: number, action: "review" | "block" | "approve", reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const status = action === "block" ? "blocked" : action === "review" ? "review" : "pending";
  const moderationStatus = action === "block" ? "blocked" : action === "review" ? "review" : "approved";
  return await db.transaction(async tx => {
    const [group] = await tx.select({ id: groupsCatalog.id, ownerOpenId: groupsCatalog.ownerOpenId, title: groupsCatalog.title })
      .from(groupsCatalog).where(eq(groupsCatalog.id, groupId)).limit(1);
    if (!group) throw new Error("Площадка не найдена");
    await tx.update(groupsCatalog).set({
      status,
      moderationStatus,
      moderationReason: reason,
      moderationReviewedBy: actorOpenId,
      moderationReviewedAt: new Date(),
      listedAt: null,
    }).where(eq(groupsCatalog.id, groupId));
    if (action !== "approve") {
      await tx.update(auctionSlots).set({
        groupId: null,
        leaderUserId: null,
        leaderUsername: "-",
        currentBid: "0 TON",
        bidAmount: 0,
        title: "Свободное место",
        subtitle: "Ждет листинга",
      }).where(eq(auctionSlots.groupId, groupId));
    }
    await tx.insert(moderationEvents).values({
      groupId,
      actorOpenId,
      action: action === "approve" ? "manual_approve" : action === "block" ? "manual_block" : "manual_review",
      reason,
    });
    return group;
  });
}

export async function getModerationAccess(openId: string) {
  const db = await getDb();
  if (!db) return { canModerate: false, canManageModerators: false, role: "user" as const };
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.openId, openId)).limit(1);
  const role = user?.role ?? "user";
  return { role, canModerate: role === "admin" || role === "moderator", canManageModerators: role === "admin" };
}

export async function getCatalogTaxonomy() {
  const db = await getDb();
  if (!db) return { countries: [], cities: [], topics: [] };
  const [countries, cities, topics] = await Promise.all([
    db.select().from(catalogCountries).orderBy(asc(catalogCountries.sortOrder), asc(catalogCountries.label)),
    db.select().from(catalogCities).orderBy(asc(catalogCities.countryCode), asc(catalogCities.sortOrder), asc(catalogCities.label)),
    db.select().from(catalogTopics).orderBy(asc(catalogTopics.category), asc(catalogTopics.sortOrder), asc(catalogTopics.label)),
  ]);
  return { countries, cities, topics };
}

async function requireCatalogAdmin(openId: string) {
  const access = await getModerationAccess(openId);
  if (!access.canModerate) throw new Error("Недостаточно прав для управления справочниками");
}

export async function addCatalogCountry(adminOpenId: string, input: { code: string; label: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  await db.insert(catalogCountries).values({ code, label, sortOrder: 10_000 });
  return { code, label };
}

export async function deleteCatalogCountry(adminOpenId: string, countryCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const code = countryCode.trim();
  if (code === "Global") throw new Error("Системную страну «Весь мир» нельзя удалить");
  const [usedByGroup, configuredCity] = await Promise.all([
    db.select({ id: groupsCatalog.id }).from(groupsCatalog).where(eq(groupsCatalog.country, code)).limit(1),
    db.select({ id: catalogCities.id }).from(catalogCities).where(eq(catalogCities.countryCode, code)).limit(1),
  ]);
  if (usedByGroup[0]) throw new Error("Нельзя удалить страну: она используется в размещённом сообществе");
  if (configuredCity[0]) throw new Error("Сначала удалите города этой страны");
  await db.delete(catalogCountries).where(eq(catalogCountries.code, code));
}

export async function addCatalogCity(adminOpenId: string, input: { countryCode: string; code: string; label: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const countryCode = input.countryCode.trim();
  const [country] = await db.select({ id: catalogCountries.id }).from(catalogCountries).where(eq(catalogCountries.code, countryCode)).limit(1);
  if (!country) throw new Error("Сначала добавьте страну для этого города");
  const code = input.code.trim();
  const label = input.label.trim();
  await db.insert(catalogCities).values({ countryCode, code, label, sortOrder: 10_000 });
  return { countryCode, code, label };
}

export async function deleteCatalogCity(adminOpenId: string, cityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const [city] = await db.select().from(catalogCities).where(eq(catalogCities.id, cityId)).limit(1);
  if (!city) throw new Error("Город не найден");
  const [usedByGroup] = await db.select({ id: groupsCatalog.id }).from(groupsCatalog).where(and(eq(groupsCatalog.country, city.countryCode), eq(groupsCatalog.city, city.code))).limit(1);
  if (usedByGroup) throw new Error("Нельзя удалить город: он используется в размещённом сообществе");
  await db.delete(catalogCities).where(eq(catalogCities.id, cityId));
}

export async function addCatalogTopic(adminOpenId: string, input: { category: "Каналы" | "Чаты" | "Боты"; code: string; label: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const code = input.code.trim();
  const label = input.label.trim();
  await db.insert(catalogTopics).values({ category: input.category, code, label, sortOrder: 10_000 });
  return { category: input.category, code, label };
}

export async function deleteCatalogTopic(adminOpenId: string, topicId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireCatalogAdmin(adminOpenId);
  const [topic] = await db.select().from(catalogTopics).where(eq(catalogTopics.id, topicId)).limit(1);
  if (!topic) throw new Error("Рубрика не найдена");
  const [usedByGroup] = topic.category === "Боты"
    ? []
    : await db.select({ id: groupsCatalog.id }).from(groupsCatalog).where(and(eq(groupsCatalog.category, topic.category), eq(groupsCatalog.subcategory, topic.code))).limit(1);
  if (usedByGroup) throw new Error("Нельзя удалить рубрику: она используется в размещённом сообществе");
  await db.delete(catalogTopics).where(eq(catalogTopics.id, topicId));
}

export async function getModerators() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ openId: users.openId, name: users.name, telegramUsername: users.telegramUsername, avatarUrl: users.avatarUrl, role: users.role })
    .from(users).where(inArray(users.role, ["admin", "moderator"])).orderBy(asc(users.role), asc(users.telegramUsername));
}

export async function setModeratorRole(adminOpenId: string, telegramUsername: string, role: "moderator" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const access = await getModerationAccess(adminOpenId);
  if (!access.canManageModerators) throw new Error("Недостаточно прав для управления модераторами");
  const username = telegramUsername.replace(/^@/, "").trim();
  const [target] = await db.select().from(users).where(eq(users.telegramUsername, username)).limit(1);
  if (!target) throw new Error("Пользователь ещё не входил в TG TOP через Telegram");
  if (target.role === "admin") throw new Error("Главного администратора нельзя изменить этой операцией");
  await db.update(users).set({ role }).where(eq(users.openId, target.openId));
  return { openId: target.openId, role };
}

export async function setGroupManager(ownerOpenId: string, groupId: number, manager: { telegramUserId: string; username: string | null; name: string; avatarUrl?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(groupsCatalog).set({
    managerTelegramUserId: manager.telegramUserId,
    managerUsername: manager.username,
    managerName: manager.name,
    managerAvatarUrl: manager.avatarUrl ?? null,
  }).where(and(eq(groupsCatalog.id, groupId), eq(groupsCatalog.ownerOpenId, ownerOpenId)));
  if (!result[0]?.affectedRows) throw new Error("Сообщество недоступно для настройки менеджера");
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

export async function getOpenGiveaways() {
  const db = await getDb();
  if (!db) return [];
  const participantCount = sql<number>`COUNT(${giveawayParticipants.id})`;
  const rows = await db.select({
    giveaway: giveaways,
    groupTitle: groupsCatalog.title,
    groupUsername: groupsCatalog.username,
    groupAvatarFileId: groupsCatalog.avatarFileId,
    participantCount,
  }).from(giveaways)
    .leftJoin(groupsCatalog, eq(giveaways.groupId, groupsCatalog.id))
    .leftJoin(giveawayParticipants, eq(giveawayParticipants.giveawayId, giveaways.id))
    .where(and(eq(giveaways.status, "open"), gt(giveaways.endsAt, new Date())))
    .groupBy(giveaways.id, groupsCatalog.title, groupsCatalog.username, groupsCatalog.avatarFileId)
    .orderBy(asc(giveaways.endsAt), desc(giveaways.createdAt));
  return rows.map(row => ({
    ...row.giveaway,
    group: row.groupTitle ? { title: row.groupTitle, username: row.groupUsername, avatarFileId: row.groupAvatarFileId } : null,
    participantCount: Number(row.participantCount),
  }));
}

export async function createGiveaway(ownerOpenId: string, input: { groupId: number; title: string; prizeTitle: string; rules?: string; boostOnly?: boolean; endsAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const group = await getGroupById(input.groupId);
  if (!group || group.ownerOpenId !== ownerOpenId) throw new Error("Выберите свою группу из личного кабинета");
  if (!isValidGiveawayEnd(input.endsAt)) throw new Error("Укажите завершение минимум через 5 минут");
  const inserted = await db.insert(giveaways).values({
    groupId: group.id,
    ownerOpenId,
    title: input.title.trim(),
    prizeTitle: input.prizeTitle.trim(),
    rules: input.rules?.trim() || null,
    boostOnly: input.boostOnly ?? false,
    endsAt: input.endsAt,
  });
  return { id: Number(inserted[0]?.insertId ?? 0) };
}

export async function joinGiveaway(giveawayId: number, userOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [giveaway] = await db.select().from(giveaways).where(eq(giveaways.id, giveawayId)).limit(1);
  if (!giveaway || !isGiveawayOpen(giveaway.status, giveaway.endsAt)) throw new Error("Розыгрыш уже завершён или недоступен");
  if (giveaway.ownerOpenId === userOpenId) throw new Error("Владелец не может участвовать в своём розыгрыше");
  if (giveaway.boostOnly) {
    const telegramUserId = getTelegramChatIdFromOpenId(userOpenId);
    const [group] = await db.select({ chatId: groupsCatalog.chatId }).from(groupsCatalog).where(eq(groupsCatalog.id, giveaway.groupId)).limit(1);
    const verified = telegramUserId && group?.chatId && await verifyTelegramUserChatBoost({ chatId: group.chatId, telegramUserId });
    if (!verified) throw new Error("Для участия нужен активный буст этого сообщества и права администратора у @TG_TOPBOT");
  }
  try {
    await db.insert(giveawayParticipants).values({ giveawayId, userOpenId });
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
  }
  return { success: true };
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

export async function getGroupDetail(id: number, viewerOpenId?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [detailRow] = await db.select({
    group: groupsCatalog,
    ownerName: users.name,
    ownerTelegramUsername: users.telegramUsername,
    ownerAvatarUrl: users.avatarUrl,
    ownerPublicProfile: users.publicProfile,
  }).from(groupsCatalog)
    .leftJoin(users, eq(groupsCatalog.ownerOpenId, users.openId))
    .where(eq(groupsCatalog.id, id))
    .limit(1);
  if (!detailRow) return undefined;
  const { group, ownerName, ownerTelegramUsername, ownerAvatarUrl, ownerPublicProfile } = detailRow;
  const snapshots = await db.select().from(groupStatsSnapshots).where(eq(groupStatsSnapshots.groupId, id)).orderBy(desc(groupStatsSnapshots.recordedAt)).limit(30);
  const ownerNfts = await db.select().from(nftUsernames)
    .where(and(eq(nftUsernames.showcaseGroupId, group.id), eq(nftUsernames.status, "available")))
    .orderBy(desc(nftUsernames.createdAt));
  const detailGroup = toDetailGroup(group);
  const groupForViewer = group.managerPublic || group.ownerOpenId === viewerOpenId
    ? detailGroup
    : { ...detailGroup, managerTelegramUserId: null, managerUsername: null, managerName: null };
  return {
    group: groupForViewer,
    owner: canExposeOwnerProfile(ownerPublicProfile) ? {
      openId: group.ownerOpenId,
      name: ownerName,
      telegramUsername: ownerTelegramUsername,
      avatarUrl: ownerAvatarUrl,
    } : undefined,
    ownerContact: group.showOwnerContact && ownerTelegramUsername ? {
      telegramUsername: ownerTelegramUsername,
    } : undefined,
    snapshots: snapshots.reverse(),
    ownerNfts,
    analytics: { source: "tgtop_bot_observed" as const, observedSince: group.createdAt },
  };
}

export async function getPublicSearchGroupByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [group] = await db.select().from(groupsCatalog).where(and(
    eq(groupsCatalog.username, username),
    eq(groupsCatalog.status, "listed"),
    eq(groupsCatalog.searchIndexable, true),
  )).limit(1);
  if (!group?.username) return undefined;
  const snapshots = await db.select({
    membersCount: groupStatsSnapshots.membersCount,
    recordedAt: groupStatsSnapshots.recordedAt,
  }).from(groupStatsSnapshots).where(eq(groupStatsSnapshots.groupId, group.id)).orderBy(desc(groupStatsSnapshots.recordedAt)).limit(12);
  return {
    id: group.id,
    chatId: group.chatId,
    title: group.title,
    username: group.username,
    description: group.description,
    avatarFileId: group.avatarFileId,
    membersCount: group.membersCount,
    category: group.category,
    country: group.country,
    subcategory: group.subcategory,
    managerName: group.managerPublic ? group.managerName : null,
    managerUsername: group.managerPublic ? group.managerUsername : null,
    managerAvatarUrl: group.managerPublic ? group.managerAvatarUrl : null,
    lastStatsAt: group.lastStatsAt,
    snapshots: snapshots.reverse(),
  };
}

export async function getSearchIndexableGroups() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    username: groupsCatalog.username,
    lastStatsAt: groupsCatalog.lastStatsAt,
    listedAt: groupsCatalog.listedAt,
  }).from(groupsCatalog).where(and(
    eq(groupsCatalog.status, "listed"),
    eq(groupsCatalog.searchIndexable, true),
    sql`${groupsCatalog.username} IS NOT NULL`,
  )).orderBy(desc(groupsCatalog.lastStatsAt));
}

export async function recordGroupSnapshot(groupId: number, membersCount: number, messagesCount: number, joinedCount: number, leavesCount = 0, invitedCount = 0) {
  const db = await getDb();
  if (!db) return;
  await db.insert(groupStatsSnapshots).values({ groupId, membersCount, messagesCount, joinedCount, leavesCount, invitedCount });
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
  await recordGroupSnapshot(group.id, group.membersCount, nextMessages, group.joinedCount, group.leavesCount, group.invitedCount);
}

export function isTrackedChatInvitation(category: "Каналы" | "Чаты", joined: boolean, viaInviteLink: boolean, addedByAnotherMember: boolean): boolean {
  return category === "Чаты" && joined && (viaInviteLink || addedByAnotherMember);
}

export async function recordGroupMembership(chatId: string, joined: boolean, left: boolean, viaInviteLink: boolean, addedByAnotherMember = false) {
  const db = await getDb();
  if (!db) return;
  const group = await getGroupByChatId(chatId);
  if (!group) return;
  const nextJoined = group.joinedCount + (joined ? 1 : 0);
  const nextLeaves = group.leavesCount + (left ? 1 : 0);
  const nextInvited = group.invitedCount + (isTrackedChatInvitation(group.category, joined, viaInviteLink, addedByAnotherMember) ? 1 : 0);
  await db.update(groupsCatalog).set({
    joinedCount: nextJoined,
    leavesCount: nextLeaves,
    invitedCount: nextInvited,
    lastStatsAt: new Date(),
  }).where(eq(groupsCatalog.id, group.id));
  await recordGroupSnapshot(group.id, group.membersCount, group.messagesCount, nextJoined, nextLeaves, nextInvited);
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
  if (!group || group.status !== "listed" || !canCreateRewardPersonalInviteLink(group)) {
    throw new Error("Кампания вознаграждений недоступна для персональной ссылки");
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

export async function getRewardCampaignStats(ownerOpenId: string, groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(groupsCatalog).where(and(
    eq(groupsCatalog.id, groupId),
    eq(groupsCatalog.ownerOpenId, ownerOpenId),
  )).limit(1);
  if (!group) throw new Error("Кампания недоступна");

  const [ledgerRows, events, links] = await Promise.all([
    db.select({ kind: creditTransactions.kind, amount: creditTransactions.amount })
      .from(creditTransactions)
      .where(and(eq(creditTransactions.groupId, groupId), eq(creditTransactions.userOpenId, ownerOpenId))),
    db.select({
      id: rewardEvents.id,
      amount: rewardEvents.amount,
      eventType: rewardEvents.eventType,
      createdAt: rewardEvents.createdAt,
      beneficiaryOpenId: rewardEvents.beneficiaryOpenId,
      beneficiaryName: users.name,
      beneficiaryUsername: users.telegramUsername,
    }).from(rewardEvents)
      .leftJoin(users, eq(users.openId, rewardEvents.beneficiaryOpenId))
      .where(eq(rewardEvents.groupId, groupId))
      .orderBy(desc(rewardEvents.createdAt)),
    db.select({ id: rewardInviteLinks.id }).from(rewardInviteLinks).where(eq(rewardInviteLinks.groupId, groupId)),
  ]);
  const reservedUnits = Math.abs(ledgerRows.filter(row => row.kind === "reward_campaign_reserve").reduce((total, row) => total + row.amount, 0));
  const releasedUnits = ledgerRows.filter(row => row.kind === "reward_campaign_release").reduce((total, row) => total + row.amount, 0);
  const paidUnits = events.reduce((total, event) => total + event.amount, 0);
  return {
    campaignActive: isRewardCampaignActive(group),
    budgetReserved: reservedUnits,
    paidOut: paidUnits,
    refundableRemainder: Math.max(0, group.rewardBudget),
    previouslyReleased: releasedUnits,
    personalLinks: links.length,
    confirmedParticipants: events.length,
    participants: events.slice(0, 30).map(event => ({
      id: event.id,
      amount: event.amount,
      eventType: event.eventType,
      createdAt: event.createdAt,
      name: event.beneficiaryName ?? "Пользователь Telegram",
      username: event.beneficiaryUsername,
    })),
  };
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
  salePriceTon?: string | null;
  country?: string;
  city?: string;
  subcategory?: string;
  anonymousListing?: boolean;
  showOwnerContact?: boolean;
  managerPublic?: boolean;
  listingAnnouncementEnabled?: boolean;
  searchIndexable?: boolean;
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
    managerPublic: options.managerPublic ?? true,
    listingAnnouncementEnabled: options.listingAnnouncementEnabled,
    searchIndexable: options.searchIndexable,
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
  const selectedCountry = listingOptions.country === "Global" ? undefined : listingOptions.country;
  const effectiveCountry = selectedCountry ?? groups[0]?.country;
  if (selectedCountry) {
    const [country] = await db.select({ id: catalogCountries.id }).from(catalogCountries).where(eq(catalogCountries.code, selectedCountry)).limit(1);
    if (!country) throw new Error("Выберите страну из доступного списка");
  }
  if (listingOptions.city) {
    const [city] = await db.select({ id: catalogCities.id }).from(catalogCities).where(and(eq(catalogCities.countryCode, effectiveCountry), eq(catalogCities.code, listingOptions.city))).limit(1);
    if (!city) throw new Error("Выберите город из доступного списка");
  }
  if (listingOptions.subcategory && listingOptions.subcategory !== "General") {
    const categories = Array.from(new Set(groups.map(group => group.category)));
    const category = categories.length === 1 ? categories[0] : undefined;
    const [topic] = category
      ? await db.select({ id: catalogTopics.id }).from(catalogTopics).where(and(eq(catalogTopics.category, category), eq(catalogTopics.code, listingOptions.subcategory))).limit(1)
      : [];
    if (!topic) {
      throw new Error("Подкатегория не соответствует выбранным группам");
    }
  }
  const searchIndexingError = groups.map(group => getSearchIndexingError({ username: group.username, searchIndexable: listingOptions.searchIndexable })).find(Boolean);
  if (searchIndexingError) throw new Error(searchIndexingError);
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
      ...(listingOptions.managerPublic !== undefined ? { managerPublic: listingOptions.managerPublic } : {}),
      ...(listingOptions.listingAnnouncementEnabled !== undefined ? { listingAnnouncementEnabled: listingOptions.listingAnnouncementEnabled } : {}),
      ...(listingOptions.searchIndexable !== undefined ? { searchIndexable: listingOptions.searchIndexable } : {}),
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
        bidAmount: 100,
        currentBid: "0.1 GRAM",
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
    listingAnnouncementEnabled: listingOptions.listingAnnouncementEnabled ?? group.listingAnnouncementEnabled,
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
      rewardActive: false,
      rewardBudget: 0,
    }).where(inArray(groupsCatalog.id, uniqueGroupIds));

    for (const group of groups) {
      const refundableRemainder = Math.max(0, group.rewardBudget);
      if (!refundableRemainder) continue;
      await tx.update(users).set({ bonusBalance: sql`${users.bonusBalance} + ${refundableRemainder}` }).where(eq(users.openId, ownerOpenId));
      await tx.insert(creditTransactions).values({
        userOpenId: ownerOpenId,
        groupId: group.id,
        amount: refundableRemainder,
        kind: "reward_campaign_release",
      });
    }

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
        bidAmount: 100,
        currentBid: "0.1 GRAM",
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

  if (!recipient) throw new Error("Получатель не найден в TG TOP. Попросите его открыть приложение через @TG_TOPBOT.");
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
  if (!group || group.status !== "listed" || group.listingType !== "sale" || !group.salePriceTon || !Number.isFinite(Number(group.salePriceTon)) || Number(group.salePriceTon) <= 0) {
    throw new Error("Группа недоступна для безопасной покупки");
  }
  if (group.ownerOpenId === buyerOpenId) throw new Error("Нельзя купить собственную группу");
  const priceUnits = Math.round(Number(group.salePriceTon) * 100);
  const buyer = await getUserByOpenId(buyerOpenId);
  if (!hasSufficientGramBalance(buyer?.bonusBalance ?? 0, priceUnits)) {
    throw new Error(INSUFFICIENT_GRAM_BALANCE_MESSAGE);
  }
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

const NFT_RENTAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const NFT_RENTAL_MAX_DAYS = POLICY_NFT_RENTAL_MAX_DAYS;

function nftRentalReference() {
  return `nft_rent_${Date.now()}_${randomBytes(6).toString("hex")}`;
}

/** Creates an idempotent rental intent. It never debits a balance and never assigns a Telegram username. */
export async function createNftRentalDeal(nftId: number, buyerOpenId: string, rentalDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!Number.isInteger(rentalDays) || rentalDays < 1 || rentalDays > NFT_RENTAL_MAX_DAYS) throw new Error("Укажите корректный срок аренды");
  const [nft] = await db.select().from(nftUsernames).where(eq(nftUsernames.id, nftId)).limit(1);
  if (!nft || nft.status !== "available" || (nft.listingType !== "rent" && nft.listingType !== "both")) throw new Error("Collectible-юзернейм недоступен для аренды");
  if (nft.ownerOpenId === buyerOpenId) throw new Error("Нельзя арендовать собственный юзернейм");
  if (!validateRentalDays(rentalDays, nft.minRentalDays, nft.maxRentalDays)) throw new Error(`Срок аренды должен быть от ${nft.minRentalDays} до ${nft.maxRentalDays} дней`);
  const [existing] = await db.select().from(deals).where(and(eq(deals.nftId, nftId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.dealType, "nft_rent"), eq(deals.status, "open"))).limit(1);
  if (existing) return { deal: existing, nft, requiresExternalAssignment: true };
  await db.insert(deals).values({ nftId, buyerOpenId, sellerOpenId: nft.ownerOpenId, price: String(rentalTotalUnits(nft.rentalAmountPerDay, rentalDays)), dealType: "nft_rent", rentalDays, status: "open", fundingReference: nftRentalReference() });
  const [deal] = await db.select().from(deals).where(and(eq(deals.nftId, nftId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.dealType, "nft_rent"), eq(deals.status, "open"))).orderBy(desc(deals.id)).limit(1);
  return { deal, nft, requiresExternalAssignment: true };
}

/** Internal-only: call after independent payment/escrow verification. */
export async function markNftRentalFunded(dealId: number, fundingReference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!fundingReference.trim()) throw new Error("Нужна ссылка подтверждённого escrow-платежа");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.dealType, "nft_rent"))).limit(1);
  if (!deal) throw new Error("Аренда не найдена");
  if (deal.status === "escrow_funded" || deal.status === "active") return deal;
  if (deal.status !== "open") throw new Error("Эту аренду нельзя профинансировать");
  const fundedAt = new Date();
  await db.update(deals).set({ status: "escrow_funded", fundingReference: fundingReference.trim(), fundedAt, expiresAt: new Date(fundedAt.getTime() + NFT_RENTAL_WINDOW_MS) }).where(and(eq(deals.id, dealId), eq(deals.status, "open")));
  const [updated] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  return updated;
}

/** Internal-only: records an externally verified Telegram/Fragment assignment. */
export async function observeNftRentalAssignment(dealId: number, evidence: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.dealType, "nft_rent"))).limit(1);
  if (!deal || deal.status !== "escrow_funded") throw new Error("Сначала нужен подтверждённый escrow-платёж");
  if (!evidence.trim()) throw new Error("Нужна подтверждённая ссылка назначения Telegram/Fragment");
  if (deal.expiresAt && deal.expiresAt.getTime() < Date.now()) throw new Error("Окно назначения аренды истекло");
  await db.update(deals).set({ status: "active", transferObservedAt: new Date(), transferEvidence: evidence.trim().slice(0, 512) }).where(and(eq(deals.id, dealId), eq(deals.status, "escrow_funded")));
  const [updated] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  return updated;
}

export async function confirmNftRental(dealId: number, buyerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.dealType, "nft_rent"))).limit(1);
  if (!deal || !canConfirmNftRental(deal.status, Boolean(deal.transferObservedAt))) throw new Error("Подтверждение аренды пока недоступно");
  if (deal.buyerConfirmedAt) return { settlementLocked: true, alreadyConfirmed: true };
  await db.update(deals).set({ buyerConfirmedAt: new Date() }).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.status, "active")));
  return { settlementLocked: true, alreadyConfirmed: false };
}

export async function cancelNftRental(dealId: number, buyerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.dealType, "nft_rent"))).limit(1);
  if (!deal || !canCancelNftRental(deal.status)) throw new Error("Эту аренду уже нельзя отменить");
  await db.update(deals).set({ status: "cancelled", cancelledAt: new Date() }).where(and(eq(deals.id, dealId), eq(deals.buyerOpenId, buyerOpenId), eq(deals.status, deal.status)));
  return { requiresEscrowRefund: deal.status === "escrow_funded", noAssetTransfer: true };
}
