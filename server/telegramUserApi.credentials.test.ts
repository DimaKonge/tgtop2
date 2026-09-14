import { afterEach, describe, expect, it } from "vitest";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

const apiId = Number(process.env.TELEGRAM_USER_API_ID);
const apiHash = process.env.TELEGRAM_USER_API_HASH?.trim() ?? "";
let client: TelegramClient | undefined;

describe("Telegram worker API credentials", () => {
  afterEach(async () => {
    await client?.disconnect();
    client = undefined;
  });

  it("authenticates the configured client application for a public MTProto configuration read", async () => {
    expect(Number.isSafeInteger(apiId)).toBe(true);
    expect(apiId).toBeGreaterThan(0);
    expect(apiHash).toMatch(/^[a-f0-9]{32}$/i);

    client = new TelegramClient(new StringSession(""), apiId, apiHash, {
      connectionRetries: 1,
      retryDelay: 250,
      useWSS: false,
    });
    await client.connect();
    const configuration = await client.invoke(new Api.help.GetConfig());
    expect(configuration).toBeInstanceOf(Api.Config);
  }, 20_000);
});
