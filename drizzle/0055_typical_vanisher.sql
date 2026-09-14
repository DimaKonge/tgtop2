CREATE TABLE `telegram_owner_dm_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramMessageId` varchar(64) NOT NULL,
	`ownerTelegramId` varchar(64) NOT NULL,
	`encryptedInput` text NOT NULL,
	`status` enum('queued','leased','waiting_agent','completed','manual_review','cancelled') NOT NULL DEFAULT 'queued',
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`leaseToken` varchar(96),
	`leaseExpiresAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`manusTaskId` varchar(128),
	`dispatchedAt` timestamp,
	`deliveredEventId` varchar(128),
	`lastError` varchar(255),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_owner_dm_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_owner_dm_jobs_message_unique` UNIQUE(`ownerTelegramId`,`telegramMessageId`)
);
--> statement-breakpoint
CREATE TABLE `telegram_owner_dm_worker_states` (
	`scope` varchar(32) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`manusTaskId` varchar(128),
	`activationSentAt` timestamp,
	`lastError` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_owner_dm_worker_states_scope` PRIMARY KEY(`scope`)
);
--> statement-breakpoint
CREATE INDEX `telegram_owner_dm_jobs_status_available_idx` ON `telegram_owner_dm_jobs` (`status`,`availableAt`,`id`);--> statement-breakpoint
CREATE INDEX `telegram_owner_dm_jobs_lease_expires_idx` ON `telegram_owner_dm_jobs` (`status`,`leaseExpiresAt`);