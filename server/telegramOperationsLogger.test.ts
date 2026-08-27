import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { formatAdditionLog, formatFinanceLog, formatLaunchLog, formatTopActivityLog } from "./telegramOperationsLogger";

describe("private Telegram operations logs", () => {
  it("formats only concise operational information and strips line breaks from user supplied fields", () => {
    const message = formatTopActivityLog({ event: "bot_connected", groupTitle: "TOP\nspoof", groupId: 19, actor: { name: "Alex\nAdmin", username: "@alex" } });
    expect(message).toContain("TOP spoof");
    expect(message).toContain("Alex Admin · @alex");
    expect(message).not.toContain("\nspoof");
  });

  it("formats confirmed onboarding events for the additions topic", () => {
    const message = formatAdditionLog({ groupTitle: "TON\nCommunity", groupId: 77, chatType: "supergroup", actor: { name: "Owner", username: "owner" } });
    expect(message).toContain("➕ Новое добавление в TG TOP");
    expect(message).toContain("Тип: Группа");
    expect(message).toContain("Сообщество: TON Community");
    expect(message).toContain("Карточка: #77");
    expect(message).toContain("Владелец: Owner · @owner");
    expect(message).not.toContain("wallet");
  });

  it("separates confirmed financial operation states without wallet-address payloads", () => {
    const message = formatFinanceLog({ event: "withdrawal_requested", amount: "0.3 GRAM", reference: "withdrawal-42" });
    expect(message).toContain("заявка на вывод");
    expect(message).toContain("withdrawal-42");
    expect(message).not.toContain("wallet");
  });

  it("adds a Tonviewer link only when a confirmed network hash is explicitly supplied", () => {
    const pending = formatFinanceLog({ event: "withdrawal_sent", amount: "0.3 GRAM", reference: "withdrawal-42" });
    const confirmed = formatFinanceLog({
      event: "withdrawal_confirmed",
      amount: "0.3 GRAM",
      reference: "withdrawal-42",
      transactionHash: "a".repeat(64),
    });

    expect(pending).not.toContain("tonviewer.com");
    expect(confirmed).toContain(`https://tonviewer.com/transaction/${"a".repeat(64)}`);
    expect(confirmed).not.toContain("wallet");
  });

  it("omits a referrer for direct starts and shows only the verified referral account when present", () => {
    const direct = formatLaunchLog({ userId: "42", username: "guest", source: "direct", referrer: { username: "should_not_show" }, createdAt: new Date("2026-08-27T00:00:00.000Z") });
    const referral = formatLaunchLog({ userId: "43", username: "guest2", source: "referral", referrer: { name: "Ref Owner", username: "ref_owner" }, createdAt: new Date("2026-08-27T00:00:00.000Z") });

    expect(direct).not.toContain("Пришёл от:");
    expect(referral).toContain("Пришёл от: Ref Owner · @ref_owner");
  });

  it("does not contain bot management, payment or payout commands", () => {
    const source = readFileSync(new URL("./telegramOperationsLogger.ts", import.meta.url), "utf8");
    expect(source).toContain("sendMessage");
    expect(source).not.toContain("sendTransaction");
    expect(source).not.toContain("transfer");
    expect(source).not.toContain("refund");
  });
});
