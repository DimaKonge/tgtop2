import "dotenv/config";

async function startReserveBot() {
  const reserveToken = process.env.TELEGRAM_RESERVE_BOT_TOKEN;
  if (!reserveToken) throw new Error("TELEGRAM_RESERVE_BOT_TOKEN is not configured");
  process.env.TELEGRAM_BOT_TOKEN = reserveToken;
  const { runTelegramBot } = await import("./telegramBot");
  await runTelegramBot("@TGTOP_robot");
}

void startReserveBot();
