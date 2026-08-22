import { describe, expect, it } from "vitest";
import { TonPayoutRejectedError } from "./tonPayoutWallet";

describe("TonPayoutRejectedError", () => {
  it("is distinguishable from an ambiguous timeout", () => {
    const error = new TonPayoutRejectedError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TonPayoutRejectedError");
    expect(error.message).toContain("не принял");
  });
});
