ALTER TABLE `groups_catalog` ADD `monthlyEntryEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `monthlyEntryEnabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `monthlyEntryStars` int;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `monthlyEntryLinkName` varchar(64);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `monthlyEntryInviteLink` varchar(512);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `monthlyEntryUpdatedAt` timestamp;
