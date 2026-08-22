import { Address, beginCell, Cell } from "@ton/core";
import { randomBytes } from "node:crypto";

export const TON_DEPOSIT_MIN_NANO = BigInt("10000000");
export const TON_DEPOSIT_MAX_NANO = BigInt("1000000000000000");
export const TON_DEPOSIT_TTL_MS = 15 * 60 * 1_000;

type TonApiAddress = { address?: string | null } | null | undefined;
type TonApiMessage = {
  source?: TonApiAddress;
  destination?: TonApiAddress;
  value?: string | number | null;
  raw_body?: string | null;
  bounced?: boolean;
} | null | undefined;

export type TonApiTransaction = {
  hash?: string | null;
  lt?: string | number | null;
  success?: boolean;
  aborted?: boolean;
  in_msg?: TonApiMessage;
};

export type TonDepositMatch = { transactionHash: string; transactionLt: string; receivedNano: bigint };

export function normalizeTonAddress(value: string) {
  return Address.parse(value.trim()).toRawString();
}

export function toFriendlyTonAddress(value: string) {
  return Address.parse(value.trim()).toString({ urlSafe: true, bounceable: true, testOnly: false });
}

export function parseTonToNano(value: string) {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/^(0|[1-9]\d*)(?:\.(\d{1,9}))?$/);
  if (!match) throw new Error("Введите сумму TON с точностью до 0.000000001");
  const nano = BigInt(match[1]) * BigInt("1000000000") + BigInt((match[2] ?? "").padEnd(9, "0") || "0");
  if (nano < TON_DEPOSIT_MIN_NANO) throw new Error("Минимальное пополнение — 0.01 TON");
  if (nano > TON_DEPOSIT_MAX_NANO) throw new Error("Сумма пополнения превышает допустимый лимит");
  return nano;
}

export function formatNanoTon(value: bigint) {
  const whole = value / BigInt("1000000000");
  const fraction = (value % BigInt("1000000000")).toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function createTonDepositReference() {
  return `TGTOP-${randomBytes(16).toString("hex").toUpperCase()}`;
}

export function isTonDepositReference(value: string) {
  return /^TGTOP-[A-F0-9]{32}$/.test(value);
}

export function buildTonDepositPayload(reference: string) {
  if (!isTonDepositReference(reference)) throw new Error("Некорректный код пополнения");
  return beginCell().storeUint(0, 32).storeStringTail(reference).endCell().toBoc().toString("base64");
}

export function decodeTonComment(rawBody: string | null | undefined) {
  if (!rawBody || !/^[0-9a-f]+$/i.test(rawBody) || rawBody.length % 2) return null;
  try {
    const [body] = Cell.fromBoc(Buffer.from(rawBody, "hex"));
    const slice = body.beginParse();
    if (slice.remainingBits < 32 || slice.loadUint(32) !== 0) return null;
    return slice.loadStringTail();
  } catch {
    return null;
  }
}

function matchesAddress(actual: TonApiAddress, expected: string) {
  if (!actual?.address) return false;
  try {
    return normalizeTonAddress(actual.address) === expected;
  } catch {
    return false;
  }
}

export function findMatchingTonDepositTransaction(input: {
  transactions: TonApiTransaction[];
  senderWalletAddress: string;
  recipientWalletAddress: string;
  requestedAmountNano: bigint;
  reference: string;
}) : TonDepositMatch | null {
  const sender = normalizeTonAddress(input.senderWalletAddress);
  const recipient = normalizeTonAddress(input.recipientWalletAddress);

  for (const transaction of input.transactions) {
    const message = transaction.in_msg;
    if (!transaction.success || transaction.aborted || !message || message.bounced) continue;
    if (!transaction.hash || transaction.lt === undefined || transaction.lt === null) continue;
    if (!matchesAddress(message.source, sender) || !matchesAddress(message.destination, recipient)) continue;
    if (decodeTonComment(message.raw_body) !== input.reference) continue;
    try {
      const receivedNano = BigInt(message.value ?? 0);
      if (receivedNano < input.requestedAmountNano) continue;
      return { transactionHash: transaction.hash, transactionLt: String(transaction.lt), receivedNano };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getRecentTonDepositTransactions(recipientWalletAddress: string) {
  const apiKey = process.env.TONAPI_API_KEY;
  if (!apiKey) throw new Error("TonAPI не настроен");
  const recipient = normalizeTonAddress(recipientWalletAddress);
  const response = await fetch(`https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(recipient)}/transactions?limit=100&sort_order=desc`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Не удалось проверить транзакцию TON в сети");
  const payload = await response.json() as { transactions?: TonApiTransaction[] };
  return payload.transactions ?? [];
}
