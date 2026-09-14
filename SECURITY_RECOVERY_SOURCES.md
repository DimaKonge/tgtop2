# TG TOP — источники для security и recovery-аудита

## OWASP: отказ в обслуживании

OWASP рекомендует рассматривать защиту от DoS на уровнях приложения, сессий и сети, применять дешёвую валидацию до ресурсоёмких действий, лимиты размера запросов и загрузок, graceful degradation, кэширование и rate limiting как на инфраструктурном, так и на прикладном уровне.

Источник: [OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).

## OWASP: инъекции и Node.js

Для SQL и других интерпретируемых контекстов OWASP приоритизирует параметризованные API и allow-list валидацию. Для Node.js отдельно важны разные лимиты тела запроса по маршрутам и типам контента, недопущение блокировки event loop, server-side validation, output escaping и ограничение тяжёлых ресурсов.

Источники: [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html) и [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html).

## nginx: ограничение запросов

`limit_req` использует leaky-bucket ограничение с key-based shared memory zone; допускает rate и burst, а при `nodelay` отклоняет превышение без задержки. Лимиты могут сочетаться по IP и по виртуальному серверу.

Источник: [nginx ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

## MariaDB: резервное восстановление

`mariadb-dump` подходит для переносимого логического бэкапа, а `mariadb-backup` — для физических online backup. Логический backup должен включать необходимые routines/events при их использовании; физический backup перед restore необходимо `--prepare`, а восстановление требует пустого datadir. LVM-снапшоты сами по себе не являются надёжным DB backup.

Источники: [mariadb-dump](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump) и [MariaDB Backup and Restore Overview](https://mariadb.com/docs/server/server-usage/backup-and-restore/backup-and-restore-overview).
