CREATE TABLE `ranking_bid_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotId` int NOT NULL,
	`groupId` int NOT NULL,
	`bidderOpenId` varchar(64) NOT NULL,
	`bidAmount` int NOT NULL,
	`status` enum('recorded','verified','cancelled') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ranking_bid_intents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ranking_bid_intents_bidder_status_idx` ON `ranking_bid_intents` (`bidderOpenId`,`status`);--> statement-breakpoint
CREATE INDEX `ranking_bid_intents_slot_idx` ON `ranking_bid_intents` (`slotId`);