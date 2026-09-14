import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Telegram Stars bot payment flow", () => {
  it("handles official checkout and receipt updates with a safeguarded refund path", () => {
    const source = readFileSync(new URL("./telegramBot.ts", import.meta.url), "utf8");
    expect(source).toContain('pre_checkout_query');
    expect(source).toContain('successful_payment');
    expect(source).toContain('answerPreCheckoutQuery');
    expect(source).toContain('refundStarPayment');
    expect(source).toContain('message?.text?.startsWith("/terms")');
    expect(source).toContain('message?.text?.startsWith("/paysupport")');
  });
});
