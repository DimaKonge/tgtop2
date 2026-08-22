import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP admin panel", () => {
  it("shows a role-gated fourth navigation cell with a live active-listing feed", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('type Page = "top" | "catalog" | "giveaways" | "mine" | "details" | "owner" | "profile" | "admin"');
    expect(source).toContain("getActiveModerationListings.useQuery");
    expect(source).toContain("refetchInterval: 10_000");
    expect(source).toContain('moderationAccess?.canModerate ? [{ key: "admin", label: "Админ", icon: ShieldCheck }]');
    expect(source).toContain("Активные лоты");
    expect(source).toContain("Сначала показаны новые размещения");
    expect(source).toContain("openTelegramInNewBrowserTab(groupUrl)");
    expect(source).toContain('action: "review", reason: moderationReasonDraft.trim()');
    expect(source).toContain("Владельцу отправлена причина");
    expect(source).toContain("Доступ к админ-панели");
    expect(source).toContain("Дать доступ");
    expect(source).toContain("Забрать доступ");
    expect(source).toContain('setModeratorRole.mutate({ telegramUsername: moderatorUsernameDraft, role: "moderator" })');
    expect(source).toContain('detail && !ownsDetail && moderationAccess?.canModerate && detail.group.status === "listed"');
    expect(source).toContain('value={detailModerationReason}');
    expect(source).toContain('moderateGroup.mutate({ groupId: detail.group.id, action: "review", reason: detailModerationReason.trim() })');
    expect(source).toContain('tx("Снять с листинга", "Remove from listing")');
    expect(source).toContain('value="Боты"');
    expect(source).toContain('setCatalogTopicCategoryDraft(value as "Каналы" | "Чаты" | "Боты")');
    expect(source).toContain('aria-label="Рубрики ботов"');
    expect(source).toContain('botTopicOptions.map(topic =>');
  });
});
