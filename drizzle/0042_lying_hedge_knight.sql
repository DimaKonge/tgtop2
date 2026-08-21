CREATE TABLE `moderation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`action` enum('auto_review','manual_review','manual_block','manual_approve') NOT NULL,
	`actorOpenId` varchar(64),
	`reason` varchar(255) NOT NULL,
	`evidenceSummary` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moderation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groups_catalog` MODIFY COLUMN `status` enum('listed','rented','sold','pending','review','blocked') NOT NULL DEFAULT 'listed';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','moderator','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `moderationStatus` enum('pending','approved','review','blocked') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `moderationReason` varchar(255);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `moderationReviewedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `moderationReviewedAt` timestamp;--> statement-breakpoint
CREATE INDEX `moderation_events_group_created_idx` ON `moderation_events` (`groupId`,`createdAt`);