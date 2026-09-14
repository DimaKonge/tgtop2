import { createTonPayoutWorkerId, runTonPayoutWorkerTick } from "./tonPayoutWorker";

const POLL_INTERVAL_MS = 1_000;
const workerId = createTonPayoutWorkerId();
let running = false;
let stopping = false;

async function tick() {
  if (running || stopping) return;
  running = true;
  try {
    await runTonPayoutWorkerTick(workerId);
  } catch (error) {
    console.error("[TonPayoutWorker] Tick failed", error instanceof Error ? error.message : "unknown_error");
  } finally {
    running = false;
  }
}

process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });

console.log("[TonPayoutWorker] Started", { workerId, broadcastEnabled: process.env.TON_PAYOUT_WORKER_BROADCAST_ENABLED === "true" });
void tick();
setInterval(() => void tick(), POLL_INTERVAL_MS).unref();
