# TG TOP — модель безопасности TON payout-контура

**Статус:** согласованный technical design до реализации. Документ не включает ключи, адреса, суммы или команды, способные инициировать перевод.

## Цель

Публичный запрос пользователя должен только быстро создать защищённую заявку и вернуть её статус. Он не должен строить BOC, получать `seqno`, подписывать сообщение, обращаться к hot wallet или ждать ответа сети. Эти действия выполняет один изолированный worker только после durable claim из базы.

| Инвариант | Требование | Пользовательский эффект |
|---|---|---|
| **Никакой отправки из API** | tRPC создаёт заявку и job, но не вызывает broadcast. | Форма вывода отвечает быстро и не зависит от TonAPI. |
| **Одна отправка на заявку** | Перед broadcast заявка атомарно переходит в `broadcast_pending` с сохранённым `externalMessageHash`. | Повторный клик, retry или рестарт не создают второй перевод. |
| **Один владелец hot wallet** | Worker получает renewable DB lease на конкретный payout wallet. | Несколько процессов не используют один `seqno`. |
| **Сначала сверка, потом действие** | После timeout/неясного ответа job переходит только в reconciliation. | Сеть не получает опасный blind retry. |
| **Секрет только у worker** | Web/API/bot процессы не получают mnemonic hot wallet. | Взлом публичного API не даёт возможность подписывать payout. |
| **Fail closed** | Ошибка БД, lease, лимита, конфигурации или сети останавливает отправку. | Нет «догадок» и скрытых финансовых действий. |
| **Короткий API-путь** | Каталог, TOP, аналитика и UI не ждут финансовых сетевых операций. | Безопасность не снижает скорость обычных функций. |

## Threat model

| Угроза | Последствие без защиты | Контроль |
|---|---|---|
| Flood запросов на вывод | Нагрузка на БД/TonAPI, очередь и риск обхода UX-rate-limit. | Per-user, per-address и global server-side budgets; одна активная заявка; короткое создание intent; job dequeue ограничен. |
| Повторная доставка/клик | Две заявки или две отправки одной суммы. | Unique idempotency key, unique withdrawal reference, conditional state transitions и один job на withdrawal. |
| Рестарт между подготовкой и broadcast | Потеря in-memory очереди или неясный результат. | Job/lease в БД, `broadcast_pending`, сохранённый message hash и обязательная reconciliation. |
| Два worker процесса | Конфликт `seqno` и конкурентная подпись hot wallet. | Wallet-scoped DB lease с TTL, fencing token и worker identity. |
| Компрометация web/API | Доступ к публичным процедурам превращается в доступ к ключу выплат. | Separate systemd unit и отдельный restricted environment file worker; API не импортирует signing code. |
| TonAPI timeout | Сообщение могло быть принято, хотя HTTP-ответ не пришёл. | Никакого повторного broadcast; только chain reconciliation по message hash/reference. |
| Зависшая job | Средства выглядят удержанными бесконечно. | Lease expiry, controlled recovery, audit event и ручная escalation вместо автоматического перевода. |

## Целевое разделение процессов

```text
Mini App / browser
        │  короткий authenticated request
        ▼
web API ──► MySQL: withdrawal + payout job
                   │
                   ▼
        isolated payout worker ──► TonAPI / hot wallet
                   │
                   ▼
           MySQL: immutable status + audit/reconciliation
```

> **Неизменное правило:** новый worker не активирует выплаты сам. Даже после релиза он исполняет только безопасные reconciliation/lease проверки, пока отдельный feature flag и явное решение владельца не разрешат broadcast.

## Измеримые требования к скорости

| Путь | Бюджет | Запрещённая работа |
|---|---:|---|
| Создание withdrawal intent | Одна короткая транзакция БД | TonAPI, подпись, BOC, ожидание очереди. |
| Public catalog / TOP / analytics | Не зависят от worker | Любая синхронная payout-сверка. |
| Worker claim | Один индексированный DB claim | Полный scan истории или пользовательский UI. |
| Reconciliation | Фоновая bounded job | Blind rebroadcast и блокировка API. |

## Release gate

Перед включением worker нужны: schema migration, unit/integration/recovery tests, отдельный service unit без публичного HTTP порта, проверка отсутствия mnemonic в web/bot environment, DB backup, staged rollout с broadcast disabled и health/queue metrics. Реальные выплаты, возвраты и переводы активов не входят в этот release.
