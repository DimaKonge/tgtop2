import { describe, expect, it } from "vitest";
import { countSuccessfulTelegramAnnouncements } from "./listingAnnouncementPolicy";

describe("listing announcement delivery", () => {
  it("reports only announcements Telegram confirmed as delivered", () => {
    expect(countSuccessfulTelegramAnnouncements([])).toBe(0);
    expect(countSuccessfulTelegramAnnouncements([true, false, true])).toBe(2);
  });
});
