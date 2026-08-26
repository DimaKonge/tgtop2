import type { Express } from "express";
import { getPublicSearchGroupByUsername, getSearchIndexableGroups } from "./db";

const SITE_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://tgtop.me").replace(/\/$/, "");

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatMembers(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, value));
}

function getCountryLabel(country: string | null | undefined) {
  const labels: Record<string, string> = { Global: "Весь мир", Ukraine: "Украина", Poland: "Польша", Germany: "Германия", "United Kingdom": "Великобритания", "United States": "США", Russia: "Россия" };
  return labels[country ?? "Global"] ?? country ?? "Весь мир";
}

export function buildPublicCommunityHtml(group: Awaited<ReturnType<typeof getPublicSearchGroupByUsername>>) {
  if (!group) return "";
  const title = `${group.title} — Telegram-группа | TG TOP`;
  const description = (group.description || `${group.title} — публичное Telegram-сообщество.`).slice(0, 180);
  const canonical = `${SITE_ORIGIN}/c/${encodeURIComponent(group.username)}`;
  const avatar = group.avatarFileId ? `${SITE_ORIGIN}/api/telegram-avatar/${encodeURIComponent(group.chatId)}` : `https://t.me/i/userpic/320/${encodeURIComponent(group.username)}.jpg`;
  const placementPath = [getCountryLabel(group.country), group.category, group.subcategory].filter(Boolean).join(" · ");
  const points = group.snapshots.length > 1
    ? group.snapshots.map((snapshot, index) => `${Math.round((index / (group.snapshots.length - 1)) * 760) + 20},${220 - Math.round(((snapshot.membersCount - Math.min(...group.snapshots.map(item => item.membersCount))) / Math.max(1, Math.max(...group.snapshots.map(item => item.membersCount)) - Math.min(...group.snapshots.map(item => item.membersCount)))) * 135)}`).join(" ")
    : "20,150 780,150";
  const manager = group.managerName && group.managerUsername
    ? `<aside class="manager"><span class="eyebrow">МЕНЕДЖЕР</span><div class="manager-row">${group.managerAvatarUrl ? `<img src="${escapeHtml(group.managerAvatarUrl)}" alt="" />` : "<span class=\"manager-fallback\">M</span>"}<span><b>${escapeHtml(group.managerName)}</b><small>Публичный менеджер</small></span><a href="https://t.me/${encodeURIComponent(group.managerUsername)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть менеджера в Telegram">↗</a></div></aside>`
    : "";
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "TG TOP", url: SITE_ORIGIN },
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="TG TOP"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(avatar)}"><meta name="twitter:card" content="summary"><script type="application/ld+json">${structuredData}</script><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#17212b;color:#eff6ff;font:16px/1.5 Inter,Arial,sans-serif}.shell{max-width:1180px;margin:auto;padding:32px 24px 72px}.brand{display:flex;gap:10px;align-items:center;font-weight:800;letter-spacing:.03em}.mark{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#202b3a;border:1px solid #39506a;color:#fff}.crumbs{margin:28px 0 16px;color:#94a9c0;font-size:14px}.crumbs a{color:#79b8ff;text-decoration:none}.layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:16px}.card{background:#202b3a;border:1px solid #36506c;border-radius:18px;padding:24px}.hero{display:flex;gap:22px;align-items:flex-start}.avatar{width:150px;height:150px;border-radius:16px;object-fit:cover;background:#17212b;border:1px solid #45607d}.eyebrow{display:block;color:#7f9ab5;font-size:11px;letter-spacing:.1em}.placement-path{margin:0 0 10px;color:#8fc4ff;font-size:13px;font-weight:700}.handle{color:#75b7ff;font-weight:600}.facts{display:flex;gap:14px;flex-wrap:wrap;color:#b6c7d9;font-size:14px}.cta{display:inline-flex;align-items:center;gap:9px;margin-top:18px;padding:12px 18px;border-radius:10px;background:#3390ec;color:white;text-decoration:none;font-weight:800}.trust{display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid #36506c;margin-top:20px;padding-top:16px;color:#c9dcf1;font-size:14px}.chart{margin-top:16px}.chart svg{width:100%;height:auto;background:#17212b;border-radius:12px}.manager-row{display:flex;align-items:center;gap:12px;margin-top:12px}.manager-row img,.manager-fallback{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#3390ec;display:grid;place-items:center}.manager-row small{display:block;color:#8ea4ba}.manager-row a{margin-left:auto;color:#79b8ff;font-size:24px;text-decoration:none}@media(max-width:760px){.shell{padding:20px 14px 44px}.layout{grid-template-columns:1fr}.hero{flex-direction:column}.avatar{width:112px;height:112px}}</style></head><body><main class="shell"><header class="brand"><span class="mark">T</span> TG TOP</header><nav class="crumbs"><a href="${SITE_ORIGIN}">TG TOP</a> / Сообщества / ${escapeHtml(group.title)}</nav><div class="layout"><section><article class="card"><div class="hero"><img class="avatar" src="${escapeHtml(avatar)}" alt="Аватар ${escapeHtml(group.title)}"><div><p class="placement-path">${escapeHtml(placementPath)}</p><span class="eyebrow">${escapeHtml(group.category)}</span><h1>${escapeHtml(group.title)}</h1><div class="handle">@${escapeHtml(group.username)}</div><div class="facts"><span>${formatMembers(group.membersCount)} участников</span></div><p>${escapeHtml(description)}</p><a class="cta" href="https://t.me/${encodeURIComponent(group.username)}" target="_blank" rel="noopener noreferrer">✈ Открыть в Telegram</a></div></div><div class="trust"><span>✓ Проверено TG TOP</span><span>◎ Публичная карточка</span></div></article><section class="card chart"><h2>Динамика аудитории</h2><svg viewBox="0 0 800 260" role="img" aria-label="Динамика аудитории"><polyline fill="none" stroke="#3390ec" stroke-width="5" points="${points}"/></svg><small>Наблюдения TG TOP: ${group.lastStatsAt ? new Intl.DateTimeFormat("ru-RU").format(new Date(group.lastStatsAt)) : "данные обновляются"}</small></section></section>${manager}</div></main></body></html>`;
}

export function registerPublicCommunityPages(app: Express) {
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      const groups = await getSearchIndexableGroups();
      const urls = [`<url><loc>${SITE_ORIGIN}/</loc></url>`, ...groups.filter(group => group.username).map(group => `<url><loc>${SITE_ORIGIN}/c/${encodeURIComponent(group.username!)}</loc><lastmod>${(group.lastStatsAt ?? group.listedAt ?? new Date()).toISOString()}</lastmod></url>`)].join("");
      res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    } catch (error) {
      next(error);
    }
  });
  app.get("/c/:username", async (req, res, next) => {
    try {
      const username = req.params.username.trim().replace(/^@/, "");
      if (!/^[A-Za-z0-9_]{5,128}$/.test(username)) return res.status(404).set("X-Robots-Tag", "noindex").send("Страница не найдена");
      const group = await getPublicSearchGroupByUsername(username);
      if (!group) return res.status(404).set("X-Robots-Tag", "noindex").send("Страница не найдена");
      return res.status(200).set("Cache-Control", "no-cache").type("html").send(buildPublicCommunityHtml(group));
    } catch (error) {
      next(error);
    }
  });
}
