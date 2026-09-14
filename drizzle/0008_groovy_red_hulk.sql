ALTER TABLE `credit_transactions` ADD `telegramChatId` varchar(64);--> statement-breakpoint
UPDATE `credit_transactions` AS transaction
INNER JOIN `groups_catalog` AS group_catalog ON group_catalog.`id` = transaction.`groupId`
SET transaction.`telegramChatId` = group_catalog.`chatId`
WHERE transaction.`kind` = 'group_connection_bonus' AND transaction.`telegramChatId` IS NULL;--> statement-breakpoint
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_kind_telegram_chat_unique` UNIQUE(`kind`,`telegramChatId`);
