import { Address, beginCell, external, internal, SendMode, storeMessage } from "@ton/core";
import { mnemonicToPrivateKey, mnemonicValidate } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { normalizeTonAddress } from "./tonDeposits";

type TonApiAccount = { status?: string | null };
type TonApiSeqno = { decoded?: { seqno?: number | string }; stack?: Array<unknown> };

function getTonApiHeaders() {
  const key = process.env.TONAPI_API_KEY?.trim();
  if (!key) throw new Error("TonAPI не настроен");
  return { Authorization: `Bearer ${key}` };
}

function parseSeqnoValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = value.startsWith("0x") ? Number.parseInt(value.slice(2), 16) : Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
  }
  if (value && typeof value === "object") {
    for (const candidate of Object.values(value as Record<string, unknown>)) {
      const parsed = parseSeqnoValue(candidate);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

async function getWalletMaterial() {
  const configuredAddress = process.env.TON_PAYOUT_WALLET_ADDRESS?.trim();
  const mnemonic = process.env.TON_PAYOUT_WALLET_MNEMONIC?.trim();
  if (!configuredAddress || !mnemonic) throw new Error("Горячий кошелёк выплат не настроен");
  const words = mnemonic.split(/\s+/).filter(Boolean);
  if (words.length !== 24 || !(await mnemonicValidate(words))) throw new Error("Секрет горячего кошелька недействителен");
  const keyPair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const expected = normalizeTonAddress(configuredAddress);
  if (normalizeTonAddress(wallet.address.toString({ urlSafe: true, bounceable: true, testOnly: false })) !== expected) {
    throw new Error("Секрет не соответствует адресу горячего кошелька");
  }
  return { wallet, secretKey: keyPair.secretKey, payoutWalletAddress: expected };
}

async function getPayoutWalletNetworkState(address: string) {
  const [accountResponse, seqnoResponse] = await Promise.all([
    fetch(`https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(address)}`, { headers: getTonApiHeaders(), signal: AbortSignal.timeout(12_000) }),
    fetch(`https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(address)}/methods/seqno`, { headers: getTonApiHeaders(), signal: AbortSignal.timeout(12_000) }),
  ]);
  if (!accountResponse.ok) throw new Error("Не удалось проверить состояние горячего кошелька");
  const account = await accountResponse.json() as TonApiAccount;
  // У неразвёрнутого V4R2 seqno равен нулю; TonAPI может вернуть 404 для get-method до развёртывания.
  if (!seqnoResponse.ok && account.status !== "uninit") throw new Error("Не удалось получить seqno горячего кошелька");
  const seqnoPayload = seqnoResponse.ok ? await seqnoResponse.json() as TonApiSeqno : {};
  const seqno = parseSeqnoValue(seqnoPayload.decoded?.seqno) ?? parseSeqnoValue(seqnoPayload.stack) ?? 0;
  return { isActive: account.status === "active", seqno };
}

export async function getConfiguredTonPayoutWalletAddress() {
  const material = await getWalletMaterial();
  return material.payoutWalletAddress;
}

export async function buildTonPayoutExternalBoc(input: { destinationWalletAddress: string; amountNano: bigint; reference: string }) {
  if (input.amountNano <= BigInt(0)) throw new Error("Сумма выплаты должна быть больше нуля");
  if (!/^TGTOP-WD-[A-F0-9]{32}$/.test(input.reference)) throw new Error("Некорректная ссылка выплаты");
  const destination = Address.parse(input.destinationWalletAddress);
  const { wallet, secretKey, payoutWalletAddress } = await getWalletMaterial();
  const state = await getPayoutWalletNetworkState(payoutWalletAddress);
  const body = await wallet.createTransfer({
    seqno: state.seqno,
    secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
    messages: [internal({ to: destination, value: input.amountNano, bounce: false, body: beginCell().storeUint(0, 32).storeStringTail(input.reference).endCell() })],
  });
  const message = external({ to: wallet.address, init: state.isActive ? null : wallet.init, body });
  const root = beginCell().store(storeMessage(message)).endCell();
  return {
    boc: root.toBoc().toString("base64"),
    externalMessageHash: root.hash().toString("hex"),
    payoutWalletAddress,
    seqno: state.seqno,
  };
}

export async function broadcastTonPayoutBoc(boc: string) {
  const response = await fetch("https://tonapi.io/v2/blockchain/message", {
    method: "POST",
    headers: { ...getTonApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ boc }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("TonAPI не принял сообщение выплаты");
}

export async function emulateTonPayoutFee(boc: string) {
  const response = await fetch("https://tonapi.io/v2/traces/emulate", {
    method: "POST",
    headers: { ...getTonApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ boc }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Не удалось безопасно оценить комиссию сети");
  const payload = await response.json() as { transaction?: { total_fees?: string | number | null } };
  const value = payload.transaction?.total_fees;
  try {
    const fee = BigInt(value ?? "");
    if (fee < BigInt(0)) throw new Error("negative");
    return fee;
  } catch {
    throw new Error("Не удалось безопасно оценить комиссию сети");
  }
}
