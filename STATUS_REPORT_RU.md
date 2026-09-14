# Статус TG TOP на 8 сентября 2026 года

## Краткий вывод

Проект остановился на стадии **закрытого production-тестирования**, а не публичного масштабного запуска. Основной каталог, рейтинг, листинг, Telegram-интеграции, визуальная система, staged VPS rollout и последние исправления кнопки «Перейти» уже реализованы. При этом полный новый пользовательский Telegram E2E, финансовая безопасность, резервное восстановление, масштабирование и часть owner-workflow остаются незавершёнными.

Последняя фактически выполненная операция — загрузка актуального видеоаватара канала **TG TOP / `@TGTOP_Community`**, `groupId=26`, через production User API. MP4 сохранён в S3, каталог возвращает новый URL, а live media endpoint отвечает `HTTP 200 video/mp4`. Последний проектный checkpoint — **`798ee2fb`**; отдельный VPS rollout с same-window fallback кнопки перехода — **`43e79da5`**.

> Проект можно использовать для ограниченного закрытого теста на реальных Telegram-аккаунтах и небольшом количестве сообществ. Для массового трафика и реальных TON-платежей выпускать его пока нельзя.

## 1. Фактическое состояние ledger

В `todo.md` находится **1 243 пункта** с чекбоксами:

| Состояние | Количество | Интерпретация |
|---|---:|---|
| Отмечены `[x]` | **1 002** | Реализовано на уровне кода, тестов, документации или отдельного rollout; не каждый пункт означает полноценный live Telegram E2E |
| Остаются `[ ]` | **241** | Не реализовано, не подтверждено в production или требует отдельной проверки |
| Всего | **1 243** | В ledger есть исторические и частично дублирующиеся записи |

Количество `[x]` нельзя трактовать как процент готовности продукта: часть старых пунктов дублируется, часть помечает source-level работу, а не живую проверку через Telegram. Аналогично, в `todo.md` остались некоторые устаревшие pending-записи о live rollout и Market media, хотя позднейшими smoke-проверками часть этих результатов уже была подтверждена. Ledger следует дополнительно нормализовать.

## 2. Что полностью реализовано и проверено

### Каталог, рейтинг и листинг

Реализованы основная Global-страница, пирамида 1→2→4, featured и general catalog, поиск, категории, подкатегории, страны, города, «Весь мир», фильтры аудитории, My Groups, карточка деталей, owner block, public/private entry links и listing settings. Зафиксировано правило сортировки: цена выше свежести, то есть большая ставка выше меньшей, а при одинаковой цене более свежий листинг выше старого. Для ключевых изменений добавлялись regression-тесты и acceptance checks.

Покрыты сценарии выбора группы, параметров публикации, manager block, продажи, reward settings, прогнозируемого места, удаления группы, статусов listed/sale/unlisted и drag-sortable My Groups. Native number spinners для GRAM-поля удалены, верхние category/geo controls восстановлены, а скрытые и устаревшие элементы listing UI удалены.

**Ограничение:** полноценный production E2E с новым аккаунтом, выбором группы, listing, снятием с listing и защищённой мутацией не был завершён. Поэтому source-level готовность не равна подтверждённой готовности всего пользовательского пути.

### Telegram onboarding и боты

Реализованы onboarding через `@TGTOP_robot` и `@TG_TOPBOT`, admin-rights flow, idempotent event handling, защита от двойных бонусов, обработка приватных групп и каналов, объявления, служебные темы, support relay и owner-only operational logging. Реальное onboarding для `@o_a_th` ранее подтверждалось.

Остаются live-проверки нового Telegram-аккаунта, BotFather Main App, discoverability в глобальном поиске и полная проверка protected mutation. Readiness-аудит прямо классифицирует production auth/onboarding и BotFather Main App как P0-пункты перед публичным запуском [1].

### Telegram-ссылки и кнопка «Перейти»

Исправлен ошибочный flow, при котором guest CTA требовала проверки, что бот всё ещё администратор публичного сообщества. Для публичного username используется подтверждённый `t.me`-адрес, для private invite links сохранён защищённый resolver. После повторной жалобы добавлен visibility-aware same-window fallback: если `Telegram.WebApp.openTelegramLink` или popup молча не срабатывают, используется переход текущего окна.

Это изменение прошло targeted regression tests, TypeScript и production build, было выкачено в release `43e79da5`, а пользователь подтвердил, что переходы заработали.

### Аватары и media snapshots

Сделан защищённый User API media flow с S3 storage, ограничением размера, fallback на static Telegram avatar/brand mark, policy для listed/unlisted snapshots, lazy muted loop playback и regression coverage.

Подтверждены два важных live-результата:

| Объект | Результат |
|---|---|
| `Market`, `groupId=8` | Реальное Telegram profile video ранее скачивалось в production User API, сохранялось в S3 и в браузере проигрывалось с `readyState=4`, `paused=false` [2] |
| `TG TOP`, `@TGTOP_Community`, `groupId=26` | После ручного production refresh получен MP4 `telegram/group-media/26_53aed79e.mp4`; catalog API возвращает `animatedAvatarUrl`, CloudFront отвечает `HTTP 200 video/mp4`, размер ответа — 167 873 bytes |

При новом listing media refresh теперь ожидается до ответа mutation, поэтому snapshot не должен теряться из-за fire-and-forget. Последний TG TOP media результат сохранён в checkpoint `798ee2fb`.

### Темы, бренд и мобильный интерфейс

Подтверждённо реализованы:

- фирменная SVG-пирамида 1→2→4 в верхнем TG TOP header;
- исправление переворота пирамиды в тёмной теме — удалён dark-only `rotate(180deg)`;
- accent-aware logo и launch glow/progress для blue, purple, rose, gold, green и turquoise;
- светлые контрастные кнопки, active states, media overlays и balance chart;
- в Settings оставлены только два режима — «Тёмная» и «Светлая»;
- нижняя навигация сохранена без изменения маршрутов;
- mobile 390×844 checks и compact pyramid acceptance checks;
- reduced-motion fallback для launch animation.

Светлая тема owner-management, listing sheets, deals, NFT cards и transfer surfaces всё ещё не закрыта полностью. Для неё в ledger остаются отдельные audit, rendered regression и authenticated mobile verification пункты.

### VPS, GitHub и staged deployment

Production `/opt/tgtop` был синхронизирован с `github/main` до commit `918fe5a0` без удаления `.env`, базы, S3 или rollback backup. Corepack signature problem обойдён установкой pnpm 10.4.1 напрямую через npm; production build прошёл. `tgtop.service` active/enabled, `/healthz` возвращал 200, canonical `tgtop.me` отвечал 200, а `tgtop.xyz` проходил через предусмотренный redirect.

Подготовлены backup/rollback paths и отдельный SSH deploy key. Последние live операции выполнялись staged-способом, без ручного изменения базы или S3-структуры.

Однако полный Vitest на VPS не является зелёным production gate: часть environment-dependent тестов требует JWT/TON/MTProto secrets, а один rendered-тест требует Chromium, отсутствующий на сервере. Локальные TypeScript/build gates и targeted suites проходили; это не следует описывать как полное live E2E-подтверждение.

## 3. Что осталось недописанным или не подтверждено

### P0 перед публичным запуском

| Область | Что осталось |
|---|---|
| Production auth | Реальный новый Telegram-аккаунт должен пройти вход, запуск Mini App, профиль, My Groups и protected mutation |
| BotFather | Нужно подтвердить HTTPS Mini App URL и Main App для нужного бота; profile-level Launch App button не подтверждён |
| Listing E2E | Нужна живая проверка add bot → group appears → settings → listing → open detail → protected action → unlisting |
| Financial correctness | В ledger остаётся исправление точного listing charge `0.1 GRAM` и возврат затронутого `0.9 GRAM` overcharge |
| Auth runtime | В production logs ранее фиксировалось отсутствие `OAUTH_SERVER_URL`; protected auth paths нужно проверить после корректной конфигурации |

### Финансовый и TON-контур

Не завершены server-verified TON deposits/withdrawals, idempotency, recipient confirmation, manual approval, transaction verification, payout safeguards, escrow settlement, dispute/refund deadlines и масштабируемый account-wallet foundation. Внутренние bid/payment intents и Telegram Stars path существуют, но реальные TON списания и выплаты не должны включаться до завершения safeguards.

Referral links с configurable commission share, completed-deal referral earnings, referral dashboard, payout calculation и owner-only manual GRAM bonuses также остаются pending.

### Безопасность, DDoS и восстановление

Были сделаны quick wins: bounded request/cache limits, route limits, server-side checks, ORM boundaries и staged systemd/nginx hardening. Но полный security-аудит с DDoS/rate-limit/queue strategy для сайта и обоих ботов, XSS/URL/upload review, safe error logging, критический API regression coverage и off-host encrypted DB backup/restore drill ещё не завершены.

Важно: code checkpoint и rollback не равны восстановлению базы данных. Нужны отдельная резервная копия БД, checksum/schema/ledger verification и тестовое восстановление в новой БД.

### Архитектура и масштабирование

`Home.tsx` уже частично разгружен: вынесены `NftShowcase`, `NftCard`, shared community artwork, compact list-row и первый TOP/ranking module. Но крупный owner-workspace/profile/admin блок всё ещё не полностью декомпозирован. Остаются pagination/keyset loading, query safeguards, cache, batch refresh, ограничение realtime только активными TOP-карточками и защита от загрузки миллиона групп целиком.

### Аналитика

Собраны и отображаются только Telegram-observable snapshots, joins/leaves/invites и доступные метрики. Не завершены доверенная аналитическая архитектура с provenance, историческими snapshots, approved-provider enrichment, TGStat-grade historical analytics, realtime deltas и честный прогноз охвата с состоянием «недостаточно данных».

### Owner cabinet, moderation и support

Не завершены progressive rich owner cabinet, полноценная система нарушений/moderation, карантин до решения модератора, раздельные Telegram owner/admin/listing/moderator roles, owner action feed, закрытая forum-группа вместо отдельных служебных каналов и часть support/admin-bot hardening. MVP launch/support logging уже есть, но это не полный operational console.

### NFT, sale и Web3 identity

Не завершены NFT deposit bot, on-chain/off-chain расширенный transfer flow, verified wallet routing per NFT, automatic discovery с owner approval, leased username return flow, staged group sale/escrow и ownership-transfer safeguards. `tgtop.ton` и TON Site также не доведены до verified production состояния; HTTPS Mini App остаётся на `tgtop.me`.

### Конкретные оставшиеся media/UI пункты

В ledger всё ещё находятся следующие незакрытые или требующие reconciliation задачи:

- live Telegram user-avatar refresh после re-login/avatar change;
- отдельная диагностика канала `@F_I_N_E_G_O_L_D`;
- полная authenticated light-theme owner verification;
- production avatar flow для всех карточек и detail;
- подтверждение exact `0.1 GRAM` listing minimum на client и server;
- сохранение optional category/geo в listing payload;
- замена верхнего буквенного avatar fallback на брендовый ассет во всех live paths;
- нормализация старых pending-пунктов о Market video и stale live bundle после поздней live-проверки.

Часть этих записей уже частично исправлена более поздними checkpoint-ами, поэтому перед следующим спринтом нужно провести reconciliation `todo.md`, а не просто продолжать добавлять новые пункты.

## 4. Текущий ответ на вопрос «готовы ли мы к тестированию?»

**К закрытому тестированию — да.** Можно подключать ограниченное число реальных Telegram-аккаунтов и тестовых групп, проверять onboarding, Global, My Groups, listing и переходы. Реальные TON-платежи, автоматические выплаты, массовый трафик и миллионные объёмы включать нельзя.

**К публичному launch — нет.** Главные причины: незавершённый новый-account production E2E, незакрытый BotFather/Main App flow, финансовая корректность `0.1 GRAM` и возврат `0.9 GRAM`, отсутствие полноценного off-host restore drill, незавершённый security/scale review и pending live auth configuration.

## 5. Рекомендуемый следующий порядок

1. Исправить и проверить `OAUTH_SERVER_URL`, затем провести один полный production E2E с новым Telegram-аккаунтом.
2. Подтвердить BotFather HTTPS/Main App settings и canonical `tgtop.me` origin.
3. Проверить точное начисление `0.1 GRAM`, найти затронутые `0.9 GRAM` overcharge записи и подготовить безопасный ledger refund без ручного удаления данных.
4. Провести реальный mobile owner-flow: add bot, My Groups, listing settings, listing, detail, CTA, unlisting.
5. Завершить encrypted off-host DB backup/restore drill и критический security/rate-limit audit.
6. Нормализовать `todo.md`, особенно старые media/live пункты, затем продолжить декомпозицию `Home.tsx` и light-theme owner surfaces.
7. Только после этого переходить к массовому трафику, TON charges/payouts, referral economics, full analytics и расширенному Web3/NFT sale flow.

## References

[1]: `READINESS_AUDIT_RU.md` — readiness-аудит от 2 сентября 2026 года.
[2]: `production_smoke_notes.md` — production HTTP/browser/User API smoke notes, включая Market video.
[3]: `todo.md` — полный проектный ledger с 1 002 выполненными и 241 незавершённым пунктом.
