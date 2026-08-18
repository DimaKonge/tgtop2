# Reward campaign: Telegram event source

TG TOP receives bot updates through the existing persistent `getUpdates` long-polling worker. The official Telegram Bot API states that `getUpdates` and outgoing webhooks are mutually exclusive and that `chat_member` must be included explicitly in `allowed_updates`, because it is excluded from the default update set. The production bot already requests `chat_member` updates.

For a verified membership change, TG TOP uses `ChatMemberUpdated` fields: the chat, the actor who performed the action, the affected member, and, when Telegram supplies it, the invite link used to join. A direct chat addition can therefore credit the acting user only when the update has no invite link and the actor differs from the new member. For channel referrals, TG TOP creates and stores a unique Telegram invite link for the recipient; when that exact link is returned in a later membership update, the stored recipient is credited.

The reward ledger is idempotent. One event may credit a given beneficiary only once per group, joined member, and reward type. A transaction reserves campaign GRAM from the owner, decrements the remaining campaign budget atomically on a confirmed event, and disables public reward visibility when no configured reward still fits the remaining balance.

## Source

- [Telegram Bot API — getUpdates, allowed updates, and webhook exclusivity](https://core.telegram.org/bots/api#getupdates)
- [Telegram Bot API — ChatMemberUpdated](https://core.telegram.org/bots/api#chatmemberupdated)
