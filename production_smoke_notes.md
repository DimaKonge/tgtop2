Production browser smoke on 2026-09-02: https://tgtop.me/ initially showed a blank loading viewport, then completed loading. Browser extraction showed title `TG TOP — каталог Telegram-групп и каналов`, public Global screen, `Все сообщества · Весь мир 8`, category toggles, search/geo/category controls, multiple real community cards including `TG TOP chat`, `o_a_th`, `TG TOP`, and the Telegram login button. No blocking browser-console error was observed during the check. HTTPS curl checks: tgtop.me, tgtop.xyz, and www.tgtop.xyz all resolved successfully; .xyz variants followed to https://tgtop.me/ with HTTP 200.


## 2026-09-02 — public smoke after User API media-sync checkpoint

`tgtop.me` открылся с HTTP 200. Публичный Global отрисовал реальные сообщества и featured/general states; для карточек без animated snapshot виден штатный Telegram-avatar/fallback. В проверке намеренно не запускались Telegram authorization, protected mutations, listing, payment или User API login, поэтому live onboarding и фактическая загрузка profile video остаются отдельным ручным smoke-пунктом.

2026-09-02 live rollout follow-up: VPS accepted deploy key, current frontend was rebuilt locally from GitHub source and static assets copied to /opt/tgtop with a backup. tgtop.service is active; https://tgtop.me/ and tgTop.getSlots return HTTP 200 after restart. Browser smoke shows the upper TG TOP control has aria-label "Открыть главную страницу TG TOP" and is clickable; the real catalog contains Market as the second featured card. The first immediate build attempt failed only because the older VPS checkout lacked shared frontend files, so the complete local dist/public build was used while preserving the existing server/runtime.

Live DOM verification after rollout: the `header button` labeled TG TOP has aria-label `Открыть главную страницу TG TOP`, contains the shared seven-rectangle SVG pyramid, and the bottom navigation still exposes `ТОП` unchanged. This confirms the upper logo/home behavior is live, not only present in local source.

## 2026-09-03 — Market profile video sync

- Production DB `telegram_user_agent_sessions`: scope `primary`, status `connected`, encrypted session present. Sensitive payload was not read or logged.
- One-off User API worker resolved the listed `Market` row (`groupId=8`) and downloaded its real Telegram profile video: 156,608 bytes.
- Uploaded snapshot: `/manus-storage/telegram/group-media/8-1788401052778.mp4`; only `animatedAvatarKey`, `animatedAvatarUrl`, and `animatedAvatarUpdatedAt` were changed for that group.
- Live frontend bundle contains `animatedAvatarUrl`, muted/loop/playsInline video playback, and fallback handlers. Temporary diagnostic/sync scripts were removed from the VPS after completion.
- Remaining live verification is visual confirmation from the user's Telegram client after reopening Global; no placeholder or unrelated media was substituted.
