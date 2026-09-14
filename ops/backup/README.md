# TG TOP — production database backup and recovery runbook

> This runbook is intentionally **fail-closed**. Do not enable an automated backup until an encrypted off-host destination and a restore drill are configured. A SQL dump left only on the same VPS is not disaster recovery.

## Required configuration

Create the following root-owned files outside the repository. Never add credentials, database URLs, encryption passwords or storage tokens to Git.

| File | Permissions | Purpose |
| --- | --- | --- |
| `/etc/tgtop/backup-db.cnf` | `0600 root:root` | MariaDB client credentials for a dedicated backup-only DB user. |
| `/etc/tgtop/backup.env` | `0600 root:root` | Database name, encryption key reference and approved off-host destination. |
| `/etc/tgtop/backup-public-key.asc` | `0644 root:root` | Public encryption key; private key must remain outside the VPS. |

The DB user receives only the minimal read/metadata privileges required by `mariadb-dump`; it must not own the application tables and must not be the app runtime user. The external destination must support immutable or versioned retention. A separate location under the same VPS filesystem is only a temporary operational copy, never the final backup.

## Backup contract

Each backup must create an encrypted compressed logical dump with `mariadb-dump --single-transaction --quick --routines --events --triggers --databases`, then upload both the encrypted file and a manifest containing the timestamp, app release version, byte size and SHA-256. The job returns failure if encryption, checksum, upload or retention validation fails; silent local-only success is forbidden.

Use a `systemd` service and timer on the VPS for this infrastructure operation. Do not use `setInterval`, `node-cron` or a Node process-local timer. The default intended frequency is a daily full logical dump initially; the schedule, retention and encrypted external destination require a separate confirmation once the storage location is available.

## Restore drill contract

At least once before enabling production dependence, restore a selected encrypted backup into a **new empty test database**, not the running production database. Check: schema presence, row counts for critical tables, index availability, append-only financial ledger consistency, application database connectivity and `/healthz`. Record the restore time and checksum in a private operations log.

## Incident sequence

1. Preserve current release ID, service logs and the selected backup manifest; do not overwrite the suspected broken state.
2. Stop or isolate only the affected service. Keep webhook/polling implications in mind for each Telegram bot.
3. Restore to a fresh DB target, verify checksum and run integrity checks before changing runtime configuration.
4. Point the staged app runtime at the verified target, start services one by one and confirm `/healthz`, bot logs and read-only catalogue queries.
5. Keep financial withdrawals, manual bonuses and background jobs paused until ledger reconciliation is explicitly completed.
6. After recovery, create a new checkpoint and post-incident record; only then return to ordinary releases.

## Required future assets

The only missing external prerequisite is an approved off-host encrypted backup destination and public encryption key. Do not substitute GitHub, Telegram messages, unencrypted email or a personal chat for database backups.
