import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/index.js";
import { getTelegramUserAgentSession, recordTelegramUserAgentAuditEvent, saveTelegramUserAgentSession } from "./db";

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

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "errorMessage" in error && typeof error.errorMessage === "string") {
    return error.errorMessage;
  }
  return error instanceof Error ? error.message : "Telegram authorization failed";
}

export async function getTelegramUserAgentStatus() {
  return safeStatus(await getTelegramUserAgentSession());
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

export const __private__ = { decrypt, encrypt, getErrorCode, normalizePhone, normalizeCode, safeStatus };
