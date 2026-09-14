import { describe, expect, it } from "vitest";
import { getSafeTonDepositError, TON_DEPOSIT_GENERIC_ERROR } from "./tonDepositErrorPolicy";

describe("TON deposit error policy", () => {
  it("keeps only recognised user-safe messages", () => {
    expect(getSafeTonDepositError(new Error("Минимальное пополнение — 0.01 TON"))).toContain("0.01 TON");
    expect(getSafeTonDepositError(new Error("Failed query: insert into `ton_deposits` values (...)"))).toBe(TON_DEPOSIT_GENERIC_ERROR);
  });
});
