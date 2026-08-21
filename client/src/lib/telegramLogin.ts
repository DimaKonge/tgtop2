export function startTelegramLogin(returnTo = `${window.location.pathname}${window.location.search}`) {
  const url = new URL("/api/auth/telegram/login", window.location.origin);
  url.searchParams.set("returnTo", returnTo.startsWith("/") ? returnTo : "/");
  window.location.assign(url.toString());
}
