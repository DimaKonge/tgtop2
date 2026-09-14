CREATE TABLE `nft_usernames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(128) NOT NULL,
	`price` varchar(64) NOT NULL,
	`priceAmount` int NOT NULL DEFAULT 0,
	`rentalPricePerDay` varchar(64) NOT NULL,
	`rentalAmountPerDay` int NOT NULL DEFAULT 0,
	`minRentalDays` int NOT NULL DEFAULT 7,
	`maxRentalDays` int NOT NULL DEFAULT 365,
	`ownerOpenId` varchar(64) NOT NULL,
	`ownerUsername` varchar(128) NOT NULL DEFAULT 'Anonymous',
	`listingType` enum('sale','rent','both') NOT NULL DEFAULT 'both',
	`status` enum('available','rented','sold') NOT NULL DEFAULT 'available',
	`currentRenterOpenId` varchar(64),
	`rentalExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nft_usernames_id` PRIMARY KEY(`id`),
	CONSTRAINT `nft_usernames_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `deals` MODIFY COLUMN `groupId` int;--> statement-breakpoint
ALTER TABLE `deals` MODIFY COLUMN `status` enum('open','escrow_funded','active','completed','disputed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `groups_catalog` MODIFY COLUMN `status` enum('listed','rented','sold','pending') NOT NULL DEFAULT 'listed';--> statement-breakpoint
ALTER TABLE `deals` ADD `nftId` int;--> statement-breakpoint
ALTER TABLE `deals` ADD `dealType` enum('group_buy','nft_buy','nft_rent') DEFAULT 'group_buy' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `rentalDays` int;