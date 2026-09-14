import { describe, expect, it } from "vitest";
import { formatCatalogDate, formatCatalogDateTime, formatGram, normalizeRankingBid, parseGramInput } from "./catalog-format";

describe("catalog formatting helpers", () => {
  it("formats empty date values without inventing a timestamp", () => {
    expect(formatCatalogDate(null)).toBe("—");
    expect(formatCatalogDateTime(undefined)).toBe("—");
  });

  it("formats and parses GRAM amounts in integer hundredths", () => {
    expect(formatGram(125)).toBe("1.25");
    expect(formatGram(-1)).toBe("0");
    expect(parseGramInput("1,25")).toBe(125);
    expect(parseGramInput("1.234")).toBeUndefined();
  });

  it("accepts only tenth-GRAM ranking bids", () => {
    expect(normalizeRankingBid(0.1)).toBe(0.1);
    expect(normalizeRankingBid(0.11)).toBeUndefined();
  });
});
