export type ModerationAction = "review" | "block" | "approve";

export function getModeratedGroupLifecycle(existingStatus: string, action: ModerationAction) {
  if (action === "approve" && existingStatus === "listed") {
    return { status: "listed" as const, moderationStatus: "approved" as const, keepsListedAt: true };
  }
  if (action === "approve") {
    return { status: "pending" as const, moderationStatus: "approved" as const, keepsListedAt: false };
  }
  if (action === "block") {
    return { status: "blocked" as const, moderationStatus: "blocked" as const, keepsListedAt: false };
  }
  return { status: "review" as const, moderationStatus: "review" as const, keepsListedAt: false };
}
