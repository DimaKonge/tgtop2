import { chromium } from "playwright";

const url = process.env.TG_TOP_VERIFY_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector(".tg-launch"), { timeout: 8_000 });

  const countryControl = page.getByRole("button", { name: "Весь мир", exact: true });
  const firstFeaturedCard = page.getByRole("button", { name: "Добавить группу", exact: true }).first();
  await Promise.all([countryControl.click(), page.getByText("Настроить выдачу", { exact: true }).waitFor()]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector(".tg-launch"), { timeout: 8_000 });
  await Promise.all([
    page.locator('button[aria-label="Settings"]').click(),
    page.locator('[role="dialog"]').last().waitFor(),
  ]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector(".tg-launch"), { timeout: 8_000 });
  await Promise.all([firstFeaturedCard.click(), page.getByText("Мои группы", { exact: true }).waitFor()]);
  await page.getByRole("button", { name: "Топ", exact: true }).click();

  const result = await page.evaluate(() => {
    const addGroupCards = [...document.querySelectorAll("button")]
      .filter(button => button.textContent?.includes("Добавить группу"))
      .slice(0, 7)
      .map(button => {
        const rect = button.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
    const navigation = document.querySelector("nav")?.getBoundingClientRect();
    const featuredBottom = Math.max(...addGroupCards.map(card => card.bottom));
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cardCount: addGroupCards.length,
      featuredBottom,
      navigationTop: navigation?.top ?? window.innerHeight,
      fitsAboveNavigation: featuredBottom <= (navigation?.top ?? window.innerHeight) - 8,
      interactions: {
        countryControlVisible: true,
        settingsControlVisible: true,
        featuredCardOpened: true,
      },
    };
  });

  await page.screenshot({ path: "/tmp/tgtop-global-390x844.png", fullPage: false });
  if (result.viewport.width !== 390 || result.viewport.height !== 844 || result.cardCount !== 7 || !result.fitsAboveNavigation) {
    throw new Error(`Mobile Global board acceptance failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
