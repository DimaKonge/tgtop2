import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/index.js";
import { getLatestTelegramStatsSnapshot, getTelegramOwnerDmBinding, getTelegramStatsTargetByUsername, getTelegramUserAgentSession, listTelegramStatsTargets, markTelegramStatsTargetUnavailable, recordTelegramUserAgentAuditEvent, saveTelegramOwnerDmBinding, saveTelegramStatsSnapshot, saveTelegramStatsTarget, saveTelegramUserAgentSession } from "./db";

const LOGIN_TTL_MS = 10 * 60_000;

type UserAgentStatus = "disconnected" | "code_pending" | "password_pending" | "connected" | "error";

function getApiCredentials() {
  const apiId = Number(process.env.TELEGRAM_USER_API_ID);
  const apiHash = process.env.TELEGRAM_USER_API_HASH?.trim() ?? "";
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f0-9]{32}$/i.test(apiHash)) {
    throw new Error("Рабочий Telegram API-контур ещё не настроен");
  }
  return { apiId, apiHash };
}

function getEncryptionKey() {
  const material = process.env.JWT_SECRET?.trim();
  if (!material) throw new Error("Защищённое хранилище рабочего Telegram-аккаунта недоступно");
  return createHash("sha256").update("tgtop:telegram-user-agent:v1:").update(material).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decrypt(value: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Повреждено защищённое состояние рабочего Telegram-аккаунта");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

function safeStatus(session?: Awaited<ReturnType<typeof getTelegramUserAgentSession>>) {
  const expired = Boolean(session?.expiresAt && session.expiresAt.getTime() <= Date.now());
  const status: UserAgentStatus = expired && session?.status !== "connected" ? "disconnected" : (session?.status ?? "disconnected");
  return {
    status,
    accountTelegramId: status === "connected" ? session?.accountTelegramId ?? null : null,
    accountUsername: status === "connected" ? session?.accountUsername ?? null : null,
    expiresAt: status === "code_pending" || status === "password_pending" ? session?.expiresAt ?? null : null,
  };
}

async function createClient(serializedSession: string) {
  const { apiId, apiHash } = getApiCredentials();
  const client = new TelegramClient(new StringSession(serializedSession), apiId, apiHash, {
    connectionRetries: 1,
    retryDelay: 250,
  });
  await client.connect();
  return { client, apiId, apiHash };
}

function normalizePhone(phone: string) {
  const normalized = phone.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error("Укажите номер в международном формате, например +380…");
  return normalized;
}

function normalizeCode(code: string) {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{4,8}$/.test(normalized)) throw new Error("Укажите код Telegram без пробелов");
  return normalized;
}

function normalizeOwnerUsername(username: string) {
  const normalized = username.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(normalized)) throw new Error("Укажите корректный @username owner-аккаунта");
  return normalized;
}

function normalizeStatsUsername(username: string) {
  const normalized = username.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(normalized)) throw new Error("Укажите корректный публичный @username канала или группы");
  return normalized;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "errorMessage" in error && typeof error.errorMessage === "string") {
    return error.errorMessage;
  }
  return error instanceof Error ? error.message : "Telegram authorization failed";
}

type HistoryPoint = { at: number; value: number };
type HistorySeries = { key: string; label: string; points: HistoryPoint[] };
type HistoryGraph = { series: HistorySeries[] };

function toDateFromUnixSeconds(value: unknown) {
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds > 0 ? new Date(seconds * 1_000) : null;
}

function currentValue(value: { current: number } | undefined) {
  const current = Number(value?.current);
  return Number.isFinite(current) ? Math.round(current) : null;
}

async function readStatsGraph(client: TelegramClient, graph: Api.TypeStatsGraph, pointLimit = 120): Promise<HistoryGraph> {
  let resolved = graph;
  if (resolved instanceof Api.StatsGraphAsync) resolved = await client.invoke(new Api.stats.LoadAsyncGraph({ token: resolved.token }));
  if (!(resolved instanceof Api.StatsGraph)) return { series: [] };
  try {
    const parsed = JSON.parse(resolved.json.data) as { columns?: unknown; names?: unknown };
    if (!Array.isArray(parsed.columns)) return { series: [] };
    const columns = parsed.columns.filter((column): column is [string, ...unknown[]] => Array.isArray(column) && typeof column[0] === "string");
    const x = columns.find(column => column[0] === "x");
    if (!x) return { series: [] };
    const names: Record<string, unknown> = parsed.names && typeof parsed.names === "object" ? parsed.names as Record<string, unknown> : {};
    const series = columns.filter(column => column[0] !== "x").slice(0, 8).map(column => {
      const rawLabel = names[column[0]];
      const label = typeof rawLabel === "string" ? rawLabel : column[0];
      const points: HistoryPoint[] = [];
      const total = Math.min(x.length, column.length) - 1;
      for (let index = 1; index <= total && points.length < pointLimit; index += 1) {
        const at = Number(x[index]);
        const value = Number(column[index]);
        if (Number.isSafeInteger(at) && Number.isFinite(value)) points.push({ at: at * 1_000, value: Math.round(value) });
      }
      return { key: column[0], label, points };
    }).filter(series => series.points.length > 0);
    return { series };
  } catch {
    return { series: [] };
  }
}

export async function addTelegramHistoricalStatsTarget(actorOpenId: string, rawUsername: string) {
  const username = normalizeStatsUsername(rawUsername);
  const { client } = await openConnectedTelegramUserAgentClientForWorker();
  try {
    const entity = await client.getEntity(`@${username}`);
    if (!(entity instanceof Api.Channel) || entity.left) throw new Error("Рабочий аккаунт не имеет доступа к этому каналу или группе");
    const kind = entity.broadcast ? "channel" as const : "supergroup" as const;
    const target = await saveTelegramStatsTarget({ username, chatId: String(entity.id), title: entity.title, kind, addedByOpenId: actorOpenId });
    await persistConnectedTelegramUserAgentClientSession(client);
    await recordTelegramUserAgentAuditEvent({ action: "stats_target_allowed", actorOpenId, details: `username=@${username};kind=${kind}` });
    return { id: target?.id ?? null, username, title: entity.title, kind };
  } finally {
    await client.disconnect();
  }
}

export async function refreshTelegramHistoricalStats(actorOpenId: string, rawUsername: string) {
  const username = normalizeStatsUsername(rawUsername);
  const target = await getTelegramStatsTargetByUsername(username);
  if (!target?.enabled) throw new Error("Сначала добавьте этот канал в allowlist статистики");
  const { client } = await openConnectedTelegramUserAgentClientForWorker();
  try {
    const entity = await client.getEntity(`@${username}`);
    if (!(entity instanceof Api.Channel) || String(entity.id) !== target.chatId || entity.left) throw new Error("Идентичность или доступ к разрешённому каналу изменились; обновление остановлено");
    const stats = entity.broadcast
      ? await client.invoke(new Api.stats.GetBroadcastStats({ channel: entity, dark: true }))
      : await client.invoke(new Api.stats.GetMegagroupStats({ channel: entity, dark: true }));
    const isChannel = stats instanceof Api.stats.BroadcastStats;
    const memberCount = currentValue(isChannel ? stats.followers : stats.members);
    const viewsPerPost = isChannel ? currentValue(stats.viewsPerPost) : currentValue(stats.viewers);
    const sharesPerPost = isChannel ? currentValue(stats.sharesPerPost) : null;
    const reactionsPerPost = isChannel ? currentValue(stats.reactionsPerPost) : null;
    const graphs = isChannel
      ? {
          growth: await readStatsGraph(client, stats.growthGraph),
          subscriptions: await readStatsGraph(client, stats.followersGraph),
          notifications: await readStatsGraph(client, stats.muteGraph, 60),
          activeHours: await readStatsGraph(client, stats.topHoursGraph, 48),
          reach: await readStatsGraph(client, stats.interactionsGraph),
          viewsBySource: await readStatsGraph(client, stats.viewsBySourceGraph, 60),
          followersBySource: await readStatsGraph(client, stats.newFollowersBySourceGraph, 60),
          languages: await readStatsGraph(client, stats.languagesGraph, 60),
          reactions: await readStatsGraph(client, stats.reactionsByEmotionGraph, 60),
        }
      : {
          growth: await readStatsGraph(client, stats.growthGraph),
          subscriptions: await readStatsGraph(client, stats.membersGraph),
          activeHours: await readStatsGraph(client, stats.topHoursGraph, 48),
          reach: await readStatsGraph(client, stats.messagesGraph),
          followersBySource: await readStatsGraph(client, stats.newMembersBySourceGraph, 60),
          languages: await readStatsGraph(client, stats.languagesGraph, 60),
          activity: await readStatsGraph(client, stats.actionsGraph),
          weekdays: await readStatsGraph(client, stats.weekdaysGraph, 48),
        };
    const history = {
      version: 2,
      graphs,
      summary: isChannel ? {
        notificationsEnabled: { part: Number(stats.enabledNotifications.part), total: Number(stats.enabledNotifications.total) },
        viewsPerPost: { current: currentValue(stats.viewsPerPost), previous: currentValue({ current: Number(stats.viewsPerPost.previous) }) },
        sharesPerPost: { current: currentValue(stats.sharesPerPost), previous: currentValue({ current: Number(stats.sharesPerPost.previous) }) },
        reactionsPerPost: { current: currentValue(stats.reactionsPerPost), previous: currentValue({ current: Number(stats.reactionsPerPost.previous) }) },
      } : {
        messages: { current: currentValue(stats.messages), previous: currentValue({ current: Number(stats.messages.previous) }) },
        viewers: { current: currentValue(stats.viewers), previous: currentValue({ current: Number(stats.viewers.previous) }) },
        posters: { current: currentValue(stats.posters), previous: currentValue({ current: Number(stats.posters.previous) }) },
      },
    };
    await saveTelegramStatsSnapshot({ targetId: target.id, periodStart: toDateFromUnixSeconds(stats.period.minDate), periodEnd: toDateFromUnixSeconds(stats.period.maxDate), memberCount, viewsPerPost, sharesPerPost, reactionsPerPost, historyJson: JSON.stringify(history) });
    await persistConnectedTelegramUserAgentClientSession(client);
    await recordTelegramUserAgentAuditEvent({ action: "stats_refreshed", actorOpenId, details: `username=@${username};graphs=${Object.keys(graphs).length}` });
    return { username, title: target.title, kind: target.kind, memberCount, viewsPerPost, sharesPerPost, reactionsPerPost, history, periodStart: toDateFromUnixSeconds(stats.period.minDate), periodEnd: toDateFromUnixSeconds(stats.period.maxDate), availability: "ready" as const };
  } catch {
    await markTelegramStatsTargetUnavailable({ targetId: target.id, reason: "Telegram statistics unavailable or access changed" });
    await recordTelegramUserAgentAuditEvent({ action: "stats_unavailable", actorOpenId, details: `username=@${username}` });
    throw new Error("Telegram пока не отдал статистику этому рабочему аккаунту. Проверьте доступ администратора и повторите позже.");
  } finally {
    await client.disconnect();
  }
}

export async function getTelegramHistoricalStatsOverview() {
  const targets = await listTelegramStatsTargets();
  return await Promise.all(targets.map(async target => {
    const latest = await getLatestTelegramStatsSnapshot(target.id);
    return { id: target.id, username: target.username, title: target.title, kind: target.kind, lastRefreshedAt: target.lastRefreshedAt, availability: target.lastAvailability, snapshot: latest ? { collectedAt: latest.collectedAt, periodStart: latest.periodStart, periodEnd: latest.periodEnd, memberCount: latest.memberCount, viewsPerPost: latest.viewsPerPost, sharesPerPost: latest.sharesPerPost, reactionsPerPost: latest.reactionsPerPost, history: JSON.parse(latest.historyJson) as { version?: number; graphs?: Record<string, HistoryGraph>; summary?: Record<string, unknown>; memberHistory?: HistoryPoint[]; activityHistory?: HistoryPoint[] } } : null };
  }));
}

export async function getTelegramUserAgentStatus() {
  const [session, ownerDm] = await Promise.all([getTelegramUserAgentSession(), getTelegramOwnerDmBinding()]);
  return { ...safeStatus(session), ownerDm: ownerDm ? { username: ownerDm.expectedUsername, active: true } : null };
}

export async function bootstrapTelegramOwnerDmGreeting(actorOpenId: string, rawUsername: string) {
  const username = normalizeOwnerUsername(rawUsername);
  const [pending, existing] = await Promise.all([getTelegramUserAgentSession(), getTelegramOwnerDmBinding()]);
  if (existing) throw new Error("Owner-диалог уже привязан. Изменение получателя требует отдельного безопасного сброса.");
  if (!pending?.encryptedSession || pending.status !== "connected") throw new Error("Сначала подключите рабочий Telegram-аккаунт.");
  const { client } = await createClient(decrypt(pending.encryptedSession));
  try {
    const entity = await client.getEntity(`@${username}`);
    if (!(entity instanceof Api.User) || entity.bot) throw new Error("@username должен принадлежать личному Telegram-аккаунту владельца.");
    const ownerTelegramId = String(entity.id);
    await saveTelegramUserAgentSession({ status: "connected", encryptedSession: encrypt(client.session.save()) });
    await client.sendMessage(entity, {
      message: "TG TOP Assistant готов. Этот личный канал закреплён только за владельцем TG TOP. Публикации, права каналов и финансовые действия выключены и требуют отдельного подтверждения.",
      linkPreview: false,
    });
    await saveTelegramUserAgentSession({ status: "connected", encryptedSession: encrypt(client.session.save()) });
    await saveTelegramOwnerDmBinding({ ownerTelegramId, expectedUsername: username, boundByOpenId: actorOpenId, greetingSentAt: new Date() });
    await recordTelegramUserAgentAuditEvent({ action: "owner_dm_bound", actorOpenId, details: `username=@${username}` });
    return { username, active: true } as const;
  } finally {
    await client.disconnect();
  }
}

export async function openConnectedTelegramUserAgentClientForWorker() {
  const session = await getTelegramUserAgentSession();
  if (!session?.encryptedSession || session.status !== "connected") throw new Error("Рабочий Telegram-аккаунт отключён");
  return await createClient(decrypt(session.encryptedSession));
}

export async function persistConnectedTelegramUserAgentClientSession(client: { session: { save: () => string } }) {
  await saveTelegramUserAgentSession({ status: "connected", encryptedSession: encrypt(client.session.save()) });
}

export function encryptTelegramOwnerDmPayload(value: string) {
  return encrypt(value);
}

export function decryptTelegramOwnerDmPayload(value: string) {
  return decrypt(value);
}

export async function beginTelegramUserAgentLogin(actorOpenId: string, rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const { client, apiId, apiHash } = await createClient("");
  try {
    const result = await client.sendCode({ apiId, apiHash }, phone);
    await saveTelegramUserAgentSession({
      status: "code_pending",
      encryptedSession: encrypt(client.session.save()),
      encryptedPhone: encrypt(phone),
      encryptedPhoneCodeHash: encrypt(result.phoneCodeHash),
      accountTelegramId: null,
      accountUsername: null,
      expiresAt: new Date(Date.now() + LOGIN_TTL_MS),
    });
    await recordTelegramUserAgentAuditEvent({ action: "code_requested", actorOpenId, details: result.isCodeViaApp ? "delivery=telegram" : "delivery=sms" });
    return { status: "code_pending" as const, codeViaTelegram: result.isCodeViaApp, expiresAt: new Date(Date.now() + LOGIN_TTL_MS) };
  } finally {
    await client.disconnect();
  }
}

export async function confirmTelegramUserAgentCode(actorOpenId: string, rawCode: string) {
  const pending = await getTelegramUserAgentSession();
  if (!pending?.encryptedSession || !pending.encryptedPhone || !pending.encryptedPhoneCodeHash || pending.status !== "code_pending" || !pending.expiresAt || pending.expiresAt.getTime() <= Date.now()) {
    throw new Error("Код входа истёк. Запросите новый код Telegram.");
  }
  const { client } = await createClient(decrypt(pending.encryptedSession));
  try {
    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: decrypt(pending.encryptedPhone),
        phoneCodeHash: decrypt(pending.encryptedPhoneCodeHash),
        phoneCode: normalizeCode(rawCode),
      }));
    } catch (error) {
      if (getErrorCode(error).includes("SESSION_PASSWORD_NEEDED")) {
        await saveTelegramUserAgentSession({ status: "password_pending", encryptedSession: encrypt(client.session.save()), expiresAt: new Date(Date.now() + LOGIN_TTL_MS) });
        await recordTelegramUserAgentAuditEvent({ action: "password_requested", actorOpenId });
        return { status: "password_pending" as const };
      }
      await recordTelegramUserAgentAuditEvent({ action: "code_rejected", actorOpenId, details: "Telegram rejected the login code" });
      throw new Error("Telegram не принял код. Проверьте его или запросите новый.");
    }
    const me = await client.getMe();
    await saveTelegramUserAgentSession({
      status: "connected",
      encryptedSession: encrypt(client.session.save()),
      encryptedPhone: null,
      encryptedPhoneCodeHash: null,
      accountTelegramId: String(me.id),
      accountUsername: me.username ?? null,
      expiresAt: null,
    });
    await recordTelegramUserAgentAuditEvent({ action: "connected", actorOpenId, details: "read_only_default" });
    return { status: "connected" as const, accountTelegramId: String(me.id), accountUsername: me.username ?? null };
  } finally {
    await client.disconnect();
  }
}

export async function confirmTelegramUserAgentPassword(actorOpenId: string, password: string) {
  if (!password) throw new Error("Введите пароль двухэтапной защиты");
  const pending = await getTelegramUserAgentSession();
  if (!pending?.encryptedSession || pending.status !== "password_pending" || !pending.expiresAt || pending.expiresAt.getTime() <= Date.now()) {
    throw new Error("Сеанс двухэтапного входа истёк. Запросите новый код Telegram.");
  }
  const { client, apiId, apiHash } = await createClient(decrypt(pending.encryptedSession));
  try {
    try {
      await client.signInWithPassword({ apiId, apiHash }, { password: async () => password, onError: async () => true });
    } catch {
      await recordTelegramUserAgentAuditEvent({ action: "password_rejected", actorOpenId });
      throw new Error("Telegram не принял пароль двухэтапной защиты.");
    }
    const me = await client.getMe();
    await saveTelegramUserAgentSession({
      status: "connected",
      encryptedSession: encrypt(client.session.save()),
      encryptedPhone: null,
      encryptedPhoneCodeHash: null,
      accountTelegramId: String(me.id),
      accountUsername: me.username ?? null,
      expiresAt: null,
    });
    await recordTelegramUserAgentAuditEvent({ action: "connected", actorOpenId, details: "read_only_default_2fa" });
    return { status: "connected" as const, accountTelegramId: String(me.id), accountUsername: me.username ?? null };
  } finally {
    await client.disconnect();
  }
}

export async function disconnectTelegramUserAgent(actorOpenId: string) {
  await saveTelegramUserAgentSession({
    status: "disconnected",
    encryptedSession: null,
    encryptedPhone: null,
    encryptedPhoneCodeHash: null,
    accountTelegramId: null,
    accountUsername: null,
    expiresAt: null,
  });
  await recordTelegramUserAgentAuditEvent({ action: "session_revoked", actorOpenId });
  return { status: "disconnected" as const };
}

export const __private__ = { decrypt, encrypt, getErrorCode, normalizeOwnerUsername, normalizeStatsUsername, normalizePhone, normalizeCode, safeStatus };
