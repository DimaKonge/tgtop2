import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createTonPayoutWorkerId, isTonPayoutWorkerBroadcastEnabled } from "./tonPayoutWorker";

describe("isolated TON payout worker", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed unless the dedicated worker gate is explicitly enabled", () => {
    vi.stubEnv("TON_WITHDRAWALS_ENABLED", "true");
    vi.stubEnv("TON_WITHDRAWALS_PAUSED", "false");
    vi.stubEnv("TON_PAYOUT_WORKER_BROADCAST_ENABLED", "false");
    expect(isTonPayoutWorkerBroadcastEnabled()).toBe(false);

    vi.stubEnv("TON_PAYOUT_WORKER_BROADCAST_ENABLED", "true");
    expect(isTonPayoutWorkerBroadcastEnabled()).toBe(true);

    vi.stubEnv("TON_WITHDRAWALS_PAUSED", "true");
    expect(isTonPayoutWorkerBroadcastEnabled()).toBe(false);
  });

  it("keeps the public API on a short DB-only payout path", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const worker = readFileSync(new URL("./tonPayoutWorker.ts", import.meta.url), "utf8");

    expect(router).not.toContain("broadcastQueuedTonWithdrawal");
    expect(router).toContain("enqueueTonWithdrawalReconciliation");
    expect(dbSource).not.toContain("let payoutQueue");
    expect(dbSource).toContain("tonPayoutJobs");
    expect(worker).toContain("TON_PAYOUT_WORKER_BROADCAST_ENABLED");
    expect(worker).toContain("never rebroadcast");
  });

  it("uses durable lease/recovery controls and a hardened isolated service", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const signing = readFileSync(new URL("./tonPayoutWallet.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("./tonPayoutConfig.ts", import.meta.url), "utf8");
    const unit = readFileSync(new URL("../deploy/tgtop-payout-worker.service", import.meta.url), "utf8");

    expect(dbSource).toContain("claimNextTonPayoutJob");
    expect(dbSource).toContain("leaseExpiresAt");
    expect(dbSource).toContain("sendTonPayoutJobToManualReview");
    expect(dbSource).not.toContain("buildTonPayoutExternalBoc");
    expect(signing).toContain("TON_PAYOUT_WALLET_MNEMONIC");
    expect(config).not.toContain("TON_PAYOUT_WALLET_MNEMONIC");
    expect(unit).toContain("EnvironmentFile=/etc/tgtop/payout-worker.conf");
    expect(unit).toContain("NoNewPrivileges=true");
    expect(unit).toContain("ProtectSystem=strict");
    expect(unit).toContain("PrivateTmp=true");
    expect(createTonPayoutWorkerId()).not.toBe(createTonPayoutWorkerId());
  });
});
