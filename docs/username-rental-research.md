# Collectible username rental — research notes

## Confirmed facts

Telegram’s official API documentation states that users can assign multiple Fragment collectible usernames to accounts, supergroups, and channels they own. Collectible usernames behave like basic usernames in Telegram search and deep links, but ownership is secured through TON and exchange is handled through Fragment. The API exposes account, bot, and channel username activation/reordering operations, which means TG TOP should not pretend to perform assignment itself unless an official authenticated Telegram/Fragment flow confirms it.

Telegram’s official collectible info type includes the Fragment URL, purchase date, currency, and crypto amount. This supports storing an external asset reference and verification metadata rather than treating a typed username as proof of ownership.

Telegram’s official gifts announcement says channel owners can transfer gifts to users/channels or auction them on-chain, but availability can roll out gradually. Therefore the Gifts block remains view-only until a verified source and explicit wallet confirmation exist.

## Product safety decision

TG TOP will implement rental listings and escrow state tracking only. It will not custody or automatically transfer a username, claim that a username has been assigned, or mark a rental active based only on payment. The active state requires seller verification, buyer confirmation, target community identification, and a confirmed external Telegram/Fragment assignment reference. Expired or disputed contracts go to a review/refund state rather than silently reassigning the asset.

## Sources

1. https://core.telegram.org/api/fragment
2. https://core.telegram.org/type/fragment.CollectibleInfo
3. https://telegram.org/blog/wear-gifts-blockchain-and-more
