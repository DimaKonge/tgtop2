CREATE TABLE `bot_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`username` varchar(128) NOT NULL,
	`telegramLink` varchar(512) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'General',
	`moderationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderationReason` varchar(255),
	`moderationReviewedBy` varchar(64),
	`moderationReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bot_listings_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `bot_listings_status_category_created_idx` ON `bot_listings` (`moderationStatus`,`category`,`createdAt`);--> statement-breakpoint
CREATE INDEX `bot_listings_owner_created_idx` ON `bot_listings` (`ownerOpenId`,`createdAt`);