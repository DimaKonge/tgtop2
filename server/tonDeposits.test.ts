import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { buildTonDepositPayload, decodeTonComment, findMatchingTonDepositTransaction, formatNanoTon, parseTonToNano, toFriendlyTonAddress } from "./tonDeposits";

const sender = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ";
const recipient = "UQCXLfr3vjs5XpeyvEKX8SIYn9HxngQQI-ZVdg88HKkMnnJH";
const reference = "TGTOP-0123456789ABCDEF0123456789ABCDEF";

describe("TON deposit policy", () => {
  it("parses only precise positive TON amounts within deposit bounds", () => {
    expect(parseTonToNano("1.25")).toBe(BigInt("1250000000"));
    expect(formatNanoTon(BigInt("1250000000"))).toBe("1.25");
    expect(toFriendlyTonAddress(recipient)).toMatch(/^[EU]Q[A-Za-z0-9_-]{46}$/);
    expect(() => parseTonToNano("0.001")).toThrow("Минимальное пополнение");
    expect(() => parseTonToNano("1.0000000001")).toThrow("точностью");
  });

  it("matches only a successful incoming transaction with sender, receiver, amount and unique comment", () => {
    const rawBody = Buffer.from(buildTonDepositPayload(reference), "base64").toString("hex");
    expect(decodeTonComment(rawBody)).toBe(reference);
    const match = findMatchingTonDepositTransaction({
      senderWalletAddress: sender,
      recipientWalletAddress: recipient,
      requestedAmountNano: BigInt("1000000000"),
      reference,
      transactions: [{
        hash: "a".repeat(64),
        lt: "123456",
        success: true,
        aborted: false,
        in_msg: { source: { address: sender }, destination: { address: recipient }, value: "1250000000", raw_body: rawBody },
      }],
    });
    expect(match).toEqual({ transactionHash: "a".repeat(64), transactionLt: "123456", receivedNano: BigInt("1250000000") });
    expect(findMatchingTonDepositTransaction({
      senderWalletAddress: sender,
      recipientWalletAddress: recipient,
      requestedAmountNano: BigInt("1000000000"),
      reference,
      transactions: [{ hash: "b".repeat(64), lt: "7", success: true, in_msg: { source: { address: sender }, destination: { address: recipient }, value: "1250000000", raw_body: Buffer.from(buildTonDepositPayload("TGTOP-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"), "base64").toString("hex") } }],
    })).toBeNull();
    expect(findMatchingTonDepositTransaction({
      senderWalletAddress: sender,
      recipientWalletAddress: recipient,
      requestedAmountNano: BigInt("1000000000"),
      reference,
      transactions: [{ hash: "c".repeat(64), lt: "8", success: true, in_msg: { source: { address: recipient }, destination: { address: recipient }, value: "1250000000", raw_body: rawBody } }],
    })).toBeNull();
    expect(findMatchingTonDepositTransaction({
      senderWalletAddress: sender,
      recipientWalletAddress: recipient,
      requestedAmountNano: BigInt("1000000000"),
      reference,
      transactions: [{ hash: "d".repeat(64), lt: "9", success: true, in_msg: { source: { address: sender }, destination: { address: recipient }, value: "999999999", raw_body: rawBody } }],
    })).toBeNull();
  });
});
