import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth";
const TELEGRAM_TOKEN_URL = "https://oauth.telegram.org/token";
const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_JWKS = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));
const TELEGRAM_STATE_COOKIE = "__Host-tgtop-telegram-login-state";
const TELEGRAM_VERIFIER_COOKIE = "__Host-tgtop-telegram-login-verifier";
const TELEGRAM_RETURN_TO_COOKIE = "__Host-tgtop-telegram-login-return-to";

type TelegramIdTokenClaims = {
  id?: number;
  sub?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
};

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

function requestOrigin(req: Request) {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

function callbackUrl(req: Request) {
  return `${requestOrigin(req)}/api/auth/telegram/callback`;
}

function safeReturnTo(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function requestCookie(req: Request, name: string) {
  return parseCookieHeader(req.headers.cookie ?? "")[name];
}

export function getTelegramLoginConfig() {
  const clientId = ENV.telegramLoginClientId.trim();
  const clientSecret = ENV.telegramLoginClientSecret.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Telegram Login is not configured");
  }
  return { clientId, clientSecret };
}

export async function validateTelegramLoginClient() {
  const { clientId, clientSecret } = getTelegramLoginConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "tgtop-credential-validation",
    redirect_uri: "https://tgtop.xyz/api/auth/telegram/callback",
    client_id: clientId,
    code_verifier: "tgtop-credential-validation",
  });
  const response = await fetch(TELEGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return {
    acceptedClientCredentials: response.status !== 401 && payload.error !== "invalid_client",
    status: response.status,
    error: payload.error ?? null,
  };
}

async function exchangeCode(input: { code: string; codeVerifier: string; redirectUri: string }) {
  const { clientId, clientSecret } = getTelegramLoginConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: clientId,
    code_verifier: input.codeVerifier,
  });
  const response = await fetch(TELEGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });
  if (!response.ok) {
    throw new Error("Telegram did not accept the login code");
  }
  return response.json() as Promise<{ id_token: string }>;
}

async function verifyTelegramIdToken(idToken: string) {
  const { clientId } = getTelegramLoginConfig();
  const verified = await jwtVerify(idToken, TELEGRAM_JWKS, {
    issuer: TELEGRAM_ISSUER,
    audience: clientId,
  });
  return verified.payload as TelegramIdTokenClaims;
}

function clearTelegramLoginCookies(res: Response, secure: boolean) {
  const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  res.clearCookie(TELEGRAM_STATE_COOKIE, options);
  res.clearCookie(TELEGRAM_VERIFIER_COOKIE, options);
  res.clearCookie(TELEGRAM_RETURN_TO_COOKIE, options);
}

export function registerTelegramLoginRoutes(app: Express) {
  app.get("/api/auth/telegram/login", (req: Request, res: Response) => {
    try {
      const { clientId } = getTelegramLoginConfig();
      const state = base64Url(randomBytes(32));
      const verifier = base64Url(randomBytes(48));
      const challenge = base64Url(createHash("sha256").update(verifier).digest());
      const secure = requestOrigin(req).startsWith("https://");
      const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 10 * 60 * 1000 };
      res.cookie(TELEGRAM_STATE_COOKIE, state, options);
      res.cookie(TELEGRAM_VERIFIER_COOKIE, verifier, options);
      res.cookie(TELEGRAM_RETURN_TO_COOKIE, safeReturnTo(req.query.returnTo), options);

      const url = new URL(TELEGRAM_AUTH_URL);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", callbackUrl(req));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid profile phone");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      res.redirect(302, url.toString());
    } catch (error) {
      console.error("[Telegram Login] Start failed", error);
      res.status(503).json({ error: "Telegram Login is unavailable" });
    }
  });

  app.get("/api/auth/telegram/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState = requestCookie(req, TELEGRAM_STATE_COOKIE);
    const verifier = requestCookie(req, TELEGRAM_VERIFIER_COOKIE);
    const returnTo = safeReturnTo(requestCookie(req, TELEGRAM_RETURN_TO_COOKIE));
    const secure = requestOrigin(req).startsWith("https://");
    clearTelegramLoginCookies(res, secure);

    if (!code || !state || !verifier || state !== expectedState) {
      res.status(403).send("Invalid Telegram login state");
      return;
    }

    try {
      const tokens = await exchangeCode({ code, codeVerifier: verifier, redirectUri: callbackUrl(req) });
      const claims = await verifyTelegramIdToken(tokens.id_token);
      const telegramId = claims.id ?? claims.sub;
      if (!telegramId) throw new Error("Telegram identity is missing");

      const name = claims.name || claims.preferred_username || "Telegram user";
      await db.upsertUser({
        openId: `telegram:${telegramId}`,
        name,
        avatarUrl: claims.picture ?? null,
        telegramUsername: claims.preferred_username ?? null,
        loginMethod: "telegram-login",
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createSessionToken(`telegram:${telegramId}`, { name, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[Telegram Login] Callback failed", error);
      res.status(500).send("Telegram Login failed. Please try again.");
    }
  });
}
