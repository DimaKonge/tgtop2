CREATE TABLE `telegram_support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramUserId` varchar(64) NOT NULL,
	`telegramUsername` varchar(128),
	`direction` enum('inbound','outbound') NOT NULL,
	`text` text NOT NULL,
	`telegramMessageId` varchar(64) NOT NULL,
	`ownerNotificationMessageId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_support_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_support_message_unique` UNIQUE(`telegramUserId`,`telegramMessageId`,`direction`),
	CONSTRAINT `telegram_support_owner_notification_unique` UNIQUE(`ownerNotificationMessageId`)
);
--> statement-breakpoint
CREATE INDEX `telegram_support_user_created_idx` ON `telegram_support_messages` (`telegramUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `telegram_support_created_idx` ON `telegram_support_messages` (`createdAt`);