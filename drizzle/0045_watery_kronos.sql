CREATE TABLE `ton_deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`senderWalletAddress` varchar(96) NOT NULL,
	`recipientWalletAddress` varchar(96) NOT NULL,
	`requestedAmountNano` decimal(30,0) NOT NULL,
	`creditedAmountTon` decimal(20,9),
	`reference` varchar(96) NOT NULL,
	`status` enum('created','submitted','confirmed','expired','rejected') NOT NULL DEFAULT 'created',
	`transactionHash` varchar(128),
	`transactionLt` varchar(64),
	`failureReason` varchar(255),
	`expiresAt` timestamp NOT NULL,
	`submittedAt` timestamp,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ton_deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `ton_deposits_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `ton_deposits_transaction_hash_unique` UNIQUE(`transactionHash`)
);
--> statement-breakpoint
CREATE INDEX `ton_deposits_user_status_created_idx` ON `ton_deposits` (`userOpenId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ton_deposits_recipient_created_idx` ON `ton_deposits` (`recipientWalletAddress`,`createdAt`);