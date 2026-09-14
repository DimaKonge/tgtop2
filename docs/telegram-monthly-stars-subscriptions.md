# Telegram monthly Stars subscription links

TG TOP’s paid-entry feature uses Telegram’s native monthly subscription invite links for private channels. The confirmed implementation constraints are:

- Native monthly Stars subscription links are created for **channels**; TG TOP therefore limits this control to managed private channels, not chats.
- Telegram’s Bot API method is `createChatSubscriptionInviteLink`.
- The subscription period is one month: `2592000` seconds.
- The native Stars subscription price is an integer in the range **1–10,000**.
- The TG TOP bot must be an administrator with permission to invite users.
- Subscription links do not combine with manual join approval or a member-usage limit; Telegram manages monthly billing and access.

TG TOP stores the generated invite URL only in the owner’s My Groups response. It must never be returned from public catalog, ranking, profile, or group-detail queries.

## Sources

- [Telegram Bot API — createChatSubscriptionInviteLink](https://core.telegram.org/bots/api#createchatsubscriptioninvitelink)
- [Telegram API — Invite links and paid channel subscriptions](https://core.telegram.org/api/invites)
