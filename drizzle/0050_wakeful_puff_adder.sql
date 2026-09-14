CREATE TABLE `ton_payout_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`withdrawalId` int NOT NULL,
	`kind` enum('broadcast','reconcile') NOT NULL,
	`status` enum('queued','leased','completed','manual_review','cancelled') NOT NULL DEFAULT 'queued',
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`leaseToken` varchar(96),
	`leaseExpiresAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` varchar(255),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ton_payout_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ton_payout_jobs_withdrawal_kind_unique` UNIQUE(`withdrawalId`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `ton_payout_wallet_leases` (
	`payoutWalletAddress` varchar(96) NOT NULL,
	`leaseToken` varchar(96) NOT NULL,
	`holderId` varchar(96) NOT NULL,
	`leaseExpiresAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ton_payout_wallet_leases_payoutWalletAddress` PRIMARY KEY(`payoutWalletAddress`)
);
--> statement-breakpoint
CREATE INDEX `ton_payout_jobs_status_available_idx` ON `ton_payout_jobs` (`status`,`availableAt`,`id`);--> statement-breakpoint
CREATE INDEX `ton_payout_jobs_lease_expires_idx` ON `ton_payout_jobs` (`status`,`leaseExpiresAt`);