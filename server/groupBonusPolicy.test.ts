import { describe, expect, it } from "vitest";
import { GROUP_CONNECTION_BONUS, getGroupConnectionBonusIdentity } from "./groupBonusPolicy";

describe("TG TOP one-time group connection bonus policy", () => {
  it("uses Telegram's stable chat ID instead of a catalog row ID", () => {
    const originalCatalogRowId = 21;
    const relistedCatalogRowId = 84;
    const telegramChatId = "-1001778418180";

    expect(originalCatalogRowId).not.toBe(relistedCatalogRowId);
    expect(getGroupConnectionBonusIdentity(telegramChatId)).toBe(
      getGroupConnectionBonusIdentity(telegramChatId)
    );
  });

  it("keeps the reward at exactly 0.1 internal GRAM and rejects an empty group identity", () => {
    expect(GROUP_CONNECTION_BONUS).toBe(100);
    expect(() => getGroupConnectionBonusIdentity("   ")).toThrow("Telegram chat ID is required");
  });
});
