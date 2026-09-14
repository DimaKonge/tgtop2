# TG TOP — CSP Report-Only runbook

## Current production state

TG TOP отправляет заголовок `Content-Security-Policy-Report-Only`. Это **наблюдательная**, а не блокирующая политика: браузер и Telegram WebView продолжают выполнять все текущие действия, а браузер сообщает о потенциально неучтённых источниках на `/api/csp-report`.

| Контроль | Реализация | Проверенный результат |
|---|---|---|
| Policy mode | `Content-Security-Policy-Report-Only` | Никакой source не блокируется этим этапом. |
| Источники | Telegram WebApp, Google Fonts, TonAPI/TonConnect bridge, TG TOP origins и analytics origin | Public header вернулся с `200` на `tgtop.me`. |
| Отчёт | `POST /api/csp-report`, максимум 16 KB, 60 запросов/мин на IP | Возвращает `204`; не создаёт business, wallet или payout operation. |
| Лог | Только `effective-directive` и normalized origin; максимум один лог на пару в минуту | URL path и query не сохраняются. |
| Production checks | Web, два bot process и payout worker active; локальный/public health `200` | Подтверждено после staged release. |

Первый реальный TonConnect report указал `connect-src` origin `https://config.ton.org`. Он добавлен в Report-Only allowlist как evidence-based origin; это изменение не включает блокирующую CSP.

## Как читать evidence

Отчёт CSP не является инцидентом сам по себе. Он показывает источник, который нужно проверить перед строгой policy. Просматривать только агрегированные строки `CSP Report-Only` в журнале web service; не публиковать и не копировать сырые request payload, потому что в них теоретически могут быть browser URL.

> Пока не собраны реальные отчёты как минимум из Telegram Mini App, браузерного Telegram Login и TonConnect, **enforcing CSP не включается**. Report-Only сохраняет скорость и совместимость продукта, но даёт данные для следующего решения.

## Критерии отдельного перехода к enforcing

Переход требует отдельного согласованного release. До него должны быть подтверждены: отсутствие неожиданных origin в report log; работа Telegram WebApp; browser Telegram Login; подключение/отключение TonConnect; загрузка community/NFT media; public pages; и rollback header. `unsafe-inline` для script/style не убирать до отдельной nonce/hash migration клиентского bundle.

Внешний CDN/WAF и provider-level DDoS остаются отдельным слоем: CSP не защищает от насыщения канала или распределённого HTTP flood.
