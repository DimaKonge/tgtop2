ALTER TABLE `auction_slots` ADD `country` varchar(64) DEFAULT 'Global' NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `country` varchar(64) DEFAULT 'Global' NOT NULL;