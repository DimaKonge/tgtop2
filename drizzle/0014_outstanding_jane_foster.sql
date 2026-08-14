CREATE TABLE `nft_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nftId` int NOT NULL,
	`assetClass` enum('onchain','offchain') NOT NULL,
	`status` enum('draft','awaiting_signature','broadcast_pending','completed','cancelled','expired','failed') NOT NULL DEFAULT 'draft',
	`senderOpenId` varchar(64) NOT NULL,
	`recipientOpenId` varchar(64) NOT NULL,
	`recipientInput` varchar(128) NOT NULL,
	`sourceWalletAddress` varchar(96),
	`recipientWalletAddress` varchar(96),
	`transferReference` varchar(128),
	`transactionBocHash` varchar(128),
	`transactionLt` varchar(64),
	`failureReason` varchar(255),
	`expiresAt` timestamp,
	`signedAt` timestamp,
	`confirmedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nft_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `nft_transfers_transferReference_unique` UNIQUE(`transferReference`)
);
--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD `assetClass` enum('onchain','offchain') DEFAULT 'offchain' NOT NULL;--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD `nftItemAddress` varchar(96);--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD `ownerWalletAddress` varchar(96);--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD `ownershipVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD `ownershipVerification` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `telegramUsername` varchar(128);--> statement-breakpoint
ALTER TABLE `nft_usernames` ADD CONSTRAINT `nft_usernames_nftItemAddress_unique` UNIQUE(`nftItemAddress`);--> statement-breakpoint
CREATE INDEX `nft_transfers_sender_status_idx` ON `nft_transfers` (`senderOpenId`,`status`);--> statement-breakpoint
CREATE INDEX `nft_transfers_recipient_status_idx` ON `nft_transfers` (`recipientOpenId`,`status`);--> statement-breakpoint
CREATE INDEX `nft_transfers_nft_status_idx` ON `nft_transfers` (`nftId`,`status`);--> statement-breakpoint
CREATE INDEX `nft_usernames_owner_asset_status_idx` ON `nft_usernames` (`ownerOpenId`,`assetClass`,`status`);