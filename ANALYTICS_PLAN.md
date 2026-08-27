# TG TOP Analytics — architecture draft

## Goal

Provide factual, source-labelled analytics for listed Telegram channels, groups, and chats without loading the full catalog or polling every community continuously. The first priority is the set of occupied TOP cells across all categories and countries; the lower catalog uses slower refresh policies.

## Source hierarchy

| Source | Best for | Trust label | Limits |
|---|---|---|---|
| Telegram MTProto official statistics | Historical channel/supergroup growth, views, shares, reactions, source graphs and activity graphs | Telegram Official | Requires an authorized User API session and sufficient administrator access; unavailable for many ordinary groups |
| Telegram Bot API/update events | Current member changes, bot permissions, join/leave events and chat metadata | Telegram Bot | Requires the bot to be present with appropriate rights; does not provide full historical analytics |
| TG TOP snapshots/events | Continuous history from the moment a group is connected and confirmed | TG TOP Collected | Cannot reconstruct periods before collection began |
| External analytics providers | Public estimates or additional context | External Estimate | Must be shown separately and never presented as official Telegram data |

## Runtime policy

Occupied TOP cells receive event-driven updates and a lightweight realtime stream. A new or repeated listing, or movement into a TOP cell, raises the monitoring priority and triggers a fresh snapshot. When a listing leaves TOP, it is downgraded to scheduled refresh. Ordinary catalog items are refreshed in bounded batches rather than through a full-table scan.

## Data model principles

Every metric record carries `source`, `collectedAt`, `periodStart`, `periodEnd`, and an availability status. Historical imports are append-only and deduplicated by target, metric, source, and time bucket. Official data is never silently overwritten by a TG TOP estimate. The UI displays current value, last update time, and a source badge. Realtime deltas use green `+N` for confirmed joins and red `−N` for confirmed leaves; animations are only visual feedback after a real event.

## Avatars

For active TOP targets, the User Agent may fetch the latest Telegram profile photo, compare its stable photo identity with the stored metadata, and upload a changed image to S3. The catalog stores the S3 URL/key and synchronization timestamp; dynamic user media is not bundled into the frontend. If Telegram access is unavailable, the last confirmed avatar remains visible with its last-sync state.

## Safety boundaries

The User Agent must use an encrypted stored session, explicit allowlisting of analytics targets, audit events, and no public posts, financial transfers, wallet signing, NFT transfers, or automatic administrator promotion. A Telegram account cannot be made an administrator without the owner’s explicit action or confirmation in the target chat.

## First implementation slice

1. Extract analytics types, source labels, and priority policy into a standalone module.
2. Reuse existing `groupStatsSnapshots`, `telegramStatsTargets`, and `telegramStatsSnapshots` rather than adding duplicate tables.
3. Add a single read model for TOP-cell counters and last update metadata.
4. Add event-driven counter updates for confirmed bot events and a fallback refresh path.
5. Add the compact Analytics surface to Workspace/card details only after the server contracts and tests are stable.
