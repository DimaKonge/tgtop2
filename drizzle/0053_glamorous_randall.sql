CREATE TABLE `telegram_operation_log_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('top_activity','finance') NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`chatTitle` varchar(255),
	`configuredByOpenId` varchar(64) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_operation_log_destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_operation_log_destinations_kind_unique` UNIQUE(`kind`)
);
