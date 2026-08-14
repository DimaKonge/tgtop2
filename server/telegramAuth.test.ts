import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateTelegramInitData } from "./telegramAuth";

const botToken = "test-token-for-telegram-mini-app-auth";

function makeInitData(authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAHgV3EAAAAAAGBXcQ",
    user: JSON.stringify({ id: 123456, first_name: "Dima", username: "dimij" }),
  });
  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secretKey).update(dataCheckString).digest("hex"));
  return params.toString();
}

describe("Telegram Mini App initData validation", () => {
  it("accepts a correctly signed recent Telegram identity", () => {
    const verified = validateTelegramInitData(makeInitData(), botToken);
    expect(verified?.user).toMatchObject({ id: 123456, username: "dimij" });
  });

  it("rejects tampered and expired initialization data", () => {
    expect(validateTelegramInitData(`${makeInitData()}&query_id=tampered`, botToken)).toBeNull();
    expect(validateTelegramInitData(makeInitData(Math.floor(Date.now() / 1000) - 86_401), botToken)).toBeNull();
  });
});
