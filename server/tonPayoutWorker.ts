import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { tonWithdrawals, users } from "../drizzle/schema";
import {
  acquireTonPayoutWalletLease,
  claimNextTonPayoutJob,
  completeTonPayoutJob,
  deferTonPayoutJob,
  enqueueTonPayoutJob,
  getDb,
  getUserByOpenId,
  reconcileTonWithdrawal,
  releaseTonPayoutWalletLease,
  sendTonPayoutJobToManualReview,
} from "./db";
import { formatNanoTon } from "./tonDeposits";
import { buildTonPayoutExternalBoc, broadcastTonPayoutBoc, emulateTonPayoutFee, TonPayoutRejectedError } from "./tonPayoutWallet";
import { getConfiguredTonPayoutWalletAddress } from "./tonPayoutConfig";
import { deliverOperationsLog, formatFinanceLog } from "./telegramOperationsLogger";

const RECONCILIATION_DELAY_MS = 30_000;
const WORKER_DISABLED_DELAY_MS = 60_000;
const WALLET_BUSY_DELAY_MS = 1_000;
const MAX_RECONCILIATION_ATTEMPTS = 60;

export function isTonPayoutWorkerBroadcastEnabled() {
  return process.env.TON_PAYOUT_WORKER_BROADCAST_ENABLED === "true"
    && process.env.TON_WITHDRAWALS_ENABLED === "true"
    && process.env.TON_WITHDRAWALS_PAUSED !== "true";
}

async function getFeeWithBoundedRetry(boc: string) {
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
}

async function cancelQueuedWithdrawalForFeeFailure(withdrawalId: number, userOpenId: string, grossAmountNano: bigint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const grossTon = formatNanoTon(grossAmountNano);
  await db.transaction(async tx => {
    const cancelled = await tx.update(tonWithdrawals).set({
      status: "cancelled",
      riskReasons: sql`concat_ws(',', ${tonWithdrawals.riskReasons}, 'fee_preflight')`,
      failureReason: "Отмена: комиссию сети нельзя безопасно рассчитать",
    }).where(and(eq(tonWithdrawals.id, withdrawalId), eq(tonWithdrawals.status, "queued")));
    if (Number(cancelled[0]?.affectedRows ?? 0) === 1) {
      await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${grossTon}` }).where(eq(users.openId, userOpenId));
    }
  });
}

async function cancelRejectedBroadcast(withdrawalId: number, userOpenId: string, grossAmountNano: bigint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const grossTon = formatNanoTon(grossAmountNano);
  await db.transaction(async tx => {
    const cancelled = await tx.update(tonWithdrawals).set({
      status: "cancelled",
      actualFeeNano: "0",
      failureReason: "Сеть отклонила транзакцию; GRAM возвращён на основной баланс",
    }).where(and(eq(tonWithdrawals.id, withdrawalId), eq(tonWithdrawals.status, "broadcast_pending"), sql`${tonWithdrawals.transactionHash} IS NULL`));
    if (Number(cancelled[0]?.affectedRows ?? 0) === 1) {
      await tx.update(users).set({ mainBalanceTon: sql`${users.mainBalanceTon} + ${grossTon}` }).where(eq(users.openId, userOpenId));
    }
  });
}

async function processBroadcastJob(job: NonNullable<Awaited<ReturnType<typeof claimNextTonPayoutJob>>>) {
  if (!isTonPayoutWorkerBroadcastEnabled()) {
    await deferTonPayoutJob(job.id, job.leaseToken, WORKER_DISABLED_DELAY_MS, "Broadcast worker отключён отдельным security flag");
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const withdrawal = (await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, job.withdrawalId)).limit(1))[0];
  if (!withdrawal || withdrawal.status !== "queued") {
    await completeTonPayoutJob(job.id, job.leaseToken);
    return;
  }
  const payoutWalletAddress = getConfiguredTonPayoutWalletAddress();
  const walletLease = await acquireTonPayoutWalletLease({ payoutWalletAddress, workerId: job.workerId });
  if (!walletLease) {
    await deferTonPayoutJob(job.id, job.leaseToken, WALLET_BUSY_DELAY_MS, "Горячий кошелёк занят другим worker");
    return;
  }
  try {
    const grossAmountNano = BigInt(withdrawal.grossAmountNano);
    let prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: grossAmountNano, reference: withdrawal.reference });
    let estimatedFeeNano: bigint;
    try {
      estimatedFeeNano = await getFeeWithBoundedRetry(prepared.boc);
      if (estimatedFeeNano <= BigInt(0) || estimatedFeeNano >= grossAmountNano) throw new Error("fee_exceeds_amount");
      const initialNetNano = grossAmountNano - estimatedFeeNano;
      prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: initialNetNano, reference: withdrawal.reference });
      estimatedFeeNano = await getFeeWithBoundedRetry(prepared.boc);
      if (estimatedFeeNano <= BigInt(0) || estimatedFeeNano >= grossAmountNano) throw new Error("fee_exceeds_amount");
      const finalNetNano = grossAmountNano - estimatedFeeNano;
      if (finalNetNano !== initialNetNano) {
        prepared = await buildTonPayoutExternalBoc({ destinationWalletAddress: withdrawal.destinationWalletAddress, amountNano: finalNetNano, reference: withdrawal.reference });
      }
    } catch {
      await cancelQueuedWithdrawalForFeeFailure(withdrawal.id, withdrawal.userOpenId, grossAmountNano);
      await completeTonPayoutJob(job.id, job.leaseToken);
      return;
    }
    const netAmountNano = grossAmountNano - estimatedFeeNano;
    const marked = await db.update(tonWithdrawals).set({
      status: "broadcast_pending",
      feeReserveNano: estimatedFeeNano.toString(),
      netAmountNano: netAmountNano.toString(),
      externalMessageHash: prepared.externalMessageHash,
      broadcastAt: new Date(),
      failureReason: null,
    }).where(and(eq(tonWithdrawals.id, withdrawal.id), eq(tonWithdrawals.status, "queued")));
    if (Number(marked[0]?.affectedRows ?? 0) !== 1) {
      await completeTonPayoutJob(job.id, job.leaseToken);
      return;
    }
    try {
      await broadcastTonPayoutBoc(prepared.boc);
      const user = await getUserByOpenId(withdrawal.userOpenId);
      void deliverOperationsLog("finance", formatFinanceLog({
        event: "withdrawal_sent",
        amount: `${formatNanoTon(netAmountNano)} GRAM`,
        actor: { name: user?.name, username: user?.telegramUsername },
        reference: withdrawal.reference,
      }));
    } catch (error) {
      if (error instanceof TonPayoutRejectedError) {
        await cancelRejectedBroadcast(withdrawal.id, withdrawal.userOpenId, grossAmountNano);
        await completeTonPayoutJob(job.id, job.leaseToken);
        return;
      }
      // An ambiguous response can mean that the chain accepted the message: never rebroadcast it.
      await db.update(tonWithdrawals).set({ failureReason: "Трансляция проверяется в сети" }).where(eq(tonWithdrawals.id, withdrawal.id));
    }
    await enqueueTonPayoutJob(withdrawal.id, "reconcile");
    await completeTonPayoutJob(job.id, job.leaseToken);
  } finally {
    await releaseTonPayoutWalletLease({ payoutWalletAddress, leaseToken: walletLease.leaseToken });
  }
}

async function processReconciliationJob(job: NonNullable<Awaited<ReturnType<typeof claimNextTonPayoutJob>>>) {
  const result = await reconcileTonWithdrawal({ withdrawalId: job.withdrawalId });
  if (result.status === "confirmed" && result.newlyConfirmed) {
    const db = await getDb();
    const withdrawal = db ? (await db.select().from(tonWithdrawals).where(eq(tonWithdrawals.id, job.withdrawalId)).limit(1))[0] : undefined;
    if (withdrawal) {
      const user = await getUserByOpenId(withdrawal.userOpenId);
      void deliverOperationsLog("finance", formatFinanceLog({
        event: "withdrawal_confirmed",
        amount: `${formatNanoTon(BigInt(withdrawal.netAmountNano))} GRAM`,
        actor: { name: user?.name, username: user?.telegramUsername },
        reference: withdrawal.reference,
      }));
    }
  }
  if (result.status === "confirmed" || result.status === "cancelled" || result.status === "failed_refunded") {
    await completeTonPayoutJob(job.id, job.leaseToken);
    return;
  }
  if (job.attempts >= MAX_RECONCILIATION_ATTEMPTS) {
    await sendTonPayoutJobToManualReview(job.id, job.leaseToken, "Сверка выплаты превысила безопасный лимит; нужна ручная проверка без повторной отправки");
    return;
  }
  await deferTonPayoutJob(job.id, job.leaseToken, RECONCILIATION_DELAY_MS, "Ожидание подтверждения сети; повторный broadcast запрещён");
}

export async function runTonPayoutWorkerTick(workerId: string) {
  const job = await claimNextTonPayoutJob(workerId);
  if (!job) return false;
  try {
    if (job.kind === "broadcast") await processBroadcastJob(job);
    else await processReconciliationJob(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка worker";
    if (job.attempts >= MAX_RECONCILIATION_ATTEMPTS) await sendTonPayoutJobToManualReview(job.id, job.leaseToken, message);
    else await deferTonPayoutJob(job.id, job.leaseToken, RECONCILIATION_DELAY_MS, message);
  }
  return true;
}

export function createTonPayoutWorkerId() {
  return `payout-worker-${randomUUID()}`;
}
