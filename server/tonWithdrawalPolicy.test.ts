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
  it("keeps every balance calculation in nanoTON and takes the network reserve from the gross amount", () => {
    const quote = quoteTonWithdrawal("1.11");
    expect(quote.grossAmountNano).toBe(BigInt("1110000000"));
    expect(quote.feeReserveNano).toBe(TON_WITHDRAWAL_FEE_RESERVE_NANO);
    expect(TON_WITHDRAWAL_FEE_SAFETY_MARGIN_NANO).toBe(BigInt("2000000"));
    expect(quote.netAmountNano).toBe(BigInt("1110000000") - TON_WITHDRAWAL_FEE_RESERVE_NANO);
  });

  it("rejects gross amounts below 0.1 TON", () => {
    expect(() => quoteTonWithdrawal("0.099999999")).toThrow("0.1 TON");
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
