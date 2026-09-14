export function startTelegramLogin(returnTo?: unknown) {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const safeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : currentPath;
  const url = new URL("/api/auth/telegram/login", window.location.origin);
  url.searchParams.set("returnTo", safeReturnTo);
  window.location.assign(url.toString());
}
