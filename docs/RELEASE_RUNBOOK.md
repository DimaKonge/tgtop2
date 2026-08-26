# TG TOP: безопасный VPS-релиз

Этот runbook стандартизирует выпуск TG TOP на VPS. Он защищает **runtime-конфигурацию**, сохраняет резервную копию и выполняет откат всей связки `dist + node_modules + package.json + pnpm-lock.yaml`, если после перезапуска любой из трёх сервисов или `/healthz` не здоров.

> Не выполняйте `git reset`, `git clean`, `git checkout -f` или `git pull` в `/opt/tgtop`. В нём могут находиться исторические несохранённые изменения и runtime-конфигурация.

| Этап | Что происходит | Защита |
|---|---|---|
| Локальная проверка | Запускаются тесты и production build. | В VPS не передаётся непроверенный `dist`. |
| Упаковка | В архив входят `dist`, audited `node_modules`, manifest и lockfile. | Runtime не получает несинхронные зависимости. |
| Staging | Архив и его SHA-256 сверяются до активации. | Исключается повреждённая или подменённая передача. |
| Активация | Старая связка переименовывается в `previous`, новая переносится целиком. | Откат возвращает код и зависимости вместе. |
| Проверка | Проверяются `tgtop.service`, два bot-сервиса и `GET /healthz`. | Неактивный или нездоровый релиз не остаётся рабочим. |

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

Скрипт не читает и не изменяет `/etc/tgtop/runtime.conf`. Он не выполняет финансовые переводы, выплаты, NFT-передачи или изменения данных базы.

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
  'systemctl is-active tgtop.service tgtop-bot.service tgtop-bot-reserve.service'
```

Если любой из сервисов не active, не выполняйте ручных `rm` или Git-команд. Скрипт уже возвращает предыдущую связку; сначала изучите последние журналы сервисов без раскрытия секретов.
