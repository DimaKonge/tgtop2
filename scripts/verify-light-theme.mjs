import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => localStorage.setItem("tg-top-appearance", "light"));
await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.theme === "light");

const styles = await page.evaluate(() => {
  const shell = document.createElement("div");
  shell.className = "tg-shell bg-[#0b0f14] text-slate-100";
  const sticky = document.createElement("div");
  sticky.className = "bg-[#101a2a]/95 border border-white/10 text-slate-300";
  shell.append(sticky);
  document.body.append(shell);

  const sheet = document.createElement("div");
  sheet.dataset.slot = "sheet-content";
  sheet.className = "bg-[#10161f] border border-white/10 text-slate-100";
  const sheetInner = document.createElement("div");
  sheetInner.className = "bg-black/10 text-slate-500";
  sheet.append(sheetInner);
  document.body.append(sheet);

  const read = element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, border: getComputedStyle(element).borderTopColor });
  const result = { shell: read(shell), sticky: read(sticky), sheet: read(sheet), sheetInner: read(sheetInner) };
  shell.remove();
  sheet.remove();
  return result;
});

const dark = new Set(["rgb(11, 15, 20)", "rgb(16, 22, 31)", "rgb(17, 23, 32)", "rgb(27, 36, 48)"]);
for (const [name, value] of Object.entries(styles)) {
  if (dark.has(value.background)) throw new Error(`${name} retained a dark-only background: ${value.background}`);
  if (value.color === "rgb(248, 250, 252)") throw new Error(`${name} retained dark-theme text`);
}
console.log(`Light-theme browser verification passed: ${JSON.stringify(styles)}`);
await browser.close();
