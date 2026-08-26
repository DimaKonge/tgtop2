# TG TOP — canonical domain policy

## Production state

`https://tgtop.me/` — единственный публичный canonical URL TG TOP. Главная страница публикует `rel="canonical"` и `og:url` на `tgtop.me`, а `robots.txt` указывает sitemap этого же домена. TonConnect manifest также объявляет `https://tgtop.me` как URL приложения.

| URL / integration | Назначение | Подтверждённое состояние |
|---|---|---|
| `https://tgtop.me/` | Canonical web, SEO и Mini App base | Public metadata и health отвечают корректно. |
| `https://tgtop.xyz/` | Legacy URL | Постоянный `301` на `https://tgtop.me/`; не используется в новой SEO-разметке. |
| `https://tgtop.me/tonconnect-manifest.json` | TonConnect manifest | Публикует canonical app URL `https://tgtop.me`. |
| `https://tgtop.xyz` в Telegram Login | Совместимость старого OAuth callback | Локализовано в server canonicalization: `www.tgtop.xyz` приводится к `tgtop.xyz`; не относится к canonical SEO. |

## Правило будущих изменений

Новые публичные ссылки, sitemap, OG tags и пользовательская SEO-copy должны использовать `tgtop.me`. Не удалять legacy redirect и не менять Telegram Login callback origin без отдельной проверки OAuth state/cookie flow в browser Telegram Login.

> Канонизация домена не меняет payout worker, его `broadcast=false`, финансовые балансы, TON Connect session или Telegram bot workflow.
