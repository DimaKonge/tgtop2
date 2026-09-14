CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`groupId` int,
	`amount` int NOT NULL,
	`kind` enum('group_connection_bonus','listing_spend') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_stats_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`membersCount` int NOT NULL DEFAULT 0,
	`messagesCount` int NOT NULL DEFAULT 0,
	`joinedCount` int NOT NULL DEFAULT 0,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_stats_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `description` text;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `avatarFileId` varchar(255);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `lastPostViews` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `lastPostAt` timestamp;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `lastStatsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `bonusBalance` int DEFAULT 0 NOT NULL;