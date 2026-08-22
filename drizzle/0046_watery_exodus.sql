CREATE TABLE `ton_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`payoutWalletAddress` varchar(96) NOT NULL,
	`destinationWalletAddress` varchar(96) NOT NULL,
	`grossAmountNano` decimal(30,0) NOT NULL,
	`feeReserveNano` decimal(30,0) NOT NULL,
	`actualFeeNano` decimal(30,0),
  `netAmountNano` decimal(30,0) NOT NULL,
  `idempotencyKey` varchar(96) NOT NULL,
  `reference` varchar(96) NOT NULL,
	`status` enum('queued','manual_review','broadcast_pending','sent','confirmed','failed_refunded','cancelled') NOT NULL,
	`riskReasons` varchar(512),
	`externalMessageHash` varchar(128),
	`transactionHash` varchar(128),
	`transactionLt` varchar(64),
	`broadcastAt` timestamp,
	`sentAt` timestamp,
	`confirmedAt` timestamp,
	`reviewedAt` timestamp,
	`reviewedByOpenId` varchar(64),
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ton_withdrawals_id` PRIMARY KEY(`id`),
	CONSTRAINT `ton_withdrawals_user_idempotency_unique` UNIQUE(`userOpenId`,`idempotencyKey`),
	CONSTRAINT `ton_withdrawals_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `ton_withdrawals_transaction_hash_unique` UNIQUE(`transactionHash`),
	CONSTRAINT `ton_withdrawals_external_message_hash_unique` UNIQUE(`externalMessageHash`)
);
--> statement-breakpoint
CREATE INDEX `ton_withdrawals_user_created_idx` ON `ton_withdrawals` (`userOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ton_withdrawals_destination_created_idx` ON `ton_withdrawals` (`destinationWalletAddress`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ton_withdrawals_status_created_idx` ON `ton_withdrawals` (`status`,`createdAt`);
