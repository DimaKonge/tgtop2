import { describe, expect, it } from "vitest";
import {
  MAX_ONBOARDING_INTENTS_PER_WINDOW,
  ONBOARDING_INTENT_WINDOW_MS,
  canIssueOnboardingIntent,
  getOnboardingIntentWindow,
  getTelegramIdFromOpenId,
  isPendingOnboardingIntent,
} from "./onboardingIntentPolicy";

describe("anti-Sybil onboarding intent policy", () => {
  const now = new Date("2026-08-28T00:00:00.000Z");

  it("accepts only Telegram-backed owner identities", () => {
    expect(getTelegramIdFromOpenId("telegram:12345")).toBe("12345");
    expect(getTelegramIdFromOpenId("telegram:-1")).toBeNull();
    expect(getTelegramIdFromOpenId("manus:user-1")).toBeNull();
  });

  it("keeps only fresh pending intents eligible for bot-added onboarding", () => {
    expect(isPendingOnboardingIntent({ status: "pending", expiresAt: new Date(now.getTime() + 1), now })).toBe(true);
    expect(isPendingOnboardingIntent({ status: "pending", expiresAt: now, now })).toBe(false);
    expect(isPendingOnboardingIntent({ status: "consumed", expiresAt: new Date(now.getTime() + 1), now })).toBe(false);
  });

  it("enforces three issued intents per owner/kind rolling window and resets after one day", () => {
    expect(canIssueOnboardingIntent({ now, windowStartedAt: now, issuedInWindow: MAX_ONBOARDING_INTENTS_PER_WINDOW - 1 })).toBe(true);
    expect(canIssueOnboardingIntent({ now, windowStartedAt: now, issuedInWindow: MAX_ONBOARDING_INTENTS_PER_WINDOW })).toBe(false);
    expect(getOnboardingIntentWindow({
      now,
      windowStartedAt: new Date(now.getTime() - ONBOARDING_INTENT_WINDOW_MS),
      issuedInWindow: MAX_ONBOARDING_INTENTS_PER_WINDOW,
    })).toEqual({ windowStartedAt: now, issuedInWindow: 0 });
  });
});
