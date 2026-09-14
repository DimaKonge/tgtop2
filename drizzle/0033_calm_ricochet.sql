CREATE TABLE `giveaway_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`giveawayId` int NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `giveaway_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `giveaway_participants_giveaway_user_unique` UNIQUE(`giveawayId`,`userOpenId`)
);
--> statement-breakpoint
CREATE TABLE `giveaways` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`prizeTitle` varchar(160) NOT NULL,
	`rules` text,
	`boostOnly` boolean NOT NULL DEFAULT false,
	`status` enum('open','closed','cancelled') NOT NULL DEFAULT 'open',
	`endsAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `giveaways_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `giveaway_participants_giveaway_joined_idx` ON `giveaway_participants` (`giveawayId`,`joinedAt`);--> statement-breakpoint
CREATE INDEX `giveaways_status_ends_idx` ON `giveaways` (`status`,`endsAt`);--> statement-breakpoint
CREATE INDEX `giveaways_owner_created_idx` ON `giveaways` (`ownerOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `giveaways_group_created_idx` ON `giveaways` (`groupId`,`createdAt`);