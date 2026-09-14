import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Telegram user API production sync safety", () => {
  it("uses a dedicated protected EnvironmentFile and does not access runtime.conf", () => {
    const source = readFileSync(new URL("../scripts/sync-telegram-user-api-production.sh", import.meta.url), "utf8");
    expect(source).toContain("/etc/tgtop/telegram-user-api.env");
    expect(source).toContain("EnvironmentFile=/etc/tgtop/telegram-user-api.env");
    expect(source).toContain("install -m 0600");
    expect(source).toContain("trap rollback ERR");
    expect(source).not.toContain("runtime.conf");
  });

  it("probes only a public MTProto configuration read without account login or messaging", () => {
    const source = readFileSync(new URL("../scripts/telegram-user-api-probe.mjs", import.meta.url), "utf8");
    expect(source).toContain("Api.help.GetConfig");
    expect(source).toContain("new StringSession(\"\")");
    expect(source).not.toContain("sendCode");
    expect(source).not.toContain("sendMessage");
    expect(source).not.toContain("signIn");
  });
});
