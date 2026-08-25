import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const payoutSource = readFileSync(new URL("./tonPayoutWallet.ts", import.meta.url), "utf8");

describe("withdrawal reliability guards", () => {
  it("returns the existing active withdrawal before another balance debit", () => {
    expect(dbSource).toContain('const active = (await db.select().from(tonWithdrawals)');
    expect(dbSource).toContain('const activeInTransaction = (await tx.select().from(tonWithdrawals)');
    expect(dbSource).toContain('if (activeInTransaction)');
    expect(dbSource.indexOf('if (activeInTransaction)')).toBeLessThan(dbSource.indexOf('const debit = await tx.update(users)'));
  });

  it("tracks broadcast messages with the normalized TonAPI-compatible hash", () => {
    expect(payoutSource).toContain('getNormalizedExternalMessageHash');
    expect(payoutSource).toContain('/v2/blockchain/messages/${messageHash}/transaction');
    expect(dbSource).toContain('getTonPayoutTransactionByMessageHash(withdrawal.externalMessageHash)');
  });
});
