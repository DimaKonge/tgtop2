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

  it("keeps risk reasons in the audit trail but queues automatic payouts", () => {
    const quote = quoteTonWithdrawal("0.1");
    expect(classifyTonWithdrawalRisk({ ...ordinary, hasPriorConfirmedDestination: false }, quote)).toMatchObject({ status: "queued", reasons: ["new_destination"] });
    expect(classifyTonWithdrawalRisk({ ...ordinary, userRequestsLastHour: 2 }, quote)).toMatchObject({ status: "queued", reasons: ["user_hourly_limit"] });
  });

  it("queues a large or daily-limit request while retaining its risk reason", () => {
    expect(classifyTonWithdrawalRisk(ordinary, quoteTonWithdrawal("5"))).toMatchObject({ status: "queued", reasons: ["large_amount"] });
    expect(classifyTonWithdrawalRisk({ ...ordinary, userGrossTodayNano: BigInt(20) * TON_NANO }, quoteTonWithdrawal("0.1"))).toMatchObject({ status: "queued", reasons: ["daily_limit"] });
  });

  it("uses the emergency pause as a hard stop", () => {
    expect(() => classifyTonWithdrawalRisk({ ...ordinary, emergencyPaused: true }, quoteTonWithdrawal("0.1"))).toThrow("приостановлен");
  });
});
