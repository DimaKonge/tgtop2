import { describe, expect, it } from "vitest";

describe("TonAPI credentials", () => {
  it("authorizes a lightweight masterchain request", async () => {
    const apiKey = process.env.TONAPI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://tonapi.io/v2/blockchain/masterchain-head", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
    const payload = await response.json() as { seqno?: unknown };
    expect(typeof payload.seqno).toBe("number");
  }, 15_000);

  it("authorizes the configured deposit wallet address", async () => {
    const apiKey = process.env.TONAPI_API_KEY;
    const depositWallet = process.env.TON_DEPOSIT_WALLET_ADDRESS;
    expect(apiKey).toBeTruthy();
    expect(depositWallet).toMatch(/^[EU]Q[A-Za-z0-9_-]{46}$/);

    const response = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(depositWallet!)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).not.toBe(400);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 15_000);
});
