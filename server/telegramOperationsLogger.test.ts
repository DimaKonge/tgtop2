import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { formatFinanceLog, formatTopActivityLog } from "./telegramOperationsLogger";

describe("private Telegram operations logs", () => {
  it("formats only concise operational information and strips line breaks from user supplied fields", () => {
    const message = formatTopActivityLog({ event: "bot_connected", groupTitle: "TOP\nspoof", groupId: 19, actor: { name: "Alex\nAdmin", username: "@alex" } });
    expect(message).toContain("TOP spoof");
    expect(message).toContain("Alex Admin · @alex");
    expect(message).not.toContain("\nspoof");
  });

  it("separates confirmed financial operation states without wallet-address payloads", () => {
    const message = formatFinanceLog({ event: "withdrawal_requested", amount: "0.3 GRAM", reference: "withdrawal-42" });
    expect(message).toContain("заявка на вывод");
    expect(message).toContain("withdrawal-42");
    expect(message).not.toContain("wallet");
  });

  it("does not contain bot management, payment or payout commands", () => {
    const source = readFileSync(new URL("./telegramOperationsLogger.ts", import.meta.url), "utf8");
    expect(source).toContain("sendMessage");
    expect(source).not.toContain("sendTransaction");
    expect(source).not.toContain("transfer");
    expect(source).not.toContain("refund");
  });
});
