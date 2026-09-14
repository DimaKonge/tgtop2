CREATE TABLE `telegram_operations_owner_bindings` (
	`scope` varchar(32) NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`ownerTelegramId` varchar(64) NOT NULL,
	`ownerUsername` varchar(128),
	`boundAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_operations_owner_bindings_scope` PRIMARY KEY(`scope`),
	CONSTRAINT `telegram_operations_owner_chat_unique` UNIQUE(`chatId`),
	CONSTRAINT `telegram_operations_owner_telegram_unique` UNIQUE(`ownerTelegramId`)
);
