import { describe, expect, it } from "vitest";
import {
  TON_NANO,
  TON_WITHDRAWAL_FEE_SAFETY_MARGIN_NANO,
  TON_WITHDRAWAL_FEE_RESERVE_NANO,
  classifyTonWithdrawalRisk,
  quoteTonWithdrawal,
} from "./tonWithdrawalPolicy";

const ordinary = {
  nowMs: 1_000_000,
  hasPriorConfirmedDestination: true,
  userRequestsLastHour: 0,
  userGrossTodayNano: BigInt(0),
  lastUserRequestAtMs: null,
  lastAddressRequestAtMs: null,
  globalRequestsLastMinute: 0,
  emergencyPaused: false,
};

describe("TON withdrawal policy", () => {
  it("keeps the initial quote at the requested gross amount until network fee emulation", () => {
    const quote = quoteTonWithdrawal("1.11");
    expect(quote.grossAmountNano).toBe(BigInt("1110000000"));
    expect(quote.feeReserveNano).toBe(BigInt(0));
    expect(TON_WITHDRAWAL_FEE_RESERVE_NANO).toBe(BigInt(0));
    expect(TON_WITHDRAWAL_FEE_SAFETY_MARGIN_NANO).toBe(BigInt(0));
    expect(quote.netAmountNano).toBe(BigInt("1110000000"));
  });

  it("rejects gross amounts below 0.1 GRAM", () => {
    expect(() => quoteTonWithdrawal("0.099999999")).toThrow("0.1 GRAM");
  });

  it("keeps new destinations automatic and only blocks the hourly velocity limit", () => {
    const quote = quoteTonWithdrawal("0.1");
    expect(classifyTonWithdrawalRisk({ ...ordinary, hasPriorConfirmedDestination: false }, quote)).toMatchObject({ status: "queued", reasons: [] });
    expect(classifyTonWithdrawalRisk({ ...ordinary, userRequestsLastHour: 10 }, quote)).toMatchObject({ status: "manual_review", reasons: ["user_hourly_limit"] });
  });

  it("keeps large requests automatic without a daily cap", () => {
    expect(classifyTonWithdrawalRisk(ordinary, quoteTonWithdrawal("5"))).toMatchObject({ status: "queued", reasons: [] });
    expect(classifyTonWithdrawalRisk({ ...ordinary, userGrossTodayNano: BigInt(2000) * TON_NANO }, quoteTonWithdrawal("0.1"))).toMatchObject({ status: "queued", reasons: [] });
    expect(classifyTonWithdrawalRisk({ ...ordinary, lastUserRequestAtMs: 999_999, lastAddressRequestAtMs: 999_999 }, quoteTonWithdrawal("0.1"))).toMatchObject({ status: "queued", reasons: [] });
  });

  it("uses the emergency pause as a hard stop", () => {
    expect(() => classifyTonWithdrawalRisk({ ...ordinary, emergencyPaused: true }, quoteTonWithdrawal("0.1"))).toThrow("приостановлен");
  });
});
