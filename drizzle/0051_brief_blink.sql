CREATE TABLE `group_entry_link_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`previousUsername` varchar(128),
	`verifiedUsername` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_entry_link_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `group_entry_link_audits_group_created_idx` ON `group_entry_link_audits` (`groupId`,`createdAt`);