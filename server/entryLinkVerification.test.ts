import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolveVerifiedGroupEntryLink } from "./telegramBot";

const target = {
  id: 16,
  chatId: "-1001295827057",
  title: "TG TOP",
  ownerOpenId: "owner",
  username: "tg_top",
  inviteLink: null,
  monthlyEntryInviteLink: null,
  status: "listed",
};

describe("verified TG TOP entry links", () => {
  it("safely rebinds a renamed public username only after Telegram returns the same numeric chat ID", async () => {
    const recordVerifiedUsername = vi.fn().mockResolvedValue(true);
    const invalidate = vi.fn().mockResolvedValue(false);
    const notify = vi.fn();
    await expect(resolveVerifiedGroupEntryLink(target, {
      getChatProfile: async () => ({ id: -1001295827057, type: "channel", username: "TGTOP_Community" }),
      recordVerifiedPublicUsername: recordVerifiedUsername,
      invalidateStaleEntryLink: invalidate,
      notifyCommunityEntryLinkRevalidated: notify,
    })).resolves.toBe("https://t.me/TGTOP_Community");
    expect(recordVerifiedUsername).toHaveBeenCalledWith({ chatId: target.chatId, verifiedUsername: "TGTOP_Community" });
    expect(invalidate).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith({ openId: target.ownerOpenId, groupTitle: target.title, username: "TGTOP_Community" });
  });

  it("does not fall back to a stale public username when Telegram confirms the chat but public access disappeared", async () => {
    const invalidate = vi.fn().mockResolvedValue(true);
    await expect(resolveVerifiedGroupEntryLink(target, {
      getChatProfile: async () => ({ id: -1001295827057, type: "channel" }),
      invalidateStaleEntryLink: invalidate,
    })).rejects.toThrow("Публичный адрес сообщества больше недоступен");
    expect(invalidate).toHaveBeenCalledWith(target);
  });

  it("does not delist a group during a Telegram transport failure", async () => {
    const invalidate = vi.fn().mockResolvedValue(true);
    await expect(resolveVerifiedGroupEntryLink(target, {
      getChatProfile: async () => { throw new Error("transport unavailable"); },
      invalidateStaleEntryLink: invalidate,
    })).rejects.toThrow("Не удалось проверить ссылку сообщества");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("keeps a strict identity check for an unexpected Telegram chat ID", async () => {
    const invalidate = vi.fn().mockResolvedValue(true);
    await expect(resolveVerifiedGroupEntryLink(target, {
      getChatProfile: async () => ({ id: -100777, type: "channel", username: "TGTOP_Community" }),
      invalidateStaleEntryLink: invalidate,
    })).rejects.toThrow("Telegram-идентичность");
    expect(invalidate).toHaveBeenCalledWith(target);
  });

  it("keeps the protected resolver wired to the authenticated API", () => {
    const botSource = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(botSource).toContain('if (target.username) {');
    expect(botSource).toContain('if (profile.id !== chatId) {');
    expect(botSource).toContain('recordVerifiedPublicUsername');
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
