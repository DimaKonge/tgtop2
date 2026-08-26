# TG TOP — безопасное включение payout worker

Этот документ описывает подготовку отдельного процесса обработки TON-выплат. Он не содержит секретов и не включает автоматическую отправку средств.

> Worker нельзя запускать из общего `/etc/tgtop/runtime.conf`: web/API и боты не должны получать mnemonic hot wallet. Для worker используется отдельный root-owned файл `/etc/tgtop/payout-worker.conf` с правами `0600`.

| Шаг | Действие | Защитный результат |
|---|---|---|
| 1 | Выпустить проверенный `dist`, включающий `tonPayoutWorkerProcess.js`. | Worker-код проходит тем же staged release и rollback, что сайт. |
| 2 | Применить migration `0050_wakeful_puff_adder.sql`. | Очередь и wallet lease существуют до запуска процесса. |
| 3 | Установить `deploy/tgtop-payout-worker.service` и выполнить `daemon-reload`. | Worker работает отдельным `tgtop` user без HTTP-порта. |
| 4 | Создать отдельный restricted environment file для worker. | Mnemonic отсутствует у web/API и bot services. |
| 5 | Запустить worker **без** `TON_PAYOUT_WORKER_BROADCAST_ENABLED=true`. | Разрешены только durable queue/reconciliation checks; новые broadcasts не исполняются. |
| 6 | Проверить worker status и job logs. | Ни одна заявка не должна быть отправлена или автоматически возвращена на этом этапе. |
| 7 | Только отдельным явным решением владельца провести controlled broadcast smoke с точной суммой и получателем. | Никакого неявного финансового действия. |

## Необходимые параметры worker environment

В отдельный защищённый файл попадают только обязательные данные worker: `DATABASE_URL`, `TONAPI_API_KEY`, `TON_PAYOUT_WALLET_ADDRESS`, `TON_PAYOUT_WALLET_MNEMONIC`, `TON_WITHDRAWALS_ENABLED`, `TON_WITHDRAWALS_PAUSED` и новый отдельный `TON_PAYOUT_WORKER_BROADCAST_ENABLED`.

Для initial rollout последний параметр **не указывается** или устанавливается в `false`. Общая runtime-конфигурация web/API должна сохранять публичный `TON_PAYOUT_WALLET_ADDRESS`, но не mnemonic.

## Запрещённые действия

Не следует копировать секреты в репозиторий, выводить environment в терминал, включать broadcast вместе с первым запуском service, запускать worker до миграции или повторять broadcast после timeout. Не используйте `git reset`, `git clean`, `git pull` и не заменяйте runtime-конфигурацию при установке unit.
