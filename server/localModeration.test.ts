import { describe, expect, it } from "vitest";
import { inspectLocalContent } from "./localModeration";

describe("inspectLocalContent", () => {
  it("допускает обычное описание сообщества", () => {
    expect(inspectLocalContent("Новости технологий и разборы обновлений каждый день")).toEqual({ verdict: "approved" });
  });

  it("направляет высокий риск на ручную проверку", () => {
    const result = inspectLocalContent("Закладки и наркотик без предоплаты");
    expect(result.verdict).toBe("review");
    expect(result.reason).toContain("запрещённые товары");
  });

  it("отмечает массовый спам по количеству ссылок", () => {
    const result = inspectLocalContent("https://a.test https://b.test https://c.test https://d.test");
    expect(result).toMatchObject({ verdict: "review", reason: "Подозрение на массовый спам" });
  });
});
