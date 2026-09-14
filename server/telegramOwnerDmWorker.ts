import { randomUUID } from "node:crypto";
import { Api } from "teleproto";
import { NewMessage, type NewMessageEvent } from "teleproto/events/index.js";
import {
  claimNextTelegramOwnerDmJob,
  completeTelegramOwnerDmJob,
  deferTelegramOwnerDmJob,
  enqueueTelegramOwnerDmJob,
  ensureTelegramOwnerDmWorkerState,
  getTelegramOwnerDmBinding,
  getTelegramOwnerDmJobStatus,
  getWaitingTelegramOwnerDmJob,
  markTelegramOwnerDmJobWaiting,
  recordTelegramUserAgentAuditEvent,
  retryTelegramOwnerDmClaim,
  reviewTelegramOwnerDmClaim,
  reviewTelegramOwnerDmJob,
  restartTelegramOwnerDmJobForMissingTask,
  updateTelegramOwnerDmWorkerState,
} from "./db";
import {
  decryptTelegramOwnerDmPayload as decryptPayload,
  encryptTelegramOwnerDmPayload as encryptPayload,
  openConnectedTelegramUserAgentClientForWorker,
  persistConnectedTelegramUserAgentClientSession,
} from "./telegramUserAgent";

const OWNER_DM_PROJECT_ID = "NKJWnp8SgQCMaTP3m4Bvon";
const OWNER_DM_MAX_INPUT_CHARS = 2_000;
const OWNER_DM_MAX_REPLY_CHARS = 3_000;
const OWNER_DM_MAX_ATTEMPTS = 3;
const OWNER_DM_INBOX_SCAN_INTERVAL_MS = 8_000;

type ManusEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  assistant_message?: { content?: string };
  status_update?: { agent_status?: string; status_detail?: { waiting_description?: string } };
};

function getManusApiKey() {
  const apiKey = process.env.MANUS_API_KEY?.trim();
  if (!apiKey) throw new Error("Owner-DM responder не настроен: отсутствует защищённый Manus API key");
  return apiKey;
}

async function manusApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.manus.ai${path}`, {
    ...init,
    headers: { "x-manus-api-key": getManusApiKey(), "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as (T & { ok?: boolean; error?: { message?: string } }) | null;
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || `Manus API request failed (${response.status})`);
  return body;
}

function buildOwnerRelayPrompt(input: string) {
  return [
    "Ты TG TOP Assistant — честный рабочий ассистент проекта TG TOP, а не человек.",
    "Сообщение пришло от единственного проверенного владельца через личный Telegram-канал.",
    "Отвечай по-русски, кратко и по существу. Можно анализировать и выполнять безопасную работу по проекту.",
    "Никогда не подтверждай и не выполняй самостоятельно платежи, выводы, переводы, возвраты, NFT-трансферы, смену прав или ownership, публикацию постов/Stories. Для таких действий опиши план и запроси отдельное явное подтверждение.",
    "Не проси коды Telegram, 2FA, пароли, приватные ключи, session-файлы, токены, mnemonics, DB URL или runtime config в Telegram.",
    `Сообщение владельца: ${input}`,
  ].join("\n\n");
}

function safeReply(content: string) {
  const normalized = content.replace(/\u0000/g, "").trim();
  return normalized.length > OWNER_DM_MAX_REPLY_CHARS ? `${normalized.slice(0, OWNER_DM_MAX_REPLY_CHARS - 1)}…` : normalized;
}

async function resolveBoundOwnerEntity(client: Awaited<ReturnType<typeof openConnectedTelegramUserAgentClientForWorker>>["client"], binding: NonNullable<Awaited<ReturnType<typeof getTelegramOwnerDmBinding>>>) {
  const entity = await client.getEntity(`@${binding.expectedUsername}`);
  if (!(entity instanceof Api.User) || entity.bot || String(entity.id) !== binding.ownerTelegramId) {
    throw new Error("Owner username больше не соответствует закреплённому Telegram ID; отправка остановлена");
  }
  await persistConnectedTelegramUserAgentClientSession(client);
  return entity;
}

async function enqueueOwnerText(binding: NonNullable<Awaited<ReturnType<typeof getTelegramOwnerDmBinding>>>, messageId: number, senderId: unknown, text: string | undefined) {
  if (String(senderId) !== binding.ownerTelegramId) return false;
  const normalized = text?.trim();
  if (!normalized || normalized.length > OWNER_DM_MAX_INPUT_CHARS) return false;
  const created = await enqueueTelegramOwnerDmJob({ telegramMessageId: String(messageId), ownerTelegramId: binding.ownerTelegramId, encryptedInput: encryptPayload(normalized) });
  if (created) await recordTelegramUserAgentAuditEvent({ action: "owner_dm_received", actorOpenId: "telegram-owner-worker", details: `message=${messageId}` });
  else {
    const existing = await getTelegramOwnerDmJobStatus({ telegramMessageId: String(messageId), ownerTelegramId: binding.ownerTelegramId });
    console.log("[TelegramOwnerDmWorker] Owner message already known", { messageId, status: existing?.status ?? "missing", attempts: existing?.attempts ?? null });
  }
  return created;
}

async function scanBoundOwnerInbox(client: Awaited<ReturnType<typeof openConnectedTelegramUserAgentClientForWorker>>["client"], binding: NonNullable<Awaited<ReturnType<typeof getTelegramOwnerDmBinding>>>) {
  const owner = await resolveBoundOwnerEntity(client, binding);
  const messages = await client.getMessages(owner, { limit: 20 });
  let queued = 0;
  for (const message of messages) {
    if (message.out) continue;
    if (await enqueueOwnerText(binding, message.id, message.senderId, message.text)) queued += 1;
  }
  console.log("[TelegramOwnerDmWorker] Owner inbox scanned", { fetched: messages.length, queued });
}

async function dispatchJob(workerId: string) {
  const state = await ensureTelegramOwnerDmWorkerState();
  if (!state?.enabled) return false;
  const job = await claimNextTelegramOwnerDmJob(workerId);
  if (!job) return false;
  try {
    const input = decryptPayload(job.encryptedInput);
    const taskId = state.manusTaskId;
    let resolvedTaskId = taskId;
    if (!resolvedTaskId) {
      const created = await manusApi<{ task_id?: string }>("/v2/task.create", {
        method: "POST",
        body: JSON.stringify({
          project_id: OWNER_DM_PROJECT_ID,
          title: "TG TOP Assistant — owner-only Telegram",
          locale: "ru",
          interactive_mode: true,
          share_visibility: "private",
          agent_profile: "manus-1.6",
          message: { content: buildOwnerRelayPrompt(input) },
        }),
      });
      if (!created.task_id) throw new Error("Manus API не вернул task ID");
      resolvedTaskId = created.task_id;
      await updateTelegramOwnerDmWorkerState({ manusTaskId: resolvedTaskId, lastError: null });
    } else {
      await manusApi("/v2/task.sendMessage", {
        method: "POST",
        body: JSON.stringify({ task_id: resolvedTaskId, message: { content: buildOwnerRelayPrompt(input) }, agent_profile: "manus-1.6" }),
      });
    }
    await markTelegramOwnerDmJobWaiting({ id: job.id, leaseToken: job.leaseToken, manusTaskId: resolvedTaskId });
    await recordTelegramUserAgentAuditEvent({ action: "owner_dm_forwarded", actorOpenId: "telegram-owner-worker", details: `job=${job.id}` });
    console.log("[TelegramOwnerDmWorker] Job forwarded", { jobId: job.id });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Owner-DM dispatch failed";
    if (job.attempts >= OWNER_DM_MAX_ATTEMPTS) await reviewTelegramOwnerDmClaim({ id: job.id, leaseToken: job.leaseToken, reason });
    else await retryTelegramOwnerDmClaim({ id: job.id, leaseToken: job.leaseToken, delayMs: 5_000 * job.attempts, reason });
    await updateTelegramOwnerDmWorkerState({ lastError: reason });
    console.error("[TelegramOwnerDmWorker] Job dispatch failed", { jobId: job.id, reason });
  }
  return true;
}

async function deliverAgentReply(workerId: string, client: Awaited<ReturnType<typeof openConnectedTelegramUserAgentClientForWorker>>["client"]) {
  const state = await ensureTelegramOwnerDmWorkerState();
  if (!state?.enabled) return false;
  const job = await getWaitingTelegramOwnerDmJob();
  const binding = await getTelegramOwnerDmBinding();
  if (!job || !binding || !job.manusTaskId) return false;
  try {
    const data = await manusApi<{ messages?: ManusEvent[] }>(`/v2/task.listMessages?task_id=${encodeURIComponent(job.manusTaskId)}&limit=50`);
    const events = data.messages ?? [];
    const waiting = events.find(event => event.type === "status_update" && event.status_update?.agent_status === "waiting");
    if (waiting) {
      const note = "TG TOP Assistant ждёт отдельного подтверждения действия в защищённом интерфейсе Manus. Я ничего не подтверждаю автоматически.";
      const owner = await resolveBoundOwnerEntity(client, binding);
      await client.sendMessage(owner, { message: note, linkPreview: false });
      await reviewTelegramOwnerDmJob({ id: job.id, reason: "Agent requested confirmation; automatic confirmation prohibited" });
      await recordTelegramUserAgentAuditEvent({ action: "owner_dm_confirmation_blocked", actorOpenId: "telegram-owner-worker", details: `job=${job.id}` });
      console.log("[TelegramOwnerDmWorker] Confirmation blocked", { jobId: job.id });
      return true;
    }
    const replies = events.filter(event => event.type === "assistant_message" && event.id && event.id !== job.deliveredEventId && typeof event.assistant_message?.content === "string");
    const reply = replies.at(-1);
    if (!reply?.id || !reply.assistant_message?.content) return false;
    const sentAt = job.dispatchedAt?.getTime() ?? 0;
    const eventAt = reply.created_at ? Date.parse(reply.created_at) : Date.now();
    if (!Number.isFinite(eventAt) || eventAt < sentAt) return false;
    const owner = await resolveBoundOwnerEntity(client, binding);
    await client.sendMessage(owner, { message: safeReply(reply.assistant_message.content), linkPreview: false });
    await completeTelegramOwnerDmJob({ id: job.id, deliveredEventId: reply.id });
    await recordTelegramUserAgentAuditEvent({ action: "owner_dm_replied", actorOpenId: "telegram-owner-worker", details: `job=${job.id}` });
    console.log("[TelegramOwnerDmWorker] Reply delivered", { jobId: job.id });
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Owner-DM response delivery failed";
    if (reason.toLowerCase().includes("task not found")) {
      await restartTelegramOwnerDmJobForMissingTask({ id: job.id, reason: "Stale Manus task reference; starting a new private task" });
      await updateTelegramOwnerDmWorkerState({ manusTaskId: null, lastError: "Stale Manus task reference reset" });
      console.warn("[TelegramOwnerDmWorker] Stale task reset", { jobId: job.id });
      return false;
    }
    await deferTelegramOwnerDmJob({ id: job.id, delayMs: 5_000, reason });
    await updateTelegramOwnerDmWorkerState({ lastError: reason });
    console.error("[TelegramOwnerDmWorker] Reply delivery failed", { jobId: job.id, reason });
    return false;
  }
}

export async function runTelegramOwnerDmWorker(workerId: string) {
  const binding = await getTelegramOwnerDmBinding();
  const state = await ensureTelegramOwnerDmWorkerState();
  if (!binding || !state?.enabled) return { active: false, stop: async () => undefined };
  const { client } = await openConnectedTelegramUserAgentClientForWorker();
  const handleIncoming = async (event: NewMessageEvent) => {
    if (!event.isPrivate) return;
    await enqueueOwnerText(binding, event.message.id, event.message.senderId, event.message.text);
  };
  client.addEventHandler(event => { void handleIncoming(event); }, new NewMessage({ incoming: true, forwards: false }));
  if (!state.activationSentAt) {
    const owner = await resolveBoundOwnerEntity(client, binding);
    await client.sendMessage(owner, { message: "TG TOP Assistant: личный owner-only диалог включён. Можем продолжать работу здесь.", linkPreview: false });
    await updateTelegramOwnerDmWorkerState({ activationSentAt: new Date(), lastError: null });
    await recordTelegramUserAgentAuditEvent({ action: "owner_dm_activated", actorOpenId: "telegram-owner-worker" });
  }
  let ticking = false;
  let lastInboxScanAt = 0;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      if (Date.now() - lastInboxScanAt >= OWNER_DM_INBOX_SCAN_INTERVAL_MS) {
        lastInboxScanAt = Date.now();
        await scanBoundOwnerInbox(client, binding);
      }
      await dispatchJob(workerId);
      await deliverAgentReply(workerId, client);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Owner-DM worker tick failed";
      console.error("[TelegramOwnerDmWorker] Tick failed", reason);
      await updateTelegramOwnerDmWorkerState({ lastError: reason }).catch(() => undefined);
    } finally {
      ticking = false;
    }
  };
  await tick();
  const interval = setInterval(() => void tick(), 1_000);
  return { active: true, stop: async () => { clearInterval(interval); await client.disconnect(); } };
}

export function createTelegramOwnerDmWorkerId() {
  return `owner-dm-worker-${randomUUID()}`;
}
