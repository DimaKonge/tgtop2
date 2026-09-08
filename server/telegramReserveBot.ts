import "dotenv/config";

// Marking this process explicitly as the Beta / Sandbox runner
process.env.IS_BETA_BOT = "true";

async function startBetaBot() {
  const betaToken = process.env.TELEGRAM_RESERVE_BOT_TOKEN || process.env.TELEGRAM_BETA_BOT_TOKEN;
  if (!betaToken) {
    console.error("[Telegram Beta] Neither TELEGRAM_RESERVE_BOT_TOKEN nor TELEGRAM_BETA_BOT_TOKEN is set in environment.");
    process.exit(1);
  }

  process.env.TELEGRAM_BOT_TOKEN = betaToken;
  console.info("[Telegram Beta] Initializing @TGTOP_robot in Sandbox / Beta mode...");

  const { runTelegramBot } = await import("./telegramBot");
  await runTelegramBot("@TGTOP_robot");
}

void startBetaBot();
