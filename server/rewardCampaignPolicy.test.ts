import { describe, expect, it } from "vitest";
import { getRewardAmount, isRewardCampaignActive, validateRewardCampaignConfig } from "./rewardCampaignPolicy";

describe("reward campaign policy", () => {
  it("uses subscriber and referral rewards only for channels", () => {
    const channel = { category: "Каналы" as const, rewardActive: true, rewardBudget: 10, rewardPerSubscription: 1, rewardPerInvite: 2, rewardPerManualAdd: 1 };
    expect(getRewardAmount(channel, "subscription")).toBe(1);
    expect(getRewardAmount(channel, "invite_referral")).toBe(2);
    expect(getRewardAmount(channel, "manual_add")).toBe(0);
  });

  it("uses manual-add rewards only for chats", () => {
    const chat = { category: "Чаты" as const, rewardActive: true, rewardBudget: 1, rewardPerSubscription: 5, rewardPerInvite: 5, rewardPerManualAdd: 1 };
    expect(getRewardAmount(chat, "manual_add")).toBe(1);
    expect(getRewardAmount(chat, "subscription")).toBe(0);
    expect(isRewardCampaignActive(chat)).toBe(true);
  });

  it("does not show an active campaign if no configured reward fits the remaining budget", () => {
    const empty = { category: "Каналы" as const, rewardActive: true, rewardBudget: 1, rewardPerSubscription: 2, rewardPerInvite: 0, rewardPerManualAdd: 1 };
    expect(isRewardCampaignActive(empty)).toBe(false);
    expect(validateRewardCampaignConfig(empty)).toContain("Бюджет");
  });
});
