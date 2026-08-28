export const ONBOARDING_INTENT_TTL_MS = 10 * 60 * 1_000;
export const ONBOARDING_INTENT_WINDOW_MS = 24 * 60 * 60 * 1_000;
export const MAX_ONBOARDING_INTENTS_PER_WINDOW = 3;

export type TelegramOnboardingKind = "group" | "channel";
export type TelegramOnboardingIntentStatus = "pending" | "consumed" | "expired" | "rate_limited";
export type OnboardingIntentWindow = { windowStartedAt: Date; issuedInWindow: number };

export function isTelegramOwnerOpenId(value: string): boolean {
  return /^telegram:\d+$/.test(value);
}

export function getTelegramIdFromOpenId(value: string): string | null {
  return isTelegramOwnerOpenId(value) ? value.slice("telegram:".length) : null;
}

export function isPendingOnboardingIntent(input: {
  status: TelegramOnboardingIntentStatus;
  expiresAt: Date;
  now: Date;
}): boolean {
  return input.status === "pending" && input.expiresAt.getTime() > input.now.getTime();
}

export function getOnboardingIntentWindow(input: {
  now: Date;
  windowStartedAt?: Date | null;
  issuedInWindow?: number | null;
}): OnboardingIntentWindow {
  const windowExpired = !input.windowStartedAt
    || input.now.getTime() - input.windowStartedAt.getTime() >= ONBOARDING_INTENT_WINDOW_MS;
  return windowExpired
    ? { windowStartedAt: input.now, issuedInWindow: 0 }
    : { windowStartedAt: input.windowStartedAt!, issuedInWindow: Math.max(0, input.issuedInWindow ?? 0) };
}

export function canIssueOnboardingIntent(input: {
  now: Date;
  windowStartedAt?: Date | null;
  issuedInWindow?: number | null;
}): boolean {
  return getOnboardingIntentWindow(input).issuedInWindow < MAX_ONBOARDING_INTENTS_PER_WINDOW;
}
