export type AnalyticsSource = "telegram_official" | "tgtop_observed" | "external_estimate";
export type AnalyticsPriority = "realtime" | "frequent" | "hourly" | "daily";
export type AnalyticsTargetKind = "channel" | "supergroup" | "group" | "chat";

export type AnalyticsTarget = {
  groupId: number;
  chatId: string;
  kind: AnalyticsTargetKind;
  listed: boolean;
  topRank?: number | null;
  enabled: boolean;
};

export type AnalyticsDelta = {
  value: number;
  direction: "up" | "down" | "flat";
  label: string;
  tone: "positive" | "negative" | "neutral";
};

/**
 * Only occupied TOP positions are realtime. The rest use bounded refreshes.
 * This function is deliberately pure so server jobs and UI tests share one policy.
 */
export function getAnalyticsPriority(target: AnalyticsTarget): AnalyticsPriority {
  if (!target.enabled || !target.listed) return "daily";
  if (target.topRank != null && target.topRank >= 1) return "realtime";
  return target.kind === "channel" || target.kind === "supergroup" ? "hourly" : "daily";
}

export function getAnalyticsDelta(previous: number | null | undefined, current: number | null | undefined): AnalyticsDelta {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return { value: 0, direction: "flat", label: "нет сравнения", tone: "neutral" };
  }
  const difference = Math.round(current - previous);
  if (difference > 0) return { value: difference, direction: "up", label: `+${difference}`, tone: "positive" };
  if (difference < 0) return { value: Math.abs(difference), direction: "down", label: `−${Math.abs(difference)}`, tone: "negative" };
  return { value: 0, direction: "flat", label: "без изменений", tone: "neutral" };
}

export function shouldRefreshAvatar(previousPhotoKey: string | null | undefined, currentPhotoKey: string | null | undefined) {
  return Boolean(currentPhotoKey && currentPhotoKey !== previousPhotoKey);
}
