# TG TOP Telegram Stars Payment Notes

Last reviewed: 15 August 2026.

## Product decision

Paid TG TOP ranking placement is a **digital service** delivered inside a Telegram Mini App. Consequently, any live in-app payment for that placement must use Telegram Stars with the `XTR` currency. The existing TON bid display remains a recorded, unpaid intent only until a separately compliant payment flow is released.

## Required payment lifecycle

1. The backend creates an immutable bid-payment intent with a unique payload and the proposed Stars amount.
2. `@TGTOP_robot` sends a single-chat `sendInvoice` request using currency `XTR` and no provider token.
3. The bot verifies the payload and responds to `pre_checkout_query` within Telegram's required time window.
4. The server records the `successful_payment` update and its `telegram_payment_charge_id` exactly once.
5. Only after that receipt is persisted may TG TOP mark the Stars bid as paid and grant the corresponding ranking placement.
6. Refunds, disputes, terms, and payment support must be handled through the bot's supported payment flows.

## Guardrails

- The Mini App must never decrement a client-side “Stars balance” or treat a visible balance as proof of payment.
- A pre-checkout approval is not payment confirmation; delivery waits for `successful_payment`.
- TON Connect is retained for wallet identity and future on-chain workflows outside this in-app digital-service purchase flow. It must not be used as a substitute for an in-app Stars purchase.
- Automated Telegram Stars refunds and developer payouts are not enabled in this phase.

## Sources

- [Telegram Stars payments for digital goods and services](https://core.telegram.org/bots/payments-stars)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
