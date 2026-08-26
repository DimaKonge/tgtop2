CREATE TABLE `telegram_user_agent_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(64) NOT NULL,
	`actorOpenId` varchar(64) NOT NULL,
	`details` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_user_agent_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_user_agent_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` varchar(32) NOT NULL,
	`status` enum('disconnected','code_pending','password_pending','connected','error') NOT NULL DEFAULT 'disconnected',
	`encryptedSession` text,
	`encryptedPhone` text,
	`encryptedPhoneCodeHash` text,
	`accountTelegramId` varchar(64),
	`accountUsername` varchar(128),
	`expiresAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_user_agent_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_user_agent_sessions_scope_unique` UNIQUE(`scope`)
);
--> statement-breakpoint
CREATE INDEX `telegram_user_agent_audit_created_idx` ON `telegram_user_agent_audit_events` (`createdAt`);