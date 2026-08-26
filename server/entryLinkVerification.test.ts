import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("verified TG TOP entry links", () => {
  it("opens public communities only after Telegram confirms the currently stored username", () => {
    const botSource = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(botSource).toContain('if (target.username) {');
    expect(botSource).toContain('if (profile.username === target.username) return `https://t.me/${profile.username}`;');
    expect(botSource).toContain('await invalidateStaleEntryLink(target);');
    expect(routerSource).toContain('resolveVerifiedEntryLink: protectedProcedure');
  });

  it("keeps private entry restricted to a confirmed stored invite and notifies the owner after removal", () => {
    const botSource = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const notificationSource = readFileSync(new URL("./telegramNotifications.ts", import.meta.url), "utf8");

    expect(botSource).toContain('if (target.inviteLink && profile.invite_link === target.inviteLink) return target.inviteLink;');
    expect(botSource).toContain('notifyCommunityEntryLinkInvalidated');
    expect(notificationSource).toContain('Подтверждённая ссылка входа изменилась или больше недоступна');
  });
});
