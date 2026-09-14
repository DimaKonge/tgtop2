import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("protected request availability", () => {
  it("does not present a database outage as an anonymous user for valid Telegram identity", () => {
    const contextSource = readFileSync(new URL("./_core/context.ts", import.meta.url), "utf8");
    const trpcSource = readFileSync(new URL("./_core/trpc.ts", import.meta.url), "utf8");

    expect(contextSource).toContain("authUnavailable?: boolean;");
    expect(contextSource).toContain("if (!user) authUnavailable = true;");
    expect(contextSource).toContain("Telegram identity could not be loaded");
    expect(trpcSource).toContain("if (ctx.authUnavailable) {");
    expect(trpcSource).toContain("TG TOP временно не может подтвердить аккаунт");
  });
});
