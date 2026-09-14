import { describe, expect, it } from "vitest";
import { getModeratedGroupLifecycle } from "./moderationApprovalPolicy";

describe("group moderation approval lifecycle", () => {
  it("keeps an approved active listing listed without changing its placement time", () => {
    expect(getModeratedGroupLifecycle("listed", "approve")).toEqual({
      status: "listed",
      moderationStatus: "approved",
      keepsListedAt: true,
    });
  });

  it("returns approval of a review-held group to explicit owner-controlled pending state", () => {
    expect(getModeratedGroupLifecycle("review", "approve")).toEqual({
      status: "pending",
      moderationStatus: "approved",
      keepsListedAt: false,
    });
  });

  it("continues to remove a group from the active lifecycle for review or block", () => {
    expect(getModeratedGroupLifecycle("listed", "review").status).toBe("review");
    expect(getModeratedGroupLifecycle("listed", "block").status).toBe("blocked");
  });
});
