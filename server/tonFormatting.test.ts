import { describe, expect, it } from "vitest";
import { formatTonAmount } from "./tonFormatting";

describe("TG TOP TON display formatting", () => {
  it("removes unnecessary decimal zeroes without changing precision", () => {
    expect(formatTonAmount(0.1)).toBe("0.1");
    expect(formatTonAmount("1.000000000")).toBe("1");
    expect(formatTonAmount("12.500000000")).toBe("12.5");
    expect(formatTonAmount(0.101)).toBe("0.101");
  });
});
