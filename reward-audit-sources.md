# Reward / Telegram onboarding audit source note

## Official Telegram Mini Apps documentation

Source: https://core.telegram.org/bots/webapps

Relevant fact: the official documentation states that Bot API 7.0 added the `openTelegramLink` method and that Mini Apps no longer close when `WebApp.openTelegramLink` is called. Bot API 6.1 introduced `openLink` and `openTelegramLink`; `openLink` is the general external-link method, while `openTelegramLink` is intended for Telegram links. This supports using the existing WebApp-aware helper for the TG TOP admin onboarding link instead of a raw `window.open`, while keeping Telegram admin rights and link parameters unchanged.

Retrieved during the August 2026 desktop onboarding investigation.

## Historical statistics findings

Source: https://core.telegram.org/api/stats and https://core.telegram.org/method/stats.getBroadcastStats

Telegram documents detailed statistics for channels and supergroups through MTProto. `channels.getFullChannel` exposes `can_view_stats`, `participants_count`, `online_count`, and related fields. `stats.getBroadcastStats` returns period bounds, follower current/previous values, growth graph, views, shares, reactions, notification percentage, source graphs and recent post interactions. It is a user-only method and requires admin access; errors include `CHAT_ADMIN_REQUIRED`, `CHANNEL_PRIVATE`, and `BROADCAST_REQUIRED`. Therefore official historical analytics are feasible for eligible admin-accessible channels/supergroups, not universally for every group. Bot API/current event data and TG TOP snapshots remain the fallback for other communities.
