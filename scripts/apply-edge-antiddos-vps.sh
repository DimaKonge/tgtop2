#!/usr/bin/env bash
# Applies Nginx edge limits with config backups, nginx -t, health verification and rollback.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${TG_TOP_VPS_HOST:?Set TG_TOP_VPS_HOST}"
KEY="${TG_TOP_VPS_KEY:?Set TG_TOP_VPS_KEY}"
RELEASE="${RELEASE_NAME:-edge-antiddos-$(date -u +%Y%m%dT%H%M%SZ)}"
ARCHIVE="/tmp/tgtop-${RELEASE}-nginx.tgz"

cd "$PROJECT_DIR"
for item in deploy/nginx/tgtop-rate-zones.conf deploy/nginx/tgtop-proxy-common.conf deploy/nginx/tgtop-edge-server.conf; do
  test -f "$item" || { echo "Missing $item" >&2; exit 1; }
done

tar -czf "$ARCHIVE" deploy/nginx
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes "$HOST")
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes)
"${SCP[@]}" "$ARCHIVE" "$HOST:/opt/tgtop/releases/${RELEASE}-nginx.tgz"

"${SSH[@]}" "RELEASE='$RELEASE' bash -s" <<'REMOTE'
set -euo pipefail
BASE=/opt/tgtop
ARCHIVE="$BASE/releases/${RELEASE}-nginx.tgz"
STAGE="$BASE/releases/stage-${RELEASE}-nginx"
BACKUP="$BASE/backups/pre-${RELEASE}-nginx"
SITE=/etc/nginx/sites-enabled/tgtop
ZONE=/etc/nginx/conf.d/tgtop-rate-zones.conf
COMMON=/etc/nginx/snippets/tgtop-proxy-common.conf
EDGE=/etc/nginx/snippets/tgtop-edge-server.conf
mkdir -p "$STAGE" "$BACKUP" /etc/nginx/snippets
tar -xzf "$ARCHIVE" -C "$STAGE"

cp "$SITE" "$BACKUP/tgtop.site"
for item in "$ZONE" "$COMMON" "$EDGE"; do
  if [ -e "$item" ]; then cp "$item" "$BACKUP/$(basename "$item")"; else : > "$BACKUP/$(basename "$item").absent"; fi
done

rollback() {
  cp "$BACKUP/tgtop.site" "$SITE"
  for item in "$ZONE" "$COMMON" "$EDGE"; do
    name="$(basename "$item")"
    if [ -f "$BACKUP/$name.absent" ]; then rm -f "$item"; else cp "$BACKUP/$name" "$item"; fi
  done
  nginx -t && systemctl reload nginx || true
}
trap rollback ERR

install -m 0644 "$STAGE/deploy/nginx/tgtop-rate-zones.conf" "$ZONE"
install -m 0644 "$STAGE/deploy/nginx/tgtop-proxy-common.conf" "$COMMON"
install -m 0644 "$STAGE/deploy/nginx/tgtop-edge-server.conf" "$EDGE"
if ! grep -qF 'include /etc/nginx/snippets/tgtop-edge-server.conf;' "$SITE"; then
  sed -i '/client_max_body_size 50m;/a\    include /etc/nginx/snippets/tgtop-edge-server.conf;' "$SITE"
fi
nginx -t
systemctl reload nginx
curl -fsS --max-time 15 http://127.0.0.1:3000/healthz >/dev/null
curl -fsS --max-time 15 https://tgtop.me/healthz >/dev/null
trap - ERR
printf 'edge_antiddos=enabled\nbackup=%s\n' "$BACKUP"
REMOTE

rm -f "$ARCHIVE"
