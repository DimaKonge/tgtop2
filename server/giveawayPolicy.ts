export const MIN_GIVEAWAY_DURATION_MS = 5 * 60 * 1000;

export function isValidGiveawayEnd(endsAt: Date, now = new Date()) {
  return Number.isFinite(endsAt.getTime()) && endsAt.getTime() >= now.getTime() + MIN_GIVEAWAY_DURATION_MS;
}

export function isGiveawayOpen(status: "open" | "closed" | "cancelled", endsAt: Date, now = new Date()) {
  return status === "open" && endsAt.getTime() > now.getTime();
}
