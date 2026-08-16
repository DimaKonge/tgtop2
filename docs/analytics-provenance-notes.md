# TG TOP analytics provenance notes

## Confirmed sources

TG TOP already records **bot-observed** activity for connected communities: member joins, leaves, invite-link joins, messages, last-post views, and periodic member snapshots. These values must be labelled as observed from the point when @TGTOP_robot has administrator access; they are not a reconstruction of earlier history.

Telegram's native statistics are available only to administrators of channels or supergroups that meet Telegram's server-side eligibility threshold and expose the `can_view_stats` flag. Therefore, native detailed statistics must never be implied for a community unless the owner has explicitly authorized an eligible account-level integration. Source: [Telegram Channel Statistics](https://core.telegram.org/api/stats).

TGStat publishes a Statistics API for Telegram channels and chats, a Search API for posts, and a Callback API. Its documentation and tariffs govern endpoint availability, access tiers, and any token needed for a production integration. TG TOP should fetch such history only through an authorized provider API and store: provider, response timestamp, requested entity identifier, metric name, metric value, period, and source version. Source: [TGStat API Docs](https://api.tgstat.ru/docs/).

## Safe display policy

| Source | TG TOP label | Permitted metrics | Restriction |
|---|---|---|---|
| @TGTOP_robot | `Наблюдается ботом` | Joins, leaves, invite joins, posts, current members, snapshots | Only after bot access begins |
| Telegram-native owner stats | `Статистика Telegram` | Eligible administrator-authorized channel/supergroup metrics | Requires explicit owner authorization and eligibility |
| Approved provider history | `История: <provider>` | Provider-returned public-channel history | Store fetch time and period; do not merge silently with bot values |

## Recommended implementation order

1. Add a data-provenance field to every analytics payload returned to the detail view.
2. Keep bot snapshots as the default source and show its observation start date.
3. Add a provider adapter behind a server-side API key only after the service account and commercial access are approved.
4. Cache normalized provider periods and expose a visible source switch rather than interpolating or fabricating absent values.
