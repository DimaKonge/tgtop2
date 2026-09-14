import { describe, expect, it } from "vitest";
import { resolveSessionAppId } from "./_core/sdk";

describe("session token application identity", () => {
  it("uses a stable TG TOP app identifier when production has no Manus app id", () => {
    expect(resolveSessionAppId(undefined)).toBe("tgtop");
    expect(resolveSessionAppId("   ")).toBe("tgtop");
  });

  it("preserves the configured application identity when one is available", () => {
    expect(resolveSessionAppId("project-123")).toBe("project-123");
  });
});
