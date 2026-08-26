#!/usr/bin/env bash
# Safe TG TOP release: packages dist and audited runtime dependencies together,
# activates them atomically on the VPS, and restores the full previous runtime if
# services or /healthz do not become healthy.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${TG_TOP_VPS_HOST:?Set TG_TOP_VPS_HOST, for example root@your-vps}"
KEY="${TG_TOP_VPS_KEY:?Set TG_TOP_VPS_KEY to the private release-key path}"
DRY_RUN="${DRY_RUN:-0}"
RELEASE="${RELEASE_NAME:-release-$(date -u +%Y%m%dT%H%M%SZ)}"
ARCHIVE="/tmp/tgtop-${RELEASE}-runtime.tgz"

cd "$PROJECT_DIR"

if [[ "$DRY_RUN" != "1" ]]; then
  pnpm test
  pnpm build
fi

for item in dist node_modules package.json pnpm-lock.yaml; do
  test -e "$item" || { echo "Missing required release item: $item" >&2; exit 1; }
done

tar -C "$PROJECT_DIR" -czf "$ARCHIVE" dist node_modules package.json pnpm-lock.yaml
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
"${SCP[@]}" "$ARCHIVE" "$HOST:/opt/tgtop/releases/${RELEASE}-runtime.tgz"

"${SSH[@]}" "RELEASE='$RELEASE' EXPECTED_SHA='$EXPECTED_SHA' bash -s" <<'REMOTE'
set -euo pipefail
BASE=/opt/tgtop
ARCHIVE="$BASE/releases/${RELEASE}-runtime.tgz"
STAGE="$BASE/releases/.stage-${RELEASE}"
PREVIOUS="$BASE/releases/previous-${RELEASE}"
FAILED="$BASE/releases/failed-${RELEASE}"
BACKUP="$BASE/backups/pre-${RELEASE}-runtime.tgz"
ITEMS=(dist node_modules package.json pnpm-lock.yaml)

rollback() {
  mkdir -p "$FAILED"
  for item in "${ITEMS[@]}"; do
    [[ -e "$BASE/$item" ]] && mv "$BASE/$item" "$FAILED/$item"
  done
  for item in "${ITEMS[@]}"; do
    [[ -e "$PREVIOUS/$item" ]] && mv "$PREVIOUS/$item" "$BASE/$item"
  done
  systemctl restart tgtop.service tgtop-bot.service tgtop-bot-reserve.service || true
}

[[ "$(sha256sum "$ARCHIVE" | awk '{print $1}')" == "$EXPECTED_SHA" ]]
rm -rf "$STAGE" "$PREVIOUS" "$FAILED"
mkdir -p "$STAGE" "$PREVIOUS"
tar -xzf "$ARCHIVE" -C "$STAGE"
for item in "${ITEMS[@]}"; do test -e "$STAGE/$item"; done

tar -C "$BASE" -czf "$BACKUP" "${ITEMS[@]}"
for item in "${ITEMS[@]}"; do mv "$BASE/$item" "$PREVIOUS/$item"; done
for item in "${ITEMS[@]}"; do mv "$STAGE/$item" "$BASE/$item"; done

systemctl restart tgtop.service tgtop-bot.service tgtop-bot-reserve.service || rollback
sleep 5
for unit in tgtop.service tgtop-bot.service tgtop-bot-reserve.service; do
  systemctl is-active --quiet "$unit" || { rollback; exit 1; }
done
[[ "$(curl -sS -o /tmp/tgtop-release-health.json -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/healthz)" == "200" ]] || { rollback; exit 1; }
printf 'release=%s\nbackup=%s\n' "$RELEASE" "$BACKUP"
REMOTE

rm -f "$ARCHIVE"
echo "Release ${RELEASE} completed."
