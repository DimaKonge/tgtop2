import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP admin panel", () => {
  it("shows a role-gated fourth navigation cell with a live active-listing feed", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('type Page = "top" | "catalog" | "giveaways" | "mine" | "details" | "owner" | "profile" | "admin"');
    expect(source).toContain("getActiveModerationListings.useQuery");
    expect(source).toContain("refetchInterval: 10_000");
    expect(source).toContain('moderationAccess?.canModerate ? [{ key: "admin", label: "Админ", icon: ShieldCheck }]');
    expect(source).toContain("Модерация");
    expect(source).toContain("Залистенные сообщества");
    expect(source).toContain("Полный список по времени листинга: свежие сверху.");
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
    expect(source).toContain('Рубрика ботов');
    expect(source).toContain('botTopicOptions.map(topic =>');
    expect(source).toContain('setLotGroupId(starsPaymentGroup.id)');
    expect(source).toContain('setLotGroupId(detail.group.id);');
    expect(source).toContain('getGroupAdministrators.useQuery');
    expect(source).toContain('groupAdministratorsQuery.refetch()');
    expect(source).toContain('Обновить список');
  });

  it("renders only Telegram-returned analytics with readable labels and explicit unavailable states", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const chartPanelsSource = readFileSync(new URL("../components/analytics/ChartPanels.tsx", import.meta.url), "utf8");

    expect(source).toContain('from "@/components/analytics/ChartPanels"');
    expect(chartPanelsSource).toContain('"Total followers": "Всего подписчиков"');
    expect(chartPanelsSource).toContain('"Joined": "Подписались"');
    expect(chartPanelsSource).toContain('"Left": "Отписались"');
    expect(chartPanelsSource).toContain('label === "Joined" || label === "New members"');
    expect(chartPanelsSource).toContain('if (label === "Left") return "#f26667"');
    expect(chartPanelsSource).toContain("Telegram не отдал этот график за выбранный период.");
    expect(chartPanelsSource).toContain("const bucketGraph =");
    expect(source).toContain('title="Уведомления"');
    expect(source).toContain('title="Языки аудитории"');
    expect(source).toContain('title="Реакции"');
    expect(source).toContain('title="Источники новых подписчиков"');
    expect(source).toContain('showLatest={false}');
  });
});
