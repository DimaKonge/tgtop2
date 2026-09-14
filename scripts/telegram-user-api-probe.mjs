import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/index.js";

async function main() {
  const apiId = Number(process.env.TELEGRAM_USER_API_ID);
  const apiHash = process.env.TELEGRAM_USER_API_HASH?.trim() ?? "";
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f0-9]{32}$/i.test(apiHash)) {
    throw new Error("Telegram API credentials unavailable");
  }

  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 1,
    retryDelay: 250,
  });
  try {
    await client.connect();
    const config = await client.invoke(new Api.help.GetConfig());
    if (!config) throw new Error("Telegram API probe returned no config");
    console.log("telegram_user_api_probe=ok");
  } finally {
    await client.disconnect();
  }
}

main().catch(() => {
  console.error("telegram_user_api_probe=failed");
  process.exitCode = 1;
});
