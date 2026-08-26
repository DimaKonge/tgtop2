import { createTelegramOwnerDmWorkerId, runTelegramOwnerDmWorker } from "./telegramOwnerDmWorker";

const workerId = createTelegramOwnerDmWorkerId();
let stop: (() => Promise<void>) | undefined;

async function start() {
  try {
    const worker = await runTelegramOwnerDmWorker(workerId);
    stop = worker.stop;
    console.log("[TelegramOwnerDmWorker] Started", { workerId, active: worker.active });
  } catch (error) {
    console.error("[TelegramOwnerDmWorker] Start failed", error instanceof Error ? error.message : "unknown_error");
    process.exitCode = 1;
  }
}

const shutdown = () => { void stop?.().finally(() => process.exit()); };
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
void start();
