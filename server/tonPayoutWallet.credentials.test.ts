import { mnemonicValidate } from "@ton/crypto";
import { describe, expect, it } from "vitest";
import { WalletContractV4 } from "@ton/ton/dist/wallets/v4/WalletContractV4.js";
import { mnemonicToPrivateKey, mnemonicValidate } from "@ton/crypto";
import { normalizeTonAddress } from "./tonDeposits";
import { buildTonPayoutExternalBoc } from "./tonPayoutWallet";

const payoutAddress = process.env.TON_PAYOUT_WALLET_ADDRESS?.trim();
const payoutMnemonic = process.env.TON_PAYOUT_WALLET_MNEMONIC?.trim();
const tonApiKey = process.env.TONAPI_API_KEY?.trim();

describe("hot wallet payout configuration", () => {
  it("accepts the 24-word payout mnemonic, derives the configured V4R2 wallet and resolves it through TonAPI", async () => {
    expect(payoutAddress, "Missing TON_PAYOUT_WALLET_ADDRESS").toMatch(/^UQ|^EQ/);
    expect(payoutMnemonic, "Missing TON_PAYOUT_WALLET_MNEMONIC").toBeTruthy();
    expect(tonApiKey, "Missing TONAPI_API_KEY").toBeTruthy();

    const words = payoutMnemonic!.split(/\s+/).filter(Boolean);
    expect(words).toHaveLength(24);
    await expect(mnemonicValidate(words)).resolves.toBe(true);
    const keyPair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    expect(normalizeTonAddress(wallet.address.toString({ urlSafe: true, bounceable: true, testOnly: false }))).toBe(normalizeTonAddress(payoutAddress!));

    const response = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(payoutAddress!)}`, {
      headers: { Authorization: `Bearer ${tonApiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.ok).toBe(true);

    const prepared = await buildTonPayoutExternalBoc({
      destinationWalletAddress: payoutAddress!,
      amountNano: BigInt(1),
      reference: "TGTOP-WD-0123456789ABCDEF0123456789ABCDEF",
    });
    expect(prepared.boc.length).toBeGreaterThan(100);
    expect(prepared.externalMessageHash).toMatch(/^[a-f0-9]{64}$/);
  }, 20_000);
});
