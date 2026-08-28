# TG TOP — Security & Recovery Audit

**Дата аудита:** 28 августа 2026.  
**Граница:** read-only проверка исходного кода и текущей VPS-конфигурации; без попыток эксплуатации, без изменения балансов, данных, Telegram-настроек или production-конфигурации.

> Абсолютно неуязвимых систем не существует. Цель TG TOP — предсказуемо ограничивать злоупотребления, не допускать несанкционированный доступ или изменение финансовых записей и быстро восстанавливать работу при сбое.

## 1. Подтверждённые защитные слои

| Контур | Наблюдение | Статус |
| --- | --- | --- |
| Сеть | UFW включён: входящий трафик по умолчанию запрещён; открыты только SSH с лимитом, HTTP/HTTPS и требуемый TON ADNL UDP-порт. | Есть |
| Reverse proxy | nginx ограничивает соединения до 40 на IP, общий `/api/trpc` до 30 r/s с burst 60, а финансовые withdrawal routes до 6 r/m с небольшими burst. Установлены proxy timeouts и route body limits. | Есть |
| HTTP-приложение | Отключён `x-powered-by`, настроены `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS в production и тRPC rate limit 120 запросов/минуту на IP с bounded in-memory tracking. | Есть |
| Доступ к данным | Входные контракты tRPC используют Zod; в просмотренном коде не найдено `sql.raw`, исполнения shell-команд из web-ввода или `dangerouslySetInnerHTML`. Drizzle parameter binding остаётся базовой защитой от SQL injection. | Есть, требует regression coverage |
| Telegram Login | PKCE S256, state-cookie, HttpOnly/Secure/SameSite=Lax cookies и allow-list `returnTo` уже есть. Canonical callback приведён к `https://tgtop.me/api/auth/telegram/callback`. | Есть |
| Контроль сервисов | Основной сервис и два Telegram-бота настроены на restart; public health и все три systemd service были active после последнего релиза. | Есть |
| Версии кода | Проверенные checkpoint и приватный GitHub history позволяют быстро вернуть код к сохранённой версии. | Есть |

## 2. Риски и приоритеты

| Приоритет | Подтверждённое наблюдение | Почему важно | Безопасное решение | Проверка результата |
| --- | --- | --- | --- | --- |
| P0 | На VPS не обнаружен подтверждённый независимый backup базы: найдены migration SQL, но не проверенный регулярный logical/physical dump вне сервера. | Code rollback не возвращает пользователей, балансы, ledger или каталог после потери БД. | Добавить зашифрованный off-host DB backup, retention, checksum и регулярный restore drill на отдельную тестовую БД. | Проверка хеша, restore в пустую тестовую БД, инварианты ledger, `/healthz`. |
| P1 | Global Express JSON и urlencoded parser принимают до 50 MB, хотя большинство API не нуждается в таких телах. | Большие JSON-запросы могут занять память/event loop до маршрута. | Малый общий лимит и отдельные строгие лимиты только на реально нужных маршрутах; contract tests на `413`. | Payload oversize получает `413`, легитимный flow проходит. |
| P1 | `/api/telegram-avatar/:chatId` при cache miss обращается к Telegram; `/manus-storage/*key` запрашивает presign для каждого обращения и имеет `no-store`. Эти routes не покрыты отдельным nginx rate policy в просмотренной конфигурации. | Атакующий может создать дорогой исходящий трафик без нагрузки на tRPC rate limit. | Отдельные nginx limits, серверный короткий cache/negative cache, ограниченный allow-list key-space для storage, наблюдение за 429/5xx. | Нагрузочный test на route, счётчики cache hit/miss, без лишних обращений к Telegram. |
| P1 | App-level rate limiter in-memory: он не переживает restart и не является общей квотой при будущем горизонтальном масштабировании. | IP rotation или несколько instances обходят локальный счётчик. | Оставить как второй рубеж, а первичный — nginx/CDN/WAF; для auth/финансовых действий добавить durable per-account keys. | Test IP/account limit и наблюдение rate-limit rejection. |
| P1 | `tgtop-bot-reserve.service` работает без `NoNewPrivileges` и `PrivateTmp`; у остальных сервисов отсутствуют `ProtectSystem`, `ProtectHome`, `MemoryMax`, `CPUQuota` и restrictive address-family policy. | Успешная компрометация процесса имеет слишком широкую OS-поверхность; неограниченное потребление снижает устойчивость. | Подготовить systemd hardening drop-ins и тестировать их сначала на stage, указав только нужные read/write/network права. | Staged restart, bot polling, `/healthz`, журнал без permission errors. |
| P1 | Новые события `bot added` пока нельзя считать доказательством легитимного листинга. | Ферма аккаунтов может создать поток пустых площадок и попытаться исказить каталог/награды. | Одноразовый onboarding intent, Telegram owner match, quotas, quarantine и отсутствие авто-вознаграждения/авто-публикации. | Idempotency, replay, burst и ownership regression tests. |
| P2 | CSP включён в report-only режиме. | Нарушения видны, но браузер ещё не блокирует их. | Собрать violations, сократить источники, затем включить enforce CSP после Telegram/Mini App compatibility test. | Mobile Telegram, desktop Telegram и web smoke без CSP reports. |
| P2 | В production нет подтверждённого внешнего DDoS/WAF слоя в текущем nginx-аудите. | nginx эффективно ограничивает application requests, но не заменяет внешнюю защиту от объёмной атаки канала. | Выбрать edge CDN/WAF с origin shielding, bot mitigation и L3/L4 protection; не менять DNS без отдельного согласования. | Origin закрыт от прямого веб-трафика, legitimate Telegram/Mini App flows проходят. |

## 3. Защита от инъекций и злоупотребления API

Новая бизнес-логика должна следовать схеме: дешёвая allow-list валидация и limit входа до любой сетевой, DB или криптографической операции; затем authentication; затем ownership/role проверка; затем идемпотентная транзакция; затем безопасный audit event. Пользовательский ввод не должен становиться названием таблицы, SQL fragment, URL без allow-list, shell argument, HTML или логом с секретом.

Для public catalog нужны keyset pagination, жёсткая верхняя граница `limit`, кешированный read model и отдельные дешёвые endpoints для TOP slots. Для финансовых и admin routes ключ rate limit должен учитывать не только IP, но и authenticated Telegram/open ID и критичное действие. Любое начисление, списание или payout должно быть append-only, idempotent и иметь отдельный correlation ID.

## 4. Anti-DDoS порядок внедрения

| Этап | Изменение | Что не меняется |
| --- | --- | --- |
| 1. Quick wins | Уменьшить global body parser, добавить per-route limits/negative cache, тесты на oversize и повторные запросы. | Каталог, Telegram onboarding, балансы и выплаты. |
| 2. Edge policy | nginx route limits для avatar/storage/login; защищённые systemd drop-ins; access/error metrics. | Публичные URL и Telegram bot tokens. |
| 3. Anti-Sybil | Подтверждённый intent перед регистрацией площадки, quotas, quarantine и moderation workflow. | Легитимный существующий листинг. |
| 4. External edge | CDN/WAF и закрытие web-origin после staged compatibility test. | Без отдельного согласования не меняются DNS, firewall или provider settings. |
| 5. Масштаб | Очередь, DB-backed idempotency, cache/read model и realtime только для занятых TOP slots. | Нет poll всех групп и нет in-process timers. |

## 5. Backup и быстрое восстановление

### Целевые точки восстановления

| Данные | RPO | Целевое RTO | Механизм |
| --- | --- | --- | --- |
| Код и конфигурация приложения | Последний проверенный checkpoint | Минуты | Проверенный staged release / rollback + private GitHub history. |
| MariaDB catalog, users, groups, ranking, snapshots | До последнего успешного backup | До согласованного окна восстановления | Off-host encrypted logical backup; по мере роста — physical backup и point-in-time strategy. |
| Финансовый ledger/балансы | Минимальная потеря; отдельная сверка после restore | До согласованного окна с ручной проверкой | Append-only ledger, backup, reconciliation before reopening financial actions. |
| Secrets и системная конфигурация | Последняя одобренная версия | Минуты–часы | Отдельный защищённый inventory/secret management; секреты никогда не в Git или dump без шифрования. |

### Минимальный безопасный backup runbook

1. Использовать отдельного DB backup-пользователя с минимальными правами и не писать credentials в repository.
2. Для текущего умеренного объёма сформировать согласованный `mariadb-dump` с `--single-transaction --quick --routines --events --triggers`; сохранить manifest с версией, временем, размером и SHA-256.
3. Шифровать backup до выгрузки и держать не менее одной копии вне VPS. Локальная копия на том же диске не считается аварийной защитой.
4. Хранить расписание и retention через systemd timer/проверяемую durable automation; не через process-local timer в Node.
5. Регулярно делать restore drill в отдельную пустую тестовую БД. До успешного drill backup не считается подтверждённым.
6. При инциденте: сначала зафиксировать версию и логи, изолировать повреждённый runtime, восстановить в новый target, выполнить ledger invariants, переключить приложение, проверить `/healthz` и только затем открыть критичные действия.

## 6. Release и incident gates

Каждый релиз должен включать unit/regression tests, TypeScript, production build, staged health, проверку основных Telegram flow, состояние трёх services, проверку canonical domain и запись version ID. Для изменения schema — только additive/reversible migration, backup перед применением, post-migration integrity query и задокументированный rollback/forward recovery путь.

Для security-конфигурации требуется отдельный staged rollout и явное согласование перед изменением DNS, firewall, WAF, Telegram/BotFather settings, DB retention или systemd. Атакующие тесты, массовые Telegram-действия, payout/deposit и любые финансовые операции в этот аудит не входят.

## 7. Источники

См. [SECURITY_RECOVERY_SOURCES.md](./SECURITY_RECOVERY_SOURCES.md): OWASP DoS/Injection/Node.js guidance, nginx `limit_req` documentation и MariaDB backup/restore documentation.

## 8. UI modularization visual check

После извлечения `TopRankingCard` проверены локальные рендеры 390×844 и 1280×720. В обоих viewport сохранены: верхняя 1+2+4 геометрия, пустые ranking-slots, высоты 300/136/88px на mobile и прозрачная нижняя навигация. Проверка выполнена на пустой TOP-board; карточку с живой аватаркой и action flow пользователь проверит в Telegram после следующего checkpoint/release.

## 9. Реализованный первый security/modularization milestone

Выполнены безопасные code-level quick wins. Общий JSON limit снижен с 50 MB до 256 KB, urlencoded limit — до 64 KB, при этом медиа по-прежнему идут прямым storage flow, а не через buffer Node-процесса. Для `/api/telegram-avatar/:chatId` добавлены bounded 192-entry TTL-cache, 60-секундный negative cache, request coalescing на одинаковый cache miss, ограничение размера upstream media до 1.5 MB, более короткие timeouts и allow-list image content types. Для `/manus-storage/*key` добавлены ограничение и validation key, bounded 1024-entry 30-секундный presign cache и request coalescing; полные ответы внешнего storage API больше не попадают в server log.

Первый UI extraction вынес верхнюю TOP-card presentation в `client/src/components/TopRankingCard.tsx`. Она сохраняет 1+2+4 варианты и прежние action callbacks; нижние каталожные строки остаются отдельным лёгким renderer в `Home.tsx`. Прогнаны 266 локальных tests (3 skipped), TypeScript и production build. Внешний TonAPI credential test один раз достиг timeout во время полного запуска, после чего прошёл отдельным повтором без изменения финансового кода.

## 10. Staged VPS hardening rollout — completed

Nginx limits были применены только после snapshot прежних файлов, `nginx -t` и reload. Первая попытка была автоматически отменена из-за синтаксиса некавыченного regex; production nginx тогда не перезагружался, а конфигурация была восстановлена. Шаблон исправлен, протестирован и применён повторно. Live-проверка подтвердила: `/healthz` = 200, malformed Telegram avatar = 400, path traversal в storage = 400, JSON payload 270 KB к tRPC = 413.

Web service и оба Telegram bot services затем получили systemd drop-in по одному, с отдельными backup directories и rollback при fail readiness. Первый web stage не прошёл слишком короткий two-second readiness window и был автоматически восстановлен; журнал не показал process crash. Повтор с 30-second readiness window прошёл. На итоговой проверке nginx и три TG TOP services active, а `systemd-analyze security` показывает overall exposure level **3.7 (OK)** для web, primary bot и reserve bot.

## 11. Remaining recovery prerequisite

Off-host encrypted backup и restore drill **не активированы**. Нельзя считать recovery готовым до выбора отдельного versioned destination и публичного encryption key; then a fresh-database restore drill must be performed and recorded. No financial reconciliation, database restore, DNS/WAF change or wallet action was performed during this hardening rollout.
