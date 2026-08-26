import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const payoutSource = readFileSync(new URL("./tonPayoutWallet.ts", import.meta.url), "utf8");
const networkSource = readFileSync(new URL("./tonPayoutNetwork.ts", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("./tonPayoutWorker.ts", import.meta.url), "utf8");

describe("withdrawal reliability guards", () => {
  it("returns the existing active withdrawal before another balance debit", () => {
    expect(dbSource).toContain('const active = (await db.select().from(tonWithdrawals)');
    expect(dbSource).toContain('const activeInTransaction = (await tx.select().from(tonWithdrawals)');
    expect(dbSource).toContain('if (activeInTransaction)');
    expect(dbSource.indexOf('if (activeInTransaction)')).toBeLessThan(dbSource.indexOf('const debit = await tx.update(users)'));
  });

  it("tracks broadcast messages with the normalized TonAPI-compatible hash", () => {
    expect(payoutSource).toContain('getNormalizedExternalMessageHash');
    expect(networkSource).toContain('/v2/blockchain/messages/${messageHash}/transaction');
    expect(dbSource).toContain('getTonPayoutTransactionByMessageHash(withdrawal.externalMessageHash)');
  });

  it("retries only fee emulation inside the isolated worker before broadcasting", () => {
    expect(workerSource).toContain("async function getFeeWithBoundedRetry");
    expect(workerSource).toContain("attempt < 3");
    expect(workerSource.indexOf("async function getFeeWithBoundedRetry")).toBeLessThan(workerSource.indexOf("await broadcastTonPayoutBoc(prepared.boc)"));
    expect(dbSource).not.toContain("broadcastTonPayoutBoc");
  });

  it("returns a held balance exactly once when a finalized external message has no outgoing payout", () => {
    expect(dbSource).toContain("const confirmedWithoutOutgoingPayout = Boolean(");
    expect(dbSource).toContain("trackedTransaction.out_msgs.length === 0");
    expect(dbSource).toContain('status: "cancelled"');
    expect(dbSource).toContain("GRAM возвращён на основной баланс");
    expect(dbSource).toContain('sql`${tonWithdrawals.transactionHash} IS NULL`');
  });
});
