CREATE TABLE `telegram_owner_dm_bindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` varchar(32) NOT NULL,
	`ownerTelegramId` varchar(64) NOT NULL,
	`expectedUsername` varchar(128) NOT NULL,
	`boundByOpenId` varchar(64) NOT NULL,
	`greetingSentAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_owner_dm_bindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_owner_dm_bindings_scope_unique` UNIQUE(`scope`),
	CONSTRAINT `telegram_owner_dm_bindings_owner_unique` UNIQUE(`ownerTelegramId`)
);
