# TG TOP Telegram Analytics Capabilities

## Reliable data available through the connected bot

TG TOP can collect a current member count for a connected channel or chat, record its own observed messages and membership updates, and retain time-stamped snapshots. This supports reliable growth deltas, joins and leaves observed after the bot becomes an administrator, message activity, and invite-attributed joins where Telegram provides invite information.

The current bot already has the beginnings of this model: `group_stats_snapshots`, message activity, membership events, and invite-based join counters. Zero values mean the bot has not yet observed the activity or a historical baseline; they must not be presented as historical Telegram totals.

## Data that requires a separate, explicit source

Telegram's official `messages.getMessagesViews` method states that it is available only to user accounts, not Bot API bots. Accordingly, exact historical post-view analytics cannot be claimed from the current bot alone. A future expansion needs either an owner-authorized Telegram account connection for read-only channel insights, or a third-party analytics provider for eligible public channels.

## Verified TGStat provider option

TGStat publishes an API intended for Telegram services, catalogues, and advertising marketplaces. Its Statistics API documents endpoints for channel data, historical subscribers, posts, mentions, forwards, average post reach, ERR, and views. The official documentation states that the free tier covers up to two channels owned by the caller; other channels require a paid Statistics API tariff, a personal token, and quota management by requests and unique channels. TGStat also documents callbacks for publication changes and channel subscriptions, which can be used only after an explicit provider integration is configured.

For TG TOP, provider metrics must be stored separately from bot-observed metrics, marked with source and capture time, and shown only for public channels that are eligible under the selected provider plan.

## Sources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram invite-link API](https://core.telegram.org/api/invites)
- [Telegram `messages.getMessagesViews` method](https://core.telegram.org/method/messages.getMessagesViews)
- [TGStat API introduction](https://api.tgstat.ru/docs/ru/start/intro.html)
