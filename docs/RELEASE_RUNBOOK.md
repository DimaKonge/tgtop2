# TG TOP: безопасный VPS-релиз

Этот runbook стандартизирует выпуск TG TOP на VPS. Он защищает **runtime-конфигурацию** и выполняет откат всей связки `dist + node_modules + package.json + pnpm-lock.yaml`, если после перезапуска любой обязательный сервис или `/healthz` не здоров. Зависимости **не копируются с локальной машины**: они устанавливаются по lockfile в изолированном staging непосредственно на VPS и проходят отдельный smoke-test до активации.

> Не выполняйте `git reset`, `git clean`, `git checkout -f` или `git pull` в `/opt/tgtop`. В нём могут находиться исторические несохранённые изменения и runtime-конфигурация.

| Этап | Что происходит | Защита |
|---|---|---|
| Локальная проверка | Запускаются тесты и production build. | В VPS не передаётся непроверенный `dist`. |
| Упаковка | В архив входят `dist`, manifest, lockfile, required patches и runtime dependency probe. | Локальный pnpm layout не переносится на другую машину. |
| Staging | Архив и его SHA-256 сверяются; project-local pnpm выполняет `--frozen-lockfile --ignore-scripts` прямо на VPS. | Runtime получает точный lockfile tree, включая server-required Vite dependency. |
| Smoke | Новый `dist` запускается на отдельном localhost-порту и отвечает `/healthz` до активации. | Несовместимые dependencies или server-start ошибки не доходят до public traffic. |
| Схема | После smoke применяются только заранее просмотренные **reviewed additive migrations** для новых изолированных объектов, включая immutable owner bindings private log-группы. | Новый код не активируется, если migration не прошла; legacy Drizzle migrations не переигрываются поверх уже работающей production-схемы. |
| Активация | Старая связка переименовывается в `previous`, новая переносится целиком. | Откат возвращает код и зависимости вместе. |
| Проверка | Проверяются `tgtop.service`, два bot-сервиса, payout worker (если он установлен) и `GET /healthz`. | Неактивный или нездоровый релиз не остаётся рабочим. |

## Подготовка ключа

На VPS публичный ED25519 ключ релиза добавляется в `/root/.ssh/authorized_keys`. Приватный ключ остаётся только в изолированном окружении выпуска и никогда не коммитится, не передаётся в чат и не попадает в архив.

Перед первым подключением сверяйте отпечаток сервера через `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Не используйте `StrictHostKeyChecking=no`.

## Обычный выпуск

Из корня проекта задайте только адрес VPS и путь к локальному закрытому ключу:

```bash
export TG_TOP_VPS_HOST='root@YOUR_VPS_IP'
export TG_TOP_VPS_KEY="$HOME/.ssh/tgtop_release_ed25519"
bash scripts/release-vps.sh
```

Скрипт временно использует `/etc/tgtop/runtime.conf` только для изолированного локального health smoke-test и reviewed additive migrations, но **не печатает, не архивирует и не изменяет** его. Он не выполняет финансовые переводы, выплаты, NFT-передачи или изменения прикладных данных базы.

Скрипт всегда исключает из тест-гейта `server/tonPayoutWallet.credentials.test.ts` и `server/tonApi.credentials.test.ts`. Если выпуск идёт с машины, где недоступны прод-секреты или локально поднятый инстанс, добавьте такие наборы через `TG_TOP_TEST_EXCLUDE` (пути через пробел):

```bash
TG_TOP_TEST_EXCLUDE='server/telegramUserAgent.test.ts server/telegramUserApi.credentials.test.ts client/src/pages/Home.mobile-rendered.test.ts' \
  bash scripts/release-vps.sh
```

Исключайте только suite, которым нужен недоступный ресурс, и фиксируйте список в записи о выпуске. Продуктовые тесты исключать нельзя.

## Dry-run

Перед новым типом релиза можно проверить упаковку и обязательные файлы без подключения к VPS:

```bash
DRY_RUN=1 TG_TOP_VPS_HOST='unused' TG_TOP_VPS_KEY="$HOME/.ssh/tgtop_release_ed25519" \
  bash scripts/release-vps.sh
```

## Ручная проверка после релиза

После успешного скрипта подтвердите:

```bash
curl -fsS https://tgtop.me/healthz
curl -fsSI https://tgtop.me/
ssh -i "$TG_TOP_VPS_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes "$TG_TOP_VPS_HOST" \
  'systemctl is-active tgtop.service tgtop-bot.service tgtop-bot-reserve.service tgtop-payout-worker.service'
```

Если любой из сервисов не active, не выполняйте ручных `rm` или Git-команд. Скрипт уже возвращает предыдущую связку; сначала изучите последние журналы сервисов без раскрытия секретов.
