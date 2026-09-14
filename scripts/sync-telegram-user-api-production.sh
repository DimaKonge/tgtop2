#!/usr/bin/env bash
# Installs only the already protected local Telegram API credentials into a
# dedicated root-readable systemd EnvironmentFile. It never reads, prints or
# changes the existing runtime configuration and rolls back the dedicated files on error.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${TG_TOP_VPS_HOST:?Set TG_TOP_VPS_HOST}"
KEY="${TG_TOP_VPS_KEY:?Set TG_TOP_VPS_KEY}"
API_ID="${TELEGRAM_USER_API_ID:-}"
API_HASH="${TELEGRAM_USER_API_HASH:-}"
SYNC_ID="telegram-user-api-$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_ENV_FILE="$(mktemp /dev/shm/tgtop-telegram-user-api.XXXXXX)"
REMOTE_STAGE="/opt/tgtop/releases/${SYNC_ID}.env"

cleanup() {
  rm -f "$LOCAL_ENV_FILE"
}
trap cleanup EXIT

[[ "$API_ID" =~ ^[1-9][0-9]*$ ]] || { echo "Telegram API credentials are unavailable locally" >&2; exit 1; }
[[ "$API_HASH" =~ ^[a-fA-F0-9]{32}$ ]] || { echo "Telegram API credentials are unavailable locally" >&2; exit 1; }

umask 077
printf 'TELEGRAM_USER_API_ID=%s\nTELEGRAM_USER_API_HASH=%s\n' "$API_ID" "$API_HASH" > "$LOCAL_ENV_FILE"

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes "$HOST")
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes)

"${SCP[@]}" "$LOCAL_ENV_FILE" "$HOST:$REMOTE_STAGE"
"${SSH[@]}" "SYNC_ID='$SYNC_ID' REMOTE_STAGE='$REMOTE_STAGE' bash -s" <<'REMOTE'
set -euo pipefail
TARGET=/etc/tgtop/telegram-user-api.env
DROPIN_DIR=/etc/systemd/system/tgtop.service.d
DROPIN="$DROPIN_DIR/telegram-user-api.conf"
BACKUP="/opt/tgtop/backups/pre-${SYNC_ID}"
TARGET_EXISTED=0
DROPIN_EXISTED=0

rollback() {
  status=$?
  set +e
  if [ "$TARGET_EXISTED" = 1 ]; then install -m 0600 "$BACKUP/telegram-user-api.env" "$TARGET"; else rm -f "$TARGET"; fi
  if [ "$DROPIN_EXISTED" = 1 ]; then install -m 0644 "$BACKUP/telegram-user-api.conf" "$DROPIN"; else rm -f "$DROPIN"; fi
  rm -f "$REMOTE_STAGE"
  systemctl daemon-reload
  systemctl restart tgtop.service || true
  exit "$status"
}
trap rollback ERR

mkdir -p "$BACKUP" "$DROPIN_DIR"
if [ -f "$TARGET" ]; then install -m 0600 "$TARGET" "$BACKUP/telegram-user-api.env"; TARGET_EXISTED=1; fi
if [ -f "$DROPIN" ]; then install -m 0644 "$DROPIN" "$BACKUP/telegram-user-api.conf"; DROPIN_EXISTED=1; fi

install -m 0600 "$REMOTE_STAGE" "$TARGET"
cat > "$DROPIN" <<'EOF'
[Service]
EnvironmentFile=/etc/tgtop/telegram-user-api.env
EOF
rm -f "$REMOTE_STAGE"

systemctl daemon-reload
systemctl restart tgtop.service
systemctl is-active --quiet tgtop.service
for attempt in $(seq 1 15); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/healthz >/dev/null; then break; fi
  sleep 1
done
curl -fsS --max-time 3 http://127.0.0.1:3000/healthz >/dev/null

set -a
. "$TARGET"
set +a
node /opt/tgtop/scripts/telegram-user-api-probe.mjs
trap - ERR
printf 'telegram_user_api_sync=ok\n'
REMOTE

cd "$PROJECT_DIR"
