#!/usr/bin/env bash
# Installs only the protected Manus API key for the owner-DM worker. The existing
# runtime config is neither read nor printed; every dedicated file is backed up and
# restored on failure.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${TG_TOP_VPS_HOST:?Set TG_TOP_VPS_HOST}"
KEY="${TG_TOP_VPS_KEY:?Set TG_TOP_VPS_KEY}"
API_KEY="${MANUS_API_KEY:-}"
SYNC_ID="manus-owner-dm-$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_ENV_FILE="$(mktemp /dev/shm/tgtop-manus-owner-dm.XXXXXX)"
REMOTE_STAGE="/opt/tgtop/releases/${SYNC_ID}.env"

cleanup() { rm -f "$LOCAL_ENV_FILE"; }
trap cleanup EXIT

[[ ${#API_KEY} -ge 20 ]] || { echo "Manus API key is unavailable locally" >&2; exit 1; }
[[ -f "$PROJECT_DIR/dist/telegramOwnerDmWorkerProcess.js" ]] || { echo "Owner-DM worker build is missing; release it first" >&2; exit 1; }

umask 077
printf 'MANUS_API_KEY=%s\n' "$API_KEY" > "$LOCAL_ENV_FILE"

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes "$HOST")
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes)
"${SCP[@]}" "$LOCAL_ENV_FILE" "$HOST:$REMOTE_STAGE"

"${SSH[@]}" "SYNC_ID='$SYNC_ID' REMOTE_STAGE='$REMOTE_STAGE' bash -s" <<'REMOTE'
set -euo pipefail
TARGET=/etc/tgtop/manus-owner-dm.env
UNIT=/etc/systemd/system/tgtop-owner-dm-worker.service
BACKUP="/opt/tgtop/backups/pre-${SYNC_ID}"
TARGET_EXISTED=0
UNIT_EXISTED=0

rollback() {
  status=$?
  set +e
  if [ "$TARGET_EXISTED" = 1 ]; then install -m 0600 "$BACKUP/manus-owner-dm.env" "$TARGET"; else rm -f "$TARGET"; fi
  if [ "$UNIT_EXISTED" = 1 ]; then install -m 0644 "$BACKUP/tgtop-owner-dm-worker.service" "$UNIT"; else systemctl disable --now tgtop-owner-dm-worker.service >/dev/null 2>&1 || true; rm -f "$UNIT"; fi
  rm -f "$REMOTE_STAGE"
  systemctl daemon-reload
  exit "$status"
}
trap rollback ERR

mkdir -p "$BACKUP"
if [ -f "$TARGET" ]; then install -m 0600 "$TARGET" "$BACKUP/manus-owner-dm.env"; TARGET_EXISTED=1; fi
if [ -f "$UNIT" ]; then install -m 0644 "$UNIT" "$BACKUP/tgtop-owner-dm-worker.service"; UNIT_EXISTED=1; fi
install -m 0600 "$REMOTE_STAGE" "$TARGET"
rm -f "$REMOTE_STAGE"
cat > "$UNIT" <<'EOF'
[Unit]
Description=TG TOP owner-only Telegram Assistant worker
After=network-online.target tgtop.service
Requires=tgtop.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tgtop
EnvironmentFile=/etc/tgtop/runtime.conf
EnvironmentFile=/etc/tgtop/telegram-user-api.env
EnvironmentFile=/etc/tgtop/manus-owner-dm.env
ExecStart=/usr/bin/node /opt/tgtop/dist/telegramOwnerDmWorkerProcess.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now tgtop-owner-dm-worker.service
sleep 3
systemctl is-active --quiet tgtop-owner-dm-worker.service
trap - ERR
printf 'manus_owner_dm_sync=ok\n'
REMOTE

cd "$PROJECT_DIR"
