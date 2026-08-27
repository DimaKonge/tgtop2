#!/usr/bin/env bash
# Safe TG TOP release: packages only checked source artifacts, installs the locked
# dependency tree inside an isolated VPS stage, smoke-tests it there, then atomically
# activates dist + node_modules + package metadata together.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${TG_TOP_VPS_HOST:?Set TG_TOP_VPS_HOST, for example root@your-vps}"
KEY="${TG_TOP_VPS_KEY:?Set TG_TOP_VPS_KEY to the private release-key path}"
DRY_RUN="${DRY_RUN:-0}"
RELEASE="${RELEASE_NAME:-release-$(date -u +%Y%m%dT%H%M%SZ)}"
STAGE_PORT="${TG_TOP_STAGE_PORT:-3101}"
ARCHIVE="/tmp/tgtop-${RELEASE}-source.tgz"
BACKUP_RETENTION="${TG_TOP_BACKUP_RETENTION:-5}"
MIN_FREE_KB="${TG_TOP_RELEASE_MIN_FREE_KB:-786432}"
STAGE_RETENTION_MINUTES="${TG_TOP_STAGE_RETENTION_MINUTES:-120}"
SOURCE_RETENTION_MINUTES="${TG_TOP_SOURCE_RETENTION_MINUTES:-10080}"

cd "$PROJECT_DIR"

if [[ "$DRY_RUN" != "1" ]]; then
  pnpm vitest run --exclude server/tonPayoutWallet.credentials.test.ts --exclude server/tonApi.credentials.test.ts --pool=forks --poolOptions.forks.singleFork
  pnpm build
fi

for item in dist package.json pnpm-lock.yaml patches/wouter@3.7.1.patch scripts; do
  test -e "$item" || { echo "Missing required release item: $item" >&2; exit 1; }
done

tar -C "$PROJECT_DIR" -czf "$ARCHIVE" \
  dist package.json pnpm-lock.yaml patches/wouter@3.7.1.patch scripts
EXPECTED_SHA="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
echo "Prepared ${RELEASE} (${EXPECTED_SHA})"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run: no archive uploaded and no VPS files changed."
  rm -f "$ARCHIVE"
  exit 0
fi

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes "$HOST")
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes)

"${SSH[@]}" 'mkdir -p /opt/tgtop/releases /opt/tgtop/backups'
"${SCP[@]}" "$ARCHIVE" "$HOST:/opt/tgtop/releases/${RELEASE}-source.tgz"

"${SSH[@]}" "RELEASE='$RELEASE' EXPECTED_SHA='$EXPECTED_SHA' STAGE_PORT='$STAGE_PORT' BACKUP_RETENTION='$BACKUP_RETENTION' MIN_FREE_KB='$MIN_FREE_KB' STAGE_RETENTION_MINUTES='$STAGE_RETENTION_MINUTES' SOURCE_RETENTION_MINUTES='$SOURCE_RETENTION_MINUTES' bash -s" <<'REMOTE'
set -euo pipefail
BASE=/opt/tgtop
ARCHIVE="$BASE/releases/${RELEASE}-source.tgz"
STAGE="$BASE/releases/stage-${RELEASE}"
PREVIOUS="$BASE/releases/previous-${RELEASE}"
FAILED="$BASE/releases/failed-${RELEASE}"
BACKUP="$BASE/backups/pre-${RELEASE}-runtime.tgz"
LOCK_FILE="$BASE/releases/.release.lock"
ITEMS=(dist node_modules package.json pnpm-lock.yaml scripts)
UNITS=(tgtop.service tgtop-bot.service tgtop-bot-reserve.service)
if [ -f /etc/systemd/system/tgtop-payout-worker.service ]; then UNITS+=(tgtop-payout-worker.service); fi
if [ -f /etc/systemd/system/tgtop-owner-dm-worker.service ]; then UNITS+=(tgtop-owner-dm-worker.service); fi
ACTIVATED=0

prune_runtime_backups() {
  local keep="$1"
  local -a stale=()
  mapfile -t stale < <(find "$BASE/backups" -maxdepth 1 -type f -name 'pre-release-*-runtime.tgz' -printf '%T@ %p\n' | sort -nr | tail -n +$((keep + 1)) | cut -d' ' -f2-)
  if ((${#stale[@]})); then
    rm -f -- "${stale[@]}"
  fi
}

ensure_release_space() {
  local available_kb
  prune_runtime_backups "$((BACKUP_RETENTION - 1))"
  available_kb="$(df -Pk "$BASE" | awk 'NR == 2 { print $4 }')"
  if [ -z "$available_kb" ] || [ "$available_kb" -lt "$MIN_FREE_KB" ]; then
    echo "Insufficient release space: ${available_kb:-0}KB available, ${MIN_FREE_KB}KB required after backup retention" >&2
    exit 1
  fi
}

prune_release_artifacts() {
  find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d \( -name 'stage-release-*' -o -name 'previous-release-*' \) -mmin +"$STAGE_RETENTION_MINUTES" -exec rm -rf -- {} +
  find "$BASE/releases" -mindepth 1 -maxdepth 1 -type f -name 'release-*-source.tgz' -mmin +"$SOURCE_RETENTION_MINUTES" -delete
}

rollback() {
  if [ "$ACTIVATED" = 1 ]; then
    mkdir -p "$FAILED"
    for item in "${ITEMS[@]}"; do [ -e "$BASE/$item" ] && mv "$BASE/$item" "$FAILED/$item" || true; done
    for item in "${ITEMS[@]}"; do [ -e "$PREVIOUS/$item" ] && mv "$PREVIOUS/$item" "$BASE/$item" || true; done
    systemctl restart "${UNITS[@]}" || true
  fi
}
trap rollback ERR

[ "$(sha256sum "$ARCHIVE" | awk '{print $1}')" = "$EXPECTED_SHA" ]
[ ! -e "$STAGE" ]
[ ! -e "$PREVIOUS" ]
[ -x "$BASE/node_modules/.bin/pnpm" ] || { echo "Project-local pnpm is unavailable; refusing release" >&2; exit 1; }
case "$BACKUP_RETENTION" in ''|*[!0-9]*|0) echo "TG_TOP_BACKUP_RETENTION must be a positive integer" >&2; exit 1;; esac
case "$MIN_FREE_KB" in ''|*[!0-9]*|0) echo "TG_TOP_RELEASE_MIN_FREE_KB must be a positive integer" >&2; exit 1;; esac
case "$STAGE_RETENTION_MINUTES" in ''|*[!0-9]*|0) echo "TG_TOP_STAGE_RETENTION_MINUTES must be a positive integer" >&2; exit 1;; esac
case "$SOURCE_RETENTION_MINUTES" in ''|*[!0-9]*|0) echo "TG_TOP_SOURCE_RETENTION_MINUTES must be a positive integer" >&2; exit 1;; esac
command -v flock >/dev/null || { echo "flock is required for safe staged releases" >&2; exit 1; }
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another TG TOP release is already running; refusing overlap" >&2; exit 1; }
if command -v ss >/dev/null && ss -ltn | grep -q ":${STAGE_PORT} "; then
  echo "Staging port ${STAGE_PORT} is already in use" >&2
  exit 1
fi

prune_release_artifacts
ensure_release_space
mkdir -p "$STAGE" "$PREVIOUS"
tar -xzf "$ARCHIVE" -C "$STAGE"
for item in dist package.json pnpm-lock.yaml patches/wouter@3.7.1.patch scripts; do test -e "$STAGE/$item"; done

"$BASE/node_modules/.bin/pnpm" --dir "$STAGE" install --frozen-lockfile --ignore-scripts >/tmp/tgtop-${RELEASE}-pnpm.log
(
  cd "$STAGE"
  node scripts/runtime-package-probe.mjs
)

set -a
. /etc/tgtop/runtime.conf
set +a
NODE_ENV=production PORT="$STAGE_PORT" node "$STAGE/dist/index.js" >/tmp/tgtop-${RELEASE}-smoke.log 2>&1 &
SMOKE_PID=$!
stop_smoke() { kill "$SMOKE_PID" 2>/dev/null || true; wait "$SMOKE_PID" 2>/dev/null || true; }
trap 'stop_smoke; rollback' ERR
for attempt in $(seq 1 15); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${STAGE_PORT}/healthz" >/tmp/tgtop-${RELEASE}-stage-health.json; then break; fi
  sleep 1
done
test -s /tmp/tgtop-${RELEASE}-stage-health.json
stop_smoke
trap rollback ERR

# This release uses a narrow, idempotent additive migration only for the new
# entry-link audit table. It never replays legacy migrations against production.
node "$STAGE/scripts/apply-entry-link-audit-migration.mjs" >/tmp/tgtop-${RELEASE}-migration.log

tar -C "$BASE" -czf "$BACKUP" "${ITEMS[@]}"
for item in "${ITEMS[@]}"; do mv "$BASE/$item" "$PREVIOUS/$item"; done
for item in "${ITEMS[@]}"; do mv "$STAGE/$item" "$BASE/$item"; done
ACTIVATED=1
systemctl restart "${UNITS[@]}"
sleep 10
for unit in "${UNITS[@]}"; do systemctl is-active --quiet "$unit" || { rollback; exit 1; }; done
curl -fsS --max-time 15 http://127.0.0.1:3000/healthz >/tmp/tgtop-release-health.json || { rollback; exit 1; }
rm -rf -- "$PREVIOUS" "$STAGE"
rm -f -- "$ARCHIVE"
prune_release_artifacts
prune_runtime_backups "$BACKUP_RETENTION"
trap - ERR
printf 'release=%s\nbackup=%s\nstage_health=ok\n' "$RELEASE" "$BACKUP"
REMOTE

rm -f "$ARCHIVE"
echo "Release ${RELEASE} completed."
