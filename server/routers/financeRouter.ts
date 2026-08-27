import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getSafeTonDepositError } from "../tonDepositErrorPolicy";
import { getSafeTonWithdrawalError } from "../tonWithdrawalErrorPolicy";
import { requireFinanceReviewer } from "../financeReviewAccess";
import { deliverOperationsLog, formatFinanceLog } from "../telegramOperationsLogger";
import { notifyTonDepositCredited } from "../telegramNotifications";

export const financeProcedures = {
  getAccount: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAccountLedger(ctx.user.openId);
  }),

  getAccountActivity: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAccountActivity(ctx.user.openId);
  }),

  getTonDeposits: protectedProcedure.query(async ({ ctx }) => {
    return await db.getTonDeposits(ctx.user.openId);
  }),

  getTonWithdrawalDefaultRecipient: protectedProcedure.query(async ({ ctx }) => {
    return await db.getTonWithdrawalDefaultRecipient(ctx.user.openId);
  }),

  createTonDeposit: protectedProcedure
    .input(z.object({
      amountTon: z.string().trim().min(1).max(32),
      senderWalletAddress: z.string().trim().regex(/^[EU]Q[A-Za-z0-9_-]{46}$/, "Подключите TON-кошелёк mainnet"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.createTonDeposit({
          userOpenId: ctx.user.openId,
          amountTon: input.amountTon,
          senderWalletAddress: input.senderWalletAddress,
        });
      } catch (error) {
        console.error("[TonDeposit] Could not create deposit:", error);
        throw new Error(getSafeTonDepositError(error));
      }
    }),

  markTonDepositSubmitted: protectedProcedure
    .input(z.object({ depositId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.markTonDepositSubmitted({ userOpenId: ctx.user.openId, depositId: input.depositId });
      } catch (error) {
        console.error("[TonDeposit] Could not mark deposit submitted:", error);
        throw new Error(getSafeTonDepositError(error));
      }
    }),

  verifyTonDeposit: protectedProcedure
    .input(z.object({ depositId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await db.verifyTonDeposit({ userOpenId: ctx.user.openId, depositId: input.depositId });
        if (result.newlyConfirmed) {
          void notifyTonDepositCredited({ openId: ctx.user.openId, amountTon: result.amountTon });
          void deliverOperationsLog("finance", formatFinanceLog({
            event: "deposit_confirmed",
            amount: `${result.amountTon} GRAM`,
            actor: { name: ctx.user.name, username: ctx.user.telegramUsername },
            reference: `deposit-${input.depositId}`,
          }));
        }
        return result;
      } catch (error) {
        console.error("[TonDeposit] Could not verify deposit:", error);
        throw new Error(getSafeTonDepositError(error));
      }
    }),

  getTonWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    return await db.getTonWithdrawals(ctx.user.openId);
  }),

  quoteTonWithdrawal: protectedProcedure
    .input(z.object({ amountTon: z.string().trim().min(1).max(32), destinationWalletAddress: z.string().trim().min(32).max(96) }))
    .mutation(async ({ input }) => {
      try {
        return await db.quoteTonWithdrawal(input);
      } catch (error) {
        throw new Error(getSafeTonWithdrawalError(error));
      }
    }),

  createTonWithdrawal: protectedProcedure
    .input(z.object({
      amountTon: z.string().trim().min(1).max(32),
      destinationWalletAddress: z.string().trim().min(32).max(96),
      idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9_-]{16,96}$/, "Некорректный ключ защиты операции"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await db.createTonWithdrawal({ ...input, userOpenId: ctx.user.openId });
        if (result.newlyCreated) {
          void deliverOperationsLog("finance", formatFinanceLog({
            event: "withdrawal_requested",
            amount: `${input.amountTon} GRAM`,
            actor: { name: ctx.user.name, username: ctx.user.telegramUsername },
            reference: result.reference,
          }));
        }
        return result;
      } catch (error) {
        console.error("[TonWithdrawal] Could not create withdrawal:", error);
        throw new Error(getSafeTonWithdrawalError(error));
      }
    }),

  reconcileTonWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.enqueueTonWithdrawalReconciliation({ userOpenId: ctx.user.openId, withdrawalId: input.withdrawalId });
      } catch (error) {
        console.error("[TonWithdrawal] Could not reconcile withdrawal:", error);
        throw new Error(getSafeTonWithdrawalError(error));
      }
    }),

  getTonWithdrawalsForManualReview: protectedProcedure.query(async ({ ctx }) => {
    const access = await db.getModerationAccess(ctx.user.openId);
    requireFinanceReviewer(access);
    return await db.getTonWithdrawalsForManualReview();
  }),

  reviewTonWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.number().int().positive(), action: z.enum(["approve", "reject"]), reason: z.string().trim().max(255).optional() }))
    .mutation(async ({ ctx, input }) => {
      const access = await db.getModerationAccess(ctx.user.openId);
      requireFinanceReviewer(access);
      try {
        return await db.reviewTonWithdrawal({ ...input, reviewerOpenId: ctx.user.openId });
      } catch (error) {
        console.error("[TonWithdrawal] Could not review withdrawal:", error);
        throw new Error(getSafeTonWithdrawalError(error));
      }
    }),
};

export const financeRouter = router(financeProcedures);
