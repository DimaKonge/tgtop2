# Telegram official analytics source notes

## Sources

- Telegram API: [Channel statistics](https://core.telegram.org/api/stats)
- Telegram API: [stats.getBroadcastStats](https://core.telegram.org/method/stats.getBroadcastStats)
- Telegram API: [stats.broadcastStats](https://core.telegram.org/constructor/stats.broadcastStats)

## Verified API facts

Telegram exposes detailed aggregate statistics only to user accounts (not bots) that are administrators of eligible channels or supergroups. Eligibility is indicated by the `can_view_stats` field returned in `channelFull`; the request can require routing to `channelFull.stats_dc`.

For channels, `stats.getBroadcastStats` provides a period, current and previous aggregates for followers, views per post, shares per post, reactions per post, story aggregates, and notification percentage. Its available graph fields include growth, followers, muted notifications, top hours, interactions, views by source, new followers by source, languages, and reactions by emotion.

For supergroups, `stats.getMegagroupStats` provides corresponding aggregate/member and activity graph categories. `StatsGraph` responses can be immediate JSON, async tokens loaded with `stats.loadAsyncGraph`, or unavailable/error values.

## TG TOP privacy boundary

TG TOP stores only the resolved allowlisted chat identity, safe aggregate metrics, and bounded timestamp/value graph points. It must not read or persist post text, private messages, member lists, personal identities, or financial information in the analytics path.
