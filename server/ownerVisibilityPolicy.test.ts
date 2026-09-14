import { describe, expect, it } from "vitest";
import { canExposeOwnerProfile } from "./ownerVisibilityPolicy";

describe("owner public-profile visibility", () => {
  it("exposes an owner only after the owner has opted into a public profile", () => {
    expect(canExposeOwnerProfile(true)).toBe(true);
    expect(canExposeOwnerProfile(false)).toBe(false);
    expect(canExposeOwnerProfile(null)).toBe(false);
    expect(canExposeOwnerProfile(undefined)).toBe(false);
  });
});
