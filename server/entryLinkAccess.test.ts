import { describe, expect, it } from "vitest";
import { canResolveVerifiedEntryLink } from "./entryLinkAccess";

describe("verified entry link access", () => {
  const privateTarget = { ownerOpenId: "telegram:owner", username: null };

  it("allows every signed-in visitor to resolve an already public username", () => {
    expect(canResolveVerifiedEntryLink({ target: { ...privateTarget, username: "tgtop_community" }, viewerOpenId: "telegram:visitor", canModerate: false })).toBe(true);
  });

  it("fail-closes a private invite URL for a non-owner non-moderator", () => {
    expect(canResolveVerifiedEntryLink({ target: privateTarget, viewerOpenId: "telegram:visitor", canModerate: false })).toBe(false);
  });

  it("allows a private invite URL only for its owner or an active moderator", () => {
    expect(canResolveVerifiedEntryLink({ target: privateTarget, viewerOpenId: "telegram:owner", canModerate: false })).toBe(true);
    expect(canResolveVerifiedEntryLink({ target: privateTarget, viewerOpenId: "telegram:moderator", canModerate: true })).toBe(true);
  });
});
