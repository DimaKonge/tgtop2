# Avatar audit — 2026-09-13

## Confirmed sources

- Current GitHub `main` is `0d532170ca479cabece61401458f353468c8a1f6`, with a successful production deployment run `34746345834`.
- Current `main` includes Google avatar commits `4b19a8e` (Telegram profile name/photo proxying), `53f5636` (missing user avatar fallback/error recovery), and subsequent theme/network commits.
- PR #10 is merged with merge commit `bbcd7e2f47588580ea61ddf663abd2e5b88ab433`; it is no longer the correct branch to use as a new base.
- Live `https://tgtop.me` currently returns `Worldwide 8` and real catalog entries. Browser inspection found five live `/api/telegram-avatar/<chatId>` images with `complete=true` and natural size 160x160.

## Current-main avatar behavior

- User avatar has a dedicated `/api/telegram-user-avatar/:telegramUserId` fallback and a `userAvatarError` state in `Home.tsx`.
- `Home.tsx` still has raw `<img>` branches for managerAvatarUrl, publicOwner.owner.avatarUrl, active moderation group avatars, entry.owner.avatarUrl, admin.avatarUrl, and reviewedRecipient.avatarUrl. A failed remote/S3/Telegram image leaves an empty circle because those branches do not render an error fallback.
- The safest next change is a small shared `SafeAvatar` renderer on a new branch from current `main`, applied only to those remaining raw branches, plus a regression test. Do not overwrite Google’s current-main user-avatar proxy/fallback implementation.

## Local work

- The previous local avatar patch was based on an older PR branch. Its SafeAvatar logic was validated, but it must be reapplied to current `main` rather than force-pushing over newer Google commits.
- GitHub App access is now functional for git push after the user enabled the Manus Connector with all repositories and read/write permissions. Do not use or request a Personal Access Token.
