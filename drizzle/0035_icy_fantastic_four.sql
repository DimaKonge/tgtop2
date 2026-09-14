ALTER TABLE `auction_slots` DROP INDEX `auction_slots_board_slot_unique`;--> statement-breakpoint
ALTER TABLE `auction_slots` MODIFY COLUMN `currentBid` varchar(64) NOT NULL DEFAULT '0 GRAM';--> statement-breakpoint
ALTER TABLE `auction_slots` ADD `subcategory` varchar(64) DEFAULT 'Все' NOT NULL;--> statement-breakpoint
ALTER TABLE `auction_slots` ADD CONSTRAINT `auction_slots_board_slot_unique` UNIQUE(`category`,`subcategory`,`country`,`slotNumber`);