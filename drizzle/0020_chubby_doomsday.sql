CREATE TABLE `stars_ranking_payment_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payload` varchar(96) NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`slotId` int NOT NULL,
	`groupId` int NOT NULL,
	`bidAmount` int NOT NULL,
	`starsAmount` int NOT NULL,
	`status` enum('pending','pre_checkout_approved','paid','refund_required','cancelled','expired') NOT NULL DEFAULT 'pending',
	`telegramPaymentChargeId` varchar(128),
	`telegramUserId` varchar(64),
	`invoiceMessageId` int,
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stars_ranking_payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `stars_ranking_payment_intents_payload_unique` UNIQUE(`payload`),
	CONSTRAINT `stars_ranking_payment_intents_telegramPaymentChargeId_unique` UNIQUE(`telegramPaymentChargeId`)
);
--> statement-breakpoint
CREATE INDEX `stars_rank_payment_user_status_idx` ON `stars_ranking_payment_intents` (`userOpenId`,`status`);--> statement-breakpoint
CREATE INDEX `stars_rank_payment_slot_status_idx` ON `stars_ranking_payment_intents` (`slotId`,`status`);--> statement-breakpoint
CREATE INDEX `stars_rank_payment_expiry_idx` ON `stars_ranking_payment_intents` (`status`,`expiresAt`);