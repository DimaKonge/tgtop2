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
    await page.getByText("Открываем каталог").waitFor({ state: "hidden", timeout: 25_000 });
  }, 45_000);

  afterAll(async () => {
    await browser?.close();
  });

  it("keeps all seven featured positions readable above the mobile navigation", async () => {
    const slots = page.locator('[role="button"]').filter({ hasText: "Свободно" });
    expect(await slots.count()).toBe(7);

    const boxes = await slots.evaluateAll(elements =>
      elements.map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
      }),
    );

    expect(boxes[0].x).toBeGreaterThanOrEqual(12);
    expect(boxes[0].width).toBeGreaterThan(350);
    expect(boxes[0].height).toBe(300);
    expect(boxes.slice(1, 3).every(box => box.width >= 175 && box.height === 128)).toBe(true);
    expect(boxes.slice(3).every(box => box.width > 80 && box.height === 78)).toBe(true);
    expect(Math.max(...boxes.map(box => box.bottom))).toBeLessThanOrEqual(760);
  });

  it("keeps the Global controls within the 390px viewport without horizontal overflow", async () => {
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      outOfBoundsControls: Array.from(document.querySelectorAll("button, input"))
        .filter(element => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0 && box.top < window.innerHeight;
        })
        .map(element => {
          const box = element.getBoundingClientRect();
          return { label: element.getAttribute("aria-label") ?? element.getAttribute("placeholder") ?? element.textContent?.trim(), left: box.left, right: box.right };
        })
        .filter(control => control.left < 0 || control.right > window.innerWidth),
    }));

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.outOfBoundsControls).toEqual([]);
  });
});
