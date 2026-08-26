import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Telegram owner-DM worker safety", () => {
  const source = readFileSync(new URL("./telegramOwnerDmWorker.ts", import.meta.url), "utf8");

  it("filters incoming private messages by the permanent owner numeric ID", () => {
    expect(source).toContain("event.isPrivate");
    expect(source).toContain("binding.ownerTelegramId");
    expect(source).toContain("fromUsers: [binding.ownerTelegramId]");
  });

  it("requires a separate confirmation instead of confirming agent actions", () => {
    expect(source).toContain("automatic confirmation prohibited");
    expect(source).not.toContain("task.confirmAction");
  });

  it("keeps publishing, rights and financial operations out of the worker", () => {
    expect(source).not.toContain("sendFile");
    expect(source).not.toContain("inviteToChannel");
    expect(source).not.toContain("transfer");
    expect(source).not.toContain("withdrawal");
  });
});
