import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramMiniAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type VerifiedTelegramInitData = {
  authDate: number;
  user: TelegramMiniAppUser;
};

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400
): VerifiedTelegramInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const rawUser = params.get("user");

  if (!receivedHash || !rawUser || !Number.isFinite(authDate)) return null;
  if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > maxAgeSeconds) return null;

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();

  let expectedHash: Buffer;
  try {
    expectedHash = Buffer.from(receivedHash, "hex");
  } catch {
    return null;
  }

  if (expectedHash.length !== calculatedHash.length || !timingSafeEqual(expectedHash, calculatedHash)) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as TelegramMiniAppUser;
    if (!Number.isInteger(user.id) || !user.first_name) return null;
    return { authDate, user };
  } catch {
    return null;
  }
}
