CREATE TABLE `website_login_sessions` (
	`nonce` varchar(96) NOT NULL,
	`telegramOpenId` varchar(64),
	`status` enum('pending','confirmed','consumed','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `website_login_sessions_nonce` PRIMARY KEY(`nonce`)
);
--> statement-breakpoint
ALTER TABLE `deals` MODIFY COLUMN `status` enum('open','escrow_funded','active','completed','expired','cancelled','disputed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `deals` ADD `fundingReference` varchar(128);--> statement-breakpoint
ALTER TABLE `deals` ADD `transferEvidence` varchar(512);--> statement-breakpoint
ALTER TABLE `deals` ADD `fundedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `transferObservedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `buyerConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `releasedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `disputedAt` timestamp;