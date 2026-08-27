CREATE TABLE `telegram_stats_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetId` int NOT NULL,
	`collectedAt` timestamp NOT NULL DEFAULT (now()),
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`memberCount` int,
	`viewsPerPost` int,
	`sharesPerPost` int,
	`reactionsPerPost` int,
	`historyJson` text NOT NULL,
	CONSTRAINT `telegram_stats_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_stats_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(128) NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`kind` enum('channel','supergroup') NOT NULL,
	`addedByOpenId` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastRefreshedAt` timestamp,
	`lastAvailability` enum('pending','ready','unavailable') NOT NULL DEFAULT 'pending',
	`lastError` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_stats_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_stats_targets_username_unique` UNIQUE(`username`),
	CONSTRAINT `telegram_stats_targets_chat_unique` UNIQUE(`chatId`)
);
--> statement-breakpoint
CREATE INDEX `telegram_stats_snapshots_target_collected_idx` ON `telegram_stats_snapshots` (`targetId`,`collectedAt`);