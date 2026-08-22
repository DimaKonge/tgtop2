# Внешние требования для TON-депозитов

Проверено 22 августа 2026 года.

- Официальная документация TON Connect: `sendTransaction` должен вызываться подключённым кошельком пользователя; запрос содержит `validUntil`, явную сеть mainnet `-239` и массив сообщений. Для простого TON-перевода адрес назначения должен быть в user-friendly формате, сумма передаётся в nanoton, а комментарий — в payload. Главная страница: https://docs.ton.org/applications/ton-connect/how-to/send-transaction
- TonAPI REST API: для основной сети используется `https://tonapi.io`; актуальная спецификация опубликована в Swagger/OpenAPI: https://docs.tonconsole.com/tonapi/rest-api
- Для серверной логики нельзя строить решения на высокоуровневых Events/Actions: документация прямо предупреждает, что их структура может меняться. Вместо этого используется низкоуровневый endpoint `GET /v2/blockchain/accounts/{account_id}/transactions` и проверяются поля входящего сообщения: source, destination, value, raw_body, а также transaction.success и transaction.aborted. Accounts: https://docs.tonconsole.com/tonapi/rest-api/accounts ; Events warning: https://docs.tonconsole.com/tonapi/rest-api/events
- Полученный TonAPI-ключ проверен лёгким запросом masterchain; адрес кошелька-получателя проверен через endpoint account. Значения секретов и адрес в этот файл не записываются.
