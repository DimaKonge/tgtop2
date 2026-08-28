CREATE TABLE `telegram_onboarding_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerTelegramId` varchar(64) NOT NULL,
	`kind` enum('group','channel') NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','consumed','expired','rate_limited') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`issuedInWindow` int NOT NULL DEFAULT 1,
	`consumedChatId` varchar(64),
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_onboarding_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_onboarding_intents_token_unique` UNIQUE(`token`),
	CONSTRAINT `telegram_onboarding_intents_owner_kind_unique` UNIQUE(`ownerTelegramId`,`kind`)
);
--> statement-breakpoint
CREATE INDEX `telegram_onboarding_intents_pending_expires_idx` ON `telegram_onboarding_intents` (`status`,`expiresAt`);