# Production verification notes

- 2026-08-21: `https://tgtop.xyz/manus-storage/otclend-animated-avatar_29e6295f.mp4` now returns a signed `307` redirect after the production storage configuration was completed.
- 2026-08-21: Первый sandbox-browser просмотр `https://tgtop.xyz` был пустым после deployment видеоаватара, но последующая мобильная проверка пользователя подтвердила корректную отрисовку production-интерфейса, Telegram Login и карточек сообщества.

## Telegram integration notes

The official Telegram Bot API documentation describes `ChatPhoto` download identifiers only for the 160×160 and 640×640 chat-photo renditions. The outgoing animated profile-photo input accepts MPEG-4, but the chat-profile response does not expose the source animation identifier. Therefore, TG TOP stores an owner-provided original MP4 for every community that should use an animated card avatar, while retaining Telegram’s static avatar as a fallback. Source: <https://core.telegram.org/bots/api>.

The production Telegram Login route was verified to redirect to the official Telegram authorization page for `@TG_TOPBOT`, with a callback at `https://tgtop.xyz/api/auth/telegram/callback` and PKCE state cookies. Source: <https://oauth.telegram.org/auth>.

The Telegram Login OIDC documentation requires the application owner to add every website origin and exact callback URL to **Allowed URLs** in `@BotFather` → bot → **Login Widget**. The required TG TOP entries are `https://tgtop.xyz` and `https://tgtop.xyz/api/auth/telegram/callback`. Source: <https://core.telegram.org/widgets/login>.

Mobile user-agent verification: the current TG TOP login route produces an OAuth authorization request containing the exact registered callback URL, and Telegram accepts that request with the standard authorization page rather than `redirect_uri_required`.
