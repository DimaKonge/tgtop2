CREATE TABLE `bonus_credit_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(64) NOT NULL,
	`targetOpenId` varchar(64) NOT NULL,
	`targetTelegramUsername` varchar(128),
	`amount` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bonus_credit_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_bonus_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterOpenId` varchar(64) NOT NULL,
	`inviteeOpenId` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'beta_referral',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_bonus_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_bonus_grants_invitee_unique` UNIQUE(`inviteeOpenId`)
);
--> statement-breakpoint
CREATE TABLE `referral_reward_configs` (
	`id` int NOT NULL DEFAULT 1,
	`rewardAmount` int NOT NULL DEFAULT 100,
	`lifetimeLimit` int NOT NULL DEFAULT 2,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedByOpenId` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_reward_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `bonus_credit_audits_target_created_idx` ON `bonus_credit_audits` (`targetOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `bonus_credit_audits_actor_created_idx` ON `bonus_credit_audits` (`actorOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `referral_bonus_grants_inviter_created_idx` ON `referral_bonus_grants` (`inviterOpenId`,`createdAt`);