import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP launch readiness", () => {
  it("keeps the router mounted and dismisses launch only after Home signals essential catalog readiness", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const home = ["./pages/Home.tsx", "./pages/useHomeController.ts", "./pages/home-helpers.ts", "./pages/TopPage.tsx", "./pages/CatalogPage.tsx", "./pages/GiveawaysPage.tsx", "./pages/MinePage.tsx", "./pages/DetailsPage.tsx", "./pages/OwnerPage.tsx", "./pages/AdminPage.tsx", "./pages/ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");
    const launch = readFileSync(new URL("./components/TgTopLaunchScreen.tsx", import.meta.url), "utf8");

    expect(app).toContain('<Router onHomeReady={() => setAppReady(true)} />');
    expect(app).toContain('<TgTopLaunchScreen ready={appReady} onComplete={() => setIsLaunching(false)} />');
    expect(app).toContain('manifestUrl="https://tgtop.me/tonconnect-manifest.json"');
    expect(app).toContain('actionsConfiguration={{ twaReturnUrl: "https://t.me/TG_TOPBOT" }}');
    expect(app).not.toContain('setTimeout(() => setIsLaunching(false)');
    expect(home).toContain('!slotsQuery.isFetched || !groupsQuery.isFetched');
    expect(launch).toContain('data-ready={showCompletion ? "true" : "false"}');
    expect(launch).toContain('isEnglish ? "Opening catalog" : "Открываем каталог"');
  });
});
