# TG TOP: Anti-Sybil onboarding contract

## Product rule

Новая Telegram-площадка создаётся в каталоге только после **одноразового server-side onboarding intent**. Intent создаётся автоматически, когда авторизованный через Telegram Mini App владелец нажимает существующую кнопку «Добавить бота». Для нормального владельца интерфейс не получает новый обязательный экран или ручной код.

## Trust boundary

Клиент передаёт только выбранный тип площадки (`group` или `channel`). Telegram ID владельца берётся из уже проверенного `x-telegram-init-data` в tRPC context. `my_chat_member.from.id` должен совпасть с intent owner Telegram ID. Статус инициатора дополнительно проверяется через `getChatMember` как owner сообщества. Никакой client-side `user.id`, username или chat id не считаются доказательством.

## Bounded intent lifecycle

| Свойство | Значение |
|---|---|
| Срок действия | 10 минут от создания |
| Погашение | Первый подходящий переход бота в administrator/creator этого владельца |
| Одновременные допуски | Не более одного активного intent на Telegram ID и тип площадки |
| Новый лимит | Не более 3 успешно созданных intent за 24 часа на Telegram ID |
| Повтор события | Идемпотентный результат; второй `my_chat_member` не создаёт вторую карточку/бонус |
| Истёкший/неподходящий intent | Удаляется или помечается expired; площадка, бонус, rank и operations log не создаются |

## Channel and group nuance

Telegram передаёт `startgroup` параметр как `/start@bot <parameter>` только для групп. Ссылка `startchannel` не несёт параметра. Поэтому одинаково безопасным соединяющим фактом для обоих типов остаются: short-lived intent, verified Telegram owner ID, тип площадки и одноразовое consumption. Для группы deep-link parameter может служить дополнительным диагностическим маркером, но не является единственным доказательством.

## No side effects before trust

До успешного consumption запрещены: `upsertUser`, `upsertTelegramGroup`, snapshot, connection bonus, open Mini App, personal confirmation, Telegram operations log и сообщения в добавленное сообщество. Неподтверждённый event не должен получать неограниченное хранение; для него достаточно существующего bounded event receipt path.

## Compatibility and rollback

Релиз меняет только путь **нового** добавления бота. Уже подключённые площадки и их membership/activity updates продолжают обрабатываться прежним образом. Миграция только добавляет таблицу и индексы. Удаление intent не может удалить группу или изменить баланс.
