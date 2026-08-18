import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP launch readiness", () => {
  it("keeps the router mounted and dismisses launch only after Home signals essential catalog readiness", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("./pages/Home.tsx", import.meta.url), "utf8");
    const launch = readFileSync(new URL("./components/TgTopLaunchScreen.tsx", import.meta.url), "utf8");

    expect(app).toContain('<Router onHomeReady={() => setAppReady(true)} />');
    expect(app).toContain('<TgTopLaunchScreen ready={appReady} onComplete={() => setIsLaunching(false)} />');
    expect(app).not.toContain('setTimeout(() => setIsLaunching(false)');
    expect(home).toContain('!slotsQuery.isFetched || !groupsQuery.isFetched');
    expect(launch).toContain('data-ready={showCompletion ? "true" : "false"}');
    expect(launch).toContain('isEnglish ? "Opening catalog" : "Открываем каталог"');
  });
});
