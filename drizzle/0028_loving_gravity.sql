CREATE TABLE `reward_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`beneficiaryOpenId` varchar(64) NOT NULL,
	`memberTelegramId` varchar(64) NOT NULL,
	`inviterOpenId` varchar(64),
	`eventType` enum('subscription','invite_referral','manual_add') NOT NULL,
	`amount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `reward_events_group_member_beneficiary_type_unique` UNIQUE(`groupId`,`memberTelegramId`,`beneficiaryOpenId`,`eventType`)
);
--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rewardActive` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rewardBudget` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rewardPerSubscription` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rewardPerInvite` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rewardPerManualAdd` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `reward_events_beneficiary_created_idx` ON `reward_events` (`beneficiaryOpenId`,`createdAt`);