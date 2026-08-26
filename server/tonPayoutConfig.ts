import { normalizeTonAddress } from "./tonDeposits";

/** Public payout wallet identity. This is intentionally separate from signing material. */
export function getConfiguredTonPayoutWalletAddress() {
  const configuredAddress = process.env.TON_PAYOUT_WALLET_ADDRESS?.trim();
  if (!configuredAddress) throw new Error("Адрес горячего кошелька выплат не настроен");
  return normalizeTonAddress(configuredAddress);
}
