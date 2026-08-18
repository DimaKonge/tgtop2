import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const baseUrl = process.env.MOBILE_TEST_BASE_URL ?? "http://127.0.0.1:3000";

describe("TG TOP Global rendered mobile featured board", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Открываем маркетплейс").waitFor({ state: "hidden", timeout: 10_000 });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
  });

  it("keeps all seven featured positions readable above the mobile navigation", async () => {
    const slots = page.getByRole("button", { name: "Добавить группу", exact: true });
    expect(await slots.count()).toBe(7);

    const boxes = await slots.evaluateAll(elements =>
      elements.map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
      }),
    );

    expect(boxes[0].x).toBeGreaterThanOrEqual(12);
    expect(boxes[0].width).toBeGreaterThan(350);
    expect(boxes[0].height).toBe(252);
    expect(boxes.slice(1, 3).every(box => box.width >= 175 && box.height === 104)).toBe(true);
    expect(boxes.slice(3).every(box => box.width > 80 && box.height === 68)).toBe(true);
    expect(Math.max(...boxes.map(box => box.bottom))).toBeLessThanOrEqual(760);
  });
});
