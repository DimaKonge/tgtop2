#!/usr/bin/env bash
# Activate an already smoke-tested TG TOP VPS stage.
# This script intentionally does not run migrations and never touches .env, DB, or S3.
set -euo pipefail

BASE="${TG_TOP_BASE:-/opt/tgtop}"
RELEASE_NAME="${1:-stage-22fdf3e}"
STAGE="$BASE/releases/$RELEASE_NAME"
PREVIOUS="$BASE/releases/previous-${RELEASE_NAME}-$(date -u +%Y%m%dT%H%M%SZ)"
LOCK_FILE="$BASE/releases/.activate.lock"
ITEMS=(dist node_modules package.json pnpm-lock.yaml scripts)
UNITS=(tgtop.service)
for unit in tgtop-bot.service tgtop-bot-reserve.service tgtop-owner-dm-worker.service; do
  systemctl cat "$unit" >/dev/null 2>&1 && UNITS+=("$unit") || true
done

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root (for example: sudo $0 $RELEASE_NAME)" >&2
  exit 1
fi
for item in "${ITEMS[@]}"; do
  test -e "$STAGE/$item" || { echo "Missing staged item: $STAGE/$item" >&2; exit 1; }
done

test -f "$STAGE/dist/index.js"
test -f "$STAGE/dist/public/index.html"
if grep -R -q "История статистики Telegram" "$STAGE/dist/public/assets" 2>/dev/null; then
  echo "Refusing to activate stage that still contains removed statistics UI" >&2
  exit 1
fi

mkdir -p "$BASE/releases"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another activation is already running" >&2; exit 1; }

rollback() {
  status=$?
  if [[ "$status" -ne 0 && -d "$PREVIOUS" ]]; then
    echo "Activation failed; rolling back runtime files" >&2
    for item in "${ITEMS[@]}"; do
      rm -rf -- "$BASE/$item"
      [[ -e "$PREVIOUS/$item" ]] && mv -- "$PREVIOUS/$item" "$BASE/$item"
    done
    systemctl restart "${UNITS[@]}" || true
  fi
  exit "$status"
}
trap rollback ERR

mkdir -p "$PREVIOUS"
for item in "${ITEMS[@]}"; do
  mv -- "$BASE/$item" "$PREVIOUS/$item"
done
for item in "${ITEMS[@]}"; do
  mv -- "$STAGE/$item" "$BASE/$item"
done
systemctl restart "${UNITS[@]}"
sleep 8
for unit in "${UNITS[@]}"; do
  systemctl is-active --quiet "$unit"
done
curl -fsS --max-time 15 http://127.0.0.1:3000/healthz >/dev/null

trap - ERR
printf 'activated=%s\nhealth=ok\nprevious=%s\n' "$RELEASE_NAME" "$PREVIOUS"
